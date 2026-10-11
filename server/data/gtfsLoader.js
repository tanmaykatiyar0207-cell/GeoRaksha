/**
 * gtfsLoader.js — GTFS Parser & Graph Builder for GeoRaksha
 *
 * Reads real BMTC GTFS transit data (CSV files) and builds a routable
 * directed graph scoped to the Whitefield ↔ Marathahalli zone in Bengaluru.
 *
 * Graph nodes come from two sources:
 *   1. Bus stops (isStop: true)
 *   2. Shape waypoints — zone-filtered then Douglas–Peucker simplified (isStop: false)
 *
 * Edge speeds use schedule-derived averages where stop_times data allows,
 * falling back to 30 km/h (urban arterial default) otherwise.
 *
 * Uses csv-parser for GTFS file parsing — no native addons required.
 * Uses @turf/simplify for polyline simplification.
 *
 * Usage:
 *   import { parseGTFS } from './gtfsLoader.js';
 *   const graph = await parseGTFS('./path/to/gtfs-folder');
 */

import fs from 'node:fs';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import csvParser from 'csv-parser';
import turfSimplify from '@turf/simplify';
import { lineString } from '@turf/helpers';

// ═══════════════════════════════════════════════════════════════════════
// Zone Configuration — Whitefield ↔ Marathahalli, Bengaluru
// ═══════════════════════════════════════════════════════════════════════
export const ZONE_BOUNDS = Object.freeze({
  minLat: 12.800,
  maxLat: 13.150,
  minLon: 77.450,
  maxLon: 77.780,
  label: 'Greater Bengaluru Complete',
});

// ═══════════════════════════════════════════════════════════════════════
// Tuning Constants
// ═══════════════════════════════════════════════════════════════════════
const SNAP_DISTANCE_METERS = 25;    // shape pts closer than this to a stop → snap
const DEFAULT_SPEED_KMH    = 30;    // urban arterial fallback
const MIN_SPEED_KMH        = 5;     // reject implausibly slow schedule data
const MAX_SPEED_KMH        = 60;    // reject implausibly fast schedule data
const MIN_EDGE_METERS      = 0.5;   // drop near-zero-length edges
const MAX_EDGE_METERS      = 2500;  // sanity cap — consecutive shape pts on a bus route
                                    // can be up to ~2.5km apart in coarse BMTC GTFS data;
                                    // anything beyond this is structurally wrong data
const ZONE_BUFFER_DEG      = 0.008; // ≈890m buffer outside zone bounds for shape clipping
//
// Simplification tolerance: 25m expressed in degrees.
//   25m / 111_320 m·deg⁻¹ ≈ 0.000225°
// After this step, no two retained shape-waypoint nodes will be within
// ~25m of each other, cutting waypoint count by 80–95%.
const SIMPLIFY_TOLERANCE_DEG = 0.000225;

// ═══════════════════════════════════════════════════════════════════════
// CSV Parsing
// ═══════════════════════════════════════════════════════════════════════

/**
 * Read and parse a GTFS .txt (CSV) file.  Returns an array of row objects.
 * If the file does not exist, returns an empty array with a warning.
 *
 * @param {string} filePath — Absolute path to the .txt file
 * @returns {Promise<Object[]>}
 */
function readGtfsCsv(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`[gtfsLoader] File not found (skipping): ${filePath}`);
      resolve([]);
      return;
    }
    const rows = [];
    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Haversine distance between two geographic points.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in meters
 */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Check whether a lat/lon point falls inside the zone bounding box. */
function isInZone(lat, lon) {
  return (
    lat >= ZONE_BOUNDS.minLat &&
    lat <= ZONE_BOUNDS.maxLat &&
    lon >= ZONE_BOUNDS.minLon &&
    lon <= ZONE_BOUNDS.maxLon
  );
}

/** Check whether a lat/lon point is within the zone + buffer (for shape clipping). */
function isInZoneOrBuffer(lat, lon) {
  return (
    lat >= ZONE_BOUNDS.minLat - ZONE_BUFFER_DEG &&
    lat <= ZONE_BOUNDS.maxLat + ZONE_BUFFER_DEG &&
    lon >= ZONE_BOUNDS.minLon - ZONE_BUFFER_DEG &&
    lon <= ZONE_BOUNDS.maxLon + ZONE_BUFFER_DEG
  );
}

/**
 * Parse a GTFS time string to total seconds since midnight.
 * GTFS times can legally exceed "24:00:00" for overnight trips.
 * @param {string} timeStr — e.g. "08:15:00" or "25:30:00"
 * @returns {number|null} seconds, or null if unparseable
 */
function parseGtfsTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length !== 3) return null;
  const [h, m, s] = parts.map(Number);
  if ([h, m, s].some(Number.isNaN)) return null;
  return h * 3600 + m * 60 + s;
}

/**
 * Among zoneStops, find the one closest to (lat, lon) if within SNAP_DISTANCE_METERS.
 * @returns {string|null} nodeId of the matched stop, or null
 */
function snapToStop(lat, lon, zoneStops, stopNodeMap) {
  let best = SNAP_DISTANCE_METERS;
  let bestId = null;
  for (const stop of zoneStops) {
    const d = haversineMeters(lat, lon, stop.lat, stop.lon);
    if (d < best) {
      best = d;
      bestId = stopNodeMap[stop.stopId];
    }
  }
  return bestId;
}

/**
 * Apply Douglas–Peucker simplification to an array of {lat, lon} points.
 * Returns a new (shorter) array of {lat, lon} points.
 * If the input has fewer than 3 points, returns it as-is (nothing to simplify).
 *
 * @param {Array<{lat: number, lon: number}>} pts
 * @returns {Array<{lat: number, lon: number}>}
 */
function simplifyPolyline(pts) {
  if (pts.length < 3) return pts;

  // Turf uses GeoJSON [lon, lat] coordinate order.
  const coords = pts.map((p) => [p.lon, p.lat]);
  const line   = lineString(coords);

  const simplified = turfSimplify(line, {
    tolerance:   SIMPLIFY_TOLERANCE_DEG,
    highQuality: true,   // Visvalingam–Whyatt — better shape preservation
    mutate:      false,
  });

  return simplified.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
}

// ═══════════════════════════════════════════════════════════════════════
// Internal: direct stop-to-stop edges (fallback when no usable shape)
// ═══════════════════════════════════════════════════════════════════════

function buildStopOnlyEdges(inZoneSTs, stopNodeMap, nodes, edges, adjacency) {
  const sorted = [...inZoneSTs].sort((a, b) => a.stop_sequence - b.stop_sequence);
  for (let i = 0; i < sorted.length - 1; i++) {
    const fromId = stopNodeMap[sorted[i].stop_id];
    const toId   = stopNodeMap[sorted[i + 1].stop_id];
    if (!fromId || !toId || fromId === toId) continue;

    const edgeId = `edge_${fromId}__${toId}`;
    if (edges[edgeId]) continue;

    const f    = nodes[fromId];
    const t    = nodes[toId];
    const dist = haversineMeters(f.lat, f.lon, t.lat, t.lon);
    if (dist < MIN_EDGE_METERS) continue;

    // Log and skip stop-to-stop edges that are unrealistically long
    if (dist > MAX_EDGE_METERS) {
      console.warn(
        `[gtfsLoader] Long stop-only edge skipped: ${fromId} → ${toId}, ` +
        `dist=${dist.toFixed(0)}m`,
      );
      continue;
    }

    let speed = DEFAULT_SPEED_KMH;
    const dep = parseGtfsTime(sorted[i].departure_time);
    const arr = parseGtfsTime(sorted[i + 1].arrival_time);
    if (dep !== null && arr !== null && arr - dep > 0 && dist > 0) {
      const raw = (dist / 1000) / ((arr - dep) / 3600);
      speed = Math.max(MIN_SPEED_KMH, Math.min(MAX_SPEED_KMH, raw));
    }

    edges[edgeId] = {
      fromNode: fromId,
      toNode: toId,
      distanceMeters: Math.round(dist * 100) / 100,
      defaultSpeedKmh: Math.round(speed * 10) / 10,
    };
    if (!adjacency[fromId]) adjacency[fromId] = [];
    adjacency[fromId].push(edgeId);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parse GTFS data from disk and return a routable graph for the zone.
 *
 * @param {string} gtfsFolderPath — Path to the unzipped GTFS directory
 *   (must contain routes.txt, stops.txt, trips.txt, stop_times.txt, shapes.txt)
 *
 * @returns {Promise<{
 *   nodes: Object.<string, {lat: number, lon: number, isStop: boolean}>,
 *   edges: Object.<string, {fromNode: string, toNode: string, distanceMeters: number, defaultSpeedKmh: number}>,
 *   adjacency: Object.<string, string[]>,
 *   stops: Array<{stopId: string, nodeId: string, lat: number, lon: number}>
 * }>}
 */
export async function parseGTFS(gtfsFolderPath) {
  // ── Validate input ──────────────────────────────────────────────────
  const resolved = path.resolve(gtfsFolderPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `GTFS folder not found: ${resolved}\n` +
      `Place your BMTC GTFS .txt files (routes.txt, stops.txt, trips.txt, ` +
      `stop_times.txt, shapes.txt) inside that directory.`,
    );
  }

  console.log(`[gtfsLoader] Importing GTFS data from: ${resolved}`);
  console.log(
    `[gtfsLoader] Zone: ${ZONE_BOUNDS.label} ` +
    `(${ZONE_BOUNDS.minLat}–${ZONE_BOUNDS.maxLat}°N, ` +
    `${ZONE_BOUNDS.minLon}–${ZONE_BOUNDS.maxLon}°E)`,
  );
  console.log(
    `[gtfsLoader] Simplification tolerance: ${SIMPLIFY_TOLERANCE_DEG}° ≈ 25m | ` +
    `Max edge: ${MAX_EDGE_METERS}m | Zone buffer: ${ZONE_BUFFER_DEG}° ≈ 890m`,
  );

  // ── Step 1: Read all GTFS CSV files ────────────────────────────────
  console.log('[gtfsLoader] Reading GTFS CSV files…');
  const [rawStops, , rawTrips, rawStopTimes, rawShapes] =
    await Promise.all([
      readGtfsCsv(path.join(resolved, 'stops.txt')),
      readGtfsCsv(path.join(resolved, 'routes.txt')),
      readGtfsCsv(path.join(resolved, 'trips.txt')),
      readGtfsCsv(path.join(resolved, 'stop_times.txt')),
      readGtfsCsv(path.join(resolved, 'shapes.txt')),
    ]);

  console.log(
    `[gtfsLoader] Raw file counts — stops: ${rawStops.length}, ` +
    `trips: ${rawTrips.length}, ` +
    `stop_times: ${rawStopTimes.length}, shapes: ${rawShapes.length}`,
  );

  // ── Step 2: Parse stops, filter to zone ────────────────────────────
  const allStops = rawStops.map((r) => ({
    stopId: r.stop_id,
    lat: parseFloat(r.stop_lat),
    lon: parseFloat(r.stop_lon),
    name: r.stop_name || '',
  }));
  const zoneStops   = allStops.filter((s) => isInZone(s.lat, s.lon));
  const zoneStopIds = new Set(zoneStops.map((s) => s.stopId));

  console.log(
    `[gtfsLoader] Stops in zone: ${zoneStops.length} / ${allStops.length} total`,
  );

  if (zoneStops.length === 0) {
    console.warn(
      '[gtfsLoader] ⚠  No stops found in zone. Returning empty graph.\n' +
      `  Zone bounds: ${JSON.stringify(ZONE_BOUNDS)}\n` +
      '  Check that your GTFS data covers the Whitefield–Marathahalli area.',
    );
    return { nodes: {}, edges: {}, adjacency: {}, stops: [] };
  }

  // ── Step 3: Build stop nodes ───────────────────────────────────────
  const nodes     = {};   // nodeId → { lat, lon, isStop }
  const edges     = {};   // edgeId → { fromNode, toNode, distanceMeters, defaultSpeedKmh }
  const adjacency = {};   // nodeId → [edgeId, ...]
  const stops     = [];   // [{ stopId, nodeId, lat, lon }]
  const stopNodeMap = {}; // stop_id → nodeId

  for (const s of zoneStops) {
    const nodeId = `stop_${s.stopId}`;
    nodes[nodeId] = { lat: s.lat, lon: s.lon, isStop: true, name: s.name };
    stopNodeMap[s.stopId] = nodeId;
    stops.push({ stopId: s.stopId, nodeId, lat: s.lat, lon: s.lon, name: s.name });
  }

  // ── Step 4: Build lookup indices ───────────────────────────────────
  const tripIndex = new Map(); // trip_id → { route_id, shape_id }
  for (const t of rawTrips) {
    tripIndex.set(t.trip_id, { route_id: t.route_id, shape_id: t.shape_id || null });
  }

  const stopTimesByTrip = new Map(); // trip_id → [stop_time_row, ...]
  for (const st of rawStopTimes) {
    if (!stopTimesByTrip.has(st.trip_id)) stopTimesByTrip.set(st.trip_id, []);
    stopTimesByTrip.get(st.trip_id).push({
      trip_id:        st.trip_id,
      stop_id:        st.stop_id,
      stop_sequence:  parseInt(st.stop_sequence, 10),
      arrival_time:   st.arrival_time,
      departure_time: st.departure_time,
    });
  }

  // shape_id → [{lat, lon}, ...] sorted by shape_pt_sequence
  // Shape points are pre-filtered to zone + buffer here to avoid storing
  // the entire city's shape data in memory.
  const shapeIndex = new Map();
  for (const sp of rawShapes) {
    const lat = parseFloat(sp.shape_pt_lat);
    const lon = parseFloat(sp.shape_pt_lon);
    if (!isInZoneOrBuffer(lat, lon)) continue; // ← discard out-of-zone points

    const sid = sp.shape_id;
    if (!shapeIndex.has(sid)) shapeIndex.set(sid, []);
    shapeIndex.get(sid).push({
      lat,
      lon,
      seq: parseInt(sp.shape_pt_sequence, 10),
    });
  }
  // Sort each shape's retained points by sequence
  for (const [, pts] of shapeIndex) {
    pts.sort((a, b) => a.seq - b.seq);
  }

  console.log(
    `[gtfsLoader] Shapes with any in-zone+buffer points: ${shapeIndex.size}`,
  );

  // ── Step 5: Identify trips that serve the zone ─────────────────────
  const zoneTrips = [];
  for (const [tripId, tripInfo] of tripIndex) {
    const tripSTs = stopTimesByTrip.get(tripId);
    if (!tripSTs || tripSTs.length === 0) continue;
    const inZoneSTs = tripSTs.filter((st) => zoneStopIds.has(st.stop_id));
    if (inZoneSTs.length === 0) continue;
    zoneTrips.push({ tripId, tripInfo, inZoneSTs });
  }

  console.log(
    `[gtfsLoader] Trips serving zone: ${zoneTrips.length} / ${tripIndex.size} total`,
  );

  // ── Step 6: Build graph edges from shapes and stop_times ───────────
  const processedShapes = new Set();
  const shapeRoutes     = new Map(); // shapeId → [edgeId, ...]
  let tripsProcessed    = 0;
  let longEdgesSkipped  = 0;
  let sparseFallbacks   = 0; // shapes where all segs exceeded MAX_EDGE_METERS

  for (const { tripId, tripInfo, inZoneSTs } of zoneTrips) {
    const shapeId       = tripInfo.shape_id;
    const rawShapePts   = shapeId ? shapeIndex.get(shapeId) : null;

    // ── 6a. No usable shape → direct stop-to-stop edges ─────────────
    if (!rawShapePts || rawShapePts.length < 2) {
      buildStopOnlyEdges(inZoneSTs, stopNodeMap, nodes, edges, adjacency);
      tripsProcessed++;
      continue;
    }

    // ── 6b. Already processed this shape? Just refine speeds ────────
    if (processedShapes.has(shapeId)) {
      updateSpeedsFromTrip(inZoneSTs, stopNodeMap, nodes, edges);
      tripsProcessed++;
      continue;
    }

    // ── 6c. Simplify the zone-clipped shape polyline ─────────────────
    //
    //   rawShapePts already contains ONLY points inside zone+buffer
    //   (filtered in Step 4 above).  Now apply Douglas–Peucker at
    //   SIMPLIFY_TOLERANCE_DEG ≈ 25m to eliminate redundant waypoints.
    //
    const simplifiedPts = simplifyPolyline(rawShapePts); // [{lat, lon}, ...]

    if (simplifiedPts.length < 2) {
      buildStopOnlyEdges(inZoneSTs, stopNodeMap, nodes, edges, adjacency);
      tripsProcessed++;
      continue;
    }

    // ── 6d. Sort in-zone stop_times by sequence ──────────────────────
    const sortedInZone = [...inZoneSTs].sort((a, b) => a.stop_sequence - b.stop_sequence);

    // ── 6e. Map each in-zone stop → nearest index in simplifiedPts ──
    const stopSimplifiedIdx = {}; // stop_id → index in simplifiedPts[]
    for (const st of sortedInZone) {
      const stop = zoneStops.find((s) => s.stopId === st.stop_id);
      if (!stop) continue;
      let minD = Infinity;
      let minI = 0;
      for (let i = 0; i < simplifiedPts.length; i++) {
        const d = haversineMeters(stop.lat, stop.lon, simplifiedPts[i].lat, simplifiedPts[i].lon);
        if (d < minD) { minD = d; minI = i; }
      }
      stopSimplifiedIdx[st.stop_id] = minI;
    }

    // ── 6f. Compute schedule-derived speeds per simplified segment ───
    //
    //   For each consecutive pair of in-zone stops (stA → stB):
    //     speed = (path_distance_m / 1000) / (time_seconds / 3600)  [km/h]
    //   That speed is attributed to every simplified segment between them.
    //
    const segSpeeds = {}; // simplified-array index → speed (km/h)

    for (let i = 0; i < sortedInZone.length - 1; i++) {
      const stA = sortedInZone[i];
      const stB = sortedInZone[i + 1];

      const dep = parseGtfsTime(stA.departure_time);
      const arr = parseGtfsTime(stB.arrival_time);
      if (dep === null || arr === null) continue;
      const dt = arr - dep;
      if (dt <= 0) continue;

      const idxA = stopSimplifiedIdx[stA.stop_id];
      const idxB = stopSimplifiedIdx[stB.stop_id];
      if (idxA === undefined || idxB === undefined) continue;

      const lo = Math.min(idxA, idxB);
      const hi = Math.max(idxA, idxB);
      if (lo === hi) continue;

      // Accumulate distance along the simplified polyline between the stops
      let segDist = 0;
      for (let j = lo; j < hi; j++) {
        segDist += haversineMeters(
          simplifiedPts[j].lat,     simplifiedPts[j].lon,
          simplifiedPts[j + 1].lat, simplifiedPts[j + 1].lon,
        );
      }
      if (segDist <= 0) continue;

      const rawSpeed = (segDist / 1000) / (dt / 3600);
      const clamped  = Math.max(MIN_SPEED_KMH, Math.min(MAX_SPEED_KMH, rawSpeed));

      for (let j = lo; j < hi; j++) {
        segSpeeds[j] = clamped;
      }
    }

    // ── 6g. Build node sequence from the full simplified polyline ────
    const nodeSeq = []; // [{ nodeId, idx }]

    for (let i = 0; i < simplifiedPts.length; i++) {
      const pt = simplifiedPts[i];

      // Snap to an existing stop node if within SNAP_DISTANCE_METERS
      let nodeId = snapToStop(pt.lat, pt.lon, zoneStops, stopNodeMap);

      if (!nodeId) {
        // Spatial canonicalization grid (~20m resolution: 5000 units/degree).
        // Merges shape waypoints across different GTFS routes running along the
        // same physical road segment into identical canonical node & edge IDs.
        const rLat = (Math.round(pt.lat * 5000) / 5000).toFixed(4);
        const rLon = (Math.round(pt.lon * 5000) / 5000).toFixed(4);
        nodeId = `waypoint_${rLat}_${rLon}`;
        if (!nodes[nodeId]) {
          nodes[nodeId] = { lat: pt.lat, lon: pt.lon, isStop: false };
        }
      }

      nodeSeq.push({ nodeId, idx: i });
    }

    // ── 6h. Build edges between consecutive nodes ────────────────────
    //
    // Track how many valid edges this shape contributes.  If none are
    // created (every segment > MAX_EDGE_METERS — sparse GTFS data), we
    // fall back to direct stop-to-stop edges so the route keeps
    // connectivity.
    let edgesBuiltForShape = 0;

    for (let i = 0; i < nodeSeq.length - 1; i++) {
      const from  = nodeSeq[i];
      const to    = nodeSeq[i + 1];
      if (from.nodeId === to.nodeId) continue; // merged into same stop

      const fNode  = nodes[from.nodeId];
      const tNode  = nodes[to.nodeId];
      const dist   = haversineMeters(fNode.lat, fNode.lon, tNode.lat, tNode.lon);

      if (dist < MIN_EDGE_METERS) continue;

      // ── SANITY CHECK: skip if edge is unrealistically long ─────────
      // Root cause: BMTC shapes with very few GPS points inside the zone
      // produce wide consecutive-point gaps after simplification.
      // These are counted and reported as a summary, not per-edge noise.
      if (dist > MAX_EDGE_METERS) {
        longEdgesSkipped++;
        continue;
      }

      const speed  = segSpeeds[from.idx] ?? DEFAULT_SPEED_KMH;
      const edgeId = `edge_${from.nodeId}__${to.nodeId}`;

      if (!edges[edgeId]) {
        edges[edgeId] = {
          fromNode:        from.nodeId,
          toNode:          to.nodeId,
          distanceMeters:  Math.round(dist * 100) / 100,
          defaultSpeedKmh: Math.round(speed * 10) / 10,
        };
        edgesBuiltForShape++;
      } else if (
        segSpeeds[from.idx] !== undefined &&
        edges[edgeId].defaultSpeedKmh === DEFAULT_SPEED_KMH
      ) {
        // Upgrade from default to a schedule-derived speed
        edges[edgeId].defaultSpeedKmh = Math.round(speed * 10) / 10;
        edgesBuiltForShape++;
      }

      if (!adjacency[from.nodeId]) adjacency[from.nodeId] = [];
      if (!adjacency[from.nodeId].includes(edgeId)) {
        adjacency[from.nodeId].push(edgeId);
      }

      if (!shapeRoutes.has(shapeId)) shapeRoutes.set(shapeId, []);
      shapeRoutes.get(shapeId).push(edgeId);
    }

    // ── 6i. Sparse-shape fallback ────────────────────────────────────
    // If shape processing produced zero edges (all segments were too long
    // — typical of BMTC shapes with only 2-3 GPS points in the zone),
    // fall back to stop-to-stop edges so these routes aren't silently
    // dropped from the graph.
    if (edgesBuiltForShape === 0) {
      buildStopOnlyEdges(inZoneSTs, stopNodeMap, nodes, edges, adjacency);
      sparseFallbacks++;
    }

    processedShapes.add(shapeId);
    tripsProcessed++;
  }

  if (longEdgesSkipped > 0) {
    console.log(
      `[gtfsLoader] Shape segments skipped (>${MAX_EDGE_METERS}m, sparse GTFS data): ` +
      `${longEdgesSkipped} | Shapes that fell back to stop-only edges: ${sparseFallbacks}`,
    );
  }

  // Convert shapeRoutes map to plain object
  const routes = {};
  for (const [sid, edgeList] of shapeRoutes) {
    routes[sid] = edgeList;
  }

  // ── Step 7: Prune orphaned nodes & finalize adjacency ──────────────
  const referencedNodes = new Set();
  for (const edge of Object.values(edges)) {
    referencedNodes.add(edge.fromNode);
    referencedNodes.add(edge.toNode);
  }

  let pruned = 0;
  for (const nodeId of Object.keys(nodes)) {
    if (!referencedNodes.has(nodeId)) {
      delete nodes[nodeId];
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(`[gtfsLoader] Pruned ${pruned} orphaned node(s) not referenced by any edge.`);
  }

  // Rebuild stops[] to only include nodes that survived pruning.
  const survivingStops = stops.filter((s) => nodes[s.nodeId] !== undefined);
  stops.length = 0;
  stops.push(...survivingStops);

  // Final adjacency: ensure every surviving node has an entry.
  for (const nodeId of Object.keys(nodes)) {
    if (!adjacency[nodeId]) adjacency[nodeId] = [];
  }

  // ── Summary ────────────────────────────────────────────────────────
  const nodeCount      = Object.keys(nodes).length;
  const edgeCount      = Object.keys(edges).length;
  const stopNodeCount  = Object.values(nodes).filter((n) => n.isStop).length;
  const shapeNodeCount = nodeCount - stopNodeCount;

  console.log(`[gtfsLoader] ✔  Graph built successfully.`);
  console.log(`  Nodes : ${nodeCount}  (${stopNodeCount} stops + ${shapeNodeCount} shape waypoints)`);
  console.log(`  Edges : ${edgeCount}`);
  console.log(`  Stops : ${stops.length}`);
  console.log(`  Routes: ${Object.keys(routes).length}`);
  console.log(`  Trips processed: ${tripsProcessed}`);

  return { nodes, edges, adjacency, stops, routes };
}

// ═══════════════════════════════════════════════════════════════════════
// Helper: refine edge speeds using schedule data from an additional trip
// on an already-processed shape.
// ═══════════════════════════════════════════════════════════════════════

function updateSpeedsFromTrip(inZoneSTs, stopNodeMap, nodes, edges) {
  const sorted = [...inZoneSTs].sort((a, b) => a.stop_sequence - b.stop_sequence);
  for (let i = 0; i < sorted.length - 1; i++) {
    const fromNid = stopNodeMap[sorted[i].stop_id];
    const toNid   = stopNodeMap[sorted[i + 1].stop_id];
    if (!fromNid || !toNid || fromNid === toNid) continue;

    const edgeId = `edge_${fromNid}__${toNid}`;
    const edge   = edges[edgeId];
    if (!edge || edge.defaultSpeedKmh !== DEFAULT_SPEED_KMH) continue;

    const dep = parseGtfsTime(sorted[i].departure_time);
    const arr = parseGtfsTime(sorted[i + 1].arrival_time);
    if (dep === null || arr === null) continue;
    const dt = arr - dep;
    if (dt <= 0) continue;

    const f    = nodes[fromNid];
    const t    = nodes[toNid];
    const dist = haversineMeters(f.lat, f.lon, t.lat, t.lon);
    if (dist <= 0) continue;

    const raw     = (dist / 1000) / (dt / 3600);
    const clamped = Math.max(MIN_SPEED_KMH, Math.min(MAX_SPEED_KMH, raw));
    edge.defaultSpeedKmh = Math.round(clamped * 10) / 10;
  }
}
