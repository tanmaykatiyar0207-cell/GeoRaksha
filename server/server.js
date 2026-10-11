/**
 * server.js — GeoRaksha application entry point
 *
 * Wires the bus simulator to the traffic monitoring agent.
 * Socket.io / Express integration will be added in a later step.
 *
 * Usage:
 *   node server/server.js
 */

import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { init as initTrafficMon, processPing, getStats } from './agents/trafficMonitoring.js';
import { startSimulation } from './simulator/busSimulator.js';
import { startAmbulanceSimulation } from './simulator/ambulanceSimulator.js';
import { sharedState, stateEvents, logAgentActivity } from './sharedState.js';
import { init as initRouteOptimizer, setActiveRoute } from './agents/routeOptimizer.js';
import { init as initETAPredictor } from './agents/etaPredictor.js';
import { init as initSignalCoordinator, evaluatePosition } from './agents/signalCoordinator.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║              GeoRaksha — Starting Up                    ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// ── 0. Initialize Socket.io Server
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
let lastAmbulanceUpdate = null;

import { getGraph } from './data/roadGraph.js';
import { getAlternativeRoutes } from './agents/routeOptimizer.js';

io.on('connection', async (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);
  
  // Send current state on connection
  if (sharedState.activeRoute) {
    socket.emit('route:update', { 
      routeGeoJson: sharedState.activeRoute.geoJson, 
      etaSeconds: sharedState.eta 
    });
  }
  if (sharedState.currentAlert) {
    socket.emit('signal:alert', sharedState.currentAlert);
  }
  if (lastAmbulanceUpdate) {
    socket.emit('ambulance:update', lastAmbulanceUpdate);
  }
  if (sharedState.agentActivities.length > 0) {
    socket.emit('agent:activities', sharedState.agentActivities);
  }

  socket.on('hospitals:get', async (callback) => {
    const graph = await getGraph();
    callback(graph.hospitals);
  });

  socket.on('route:request_alternatives', async ({ startNodeId, destNodeId }, callback) => {
    const alternatives = getAlternativeRoutes(startNodeId, destNodeId, 3);
    callback(alternatives);
  });

  socket.on('route:select', (selectedRoute) => {
    setActiveRoute(null, null, selectedRoute);
    sharedState.navigationStarted = true;
    // Capture baseline ETA for before/after comparison in Mission Summary
    sharedState.baselineEta = selectedRoute.totalTimeSeconds || 0;
    stateEvents.emit('route:started');
  });

  socket.on('route:end', async () => {
    // Emit mission summary before resetting
    const summary = {
      totalTransitSeconds: sharedState.eta || 0,
      timeSavedSeconds: sharedState.timeSaved || 0,
      bottlenecksAvoided: sharedState.rerouteCount || 0,
      signalAlertsFired: sharedState.signalAlertCount || 0,
      hospitalPreArrival: sharedState.hospitalMessageCount > 0,
      hospitalMessageCount: sharedState.hospitalMessageCount || 0,
      // Before/After comparison data
      congestedEta: (sharedState.baselineEta || 0) + (sharedState.timeSaved || 0),
      optimizedEta: sharedState.baselineEta || 0,
    };
    socket.emit('mission:summary', summary);

    // Reset state
    sharedState.activeRoute = null;
    sharedState.eta = null;
    sharedState.navigationStarted = false;
    sharedState.timeSaved = 0;
    sharedState.baselineEta = 0;
    sharedState.rerouteCount = 0;
    sharedState.signalAlertCount = 0;
    sharedState.hospitalMessageCount = 0;

    // reset position to start
    const startNode = (await getGraph()).nodes['stop_22628'];
    lastAmbulanceUpdate = { lat: startNode.lat, lon: startNode.lon, heading: 0, speed: 0, etaSeconds: 0 };
    
    io.emit('route:update', { routeGeoJson: null, etaSeconds: null });
    io.emit('ambulance:update', lastAmbulanceUpdate);
  });

  // ── Demo Controller Triggers ─────────────────────────────────────
  // Helper to pick an edge AHEAD of the ambulance for demo scenarios
  const getTargetEdge = () => {
    const path = sharedState.activeRoute?.edgePath;
    if (!path || path.length === 0) return 'edge_stop_22628__waypoint_12.9572_77.6990';
    // Inject at 30% down the route to ensure it's ahead of the ambulance
    const idx = Math.floor(path.length * 0.3);
    return path[idx];
  };

  socket.on('demo:inject_congestion', () => {
    const targetEdge = getTargetEdge();
    if (!sharedState.segments[targetEdge]) {
      sharedState.segments[targetEdge] = { readings: [], avgSpeed: 1, status: 'congested' };
    } else {
      sharedState.segments[targetEdge].avgSpeed = 1;
      sharedState.segments[targetEdge].status = 'congested';
    }
    stateEvents.emit('segments:changed', targetEdge);
    logAgentActivity('traffic', '🚨', 'DEMO: Gridlock Injected', `Presenter simulated sudden gridlock on segment ${targetEdge} (Speed: 1 km/h). AI forcing immediate diversion.`);
  });

  socket.on('demo:clear_congestion', () => {
    const targetEdge = getTargetEdge();
    if (sharedState.segments[targetEdge]) {
      sharedState.segments[targetEdge].avgSpeed = 38;
      sharedState.segments[targetEdge].status = 'clear';
      stateEvents.emit('segments:changed', targetEdge);
    }
    logAgentActivity('traffic', '🟢', 'DEMO: Corridor Flow Restored', `Presenter cleared bottleneck on segment ${targetEdge}.`);
  });

  socket.on('demo:trigger_signal', () => {
    const nextJunctionId = sharedState.activeRoute?.nodePath?.[1] || 'stop_22628';
    sharedState.currentAlert = {
      junctionId: nextJunctionId,
      secondsToArrival: 24,
    };
    sharedState.signalAlertCount++;
    stateEvents.emit('alert:new', sharedState.currentAlert);
    logAgentActivity('signal', '🚦', 'DEMO: Signal Priority Test', `Presenter triggered manual green-wave advisory for ${nextJunctionId}.`);
  });

  // ── Road Closure / Metro Work Simulation ──────────────────────────
  socket.on('demo:road_closure', () => {
    const targetEdge = getTargetEdge();
    if (!sharedState.segments[targetEdge]) {
      sharedState.segments[targetEdge] = { readings: [], avgSpeed: 0, status: 'blocked' };
    } else {
      sharedState.segments[targetEdge].avgSpeed = 0;
      sharedState.segments[targetEdge].status = 'blocked';
    }
    stateEvents.emit('segments:changed', targetEdge);
    logAgentActivity('traffic', '🚧', 'Road Closure Detected — Construction Zone', `Municipal road work / metro construction identified on segment. Corridor velocity: 0 km/h. Marking as BLOCKED — all routing candidates will bypass this segment.`);
  });

  socket.on('demo:clear_road_closure', () => {
    const targetEdge = getTargetEdge();
    if (sharedState.segments[targetEdge]) {
      sharedState.segments[targetEdge].avgSpeed = 38;
      sharedState.segments[targetEdge].status = 'clear';
      stateEvents.emit('segments:changed', targetEdge);
    }
    logAgentActivity('traffic', '🟢', 'Road Closure Lifted — Corridor Reopened', `Construction zone cleared. Segment restored to free-flow (38 km/h). Road available for routing.`);
  });

  // ── Hospital Emergency Pre-Arrival Communications ──────────────────
  socket.on('hospital:message_send', (msgData) => {
    sharedState.hospitalMessageCount++;
    const msgObj = {
      id: `msg_${Date.now()}`,
      sender: 'ambulance',
      senderName: 'Ambulance #KA-03-EM-108',
      text: msgData.text,
      protocol: msgData.protocol || 'Trauma Triage',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      etaSeconds: sharedState.eta,
    };
    io.emit('hospital:message', msgObj);

    logAgentActivity(
      'signal',
      '🏥',
      'Hospital Pre-Arrival Advisory Dispatched',
      `Emergency message transmitted to ER: "${msgData.text}" (Protocol: ${msgData.protocol || 'General'}).`
    );

    // Simulate realistic ER triage acknowledgment after 1.4 seconds
    setTimeout(() => {
      const hospitalName = msgData.hospitalName || 'Emergency Department';
      const triageReplies = [
        `[ER Triage Chief]: Copy that. Trauma Bay #1 prepped. CT scanner clear. Green corridor acknowledged.`,
        `[Cardiac ICU]: Message received. Cath lab activated and cardiology team on standby for immediate handover.`,
        `[Dr. Sharma, ER Head]: Pre-arrival vitals logged. Rapid response team stationed at emergency bay.`,
      ];
      const replyText = triageReplies[Math.floor(Math.random() * triageReplies.length)];

      const replyObj = {
        id: `msg_${Date.now()}_resp`,
        sender: 'hospital',
        senderName: `${hospitalName} (ER Desk)`,
        text: replyText,
        protocol: msgData.protocol || 'Trauma Triage',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      io.emit('hospital:message', replyObj);
      logAgentActivity(
        'signal',
        '👩‍⚕️',
        'Hospital ER Response Received',
        `${hospitalName} confirmed standby status. Trauma team ready for arrival.`
      );
    }, 1400);
  });
  
  socket.on('disconnect', () => {
    console.log(`[socket] Client disconnected: ${socket.id}`);
  });
});
httpServer.listen(3000, () => {
  console.log('[socket] Socket.io server running on port 3000');
});

// ── 1. Initialize traffic monitoring (loads graph, builds spatial index)
await initTrafficMon();

// ── 2. Listen for segment status changes and broadcast
stateEvents.on('segments:changed', (edgeId) => {
  io.emit('segment:update', {
    segmentId: edgeId,
    ...sharedState.segments[edgeId]
  });
});


stateEvents.on('route:diverted', (oldRoute) => {
  io.emit('route:diverted', { routeGeoJson: oldRoute.geoJson });
});

stateEvents.on('route:changed', () => {
  io.emit('route:update', {
    routeGeoJson: sharedState.activeRoute?.geoJson,
    etaSeconds: sharedState.eta
  });
});

stateEvents.on('eta:changed', () => {
  io.emit('route:update', {
    routeGeoJson: sharedState.activeRoute?.geoJson,
    etaSeconds: sharedState.eta
  });
});

stateEvents.on('alert:new', (alert) => {
  io.emit('signal:alert', alert);
});

stateEvents.on('time_saved:changed', () => {
  io.emit('time_saved:update', { timeSaved: sharedState.timeSaved });
});

stateEvents.on('alert:cleared', () => {
  io.emit('signal:alert', { cleared: true });
});

stateEvents.on('agent:activity', (activity) => {
  io.emit('agent:activity', activity);
});

// ── 2.5 Initialize routing, ETA, and signal coordination agents
await initRouteOptimizer();
initETAPredictor();
await initSignalCoordinator();

// The ambulance starts parked at the congestion edge (stop_22628)
// setActiveRoute is intentionally omitted until the user selects a route
const startNode = (await getGraph()).nodes['stop_22628'];
lastAmbulanceUpdate = { lat: startNode.lat, lon: startNode.lon, heading: 0, speed: 0, etaSeconds: 0 };
evaluatePosition(lastAmbulanceUpdate);

// ── 3. Start the bus simulator, feeding pings into the traffic monitor and socket
const stopSimulation = await startSimulation((ping) => {
  processPing(ping);
  io.emit('bus:update', ping);
});

// ── 3.5 Start the ambulance simulator, broadcasting position on each tick
const stopAmbulance = startAmbulanceSimulation((update) => {
  lastAmbulanceUpdate = update;
  evaluatePosition(update);
  io.emit('ambulance:update', update);
});

// ── 4. Periodic stats summary every 30 seconds
const statsInterval = setInterval(() => {
  const s = getStats();
  console.log(
    `\n[server] 📊 Stats — processed: ${s.pingsProcessed} | ` +
    `rejected: ${s.pingsRejected} | dwell-skipped: ${s.pingsDwellSkip} | ` +
    `segments tracked: ${s.segmentsTracked} | ` +
    `congested: ${s.segmentsCongested} | slow: ${s.segmentsSlow}`,
  );
}, 30_000);

// ── 5. Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[server] Shutting down…');
  clearInterval(statsInterval);
  stopSimulation();
  stopAmbulance();
  const final = getStats();
  console.log(
    `[server] Final stats — processed: ${final.pingsProcessed} | ` +
    `rejected: ${final.pingsRejected} | dwell-skipped: ${final.pingsDwellSkip}`,
  );
  process.exit(0);
});

console.log('[server] ✔ GeoRaksha running. Press Ctrl+C to stop.\n');
