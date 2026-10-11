import assert from 'node:assert';
import { init, processPing, getStats } from '../agents/trafficMonitoring.js';
import { sharedState, stateEvents } from '../sharedState.js';
import { getGraph, freeFlowSpeed } from '../data/roadGraph.js';
import { startSimulation } from '../simulator/busSimulator.js';

let graph;
let testEdgeId;
let testLat, testLon;
let freeFlow;

async function runTests() {
  try {
    console.log("Initializing traffic monitoring...");
    await init();
    graph = await getGraph();
    
    testEdgeId = Object.keys(graph.edges).find(id => id.startsWith('edge_waypoint_') && id.includes('__waypoint_')) 
               || Object.keys(graph.edges).find(id => id.includes('waypoint'));
    const edge = graph.edges[testEdgeId];
    const fromNode = graph.nodes[edge.fromNode];
    const toNode = graph.nodes[edge.toNode];
    
    testLat = (fromNode.lat + toNode.lat) / 2;
    testLon = (fromNode.lon + toNode.lon) / 2;
    freeFlow = freeFlowSpeed(testEdgeId);
    
    console.log(`\nUsing test edge: ${testEdgeId} (freeFlow: ${freeFlow} km/h)`);
    
    test1_RollingBufferCap();
    test2_DistinctBusCount();
    test3_ThresholdBoundaryCorrectness();
    test4_FirstClassificationEmits();
    test5_MapMatchRejection();
    test6_DwellFilter();
    test7_EventEmissionDeduplication();
    
    await test8_LiveSimulatorIntegration();
    
    console.log("\n✅ ALL 8 TESTS PASSED");
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

let pingTimestamp = 100000;
function sendPing(busId, speed) {
  pingTimestamp += 1000;
  processPing({
    busId,
    lat: testLat,
    lon: testLon,
    speed,
    timestamp: pingTimestamp,
    routeId: 'TEST-ROUTE'
  });
  return pingTimestamp;
}

function test1_RollingBufferCap() {
  console.log("\n▶ Running Test 1 — Rolling buffer cap");
  delete sharedState.segments[testEdgeId]; // Reset
  
  for (let i = 1; i <= 10; i++) sendPing('bus-test1', freeFlow);
  
  const seg = sharedState.segments[testEdgeId];
  assert.ok(seg, "Segment state should exist");
  assert.strictEqual(seg.readings.length, 5, "Buffer length should be exactly capped at 5");
  
  const timestamps = seg.readings.map(r => r.timestamp);
  assert.strictEqual(timestamps[0], pingTimestamp - 4000, "Oldest reading should be 4 pings ago");
  assert.strictEqual(timestamps[4], pingTimestamp, "Newest reading should be the most recent ping");
  console.log("  PASS");
}

function test2_DistinctBusCount() {
  console.log("\n▶ Running Test 2 — Distinct bus count accuracy");
  delete sharedState.segments[testEdgeId]; // Reset
  
  // Call processPing() 5 separate times directly, properly testing the real path
  sendPing('bus-A', freeFlow);
  sendPing('bus-A', freeFlow);
  sendPing('bus-A', freeFlow);
  sendPing('bus-B', freeFlow);
  sendPing('bus-C', freeFlow);
  
  const seg = sharedState.segments[testEdgeId];
  const distinctCount = new Set(seg.readings.map(r => r.busId)).size;
  assert.strictEqual(distinctCount, 3, "Buffer should contain exactly 3 unique busIds");
  
  // Force a transition by dropping speed naturally, so the log prints
  const originalLog = console.log;
  let transitionLog = "";
  console.log = (msg) => {
    if (typeof msg === 'string' && msg.includes('[trafficMon] 🔄')) transitionLog = msg;
  };
  
  sendPing('bus-A', freeFlow * 0.1); // Avg drops to 82% (clear)
  sendPing('bus-B', freeFlow * 0.1); // Avg drops to 64% (slow) -> TRANSITION
  sendPing('bus-C', freeFlow * 0.1); // Avg drops to 46% (congested) -> TRANSITION
  
  console.log = originalLog;
  assert.ok(transitionLog.includes('3 distinct buses'), `Log should report '3 distinct buses', but got: ${transitionLog}`);
  console.log("  PASS");
}

function test3_ThresholdBoundaryCorrectness() {
  console.log("\n▶ Running Test 3 — Threshold boundary correctness");
  delete sharedState.segments[testEdgeId]; // Reset
  
  for (let i = 0; i < 5; i++) sendPing('bus-test3', freeFlow * 0.80);
  assert.strictEqual(sharedState.segments[testEdgeId].status, 'slow', "Exactly 80% should be 'slow'");
  
  for (let i = 0; i < 5; i++) sendPing('bus-test3', freeFlow * 0.50);
  assert.strictEqual(sharedState.segments[testEdgeId].status, 'slow', "Exactly 50% should be 'slow'");
  
  for (let i = 0; i < 5; i++) sendPing('bus-test3', freeFlow * 0.49);
  assert.strictEqual(sharedState.segments[testEdgeId].status, 'congested', "49% should be 'congested'");
  
  for (let i = 0; i < 5; i++) sendPing('bus-test3', freeFlow * 0.81);
  assert.strictEqual(sharedState.segments[testEdgeId].status, 'clear', "81% should be 'clear'");
  console.log("  PASS");
}

function test4_FirstClassificationEmits() {
  console.log("\n▶ Running Test 4 — First classification emits correctly");
  const freshEdgeId = Object.keys(graph.edges).reverse().find(id => id.includes('waypoint') && id !== testEdgeId);
  delete sharedState.segments[freshEdgeId]; // Reset
  
  const edge = graph.edges[freshEdgeId];
  const fromNode = graph.nodes[edge.fromNode];
  const toNode = graph.nodes[edge.toNode];
  
  const midLat = (fromNode.lat + toNode.lat) / 2;
  const midLon = (fromNode.lon + toNode.lon) / 2;
  
  let emittedEdgeId = null;
  const listener = (edgeId) => { emittedEdgeId = edgeId; };
  stateEvents.on('segments:changed', listener);
  
  const originalLog = console.log;
  console.log = () => {}; 
  
  processPing({
    busId: 'bus-test4',
    lat: midLat,
    lon: midLon,
    speed: freeFlowSpeed(freshEdgeId),
    timestamp: pingTimestamp + 1000,
    routeId: 'TEST'
  });
  
  console.log = originalLog;
  stateEvents.off('segments:changed', listener);
  
  assert.ok(sharedState.segments[freshEdgeId], `State should be initialized for ${freshEdgeId}`);
  assert.strictEqual(emittedEdgeId, freshEdgeId, "First classification should emit 'segments:changed' event");
  console.log("  PASS");
}

function test5_MapMatchRejection() {
  console.log("\n▶ Running Test 5 — Map-match rejection (>50m)");
  const s1 = getStats();
  
  // Guaranteed >50m away (outside Bengaluru transit grid)
  processPing({ busId: 'bus-test5', lat: 12.0, lon: 75.0, speed: freeFlow, timestamp: pingTimestamp++, routeId: 'T' });
  const s2 = getStats();
  assert.strictEqual(s2.pingsRejected, s1.pingsRejected + 1, "Ping >50m should be rejected");
  assert.strictEqual(s2.pingsProcessed, s1.pingsProcessed, "Rejected ping should not be processed");
  
  // Directly on test edge (<50m)
  processPing({ busId: 'bus-test5', lat: testLat, lon: testLon, speed: freeFlow, timestamp: pingTimestamp++, routeId: 'T' });
  const s3 = getStats();
  assert.strictEqual(s3.pingsProcessed, s2.pingsProcessed + 1, "Ping <50m should be processed");
  console.log("  PASS");
}

function test6_DwellFilter() {
  console.log("\n▶ Running Test 6 — Dwell filter");
  const stop = graph.stops[0];
  const s1 = getStats();
  
  processPing({ busId: 'bus-test6', lat: stop.lat, lon: stop.lon, speed: 1, timestamp: pingTimestamp++, routeId: 'T' });
  const s2 = getStats();
  assert.strictEqual(s2.pingsDwellSkip, s1.pingsDwellSkip + 1, "Slow ping near stop should be dwell-skipped");
  
  processPing({ busId: 'bus-test6', lat: stop.lat, lon: stop.lon, speed: 5, timestamp: pingTimestamp++, routeId: 'T' });
  const s3 = getStats();
  assert.strictEqual(s3.pingsDwellSkip, s2.pingsDwellSkip, "Fast ping near stop should NOT be dwell-skipped");
  assert.strictEqual(s3.pingsProcessed, s2.pingsProcessed + 1, "Fast ping near stop should be processed");
  
  processPing({ busId: 'bus-test6', lat: testLat, lon: testLon, speed: 1, timestamp: pingTimestamp++, routeId: 'T' });
  const s4 = getStats();
  assert.strictEqual(s4.pingsDwellSkip, s3.pingsDwellSkip, "Slow ping FAR from stop should NOT be dwell-skipped");
  assert.strictEqual(s4.pingsProcessed, s3.pingsProcessed + 1, "Slow ping FAR from stop should be processed");
  console.log("  PASS");
}

function test7_EventEmissionDeduplication() {
  console.log("\n▶ Running Test 7 — Event emission deduplication");
  delete sharedState.segments[testEdgeId]; // Reset
  
  let emitCount = 0;
  const listener = (edgeId) => { if (edgeId === testEdgeId) emitCount++; };
  stateEvents.on('segments:changed', listener);
  
  for (let i = 0; i < 5; i++) sendPing('bus-test7', freeFlow);
  
  stateEvents.off('segments:changed', listener);
  assert.strictEqual(emitCount, 1, "Should emit 'segments:changed' exactly once for 5 identical statuses");
  console.log("  PASS");
}

async function test8_LiveSimulatorIntegration() {
  console.log("\n▶ Running Test 8 — Live Simulator Integration (waiting up to ~160s for scripted congestion...)");
  
  // We can suppress logs to keep the test output clean
  const originalLog = console.log;
  console.log = () => {}; 
  
  return new Promise(async (resolve, reject) => {
    let targetEdgeId = null;
    let success = false;
    
    const listener = (edgeId) => {
      const seg = sharedState.segments[edgeId];
      if (seg && seg.status === 'congested') {
        const distinctBuses = new Set(seg.readings.map(r => r.busId)).size;
        if (distinctBuses >= 3) {
          targetEdgeId = edgeId;
          success = true;
        }
      }
    };
    stateEvents.on('segments:changed', listener);
    
    const stopSim = await startSimulation(processPing);
    
    const timeout = setTimeout(() => {
      stopSim();
      stateEvents.off('segments:changed', listener);
      console.log = originalLog;
      reject(new Error("Timeout: Integration test failed to reach congested state with 3+ distinct buses within 160s"));
    }, 160_000);
    
    const checkInterval = setInterval(() => {
      if (success) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        stopSim();
        stateEvents.off('segments:changed', listener);
        
        console.log = originalLog;
        console.log(`  Live Simulation detected Target Edge '${targetEdgeId}' reached congested state with 3+ distinct buses.`);
        console.log("  PASS");
        resolve();
      }
    }, 1000);
  });
}

runTests();
