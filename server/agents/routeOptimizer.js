import { getGraph, getLocationName } from '../data/roadGraph.js';
import { sharedState, stateEvents, logAgentActivity } from '../sharedState.js';

class MinHeap {
  constructor() {
    this.heap = [];
  }
  push(node, weight) {
    this.heap.push({ node, weight });
    this._bubbleUp(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._sinkDown(0);
    }
    return top;
  }
  isEmpty() {
    return this.heap.length === 0;
  }
  _bubbleUp(n) {
    while (n > 0) {
      let p = Math.floor((n - 1) / 2);
      if (this.heap[p].weight <= this.heap[n].weight) break;
      const tmp = this.heap[p];
      this.heap[p] = this.heap[n];
      this.heap[n] = tmp;
      n = p;
    }
  }
  _sinkDown(n) {
    const length = this.heap.length;
    while (true) {
      let left = 2 * n + 1;
      let right = 2 * n + 2;
      let smallest = n;
      
      if (left < length && this.heap[left].weight < this.heap[smallest].weight) {
        smallest = left;
      }
      if (right < length && this.heap[right].weight < this.heap[smallest].weight) {
        smallest = right;
      }
      if (smallest === n) break;
      
      const tmp = this.heap[n];
      this.heap[n] = this.heap[smallest];
      this.heap[smallest] = tmp;
      n = smallest;
    }
  }
}

let graph = null;

// Exported for testing
export function __setGraphForTest(mockGraph) {
  graph = mockGraph;
}

export async function init() {
  graph = await getGraph();
  
  // Auto-recalculation on traffic changes — AUTONOMOUS DETECTION
  // When the Traffic Monitor Agent detects speed changes on segments,
  // this handler fires automatically without any human intervention.
  stateEvents.on('segments:changed', (edgeId) => {
    const active = sharedState.activeRoute;
    if (!active || !active.edgePath.includes(edgeId)) return;
    
    const segData = sharedState.segments[edgeId];
    const isAutonomous = segData?.status === 'congested' || segData?.status === 'slow';
    const isBlocked = segData?.status === 'blocked';
    
    // Log autonomous detection explicitly for the AI Agent Feed
    if (isAutonomous && !isBlocked) {
      const location = getLocationName(edgeId);
      logAgentActivity(
        'route',
        '🤖',
        `Autonomous Detection: ${location}`,
        `Route Optimizer autonomously detected speed anomaly on active corridor via Traffic Monitor telemetry. Initiating graph recalculation without human intervention.`,
        { edgeId, detectedSpeed: segData?.avgSpeed, trigger: 'autonomous' }
      );
    }
    
    // Determine ambulance's current position along active corridor
    const currentEdgeIdx = sharedState.ambulanceProgress?.currentEdgeIdx || 0;
    const bottleneckIdx = active.edgePath.indexOf(edgeId);

    // If ambulance has already driven past this bottleneck, skip rerouting
    if (currentEdgeIdx > bottleneckIdx && bottleneckIdx >= 0) {
      return;
    }

    // Determine divergence point: the next upcoming waypoint node
    const divergenceIdx = Math.min(currentEdgeIdx + 1, active.nodePath.length - 1);
    const divergenceNode = active.nodePath[divergenceIdx];
    const endNode = active.nodePath[active.nodePath.length - 1];

    const oldTime = active.totalTimeSeconds;

    // Compute optimal detour starting from the ambulance's forward node to the destination
    const detour = computeRoute(divergenceNode, endNode);
    if (!detour) return;

    // Splice traversed history with the newly computed forward detour
    const traversedNodes = active.nodePath.slice(0, divergenceIdx);
    const traversedEdges = active.edgePath.slice(0, divergenceIdx);
    const remainingOldEdges = active.edgePath.slice(divergenceIdx);

    const isPathChanged = JSON.stringify(remainingOldEdges) !== JSON.stringify(detour.edgePath);

    const combinedNodePath = [...traversedNodes, ...detour.nodePath];
    const combinedEdgePath = [...traversedEdges, ...detour.edgePath];
    const combinedCoordinates = combinedNodePath.map(nodeId => {
      const n = graph.nodes[nodeId];
      return [n.lon, n.lat];
    });

    const newRoute = {
      nodePath: combinedNodePath,
      edgePath: combinedEdgePath,
      totalTimeSeconds: Math.round(detour.totalTimeSeconds),
      geoJson: {
        type: "LineString",
        coordinates: combinedCoordinates
      }
    };

    // Calculate time saved: remaining old trajectory with congestion vs new detour
    let congestedOldRemaining = 0;
    for (const eid of remainingOldEdges) {
      const t = getEdgeTimeSeconds(eid);
      congestedOldRemaining += (t === Infinity) ? 300 : t; // blocked road penalty
    }
    const timeSavedNow = Math.round(congestedOldRemaining - detour.totalTimeSeconds);

    console.log(`\n[routeOptimizer] 🔄 Corridor updated via ${divergenceNode} due to ${isBlocked ? 'ROAD CLOSURE' : 'traffic'} on ${edgeId}`);
    console.log(`[routeOptimizer]    Old Remaining ETA: ${Math.round(oldTime)}s | Detour ETA: ${Math.round(newRoute.totalTimeSeconds)}s | Path Changed: ${isPathChanged ? 'YES' : 'NO'}`);

    sharedState.activeRoute = newRoute;
    stateEvents.emit('route:changed', newRoute);
    if (isPathChanged) stateEvents.emit('route:diverted', active);

    if (timeSavedNow > 0) {
      sharedState.timeSaved = Math.max(sharedState.timeSaved, timeSavedNow);
      stateEvents.emit('time_saved:changed');
    }

    if (isPathChanged) {
      sharedState.rerouteCount++;
    }

    const bottleneckLocation = getLocationName(edgeId);
    const timeDeltaStr = timeSavedNow > 0 ? `Saved ~${timeSavedNow}s` : `Optimal path maintained`;

    let title, desc;
    if (isBlocked) {
      title = `Road Closure Bypassed: ${bottleneckLocation}`;
      desc = `Impassable segment eliminated. Dijkstra MinHeap routed forward detour from ${getLocationName(divergenceNode)} (${timeDeltaStr}).`;
    } else {
      title = isPathChanged ? `Dynamic Reroute: Avoided ${bottleneckLocation}` : `Corridor Recalibrated: ${bottleneckLocation}`;
      desc = isPathChanged
        ? `Mid-transit detour locked from ${getLocationName(divergenceNode)}. Diverted around ${bottleneckLocation} bottleneck (${timeDeltaStr} vs gridlock).`
        : `Edge weights updated on ${bottleneckLocation}. Current trajectory remains optimal.`;
    }

    logAgentActivity(
      'route',
      isBlocked ? '🚧' : '🔄',
      title,
      desc,
      { bottleneck: bottleneckLocation, timeSavedSeconds: timeSavedNow, isPathChanged, isBlocked, divergenceNode }
    );
  });
}

export function getEdgeTimeSeconds(edgeId, penalties = {}) {
  const edge = graph.edges[edgeId];
  if (!edge) return Infinity;
  
  const dist = edge.distanceMeters;
  let speedKmh = edge.defaultSpeedKmh;
  
  const liveData = sharedState.segments[edgeId];

  // Blocked roads (construction/closure) are impassable
  if (liveData && liveData.status === 'blocked') {
    return Infinity;
  }

  if (liveData && liveData.avgSpeed > 0) {
    speedKmh = liveData.avgSpeed;
  }
  
  const speedMs = Math.max(0.1, speedKmh * (5 / 18));
  const baseTime = dist / speedMs;
  return baseTime * (penalties[edgeId] || 1.0);
}

export function computeRoute(startNodeId, endNodeId, penalties = {}) {
  if (!graph.nodes[startNodeId] || !graph.nodes[endNodeId]) {
    throw new Error('Start or end node not found in graph');
  }

  const dist = new Map();
  const prev = new Map();
  const pq = new MinHeap();
  
  dist.set(startNodeId, 0);
  pq.push(startNodeId, 0);
  
  while (!pq.isEmpty()) {
    const { node: u, weight: d } = pq.pop();
    
    if (d > dist.get(u)) continue;
    
    if (u === endNodeId) break;
    
    const edges = graph.adjacency[u] || [];
    for (const edgeId of edges) {
      const edge = graph.edges[edgeId];
      const v = edge.toNode;
      const weight = getEdgeTimeSeconds(edgeId, penalties);
      
      const newDist = d + weight;
      const currentDist = dist.has(v) ? dist.get(v) : Infinity;
      
      if (newDist < currentDist) {
        dist.set(v, newDist);
        prev.set(v, { prevNode: u, edgeId });
        pq.push(v, newDist);
      }
    }
  }
  
  if (!prev.has(endNodeId)) {
    return null;
  }
  
  const nodePath = [];
  const edgePath = [];
  let curr = endNodeId;
  
  while (curr !== startNodeId) {
    const step = prev.get(curr);
    nodePath.push(curr);
    edgePath.push(step.edgeId);
    curr = step.prevNode;
  }
  nodePath.push(startNodeId);
  
  nodePath.reverse();
  edgePath.reverse();
  
  const coordinates = nodePath.map(nodeId => {
    const n = graph.nodes[nodeId];
    return [n.lon, n.lat];
  });
  
  const geoJson = {
    type: "LineString",
    coordinates
  };
  
  return {
    nodePath,
    edgePath,
    totalTimeSeconds: dist.get(endNodeId),
    geoJson
  };
}

export function setActiveRoute(startNodeId, endNodeId, overrideRoute = null) {
  const route = overrideRoute || computeRoute(startNodeId, endNodeId);
  if (!route) {
    console.warn(`[routeOptimizer] ⚠ Unreachable route from ${startNodeId} to ${endNodeId}`);
    return null;
  }
  sharedState.activeRoute = route;
  stateEvents.emit('route:changed', route);
  console.log(`[routeOptimizer] 📍 Active route set: ${startNodeId} → ${endNodeId} (${route.totalTimeSeconds.toFixed(1)}s)`);

  const etaMins = (route.totalTimeSeconds / 60).toFixed(1);
  logAgentActivity(
    'route',
    '🗺️',
    'Emergency Corridor Activated',
    `Optimal trajectory locked (${route.edgePath.length} segments, estimated ${etaMins} mins via Dijkstra MinHeap).`,
    { totalTimeSeconds: route.totalTimeSeconds, segmentsCount: route.edgePath.length }
  );

  return route;
}

export function getAlternativeRoutes(startNodeId, endNodeId, count = 3) {
  const routes = [];
  const penalties = {};
  
  for (let i = 0; i < count; i++) {
    const route = computeRoute(startNodeId, endNodeId, penalties);
    if (!route) break;
    
    // Check if it's identical to an existing route (sometimes penalizing isn't enough)
    const isDuplicate = routes.some(r => r.edgePath.join('|') === route.edgePath.join('|'));
    
    if (!isDuplicate) {
      // Re-calculate pure ETA without the artificial penalties
      let pureEta = 0;
      for (const edgeId of route.edgePath) {
        pureEta += getEdgeTimeSeconds(edgeId, {});
      }
      route.totalTimeSeconds = pureEta;
      routes.push(route);
    }
    
    // Penalize the edges of this route heavily to force finding a different path
    // We add cumulative penalties, 1.5x multiplier per usage
    for (const edgeId of route.edgePath) {
      penalties[edgeId] = (penalties[edgeId] || 1.0) + 1.5;
    }
  }

  logAgentActivity(
    'route',
    '🔀',
    '3 Diverse Emergency Routes Computed',
    `Evaluated graph using penalty-based k-shortest paths (1.5x edge penalties). Fastest route: ${(routes[0]?.totalTimeSeconds / 60).toFixed(1)} mins.`
  );

  return routes;
}
