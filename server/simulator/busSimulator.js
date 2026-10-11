/**
 * busSimulator.js — Virtual Bus Simulator for GeoRaksha
 *
 * Spawns virtual buses on real BMTC routes reconstructed from the
 * loaded GTFS graph and emits position pings on a 2.5-second tick.
 *
 * Features:
 *   • Uses spatial canonicalization so overlapping routes share identical
 *     physical edgeIds (e.g. edge_stop_22628__waypoint_12.9572_77.6990)
 *   • Spawns 5 virtual buses on routes that share a SINGLE physical edgeId
 *   • Scripted congestion event: targets THAT EXACT SINGLE SHARED edgeId,
 *     starting 30s after sim start for 60s
 *   • Multiple independent buses report slowdown pings on the SAME edgeId
 *     (the core Floating Car Data signal for traffic monitoring)
 *   • Buses dwell 5–15s at stops (within 30m proximity)
 *   • Speed uses freeFlowSpeed() ±15% variation, or 20–30% under congestion
 *
 * Decoupled: receives onPing callback from the caller; does NOT import
 * trafficMonitoring.js.
 *
 * Usage:
 *   import { startSimulation } from './busSimulator.js';
 *   const stop = await startSimulation((ping) => processPing(ping));
 *   // later: stop();
 */

import { fileURLToPath } from 'node:url';
import { getGraph, freeFlowSpeed } from '../data/roadGraph.js';

// ═══════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════
const TICK_MS               = 2500;     // tick interval: 2.5 seconds
const DWELL_MIN_MS          = 5000;     // minimum stop dwell: 5s
const DWELL_MAX_MS          = 15000;    // maximum stop dwell: 15s
const STOP_PROXIMITY_M      = 30;       // "at stop" threshold in meters
const SPEED_VARIATION       = 0.15;     // ±15% normal speed variation
const CONGESTION_SPEED_MIN  = 0.20;     // congestion: 20% of normal speed
const CONGESTION_SPEED_MAX  = 0.30;     // congestion: 30% of normal speed
const NUM_BUSES             = 5;        // buses to spawn
const CONGESTION_DELAY_MS   = 30_000;   // congestion starts 30s after sim start
const CONGESTION_DURATION_S = 60;       // congestion lasts 60 seconds

// ═══════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeBearing(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}


// ═══════════════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════════════

/**
 * Start the bus simulation.
 *
 * @param {function} onPing — callback receiving
 *   { busId: string, lat: number, lon: number, speed: number,
 *     timestamp: number, routeId: string, edgeId: string }
 * @returns {Promise<function>} A stop function that halts the simulation.
 */
export async function startSimulation(onPing) {
  const graph = await getGraph();
  const { nodes, edges, stops, routes } = graph;

  // ── 1. Find edgeIds shared by multiple routes ──────────────────────
  const edgeUsage = new Map(); // edgeId → [shapeId, ...]
  for (const [shapeId, edgeList] of Object.entries(routes)) {
    if (!edgeList || edgeList.length < 3) continue;
    for (const eid of edgeList) {
      if (!edgeUsage.has(eid)) edgeUsage.set(eid, []);
      edgeUsage.get(eid).push(shapeId);
    }
  }

  // Find the edgeId shared by the most routes (e.g. 78 routes on ORR)
  const sharedEdgesSorted = [...edgeUsage.entries()]
    .filter(([, shapeIds]) => shapeIds.length >= 5)
    .sort((a, b) => b[1].length - a[1].length);

  if (sharedEdgesSorted.length === 0) {
    throw new Error('[simulator] No shared edges found across GTFS routes.');
  }

  const [targetEdgeId, candidateShapeIds] = sharedEdgesSorted[0];
  const targetEdge = edges[targetEdgeId];
  const targetFrom = nodes[targetEdge.fromNode];
  const targetTo = nodes[targetEdge.toNode];

  console.log(
    `\n[simulator] 🎯 Single shared congestion edge selected: "${targetEdgeId}"`,
  );
  console.log(
    `[simulator]    Physical segment: [${targetFrom.lat.toFixed(4)}, ${targetFrom.lon.toFixed(4)}] → ` +
    `[${targetTo.lat.toFixed(4)}, ${targetTo.lon.toFixed(4)}] (${targetEdge.distanceMeters}m)`,
  );

  // ── 2. Select 5 target routes for congestion ───────────────────────
  const selectedShapeIds = candidateShapeIds.slice(0, 5);

  console.log(
    `[simulator] Spawning 5 buses on routes sharing edge "${targetEdgeId}":`,
  );
  selectedShapeIds.forEach((shapeId, i) => {
    const routeEdges = routes[shapeId];
    const targetIdx = routeEdges.indexOf(targetEdgeId);
    console.log(
      `[simulator]   • ${shapeId} (${routeEdges.length} edges, passes target edge @ position #${targetIdx})`,
    );
  });

  // ── 2b. Configure city-wide ambient routes (since GTFS is Whitefield-only) ──
  const AMBIENT_ROUTES = [
    // Yeshwanthpur to Peenya (Tumkur Rd)
    [[13.024, 77.540], [13.028, 77.534], [13.033, 77.525], [13.038, 77.518]],
    // Indiranagar to KR Puram (Old Madras Rd)
    [[12.978, 77.640], [12.985, 77.648], [12.993, 77.660], [13.003, 77.674]],
    // Hebbal to Silk Board (Outer Ring Road East)
    [[13.035, 77.597], [13.020, 77.630], [12.990, 77.670], [12.960, 77.680], [12.917, 77.622]],
    // Majestic / KBS to MG Road to Domlur
    [[12.977, 77.572], [12.973, 77.585], [12.973, 77.607], [12.960, 77.638]],
    // Silk Board to Electronic City (Hosur Rd)
    [[12.917, 77.622], [12.900, 77.635], [12.875, 77.650], [12.845, 77.665]],
    // Dairy Circle to Meenakshi Mall (Bannerghatta Rd)
    [[12.936, 77.596], [12.915, 77.600], [12.895, 77.598], [12.875, 77.595]],
    // Banashankari to Konanakunte (Kanakapura Rd)
    [[12.918, 77.573], [12.905, 77.572], [12.885, 77.568], [12.865, 77.565]],
    // Nayandahalli to Kengeri (Mysore Rd)
    [[12.943, 77.523], [12.930, 77.505], [12.915, 77.495], [12.902, 77.485]],
    // Malleshwaram to Yeshwanthpur
    [[13.007, 77.570], [13.015, 77.560], [13.024, 77.540]],
    // Jayanagar to Koramangala
    [[12.930, 77.583], [12.933, 77.598], [12.935, 77.614]],
    // Jalahalli to Hebbal
    [[13.045, 77.545], [13.040, 77.570], [13.035, 77.597]],
    // Yelahanka to Hebbal
    [[13.100, 77.596], [13.070, 77.597], [13.035, 77.597]],
  ];

  // Extract ALL valid real routes from the graph to populate the main operating area
  const allShapeIds = Object.keys(routes).filter(id => !candidateShapeIds.includes(id));
  
  // SAFETY CAP: Randomly select max 350 routes to prevent Leaflet from crashing the browser tab
  const safetyCappedShapes = allShapeIds.sort(() => 0.5 - Math.random()).slice(0, 350);

  safetyCappedShapes.forEach(shapeId => {
    const routeEdgeIds = routes[shapeId];
    // Only map routes with at least 3 edges to ensure actual movement
    if (routeEdgeIds && routeEdgeIds.length > 2) {
      const path = [];
      routeEdgeIds.forEach(eid => {
        if (edges[eid] && nodes[edges[eid].fromNode]) {
          path.push([nodes[edges[eid].fromNode].lat, nodes[edges[eid].fromNode].lon]);
        }
      });
      // Ensure the path is reasonably long to avoid glitchy short hops
      if (path.length > 2) AMBIENT_ROUTES.push(path);
    }
  });

  console.log(`[simulator] Configured ${AMBIENT_ROUTES.length} total ambient routes (Massive Scale Enabled)`);

  // ── 3. Configure scripted congestion on THAT SINGLE SHARED edge ────

  const simStartTime = Date.now();
  const congestionStartTime = simStartTime + CONGESTION_DELAY_MS;
  const congestionEvent = {
    edgeId: targetEdgeId,
    startTime: congestionStartTime,
    durationSeconds: CONGESTION_DURATION_S,
  };

  console.log(
    `[simulator] 🚧 Scripted congestion event configured on SINGLE SHARED edgeId: "${targetEdgeId}"`,
  );
  console.log(
    `[simulator]    Starts T+${CONGESTION_DELAY_MS / 1000}s (${new Date(congestionStartTime).toISOString()}), lasts ${CONGESTION_DURATION_S}s`,
  );

  // ── 4. Initialize bus state ───────────────────────────────────────
  // Target corridor buses (congestion scenario)
  const buses = selectedShapeIds.map((shapeId, i) => {
    const routeEdges = routes[shapeId];
    const currentEdgeIdx = routeEdges.indexOf(targetEdgeId);

    return {
      busId:              `bus_${i + 1}`,
      routeId:            shapeId,
      routeEdges,
      currentEdgeIdx:     currentEdgeIdx >= 0 ? currentEdgeIdx : 0,
      progressOnEdge:     0.1,
      isCityBus:          false,
      state:              /** @type {'moving' | 'dwelling'} */ ('moving'),
      dwellUntil:         /** @type {number | null} */ (null),
      lastDwellStopNodeId: null,
    };
  });

  // City-wide background buses — moving back and forth on ambient routes
  AMBIENT_ROUTES.forEach((path, i) => {
    // Spawn exactly 1 bus per real-world route to prevent DOM crashing (~440 total)
    for (let j = 0; j < 1; j++) {
      buses.push({
        busId:              `ambient_bus_${i + 1}_${j + 1}`,
        routeId:            `ambient_${i}`,
        path, // Array of [lat, lon]
        currentSegmentIdx:  0,
        progressOnSegment:  Math.random(),
        direction:          j % 2 === 0 ? 1 : -1, // Mix forward and reverse directions
        isCityBus:          true,
        state:              'moving',
        dwellUntil:         null,
        lastDwellStopNodeId: null,
      });
    }
  });


  // ── 5. Simulation state ───────────────────────────────────────────
  let congestionIsActive = false;

  // ── 6. Tick function ──────────────────────────────────────────────
  function tick() {
    const now = Date.now();

    // ── Congestion window check ─────────────────────────────────────
    const wasActive = congestionIsActive;
    congestionIsActive =
      now >= congestionEvent.startTime &&
      now < congestionEvent.startTime + congestionEvent.durationSeconds * 1000;

    if (congestionIsActive && !wasActive) {
      const busesOnCongestedEdge = buses.filter(
        (b) => !b.isCityBus && b.routeEdges && b.routeEdges[b.currentEdgeIdx] === targetEdgeId,
      );
      console.log(
        `\n[simulator] 🚧 CONGESTION STARTED on SINGLE SHARED edgeId "${targetEdgeId}" at ${new Date(now).toISOString()}`,
      );
      console.log(
        `[simulator]    Target Edge: "${targetEdgeId}"`,
      );
      console.log(
        `[simulator]    Buses currently on this exact shared edge: ` +
        `${busesOnCongestedEdge.map((b) => b.busId).join(', ') || 'none (approaching)'}`,
      );
    }

    if (!congestionIsActive && wasActive) {
      console.log(
        `\n[simulator] ✅ CONGESTION ENDED on SINGLE SHARED edgeId "${targetEdgeId}" at ${new Date(now).toISOString()}`,
      );
    }

    // ── Update each bus ─────────────────────────────────────────────
    for (const bus of buses) {
      if (bus.isCityBus) {
        // --- AMBIENT BUS LOGIC ---
        const path = bus.path;
        let cFrom = path[bus.currentSegmentIdx];
        let cTo = path[bus.currentSegmentIdx + bus.direction];
        
        if (!cTo) {
          // Reached end of path, turn around
          bus.direction *= -1;
          bus.currentSegmentIdx += bus.direction;
          cFrom = path[bus.currentSegmentIdx];
          cTo = path[bus.currentSegmentIdx + bus.direction];
        }

        const segDist = haversineMeters(cFrom[0], cFrom[1], cTo[0], cTo[1]);
        const speed = 25 + Math.random() * 15; // 25-40 km/h
        const speedMs = (speed * 1000) / 3600;
        const distRemaining = speedMs * (TICK_MS / 1000);

        if (segDist > 0) {
          bus.progressOnSegment += distRemaining / segDist;
          if (bus.progressOnSegment >= 1) {
            bus.progressOnSegment = 0;
            bus.currentSegmentIdx += bus.direction;
            if (bus.currentSegmentIdx < 0 || bus.currentSegmentIdx >= path.length - 1) {
               bus.direction *= -1;
               bus.currentSegmentIdx = Math.max(0, Math.min(bus.currentSegmentIdx, path.length - 2));
            }
          }
        }

        cFrom = path[bus.currentSegmentIdx];
        cTo = path[bus.currentSegmentIdx + bus.direction] || path[bus.currentSegmentIdx];

        const lat = cFrom[0] + (cTo[0] - cFrom[0]) * bus.progressOnSegment;
        const lon = cFrom[1] + (cTo[1] - cFrom[1]) * bus.progressOnSegment;
        const heading = computeBearing(cFrom[0], cFrom[1], cTo[0], cTo[1]);

        onPing({
          busId: bus.busId,
          lat,
          lon,
          speed: Math.round(speed),
          timestamp: now,
          routeId: bus.routeId,
          edgeId: 'ambient', // Ambient buses don't interact with the traffic graph
          heading: Math.round(heading),
        });
        continue;
      }

      // --- GTFS BUS LOGIC (Target Corridor) ---
      const edgeId = bus.routeEdges[bus.currentEdgeIdx];
      const edge = edges[edgeId];
      if (!edge) continue;

      const fromN = nodes[edge.fromNode];
      const toN = nodes[edge.toNode];
      if (!fromN || !toN) continue;

      // Interpolate current lat/lon from edge progress
      const lat = fromN.lat + (toN.lat - fromN.lat) * bus.progressOnEdge;
      const lon = fromN.lon + (toN.lon - fromN.lon) * bus.progressOnEdge;
      const heading = computeBearing(fromN.lat, fromN.lon, toN.lat, toN.lon);

      // ── DWELLING state ────────────────────────────────────────────
      if (bus.state === 'dwelling') {
        if (now >= bus.dwellUntil) {
          bus.state = 'moving';
          bus.dwellUntil = null;
          console.log(
            `[simulator] 🚌 ${bus.busId} RESUMED from dwell | route: ${bus.routeId}`,
          );
        }
        // Emit ping at speed 0 while dwelling
        onPing({
          busId: bus.busId,
          lat,
          lon,
          speed: 0,
          timestamp: now,
          routeId: bus.routeId,
          edgeId,
          heading: Math.round(heading),
        });
        continue;
      }

      // ── MOVING state ──────────────────────────────────────────────

      // Check stop proximity (and avoid re-triggering at same stop)
      let nearestStopNodeId = null;
      for (const stop of stops) {
        if (haversineMeters(lat, lon, stop.lat, stop.lon) < STOP_PROXIMITY_M) {
          nearestStopNodeId = stop.nodeId;
          break;
        }
      }

      if (nearestStopNodeId && nearestStopNodeId !== bus.lastDwellStopNodeId) {
        // Enter dwell
        const dwellMs =
          DWELL_MIN_MS + Math.random() * (DWELL_MAX_MS - DWELL_MIN_MS);
        bus.state = 'dwelling';
        bus.dwellUntil = now + dwellMs;
        bus.lastDwellStopNodeId = nearestStopNodeId;
        console.log(
          `[simulator] 🚏 ${bus.busId} DWELLING at ${nearestStopNodeId} ` +
          `(${lat.toFixed(5)}, ${lon.toFixed(5)}) for ${(dwellMs / 1000).toFixed(1)}s | route: ${bus.routeId}`,
        );
        onPing({
          busId: bus.busId,
          lat,
          lon,
          speed: 0,
          timestamp: now,
          routeId: bus.routeId,
          edgeId,
          heading: Math.round(heading),
        });
        continue;
      }

      // Clear dwell memory once bus moves away from all stops
      if (!nearestStopNodeId) {
        bus.lastDwellStopNodeId = null;
      }

      // ── Compute current speed ─────────────────────────────────────
      const baseSpeed = freeFlowSpeed(edgeId); // km/h
      let currentSpeed;

      if (congestionIsActive && edgeId === targetEdgeId) {
        // Congestion on target shared edge: 20–30% of normal speed
        const multiplier =
          CONGESTION_SPEED_MIN +
          Math.random() * (CONGESTION_SPEED_MAX - CONGESTION_SPEED_MIN);
        currentSpeed = baseSpeed * multiplier;
      } else {
        // Normal: freeFlowSpeed ± 15% variation
        const variation = 1 + (Math.random() * 2 - 1) * SPEED_VARIATION;
        currentSpeed = baseSpeed * variation;
      }

      // ── Advance position along the route ──────────────────────────
      const speedMs = (currentSpeed * 1000) / 3600;
      let distRemaining = speedMs * (TICK_MS / 1000); // meters to travel
      let maxTraversals = 10;

      while (distRemaining > 0 && maxTraversals > 0) {
        const curEdge = edges[bus.routeEdges[bus.currentEdgeIdx]];
        if (!curEdge || curEdge.distanceMeters <= 0) {
          bus.progressOnEdge = 0;
          break;
        }

        const distToEdgeEnd =
          (1 - bus.progressOnEdge) * curEdge.distanceMeters;

        if (distRemaining < distToEdgeEnd) {
          bus.progressOnEdge += distRemaining / curEdge.distanceMeters;
          distRemaining = 0;
        } else {
          distRemaining -= distToEdgeEnd;
          bus.currentEdgeIdx =
            (bus.currentEdgeIdx + 1) % bus.routeEdges.length;
          bus.progressOnEdge = 0;
        }
        maxTraversals--;
      }

      // Recompute position after advancement
      const curEdgeId = bus.routeEdges[bus.currentEdgeIdx];
      const curEdge = edges[curEdgeId];
      const cFrom = nodes[curEdge.fromNode];
      const cTo = nodes[curEdge.toNode];
      const newLat = cFrom.lat + (cTo.lat - cFrom.lat) * bus.progressOnEdge;
      const newLon = cFrom.lon + (cTo.lon - cFrom.lon) * bus.progressOnEdge;
      const newHeading = computeBearing(cFrom.lat, cFrom.lon, cTo.lat, cTo.lon);

      onPing({
        busId: bus.busId,
        lat: newLat,
        lon: newLon,
        speed: Math.round(currentSpeed * 10) / 10,
        timestamp: now,
        routeId: bus.routeId,
        edgeId: curEdgeId,
        heading: Math.round(newHeading),
      });
    }
  }

  // ── 7. Start the tick loop ────────────────────────────────────────
  const intervalId = setInterval(tick, TICK_MS);

  console.log(
    `\n[simulator] 🚀 Simulation started: ${buses.length} buses, ` +
    `tick every ${TICK_MS}ms`,
  );

  return function stopSimulation() {
    clearInterval(intervalId);
    console.log('[simulator] ⏹ Simulation stopped.');
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Standalone Test
//   node server/simulator/busSimulator.js
// ═══════════════════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  let pingCount = 0;

  const stop = await startSimulation((ping) => {
    pingCount++;
    if (pingCount % NUM_BUSES === 1) {
      console.log(
        `  📍 ${ping.busId} | edge: ${ping.edgeId} | ` +
        `(${ping.lat.toFixed(5)}, ${ping.lon.toFixed(5)}) | ` +
        `${ping.speed.toFixed(1)} km/h | route: ${ping.routeId}`,
      );
    }
  });

  setTimeout(() => {
    stop();
    console.log(`\n  Total pings emitted: ${pingCount}`);
    process.exit(0);
  }, 100_000);
}
