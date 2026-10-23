import React, { useState } from 'react';

export default function DemoController({
  injectCongestion,
  clearCongestion,
  triggerSignalTest,
  injectRoadClosure,
  clearRoadClosure,
  onReset
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const handleAction = (actionFn, name) => {
    if (actionFn) actionFn();
    setLastAction(name);
    setTimeout(() => setLastAction(null), 3000);
  };

  return (
    <div style={{
      position: 'absolute', bottom: '24px', right: '24px', zIndex: 1200,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px'
    }}>
      {lastAction && (
        <div style={{
          background: '#0f172a', color: '#ffffff', padding: '6px 14px',
          borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: '6px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>⚡</span> Triggered: {lastAction}
        </div>
      )}

      {isExpanded ? (
        <div style={{
          background: '#ffffff', borderRadius: '16px', padding: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)', border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', gap: '10px', width: '260px'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #f1f5f9', paddingBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>🎛️</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Tactical Operations Console</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '16px', color: '#64748b', padding: '2px 6px'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Simulate real-time corridor disruptions & signal overrides:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => handleAction(injectCongestion, 'Traffic Jam Injected')}
              style={{
                background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px',
                padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
                fontWeight: 700, color: '#dc2626', transition: 'all 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
              onMouseOut={e => e.currentTarget.style.background = '#fef2f2'}
            >
              <span>🚨</span> Inject Bottleneck / Congestion
            </button>

            <button
              onClick={() => handleAction(clearCongestion, 'Corridor Cleared')}
              style={{
                background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px',
                padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
                fontWeight: 700, color: '#059669', transition: 'all 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#d1fae5'}
              onMouseOut={e => e.currentTarget.style.background = '#ecfdf5'}
            >
              <span>🟢</span> Clear Traffic Bottleneck
            </button>

            <button
              onClick={() => handleAction(triggerSignalTest, 'Signal Priority Tested')}
              style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
                padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
                fontWeight: 700, color: '#d97706', transition: 'all 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#fef3c7'}
              onMouseOut={e => e.currentTarget.style.background = '#fffbeb'}
            >
              <span>🚦</span> Test Signal Pre-emption Alert
            </button>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Road Work / Construction
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => handleAction(injectRoadClosure, 'Road Closure Simulated')}
                  style={{
                    background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px',
                    padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
                    fontWeight: 700, color: '#a16207', transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#fef9c3'}
                  onMouseOut={e => e.currentTarget.style.background = '#fefce8'}
                >
                  <span>🚧</span> Simulate Road Closure (Metro Work)
                </button>

                <button
                  onClick={() => handleAction(clearRoadClosure, 'Road Reopened')}
                  style={{
                    background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px',
                    padding: '8px 12px', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
                    fontWeight: 700, color: '#059669', transition: 'all 0.15s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#d1fae5'}
                  onMouseOut={e => e.currentTarget.style.background = '#ecfdf5'}
                >
                  <span>🟢</span> Reopen Closed Road
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            background: '#0f172a', color: '#ffffff', border: 'none',
            borderRadius: '24px', padding: '10px 18px', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.3)',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.4)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.3)'; }}
        >
          <span>🎛️</span> Incident Simulation Console
        </button>
      )}
    </div>
  );
}
