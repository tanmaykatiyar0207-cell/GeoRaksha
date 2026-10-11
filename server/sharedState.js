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
      title: 'Green Wave System Online',
      description: 'Connected to Bangalore Traffic Police (BTP) signal API. 60-second junction threshold armed.',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now() - 1000
    },
    {
      id: 'boot_3',
      agent: 'eta',
      icon: '⏱️',
      title: 'Speed Aggregator Synchronized',
      description: 'Continuous speed-drift engine running on live edge weights.',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now() - 2000
    },
    {
      id: 'boot_2',
      agent: 'route',
      icon: '🗺️',
      title: 'Dijkstra MinHeap Engine Ready',
      description: 'Graph populated with 1,259 directional segments across Whitefield corridor.',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now() - 3000
    },
    {
      id: 'boot_1',
      agent: 'traffic',
      icon: '📡',
      title: 'Floating Sensor Network Initialized',
      description: '17 BMTC buses transmitting live telemetry across spatial grid index.',
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
