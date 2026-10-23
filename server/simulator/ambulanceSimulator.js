/**
 * ambulanceSimulator.js — High-Precision Ambulance Movement & Telemetry Engine
 *
 * Simulates emergency vehicle kinematics along activeRoute GeoJSON coordinates.
 * Features:
 *   • Incremental distance advancement (meters/second based on live road speeds)
 *   • Zero-teleportation mid-transit rerouting
 *   • Real-time heading calculation with bearing stabilization
 *   • Continuous position & corridor progress synchronization with sharedState
 */

import along from '@turf/along';
import length from '@turf/length';
import { sharedState, stateEvents, logAgentActivity } from '../sharedState.js';

const TICK_MS = 1000; // 1-second simulation tick

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
 *   { lat: number, lon: number, heading: number, etaSeconds: number, speed: number }
 * @returns {function} A stop function that halts the simulation.
 */
export function startAmbulanceSimulation(onUpdate) {
  let distanceTraveledKm = 0;
  let elapsedSeconds = 0;
  let intervalId = null;
  let lastHeading = 0;

  const resetProgress = () => {
    distanceTraveledKm = 0;
    elapsedSeconds = 0;
  };
  stateEvents.on('route:started', resetProgress);

  function tick() {
    if (!sharedState.navigationStarted) {
      return;
    }

    const route = sharedState.activeRoute;
    if (!route || !route.geoJson || !route.totalTimeSeconds) {
      return;
    }

    const line = route.geoJson;
    const totalLengthKm = length(line, { units: 'kilometers' });
    if (totalLengthKm <= 0) return;

    elapsedSeconds += TICK_MS / 1000;

    // Realistic emergency cruising speed (50 km/h baseline with dynamic speed adjustments)
    let speedKmh = 50;

    // Check if the current segment has active congestion
    const edgePath = route.edgePath || [];
    const nodePath = route.nodePath || [];
    
    // Estimate current edge index based on distance progress
    const progressFrac = Math.min(distanceTraveledKm / Math.max(totalLengthKm, 0.001), 0.999);
    const estimatedEdgeIdx = Math.min(Math.floor(progressFrac * edgePath.length), edgePath.length - 1);
    const currentEdgeId = edgePath[estimatedEdgeIdx];

    if (currentEdgeId && sharedState.segments[currentEdgeId]) {
      const seg = sharedState.segments[currentEdgeId];
      if (seg.status === 'congested') {
        speedKmh = Math.max(8, seg.avgSpeed || 10);
      } else if (seg.status === 'slow') {
        speedKmh = Math.max(22, seg.avgSpeed || 25);
      } else if (seg.status === 'blocked') {
        speedKmh = 4; // crawling before detour takes effect
      }
    }

    // Advance physical distance by speed * time
    const deltaKm = (speedKmh / 3600) * (TICK_MS / 1000);
    distanceTraveledKm = Math.min(distanceTraveledKm + deltaKm, totalLengthKm);

    // Compute interpolated coordinate on the path
    const point = along(line, distanceTraveledKm, { units: 'kilometers' });
    const lookaheadKm = Math.min(distanceTraveledKm + 0.015, totalLengthKm);
    const nextPoint = along(line, lookaheadKm, { units: 'kilometers' });

    const [lon, lat] = point.geometry.coordinates;
    const [nextLon, nextLat] = nextPoint.geometry.coordinates;

    if (distanceTraveledKm < totalLengthKm - 0.005) {
      lastHeading = computeBearing(lat, lon, nextLat, nextLon);
    }

    // Remaining travel distance and dynamic ETA
    const remainingKm = Math.max(0, totalLengthKm - distanceTraveledKm);
    const remainingEtaSeconds = (remainingKm / Math.max(speedKmh, 5)) * 3600;

    // Determine nearest forward node for signal coordination & mid-route rerouting
    const nearestNodeIdx = Math.min(Math.floor(progressFrac * nodePath.length), nodePath.length - 1);
    const currentWayNodeId = nodePath[nearestNodeIdx] || null;

    // Update sharedState progress tracker
    sharedState.ambulanceProgress = {
      currentEdgeIdx: estimatedEdgeIdx,
      distanceTraveledKm,
      remainingKm,
      currentWayNodeId,
    };

    const updatePayload = {
      lat,
      lon,
      heading: Math.round(lastHeading),
      etaSeconds: Math.round(remainingEtaSeconds),
      speed: Math.round(speedKmh),
      progress: progressFrac,
      distanceTraveledKm: Number(distanceTraveledKm.toFixed(2)),
      remainingKm: Number(remainingKm.toFixed(2)),
    };

    sharedState.ambulancePosition = updatePayload;
    onUpdate(updatePayload);

    // Periodic telemetry confirmation every 15s (without fake scripted numbers)
    if (elapsedSeconds > 0 && Math.floor(elapsedSeconds) % 15 === 0) {
      const remainingMins = Math.ceil(remainingEtaSeconds / 60);
      logAgentActivity(
        'route',
        '🚑',
        'Corridor Telemetry Active',
        `Ambulance en route (${Math.round(remainingKm * 1000)}m remaining). Dynamic ETA: ${remainingMins} min at ${Math.round(speedKmh)} km/h.`,
        { speedKmh, remainingKm: Number(remainingKm.toFixed(2)), etaSeconds: Math.round(remainingEtaSeconds) }
      );
    }
  }

  intervalId = setInterval(tick, TICK_MS);
  console.log(`[ambulanceSim] 🚑 Precision ambulance simulation started (tick every ${TICK_MS}ms)`);

  return function stopAmbulanceSimulation() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    console.log(`[ambulanceSim] ⏹ Ambulance simulation stopped (distance: ${distanceTraveledKm.toFixed(2)}km)`);
  };
}
