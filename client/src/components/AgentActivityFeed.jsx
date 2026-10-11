import React, { useState } from 'react';

/* ── Inline SVG Sparkline for ETA Predictor ──────────────────────────── */
function ETASparkline({ history }) {
  if (!history || history.length < 2) return null;

  const W = 220, H = 48, PAD = 4;
  const rawVals = history.map(h => h.raw);
  const predVals = history.map(h => h.predicted);
  const allVals = [...rawVals, ...predVals];
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.05;
  const range = maxV - minV || 1;

  const toX = (i) => PAD + (i / (history.length - 1)) * (W - PAD * 2);
  const toY = (v) => PAD + (1 - (v - minV) / range) * (H - PAD * 2);

  const rawPath = rawVals.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const predPath = predVals.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  
  // Fill area under predicted line
  const fillPath = predPath + ` L${toX(predVals.length - 1).toFixed(1)},${H - PAD} L${toX(0).toFixed(1)},${H - PAD} Z`;

  return (
    <div style={{ marginTop: '6px', background: '#0f172a', borderRadius: '8px', padding: '8px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📈 ETA Trend — ML vs Raw
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '9px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '12px', height: '2px', background: '#ef4444', display: 'inline-block', borderTop: '1px dashed #ef4444' }} />
            Raw
          </span>
          <span style={{ fontSize: '9px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '12px', height: '2px', background: '#a78bfa', display: 'inline-block' }} />
            ML Predicted
          </span>
        </div>
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Fill under predicted */}
        <path d={fillPath} fill="url(#sparkFill)" />
        {/* Raw line (red dashed) */}
        <path d={rawPath} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7" />
        {/* Predicted line (purple solid) */}
        <path d={predPath} fill="none" stroke="#a78bfa" strokeWidth="2" />
        {/* Current point glow */}
        <circle cx={toX(predVals.length - 1)} cy={toY(predVals[predVals.length - 1])} r="3" fill="#a78bfa" />
        <circle cx={toX(predVals.length - 1)} cy={toY(predVals[predVals.length - 1])} r="5" fill="#a78bfa" opacity="0.3" />
      </svg>
    </div>
  );
}

const AGENT_CONFIG = {
  traffic: {
    name: 'Traffic Monitor',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: '#10b98140',
    icon: '📡',
  },
  route: {
    name: 'Route Optimizer',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.08)',
    border: '#3b82f640',
    icon: '🔄',
  },
  eta: {
    name: 'ETA Predictor',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.08)',
    border: '#8b5cf640',
    icon: '⏱️',
  },
  signal: {
    name: 'Signal Coordinator',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: '#f59e0b40',
    icon: '🚦',
  },
};

export default function AgentActivityFeed({ activities = [] }) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filteredActivities = activities.filter(act => {
    if (filter === 'all') return true;
    return act.agent === filter;
  });

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="panel agent-feed-panel" style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fafafa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              AI Multi-Agent Feed
              <span style={{
                fontSize: '11px', background: '#10b981', color: '#fff',
                padding: '1px 6px', borderRadius: '10px', fontWeight: 600
              }}>Live</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>4 Coordinated Autonomous Agents</div>
          </div>
        </div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
          {activities.length} events
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: '4px', padding: '8px 12px', background: '#f8fafc',
        borderBottom: '1px solid #f1f5f9', overflowX: 'auto'
      }}>
        {['all', 'traffic', 'route', 'eta', 'signal'].map(key => {
          const isSelected = filter === key;
          const label = key === 'all' ? `All (${activities.length})` : AGENT_CONFIG[key]?.name.split(' ')[0];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                fontWeight: isSelected ? 700 : 500, cursor: 'pointer',
                background: isSelected ? '#0f172a' : 'transparent',
                color: isSelected ? '#ffffff' : '#64748b',
                whiteSpace: 'nowrap', transition: 'all 0.15s'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Activity List */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '10px'
      }}>
        {filteredActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Awaiting agent events...</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>Agents evaluate live bus telemetry & emergency routes.</div>
          </div>
        ) : (
          filteredActivities.map((item, idx) => {
            const config = AGENT_CONFIG[item.agent] || AGENT_CONFIG.traffic;
            const isExpanded = expandedId === (item.id || idx);
            const hasDetails = item.details && Object.keys(item.details).length > 0;

            return (
              <div
                key={item.id || idx}
                onClick={() => hasDetails && toggleExpand(item.id || idx)}
                style={{
                  padding: '12px 14px', borderRadius: '12px',
                  background: config.bg, border: `1px solid ${config.border}`,
                  display: 'flex', flexDirection: 'column', gap: '6px',
                  cursor: hasDetails ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px' }}>{item.icon || config.icon}</span>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, color: config.color,
                      textTransform: 'uppercase', letterSpacing: '0.4px'
                    }}>
                      {config.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                    {item.timestamp}
                  </span>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  {item.title}
                </div>

                <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>
                  {item.description}
                </div>

                {/* Visual AI Sparkline — only for ETA Predictor entries with history */}
                {item.agent === 'eta' && item.details?.etaHistory && (
                  <ETASparkline history={item.details.etaHistory} />
                )}

                {/* Optional Telemetry Details Breakdown */}
                {hasDetails && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{
                      fontSize: '10px', fontWeight: 700, color: config.color,
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                      <span>{isExpanded ? '▼ Hide Telemetry Payload' : '▶ View Telemetry Payload'}</span>
                    </div>

                    {isExpanded && (
                      <div style={{
                        marginTop: '6px', padding: '8px 10px', background: '#ffffff',
                        borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px',
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px'
                      }}>
                        {Object.entries(item.details).filter(([k]) => k !== 'etaHistory').map(([k, v]) => (
                          <div key={k}>
                            <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}: </span>
                            <strong style={{ color: '#1e293b' }}>{String(v)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
