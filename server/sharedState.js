/**
 * sharedState.js — Shared application state for GeoRaksha
 *
 * Central state store + event bus consumed by the traffic-monitoring
 * agent, the (future) routing engine, and the (future) Socket.io layer.
 *
 * Exports:
 *   sharedState  — mutable state object
 *   stateEvents  — Node EventEmitter for change notifications
 *
 * State shape:
 *   sharedState.segments[edgeId] = {
 *     readings: [{ speed, timestamp, busId }, …],  // rolling buffer (max 5)
 *     avgSpeed: number,    // current moving average (km/h)
 *     status:  'clear' | 'slow' | 'congested' | null,
 *   }
 */

import { EventEmitter } from 'node:events';

export const sharedState = {
  segments: {},
  activeRoute: null,
  eta: null,
  currentAlert: null,
  navigationStarted: false,
  ambulancePosition: null,
  ambulanceProgress: {
    currentEdgeIdx: 0,
    distanceTraveledKm: 0,
    currentWayNodeId: null,
  },
  timeSaved: 0,
  baselineEta: 0,
  etaHistory: [],  // [{raw, predicted, t}] — last 20 points for sparkline
  rerouteCount: 0,
  signalAlertCount: 0,
  hospitalMessageCount: 0,
  agentActivities: [
    {
      id: 'boot_4',
      agent: 'signal',
      icon: '🚦',
      title: 'Green Wave Advisory Armed',
      description: '60-second Time-to-Junction lookahead active across municipal signal intersections.',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now() - 1000
    },
    {
      id: 'boot_3',
      agent: 'eta',
      icon: '⏱️',
      title: 'Predictive ETA Engine Online',
      description: 'Holt\'s Double Exponential Smoothing calibrated with dynamic corridor velocities.',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now() - 2000
    },
    {
      id: 'boot_2',
      agent: 'route',
      icon: '🗺️',
      title: 'Dijkstra MinHeap Router Ready',
      description: 'Graph initialized with 47,491 directional edges across Greater Bengaluru.',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now() - 3000
    },
    {
      id: 'boot_1',
      agent: 'traffic',
      icon: '📡',
      title: 'Floating Sensor Grid Active',
      description: '360+ BMTC transit probes streaming real-time telemetry across 3,401 spatial cells.',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now() - 4000
    },
  ],
};

export const stateEvents = new EventEmitter();

/**
 * Logs an AI agent activity and broadcasts it across the system.
 */
export function logAgentActivity(agent, icon, title, description, details = null) {
  const activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    agent, // 'traffic' | 'route' | 'eta' | 'signal'
    icon,
    title,
    description,
    details,
    timestamp: new Date().toLocaleTimeString(),
    createdAt: Date.now()
  };

  sharedState.agentActivities.unshift(activity);
  if (sharedState.agentActivities.length > 50) {
    sharedState.agentActivities.pop();
  }

  stateEvents.emit('agent:activity', activity);
}
