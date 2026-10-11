import React from 'react';

export default function ETADisplay({ eta }) {
  return (
    <div className="panel eta-panel">
      <h2>Estimated Time of Arrival</h2>
      <div className="eta-content">
        {eta === null || eta === undefined ? (
          <div className="empty-state">
            <h1 className="placeholder-eta">--:--</h1>
            <p>Awaiting route selection</p>
          </div>
        ) : (
          <div className="active-eta" style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '48px', fontWeight: 300, color: '#1a73e8',
              letterSpacing: '2px', marginBottom: '8px',
              
            }}>
              {Math.floor(eta / 60).toString().padStart(2, '0')}:
              {Math.floor(eta % 60).toString().padStart(2, '0')}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>Expected arrival</p>
          </div>
        )}
      </div>
    </div>
  );
}
