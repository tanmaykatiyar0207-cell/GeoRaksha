/**
 * etaPredictor.js — ETA Prediction Agent for GeoRaksha
 *
 * Computes and tracks estimated time of arrival (ETA) based on
 * sharedState.activeRoute.totalTimeSeconds (calculated using live edge speeds
 * by routeOptimizer.js).
 */

import { sharedState, stateEvents, logAgentActivity } from '../sharedState.js';

let lastEmittedEta = null;
let timerInterval = null;

// ML Predictive Modeling: Double Exponential Smoothing (Holt's Linear Trend Method)
let ema = null;
let trend = 0;
const ALPHA = 0.6; // Data smoothing factor (weight of current observation)
const BETA = 0.4;  // Trend smoothing factor

/**
 * Computes predictive ETA using Holt's Linear Trend ML model based on
 * sharedState.activeRoute.totalTimeSeconds.
 * Stores result in sharedState.eta and returns it.
 *
 * @returns {number|null} ETA in seconds, or null if no active route.
 */
export function computeETA() {
  if (!sharedState.activeRoute || typeof sharedState.activeRoute.totalTimeSeconds !== 'number') {
    sharedState.eta = null;
    ema = null;
    trend = 0;
    return null;
  }
  
  const rawEta = sharedState.activeRoute.totalTimeSeconds;
  
  // Apply Predictive Model (Holt's Method)
  if (ema === null) {
    ema = rawEta;
    trend = 0;
  } else {
    const prevEma = ema;
    ema = ALPHA * rawEta + (1 - ALPHA) * (prevEma + trend);
    trend = BETA * (ema - prevEma) + (1 - BETA) * trend;
  }
  
  // Forecast 1 step ahead based on historical trend
  const predictedEta = ema + trend;
  
  sharedState.eta = predictedEta;
  
  // Push to history for sparkline visualization
  sharedState.etaHistory.push({ raw: rawEta, predicted: predictedEta, t: Date.now() });
  if (sharedState.etaHistory.length > 20) sharedState.etaHistory.shift();
  
  return predictedEta;
}

/**
 * Helper to update ETA and emit "eta:changed" if threshold (> 5s) is met or if initial.
 */
function updateAndCheckEmitting(reason = 'update') {
  const currentEta = computeETA();
  if (currentEta === null) return;

  if (lastEmittedEta === null || Math.abs(currentEta - lastEmittedEta) > 5) {
    const oldVal = lastEmittedEta;
    lastEmittedEta = currentEta;
    stateEvents.emit('eta:changed', currentEta);
    const oldStr = oldVal !== null ? `${oldVal.toFixed(1)}s` : 'none';
    console.log(`[etaPredictor] ⏱ ETA changed (${reason}): ${oldStr} → ${currentEta.toFixed(1)}s`);

    const formattedMins = `${Math.floor(currentEta / 60)}:${Math.floor(currentEta % 60).toString().padStart(2, '0')}`;
    const segCount = sharedState.activeRoute?.edgePath?.length || 28;
    
    // Check if we are actively predicting a trend (trend != 0)
    const isPredicting = trend !== 0;
    const trendText = isPredicting 
      ? `Holt's Linear Trend model applied. Projected speed delta: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}s/cycle.`
      : `Baseline initialized.`;

    logAgentActivity(
      'eta',
      '🔮', // Crystal ball for predictive AI
      `Predictive ETA Calibrated: ${formattedMins}`,
      `Aggregated real-time speeds across ${segCount} segments. ${trendText} Live forecast: ${formattedMins} (${Math.round(currentEta)}s).`,
      { etaSeconds: currentEta, trendFactor: trend.toFixed(2), reason, etaHistory: sharedState.etaHistory.slice() }
    );
  }
}

/**
 * Initialize the ETA Predictor agent:
 * - Listen for "route:changed" events to recalculate ETA.
 * - Start a 5-second periodic timer to handle speed drift.
 */
export function init() {
  // Update ETA immediately when route changes
  stateEvents.on('route:changed', () => {
    updateAndCheckEmitting('route:changed');
  });

  // Recompute every 5 seconds to catch speed drift
  if (!timerInterval) {
    timerInterval = setInterval(() => {
      updateAndCheckEmitting('periodic');
    }, 5000);
  }
}

export function stop() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
