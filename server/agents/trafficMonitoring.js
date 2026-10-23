/**
 * trafficMonitoring.js — Traffic Monitoring Agent for GeoRaksha
 *
 * Processes raw GPS pings from buses, map-matches them to physical
 * road edges, maintains a rolling speed buffer per edge, classifies
 * congestion status, and emits state-change events.
 *
 * The agent does NOT use any internal simulator state — it works
 * entirely from { busId, lat, lon, speed, timestamp, routeId } pings,
 * exactly as it would with real GPS data from live buses.
 *
 * Exports:
 *   init()           — async; loads graph and pre-builds spatial index.
 *                      MUST be called (and awaited) before any processPing call.
 *   processPing(ping) — sync; handles one incoming bus ping.
 *
 * Usage:
 *   import { init, processPing } from './trafficMonitoring.js';
 *   await init();
 *   startSimulation(processPing);
 */

import { sharedState, stateEvents, logAgentActivity } from '../sharedState.js';
import { getGraph, freeFlowSpeed, getLocationName } from '../data/roadGraph.js';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import { point, lineString } from '@turf/helpers';

// ═══════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════
const MAX_MATCH_DISTANCE_M  = 50;    // reject map-match beyond this
const STOP_PROXIMITY_M      = 30;    // dwell filter: near a bus stop
const DWELL_SPEED_THRESHOLD = 2;     // dwell filter: speed in km/h
const BUFFER_SIZE           = 5;     // rolling readings per edge
const CLEAR_THRESHOLD       = 0.80;  // avgSpeed > 80% of freeFlow → clear
const SLOW_THRESHOLD        = 0.50;  // 50–80% → slow; <50% → congested

// Spatial grid cell size (~556 m per cell at this latitude)
const GRID_SIZE             = 0.005; // degrees

// ═══════════════════════════════════════════════════════════════════════
// Module State (populated by init())
// ═══════════════════════════════════════════════════════════════════════
let graphStops  = null;     // stops array from roadGraph
let edgeLines   = null;     // [{edgeId, line: GeoJSON, fromLat, fromLon, toLat, toLon}]
let edgeGrid    = null;     // Map<gridKey, number[]>  — grid cell → edge indices

// Counters for startup summary
let pingsProcessed  = 0;
let pingsRejected   = 0;
let pingsDwellSkip  = 0;

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

function gridKey(lat, lon) {
  return `${Math.floor(lat / GRID_SIZE)}_${Math.floor(lon / GRID_SIZE)}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Fast Map-Matching Utilities
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculates perpendicular distance (in meters) from point (pLat, pLon)
 * to line segment from (lat1, lon1) to (lat2, lon2).
 */
function distanceToSegmentMeters(pLat, pLon, lat1, lon1, lat2, lon2) {
  const dx = lon2 - lon1;
  const dy = lat2 - lat1;

  if (dx === 0 && dy === 0) {
    return haversineMeters(pLat, pLon, lat1, lon1);
  }

  // Projection parameter t along the segment [0, 1]
  let t = ((pLon - lon1) * dx + (pLat - lat1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  const projLat = lat1 + t * dy;
  const projLon = lon1 + t * dx;

  return haversineMeters(pLat, pLon, projLat, projLon);
}

// ═══════════════════════════════════════════════════════════════════════
// Initialization — must be awaited before any processPing call
// ═══════════════════════════════════════════════════════════════════════

export async function init() {
  const { nodes, edges, stops } = await getGraph();

  graphStops = stops;

  edgeLines = [];
  edgeGrid  = new Map();

  for (const [edgeId, edge] of Object.entries(edges)) {
    const from = nodes[edge.fromNode];
    const to   = nodes[edge.toNode];
    if (!from || !to) continue;

    const idx = edgeLines.length;
    edgeLines.push({
      edgeId,
      lat1: from.lat,
      lon1: from.lon,
      lat2: to.lat,
      lon2: to.lon,
      line: lineString([[from.lon, from.lat], [to.lon, to.lat]]),
    });

    // Register edge in grid cells
    const cells = new Set([
      gridKey(from.lat, from.lon),
      gridKey(to.lat, to.lon),
      gridKey((from.lat + to.lat) / 2, (from.lon + to.lon) / 2),
    ]);

    for (const cell of cells) {
      if (!edgeGrid.has(cell)) edgeGrid.set(cell, []);
      edgeGrid.get(cell).push(idx);
    }
  }

  console.log(
    `[trafficMon] ✔ Initialized — ${edgeLines.length} edge geometries ` +
    `indexed across ${edgeGrid.size} spatial grid cells`,
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Core: processPing
// ═══════════════════════════════════════════════════════════════════════

/**
 * Process a single bus telemetry ping.
 *
 * @param {{ busId: string, lat: number, lon: number, speed: number,
 *           timestamp: number, routeId: string }} ping
 */
export function processPing(ping) {
  const { busId, lat, lon, speed, timestamp } = ping;

  // ── Step 1: Dwell-time filter ─────────────────────────────────────
  if (speed < DWELL_SPEED_THRESHOLD) {
    for (const stop of graphStops) {
      if (haversineMeters(lat, lon, stop.lat, stop.lon) < STOP_PROXIMITY_M) {
        pingsDwellSkip++;
        if (pingsDwellSkip % 10 === 1) {
          logAgentActivity(
            'traffic',
            '🚏',
            'Bus Stop Dwell Filtered',
            `BMTC #${busId} stationary at ${stop.name || 'stop'} (${speed} km/h). Filtered to prevent false congestion alarm.`
          );
        }
        return;
      }
    }
  }

  // ── Step 2: Map-match to nearest edge ─────────────────────────────
  const baseLat = Math.floor(lat / GRID_SIZE);
  const baseLon = Math.floor(lon / GRID_SIZE);
  const candidateSet = new Set();

  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLon = -1; dLon <= 1; dLon++) {
      const cell = edgeGrid.get(`${baseLat + dLat}_${baseLon + dLon}`);
      if (cell) for (const idx of cell) candidateSet.add(idx);
    }
  }

  let bestIdx  = -1;
  let bestDist = Infinity; // metres

  // Fast path: grid-based candidates
  for (const idx of candidateSet) {
    const e = edgeLines[idx];
    const distM = distanceToSegmentMeters(lat, lon, e.lat1, e.lon1, e.lat2, e.lon2);
    if (distM < bestDist) {
      bestDist = distM;
      bestIdx  = idx;
    }
  }

  // Fallback if candidateSet empty
  if (candidateSet.size === 0) {
    for (let i = 0; i < edgeLines.length; i++) {
      const e = edgeLines[i];
      const distM = distanceToSegmentMeters(lat, lon, e.lat1, e.lon1, e.lat2, e.lon2);
      if (distM < bestDist) {
        bestDist = distM;
        bestIdx  = i;
      }
    }
  }

  if (bestIdx === -1 || bestDist > MAX_MATCH_DISTANCE_M) {
    pingsRejected++;
    if (pingsRejected <= 20 && !busId.startsWith('ambient_bus')) {
      // Log first 20 rejects to avoid flooding; after that, suppress.
      console.warn(
        `[trafficMon] ⚠ Ping rejected — ${busId} at ` +
        `(${lat.toFixed(5)}, ${lon.toFixed(5)}): nearest edge ` +
        `${bestDist === Infinity ? '∞' : bestDist.toFixed(0)}m away ` +
        `(>${MAX_MATCH_DISTANCE_M}m threshold)`,
      );
    }
    return;
  }

  const matchedEdgeId = edgeLines[bestIdx].edgeId;
  pingsProcessed++;

  if (pingsProcessed % 25 === 1) {
    const cleanEdge = matchedEdgeId.replace('edge_', '').replace('__waypoint_', ' → ');
    logAgentActivity(
      'traffic',
      '📡',
      'Floating Probe Telemetry Ingested',
      `BMTC #${busId} recorded at ${speed.toFixed(1)} km/h on corridor segment ${cleanEdge}.`
    );
  }

  // ── Step 3: Push reading into rolling buffer ──────────────────────
  if (!sharedState.segments[matchedEdgeId]) {
    sharedState.segments[matchedEdgeId] = {
      readings: [],
      avgSpeed: 0,
      status:   null,
    };
  }

  const seg = sharedState.segments[matchedEdgeId];

  seg.readings.push({ speed, timestamp, busId });
  if (seg.readings.length > BUFFER_SIZE) {
    seg.readings.shift();
  }

  // ── Step 4: Compute average speed from buffer ─────────────────────
  const avgSpeed =
    seg.readings.reduce((sum, r) => sum + r.speed, 0) / seg.readings.length;

  // ── Step 5: Classify status ───────────────────────────────────────
  const freeFlow = freeFlowSpeed(matchedEdgeId);
  const ratio    = freeFlow > 0 ? avgSpeed / freeFlow : 1;

  let status;
  if (ratio > CLEAR_THRESHOLD) {
    status = 'clear';
  } else if (ratio >= SLOW_THRESHOLD) {
    status = 'slow';
  } else {
    status = 'congested';
  }

  // ── Step 6: Update sharedState; emit only on status change ────────
  const oldStatus = seg.status;
  seg.avgSpeed = Math.round(avgSpeed * 10) / 10;

  if (status !== oldStatus) {
    seg.status = status;
    stateEvents.emit('segments:changed', matchedEdgeId);

    // ── Step 7: Log status transition with distinct-bus count ────────
    const distinctBuses = new Set(seg.readings.map((r) => r.busId)).size;
    const speedRatioPct = Math.round(ratio * 100);
    const speedDropPct = 100 - speedRatioPct;
    const locationName = getLocationName(matchedEdgeId);
    const confidencePct = Math.min(99, Math.round(70 + distinctBuses * 6));

    console.log(
      `[trafficMon] 🔄 ${matchedEdgeId}: ` +
      `${oldStatus ?? 'none'} → ${status} | ` +
      `avg ${seg.avgSpeed} km/h vs freeFlow ${freeFlow} km/h ` +
      `(${speedRatioPct}%) | ` +
      `${distinctBuses} distinct bus${distinctBuses > 1 ? 'es' : ''}`,
    );

    const icon = status === 'congested' ? '🚨' : status === 'slow' ? '⚠️' : '🟢';
    const statusText = status === 'congested' ? `Severe Bottleneck: ${locationName}` : status === 'slow' ? `Traffic Slowdown: ${locationName}` : `Corridor Flow Restored: ${locationName}`;
    const descText = status === 'congested'
      ? `${locationName} dropped to ${seg.avgSpeed} km/h (-${speedDropPct}% vs ${freeFlow} km/h baseline). Confirmed across ${distinctBuses} BMTC bus probes (Confidence: ${confidencePct}%).`
      : status === 'slow'
      ? `${locationName} running at ${seg.avgSpeed} km/h (-${speedDropPct}%). Mild congestion detected across ${distinctBuses} bus streams.`
      : `${locationName} recovered to ${seg.avgSpeed} km/h free-flow speed. All emergency priority queues cleared.`;

    logAgentActivity(
      'traffic',
      icon,
      statusText,
      descText,
      { segmentId: matchedEdgeId, location: locationName, status, avgSpeed: seg.avgSpeed, freeFlowSpeed: freeFlow, distinctBuses, confidence: `${confidencePct}%` }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Diagnostic: periodic summary (useful during long runs)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returns a snapshot of processing stats.  Called by server.js for
 * periodic logging or health-check endpoints.
 */
export function getStats() {
  const segmentCount = Object.keys(sharedState.segments).length;
  const congested = Object.values(sharedState.segments).filter(
    (s) => s.status === 'congested',
  ).length;
  const slow = Object.values(sharedState.segments).filter(
    (s) => s.status === 'slow',
  ).length;

  return {
    pingsProcessed,
    pingsRejected,
    pingsDwellSkip,
    segmentsTracked: segmentCount,
    segmentsCongested: congested,
    segmentsSlow: slow,
  };
}
