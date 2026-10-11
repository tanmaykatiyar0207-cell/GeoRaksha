import React from 'react';

export default function LiveNarrationPanel({ activities = [] }) {
  return (
    <div className="panel narration-panel" style={{
      background: '#ffffff',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🎙️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Live System Narration
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Plain-English Multi-Agent Stream</span>
          </div>
        </div>
        <span style={{
          fontSize: '11px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8',
          padding: '2px 8px', borderRadius: '10px', fontWeight: 700
        }}>
          Autonomous
        </span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxHeight: '260px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: '12px' }}>
            Awaiting system events...
          </div>
        ) : (
          activities.slice(0, 10).map((act, i) => {
            const isLatest = i === 0;
            return (
              <div
                key={act.id || i}
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: isLatest ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)',
                  border: isLatest ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {isLatest && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '8px',
                    fontSize: '9px', fontWeight: 800, background: '#6366f1', color: '#ffffff',
                    padding: '1px 6px', borderRadius: '8px', textTransform: 'uppercase'
                  }}>
                    Latest
                  </span>
                )}
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>{act.icon || '⚡'}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isLatest ? '#312e81' : '#1e293b' }}>
                    {act.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    {act.description}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                    {act.timestamp}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
