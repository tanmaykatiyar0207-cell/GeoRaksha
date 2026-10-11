/**
 * verifyGraph.js — Graph Verification Script for GeoRaksha
 *
 * Run directly to spot-check the parsed transit graph:
 *   node server/data/verifyGraph.js
 *
 * Prints:
 *   1. Total node count and edge count
 *   2. Lat/lon of 3 random nodes (for map spot-checking)
 *   3. Orphaned-node check (every node must appear in ≥1 edge)
 *   4. Connectivity stats: min/max/avg edges per node
 */

import { getGraph, freeFlowSpeed } from './roadGraph.js';

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function pickRandom(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function separator(title) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

// ═══════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       GeoRaksha — Graph Verification Report            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  let graph;
  try {
    graph = await getGraph();
  } catch (err) {
    console.error('\n❌  Failed to load graph:', err.message);
    console.error('\nMake sure your GTFS data folder exists and contains the');
    console.error('required .txt files.  Set the GTFS_PATH environment variable');
    console.error('or place them in <project root>/gtfs-data/.\n');
    process.exit(1);
  }

  const { nodes, edges, adjacency, stops } = graph;
  const nodeIds = Object.keys(nodes);
  const edgeIds = Object.keys(edges);

  // ── 1. Counts ─────────────────────────────────────────────────────
  separator('1. Graph Size');
  const stopNodeCount  = nodeIds.filter((id) => nodes[id].isStop).length;
  const shapeNodeCount = nodeIds.length - stopNodeCount;

  console.log(`  Total nodes : ${nodeIds.length}`);
  console.log(`    ├─ Stop nodes      : ${stopNodeCount}`);
  console.log(`    └─ Shape waypoints : ${shapeNodeCount}`);
  console.log(`  Total edges : ${edgeIds.length}`);
  console.log(`  Stops array : ${stops.length}`);

  if (nodeIds.length === 0) {
    console.warn('\n⚠  Graph is empty — nothing to verify.');
    console.warn('  Did you place GTFS data in the correct folder?');
    process.exit(0);
  }

  // ── 2. Random node samples ────────────────────────────────────────
  separator('2. Random Node Samples (check against a map)');
  const samples = pickRandom(nodeIds, 3);
  for (const id of samples) {
    const n = nodes[id];
    const type = n.isStop ? '🚏 stop' : '📍 shape';
    console.log(
      `  ${id}\n` +
      `    type : ${type}\n` +
      `    lat  : ${n.lat}\n` +
      `    lon  : ${n.lon}\n` +
      `    🔗 https://www.google.com/maps?q=${n.lat},${n.lon}`,
    );
  }

  // ── 3. Orphan check ───────────────────────────────────────────────
  separator('3. Orphaned Node Check');
  const referencedNodes = new Set();
  for (const edge of Object.values(edges)) {
    referencedNodes.add(edge.fromNode);
    referencedNodes.add(edge.toNode);
  }
  const orphans = nodeIds.filter((id) => !referencedNodes.has(id));

  if (orphans.length === 0) {
    console.log('  ✅  No orphaned nodes — every node appears in at least one edge.');
  } else {
    console.warn(`  ⚠  Found ${orphans.length} orphaned node(s):`);
    for (const id of orphans.slice(0, 10)) {
      const n = nodes[id];
      console.warn(`    • ${id}  (${n.lat}, ${n.lon})`);
    }
    if (orphans.length > 10) {
      console.warn(`    … and ${orphans.length - 10} more.`);
    }
  }

  // ── 4. Connectivity stats ─────────────────────────────────────────
  separator('4. Connectivity Statistics');
  const outDegrees = nodeIds.map((id) => (adjacency[id] || []).length);
  const minOut = Math.min(...outDegrees);
  const maxOut = Math.max(...outDegrees);
  const avgOut = (outDegrees.reduce((a, b) => a + b, 0) / outDegrees.length).toFixed(2);

  console.log(`  Outgoing edges per node:`);
  console.log(`    min : ${minOut}`);
  console.log(`    max : ${maxOut}`);
  console.log(`    avg : ${avgOut}`);

  // Distribution
  const degreeHist = {};
  for (const d of outDegrees) {
    degreeHist[d] = (degreeHist[d] || 0) + 1;
  }
  console.log(`  Degree distribution:`);
  for (const [deg, count] of Object.entries(degreeHist).sort((a, b) => +a[0] - +b[0])) {
    const bar = '█'.repeat(Math.min(count, 50));
    console.log(`    ${deg} edges : ${count} nodes  ${bar}`);
  }

  // ── 5. Edge distance & speed stats ────────────────────────────────
  separator('5. Edge Distance & Speed');
  const distances = Object.values(edges).map((e) => e.distanceMeters);
  const speeds    = Object.values(edges).map((e) => e.defaultSpeedKmh);

  const minDist = Math.min(...distances).toFixed(1);
  const maxDist = Math.max(...distances).toFixed(1);
  const avgDist = (distances.reduce((a, b) => a + b, 0) / distances.length).toFixed(1);

  const minSpd = Math.min(...speeds).toFixed(1);
  const maxSpd = Math.max(...speeds).toFixed(1);
  const avgSpd = (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1);

  const schedDerived = speeds.filter((s) => s !== 30).length;

  console.log(`  Distance (meters):`);
  console.log(`    min : ${minDist} m`);
  console.log(`    max : ${maxDist} m`);
  console.log(`    avg : ${avgDist} m`);
  console.log(`  Speed (km/h):`);
  console.log(`    min : ${minSpd}`);
  console.log(`    max : ${maxSpd}`);
  console.log(`    avg : ${avgSpd}`);
  console.log(`    Schedule-derived (non-default) : ${schedDerived} / ${edgeIds.length}`);

  // ── 6. freeFlowSpeed() sanity check ───────────────────────────────
  separator('6. freeFlowSpeed() Sanity Check');
  const sampleEdges = pickRandom(edgeIds, 3);
  for (const eid of sampleEdges) {
    const ffSpeed = freeFlowSpeed(eid);
    const expected = edges[eid].defaultSpeedKmh;
    const ok = ffSpeed === expected ? '✅' : '❌';
    console.log(`  ${ok}  freeFlowSpeed("${eid}") = ${ffSpeed} km/h  (expected ${expected})`);
  }
  // Unknown edge
  const unknownSpeed = freeFlowSpeed('edge_NONEXISTENT__FAKE');
  const ok2 = unknownSpeed === 30 ? '✅' : '❌';
  console.log(`  ${ok2}  freeFlowSpeed("unknown") = ${unknownSpeed} km/h  (expected 30)`);

  // ── Done ──────────────────────────────────────────────────────────
  separator('Verification Complete');
  console.log('  All checks finished. Review the output above.\n');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
