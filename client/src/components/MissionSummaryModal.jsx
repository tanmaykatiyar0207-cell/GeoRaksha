import React from 'react';

export default function MissionSummaryModal({ summary, onClose }) {
  if (!summary) return null;

  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '20px', width: '400px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', overflow: 'hidden',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          padding: '24px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
            Mission Complete
          </div>
          <div style={{ fontSize: '12px', color: '#d1fae5', marginTop: '4px', fontWeight: 500 }}>
            Emergency corridor successfully navigated
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Before / After Comparison */}
          {summary.timeSavedSeconds > 0 && (
            <div style={{
              background: '#f8fafc', borderRadius: '12px', padding: '16px',
              border: '1px solid #1e293b',
            }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', textAlign: 'center' }}>
                Route Time Comparison
              </div>
              {/* Without GeoRaksha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>Without GeoRaksha</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444' }}>
                    {formatTime(summary.congestedEta)}
                  </div>
                </div>
                <div style={{
                  height: '6px', flex: 2, borderRadius: '3px', background: '#ffffff', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: '100%', borderRadius: '3px',
                    background: 'linear-gradient(to right, #ef4444, #dc2626)',
                  }} />
                </div>
              </div>
              {/* With GeoRaksha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>With GeoRaksha</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>
                    {formatTime(summary.optimizedEta)}
                  </div>
                </div>
                <div style={{
                  height: '6px', flex: 2, borderRadius: '3px', background: '#ffffff', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: summary.congestedEta > 0 ? `${Math.round((summary.optimizedEta / summary.congestedEta) * 100)}%` : '60%',
                    borderRadius: '3px',
                    background: 'linear-gradient(to right, #10b981, #059669)',
                  }} />
                </div>
              </div>
              {/* Time Saved and Clinical Impact Split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  borderRadius: '8px', padding: '10px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                }}>
                  <div style={{ fontSize: '10px', color: '#d1fae5', fontWeight: 600, textTransform: 'uppercase' }}>Time Saved</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>⚡</span>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                      {formatTime(summary.timeSavedSeconds)}
                    </span>
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  borderRadius: '8px', padding: '10px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                }}>
                  <div style={{ fontSize: '10px', color: '#d1fae5', fontWeight: 600, textTransform: 'uppercase' }}>Corridor Efficiency</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>⚡</span>
                    <span style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
                      +{Math.min(Math.round(((summary.timeSavedSeconds || 60) / Math.max(summary.optimizedEta || 300, 60)) * 100), 65)}% Faster
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stat Rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{
              background: '#f8fafc', borderRadius: '10px', padding: '12px',
              border: '1px solid #e2e8f0', textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>🚧</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>
                {summary.bottlenecksAvoided}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                Bottlenecks Avoided
              </div>
            </div>

            <div style={{
              background: '#f8fafc', borderRadius: '10px', padding: '12px',
              border: '1px solid #e2e8f0', textAlign: 'center'
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>🚦</div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>
                {summary.signalAlertsFired}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                Signals Pre-empted
              </div>
            </div>
          </div>

          {/* Hospital Pre-Arrival Status */}
          <div style={{
            background: summary.hospitalPreArrival ? '#eff6ff' : '#f8fafc',
            borderRadius: '10px', padding: '12px 16px',
            border: `1px solid ${summary.hospitalPreArrival ? '#bfdbfe' : '#e2e8f0'}`,
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>🏥</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                Hospital Pre-Arrival
              </div>
              <div style={{ fontSize: '11px', color: summary.hospitalPreArrival ? '#2563eb' : '#94a3b8', fontWeight: 600 }}>
                {summary.hospitalPreArrival
                  ? `✅ Trauma team prepped — ${summary.hospitalMessageCount} message${summary.hospitalMessageCount !== 1 ? 's' : ''} transmitted`
                  : '⬜ No pre-arrival advisory sent'}
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div style={{ padding: '0 24px 20px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 48px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.5)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.35)'; }}
          >
            Close Mission Report
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
