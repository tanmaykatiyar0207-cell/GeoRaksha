import React from 'react';

export default function MapLegend({ isNav = false }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: isNav ? '120px' : '20px',
      left: '20px',
      zIndex: 900,
      background: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(10px)',
      padding: '10px 14px',
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      border: '1px solid rgba(226, 232, 240, 0.8)',
      fontSize: '11px',
      color: '#334155',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      pointerEvents: 'auto',
    }}>
      <div style={{ fontWeight: 800, fontSize: '11px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🗺️</span> Map Telemetry
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '4px', borderRadius: '2px', background: '#10b981' }} />
          <span>Clear (&gt;30 km/h)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '4px', borderRadius: '2px', background: '#fbbc04' }} />
          <span>Slow (15–30 km/h)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '4px', borderRadius: '2px', background: '#ea4335' }} />
          <span>Congested (&lt;15 km/h)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '4px', borderRadius: '2px', background: '#1a73e8' }} />
          <span>Emergency Route</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '4px', borderRadius: '2px', background: 'repeating-linear-gradient(45deg, #1e293b, #1e293b 3px, #eab308 3px, #eab308 6px)' }} />
          <span>Road Closed (🚧)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px' }}>🚌</span>
          <span>BMTC Bus</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px' }}>🚑</span>
          <span>Emergency Vehicle</span>
        </div>
      </div>
    </div>
  );
}
