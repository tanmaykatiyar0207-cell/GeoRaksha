import assert from 'assert';
import { __setGraphForTest, computeRoute } from '../agents/routeOptimizer.js';
import { sharedState } from '../sharedState.js';

console.log("Initializing routeOptimizer mock tests...");

// Small mock graph for testing
// A -10s-> B -10s-> C (Fastest path when clear: 20s)
// A ----25s------> C (Alternate path: 25s)
// B --10s--> D --10s--> C (Another path)
const mockGraph = {
  nodes: {
    'A': { lat: 12.0, lon: 77.0, isStop: true },
    'B': { lat: 12.1, lon: 77.1, isStop: false },
    'C': { lat: 12.2, lon: 77.2, isStop: true },
    'D': { lat: 12.15, lon: 77.15, isStop: false }
  },
  edges: {
    'edge_A__B': { fromNode: 'A', toNode: 'B', distanceMeters: 100, defaultSpeedKmh: 36 }, // 100m at 10m/s = 10s
    'edge_B__C': { fromNode: 'B', toNode: 'C', distanceMeters: 100, defaultSpeedKmh: 36 }, // 100m at 10m/s = 10s
    'edge_A__C': { fromNode: 'A', toNode: 'C', distanceMeters: 250, defaultSpeedKmh: 36 }, // 250m at 10m/s = 25s
    'edge_B__D': { fromNode: 'B', toNode: 'D', distanceMeters: 100, defaultSpeedKmh: 36 }, // 10s
    'edge_D__C': { fromNode: 'D', toNode: 'C', distanceMeters: 100, defaultSpeedKmh: 36 }, // 10s
  },
  adjacency: {
    'A': ['edge_A__B', 'edge_A__C'],
    'B': ['edge_B__C', 'edge_B__D'],
    'D': ['edge_D__C'],
    'C': []
  }
};

__setGraphForTest(mockGraph);

function runTests() {
  let passed = 0;
  
  try {
    console.log("\n▶ Running Test 1 — Shortest path on clear graph (Dijkstra Min-Heap)");
    // Clear state
    sharedState.segments = {}; 
    const route1 = computeRoute('A', 'C');
    assert.deepStrictEqual(route1.nodePath, ['A', 'B', 'C'], "Node path should be A -> B -> C");
    assert.deepStrictEqual(route1.edgePath, ['edge_A__B', 'edge_B__C'], "Edge path should match");
    assert.strictEqual(route1.totalTimeSeconds, 20, "Total time should be 20 seconds");
    console.log("  PASS");
    passed++;
    
    console.log("\n▶ Running Test 2 — Dynamic weighting (avoid congested edge)");
    // Congest edge_B__C so it takes 40s instead of 10s (speed drops from 36km/h to 9km/h)
    sharedState.segments['edge_B__C'] = {
      avgSpeed: 9, // 9km/h = 2.5m/s. 100m / 2.5m/s = 40s.
      status: 'congested'
    };
    
    // Now A->B->C takes 10 + 40 = 50s.
    // A->B->D->C takes 10 + 10 + 10 = 30s.
    // A->C takes 25s.
    // Dijkstra will pick A->C which takes 25s.
    const route2 = computeRoute('A', 'C');
    assert.deepStrictEqual(route2.nodePath, ['A', 'C'], "Node path should switch to A -> C");
    assert.strictEqual(route2.totalTimeSeconds, 25, "Total time should be 25 seconds");
    console.log("  PASS");
    passed++;
    
    console.log(`\n✅ ALL ${passed} TESTS PASSED`);
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ TEST FAILED: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

runTests();
