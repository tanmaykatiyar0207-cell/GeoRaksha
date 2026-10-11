/**
 * signalCoordinator.js — Signal Coordination Agent for GeoRaksha
 *
 * Calculates time-to-next-junction for emergency vehicles on activeRoute.
 * Generates signal priority alerts if arrival time is under 60 seconds,
 * and clears alerts when the route advances past the target junction.
 */

import { getGraph, freeFlowSpeed, getLocationName } from '../data/roadGraph.js';
import { sharedState, stateEvents, logAgentActivity } from '../sharedState.js';

let graph = null;

export function evaluatePosition(ambulancePos) {
  const active = sharedState.activeRoute;
  if (!active || !active.nodePath || !ambulancePos) {
    if (sharedState.currentAlert) {
      sharedState.currentAlert = null;
      stateEvents.emit('alert:cleared');
    }
    return;
  }

  // Find the closest node in the path
  let minDist = Infinity;
  let nearestIdx = 0;
  for (let i = 0; i < active.nodePath.length; i++) {
    const node = graph.nodes[active.nodePath[i]];
    if (!node) continue;
    // rough distance in degrees, good enough for ordering
    const dist = Math.pow(node.lat - ambulancePos.lat, 2) + Math.pow(node.lon - ambulancePos.lon, 2);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  // Next junction is the one after the nearest (or nearest if we haven't reached it)
  const nextIdx = Math.min(nearestIdx + 1, active.nodePath.length - 1);
  const nextJunctionId = active.nodePath[nextIdx];
  const nextNode = graph.nodes[nextJunctionId];

  // Calculate distance in meters to next junction
  const R = 6371e3; // metres
  const lat1 = ambulancePos.lat * Math.PI/180;
  const lat2 = nextNode.lat * Math.PI/180;
  const dLat = (nextNode.lat-ambulancePos.lat) * Math.PI/180;
  const dLon = (nextNode.lon-ambulancePos.lon) * Math.PI/180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distMeters = R * c;

  // Use current ambulance speed to estimate arrival, min 10 km/h
  const speedMs = Math.max(10, ambulancePos.speed || 30) * (5 / 18);
  const secondsToArrival = distMeters / speedMs;
  const readableJunctionName = getLocationName(nextJunctionId);

  if (secondsToArrival < 60 && distMeters > 50) {
    if (!sharedState.currentAlert || sharedState.currentAlert.junctionId !== nextJunctionId) {
      sharedState.currentAlert = {
        junctionId: nextJunctionId,
        junctionName: readableJunctionName,
        secondsToArrival: Math.round(secondsToArrival),
        distMeters: Math.round(distMeters),
      };
      stateEvents.emit('alert:new', sharedState.currentAlert);
      console.log(`[signalCoordinator] 🚨 ALERT NEW: Approaching ${readableJunctionName} in ${Math.round(secondsToArrival)}s`);

      logAgentActivity(
        'signal',
        '🚦',
        `Signal Advisory: ${readableJunctionName}`,
        `Approaching ${readableJunctionName} (${Math.round(distMeters)}m ahead). Green Wave pre-emption advisory transmitted to Bangalore Traffic Police (BTP) signal controller (T-${Math.round(secondsToArrival)}s).`,
        { junctionId: nextJunctionId, junctionName: readableJunctionName, secondsToArrival: Math.round(secondsToArrival), distMeters: Math.round(distMeters) }
      );
    } else {
      // Update countdown
      sharedState.currentAlert.secondsToArrival = Math.round(secondsToArrival);
      sharedState.currentAlert.distMeters = Math.round(distMeters);
      stateEvents.emit('alert:new', sharedState.currentAlert);
    }
  } else {
    if (sharedState.currentAlert) {
      const clearedJunction = sharedState.currentAlert.junctionId;
      const clearedName = sharedState.currentAlert.junctionName || getLocationName(clearedJunction);
      sharedState.currentAlert = null;
      stateEvents.emit('alert:cleared');

      logAgentActivity(
        'signal',
        '🟢',
        `Intersection Cleared: ${clearedName}`,
        `Emergency vehicle traversed through ${clearedName}. Traffic signal returned to standard adaptive cycle.`,
        { junctionId: clearedJunction, junctionName: clearedName }
      );
    }
  }
}

/**
 * Initialize the Signal Coordinator agent.
 */
export async function init() {
  graph = await getGraph();
  
  stateEvents.on('route:changed', () => {
    // When route changes, we just clear the current alert
    // evaluatePosition is continuously called by the ambulance simulator ticking,
    // so it will recalculate the alert on the very next tick (within 1 second)
    if (sharedState.currentAlert) {
      sharedState.currentAlert = null;
      stateEvents.emit('alert:cleared');
    }
  });
}
