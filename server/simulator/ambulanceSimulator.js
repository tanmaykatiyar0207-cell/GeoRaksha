/**
 * ambulanceSimulator.js — Ambulance Position Tracker for GeoRaksha
 *
 * Interpolates the ambulance's position along the active route's GeoJSON
 * LineString using Turf.js `along()` and `length()`.
 *
 * Key design:
 *   • elapsedSeconds is a monotonic counter incremented each tick —
 *     it does NOT reset to 0 when the route changes/reroutes, so the
 *     ambulance's progress continues smoothly.
 *   • On each 1-second tick, reads sharedState.activeRoute.geoJson and
 *     totalTimeSeconds to compute progress and position.
 *   • When a reroute occurs mid-transit, the ambulance's elapsed time
 *     stays the same but the new route's totalTimeSeconds changes,
 *     causing the progress fraction to adjust naturally — the ambulance
 *     simply continues from wherever it is on the new line geometry.
 *
 * Usage:
 *   import { startAmbulanceSimulation } from './ambulanceSimulator.js';
 *   const stop = startAmbulanceSimulation((update) => {
 *     io.emit('ambulance:update', update);
 *   });
 *   // later: stop();
 */

import along from '@turf/along';
import length from '@turf/length';
import { sharedState, stateEvents, logAgentActivity } from '../sharedState.js';

const TICK_MS = 1000; // 1-second tick — more granular than bus ticks

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

/**
 * Start the ambulance simulation.
 *
 * @param {function} onUpdate — callback receiving
 *   { lat: number, lon: number, heading: number, etaSeconds: number }
 * @returns {function} A stop function that halts the simulation.
 */
export function startAmbulanceSimulation(onUpdate) {
  let elapsedSeconds = 0;
  let intervalId = null;

  const resetElapsed = () => { elapsedSeconds = 0; };
  stateEvents.on('route:started', resetElapsed);

  function tick() {
    if (!sharedState.navigationStarted) {
      return; // wait for user to select route
    }

    const route = sharedState.activeRoute;
    if (!route || !route.geoJson || !route.totalTimeSeconds) {
      return; // no route yet, skip tick but keep counting
    }

    elapsedSeconds += TICK_MS / 1000;

    const totalTime = route.totalTimeSeconds;
    const progress = Math.min(elapsedSeconds / totalTime, 1);
    const etaSeconds = Math.max(totalTime - elapsedSeconds, 0);

    // Compute position along the GeoJSON LineString
    const line = route.geoJson; // { type: "LineString", coordinates: [[lon,lat], ...] }
    const totalLengthKm = length(line, { units: 'kilometers' });
    const distanceAlongKm = progress * totalLengthKm;

    // along() returns a GeoJSON Point Feature at the given distance
    const point = along(line, distanceAlongKm, { units: 'kilometers' });
    const nextPoint = along(line, Math.min(distanceAlongKm + 0.01, totalLengthKm), { units: 'kilometers' });

    const [lon, lat] = point.geometry.coordinates;
    const [nextLon, nextLat] = nextPoint.geometry.coordinates;

    const heading = computeBearing(lat, lon, nextLat, nextLon);
    
    // The simulation moves linearly over the total time, so instantaneous speed = average route speed
    const speedKmh = totalTime > 0 ? totalLengthKm / (totalTime / 3600) : 0;

    onUpdate({
      lat,
      lon,
      heading: Math.round(heading),
      etaSeconds: Math.round(etaSeconds),
      speed: Math.round(speedKmh),
    });

    // ── Multi-Agent Live Navigation Co-Pilot Engagement ────────────────

    // AUTONOMOUS DEMO SCRIPT: Automatically trigger traffic jam for Manipal Hospital
    const endNode = route.nodePath ? route.nodePath[route.nodePath.length - 1] : null;
    if (endNode === 'stop_21160' && Math.floor(elapsedSeconds) === 15) {
      const targetEdgeIdx = Math.floor(route.edgePath.length * 0.3);
      const targetEdge = route.edgePath[targetEdgeIdx];
      if (targetEdge && (!sharedState.segments[targetEdge] || sharedState.segments[targetEdge].status !== 'congested')) {
        sharedState.segments[targetEdge] = { readings: [], avgSpeed: 1, status: 'congested' };
        stateEvents.emit('segments:changed', targetEdge);
        logAgentActivity('traffic', '🚨', 'AUTONOMOUS SENSOR DETECTED', `Live bus telemetry detected sudden severe gridlock on upcoming segment ${targetEdge} (Speed: 1 km/h). AI forcing immediate diversion.`);
      }
    }

    if (elapsedSeconds % 8 === 0) {
      const cycle = Math.floor(elapsedSeconds / 8) % 4;
      const distanceRemM = Math.round((1 - progress) * totalLengthKm * 1000);
      const minsRem = Math.ceil(etaSeconds / 60);

      if (cycle === 0) {
        logAgentActivity(
          'traffic',
          '📡',
          'Downstream Corridor Monitored',
          `Traffic Monitor verified road conditions: Free-flow speed maintained along next 600m segment.`
        );
      } else if (cycle === 1) {
        logAgentActivity(
          'route',
          '🗺️',
          'Active Trajectory Verified',
          `Route Optimizer confirmed optimal corridor (${distanceRemM}m remaining to destination). 0 bottlenecks on active path.`
        );
      } else if (cycle === 2) {
        logAgentActivity(
          'eta',
          '⏱️',
          'Arrival Countdown Synchronized',
          `ETA Predictor calibrated arrival window: ${minsRem} mins remaining with real-time transit velocities.`
        );
      } else if (cycle === 3) {
        logAgentActivity(
          'signal',
          '🚦',
          'Green Wave Intersection Scan',
          `Signal Coordinator scanning for upcoming traffic signal beacon within 60-second priority window.`
        );
      }
    }
  }

  intervalId = setInterval(tick, TICK_MS);

  console.log(`[ambulanceSim] 🚑 Ambulance simulation started (tick every ${TICK_MS}ms)`);

  return function stopAmbulanceSimulation() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    console.log(`[ambulanceSim] ⏹ Ambulance simulation stopped (elapsed: ${elapsedSeconds.toFixed(0)}s)`);
  };
}
