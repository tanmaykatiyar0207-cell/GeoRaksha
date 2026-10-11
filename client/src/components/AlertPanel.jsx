import React from 'react';

export default function AlertPanel({ alerts = [] }) {
  // If no ambulance alert is active, show ambient city-wide alerts for the dashboard aesthetic
  const displayAlerts = alerts.length > 0 ? alerts : [
    {
      junctionName: "Silk Board Junction",
      type: "City-Wide Advisory",
      reason: "Waterlogging reported. Speed reduced by 40%.",
      icon: "🌧️",
      color: "#f59e0b" // Amber
    },
    {
      junctionName: "BTM Layout Stage 2",
      type: "Traffic Alert",
      reason: "Metro pillar construction. 1 lane closed.",
      icon: "🚧",
      color: "#f59e0b" // Amber
    }
  ];

  return (
    <div className="panel alert-panel">
      <h2>Live Alerts</h2>
      <div className="alerts-list">
        {displayAlerts.map((alert, i) => {
          const isRealTime = !!alert.secondsToArrival;
          const bg = isRealTime ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
          const border = isRealTime ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)';
          const titleColor = isRealTime ? '#dc2626' : '#d97706';
          
          return (
            <div key={i} className="alert-item active" style={{ display: 'flex', gap: '12px', background: bg, padding: '12px', borderRadius: '8px', border: `1px solid ${border}` }}>
              <div className="alert-icon" style={{ fontSize: '20px', color: titleColor }}>
                {isRealTime ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                ) : alert.icon}
              </div>
              <div className="alert-content">
                <h4 style={{ margin: '0 0 4px 0', color: titleColor, fontWeight: 700 }}>
                  {isRealTime ? 'Signal Priority Advisory' : alert.type}
                </h4>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#334155' }}>
                  {isRealTime ? `Approaching ` : ''}<strong>{alert.junctionName || alert.junctionId}</strong>
                </p>
                <div className="alert-time" style={{ fontSize: '12px', color: '#64748b' }}>
                  {isRealTime ? (
                    <span>Estimated arrival in <strong>{alert.secondsToArrival}s</strong> {alert.distMeters ? `(${alert.distMeters}m away)` : ''}</span>
                  ) : (
                    <span>{alert.reason}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
