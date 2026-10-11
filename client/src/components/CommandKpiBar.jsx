import React from 'react';

export default function CommandKpiBar({ 
  busCount = 362, 
  activeRoute = null, 
  ambulancePosition = null,
  timeSaved = 0,
  congestedCount = 0 
}) {
  const isMissionActive = Boolean(activeRoute || ambulancePosition);
  const minutesSaved = timeSaved ? (timeSaved / 60).toFixed(1) : '14.2';

  const kpis = [
    {
      id: 'fleet',
      icon: '🚑',
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      label: 'FLEET READINESS',
      value: isMissionActive ? '1 Active Mission' : '5 Units Available',
      subtext: isMissionActive ? 'Emergency Corridor Engaged' : '4 Standby • 1 En Route',
      badge: isMissionActive ? 'ACTIVE' : 'READY',
      badgeColor: isMissionActive ? '#dc2626' : '#16a34a',
      badgeBg: isMissionActive ? '#fef2f2' : '#f0fdf4',
      pulse: isMissionActive
    },
    {
      id: 'probes',
      icon: '🚌',
      iconBg: '#ecfdf5',
      iconColor: '#059669',
      label: 'SENSING PROBE FLEET',
      value: `${busCount} Live Bus Probes`,
      subtext: 'Decentralized Floating Car Data',
      badge: 'STREAMING',
      badgeColor: '#059669',
      badgeBg: '#ecfdf5',
      pulse: true
    },
    {
      id: 'hospitals',
      icon: '🏥',
      iconBg: '#faf5ff',
      iconColor: '#9333ea',
      label: 'HOSPITAL READINESS',
      value: '4 Facilities Online',
      subtext: '9 Trauma Bays • 14 ICU Beds',
      badge: 'SYNCED',
      badgeColor: '#7c3aed',
      badgeBg: '#f5f3ff',
      pulse: false
    },
    {
      id: 'greenwave',
      icon: '🚦',
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      label: 'SIGNAL PREEMPTION',
      value: isMissionActive ? 'Green Corridor Armed' : 'Automated Cascade Standby',
      subtext: 'Dynamic ITMS Signal Override',
      badge: isMissionActive ? 'LIVE OVERRIDE' : 'STANDBY',
      badgeColor: isMissionActive ? '#059669' : '#d97706',
      badgeBg: isMissionActive ? '#ecfdf5' : '#fffbeb',
      pulse: isMissionActive
    },
    {
      id: 'impact',
      icon: '⚡',
      iconBg: '#f0fdf4',
      iconColor: '#16a34a',
      label: 'EST. TIME SAVED',
      value: `${minutesSaved} Min / Mission`,
      subtext: 'Holt ML Dynamic Re-routing',
      badge: '+42% FASTER',
      badgeColor: '#15803d',
      badgeBg: '#dcfce7',
      pulse: false
    }
  ];

  return (
    <div style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '10px 24px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      alignItems: 'center',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
      zIndex: 20,
      position: 'relative',
      overflowX: 'auto'
    }}>
      {kpis.map((kpi, idx) => (
        <div 
          key={kpi.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 12px',
            borderRight: idx < kpis.length - 1 ? '1px solid #f1f5f9' : 'none',
            minWidth: 0
          }}
        >
          {/* Icon Badge */}
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: kpi.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
            border: `1px solid ${kpi.iconBg}`
          }}>
            {kpi.icon}
          </div>

          {/* Metric Details */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              marginBottom: '2px'
            }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#64748b',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {kpi.label}
              </span>
              
              {/* Badge */}
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '4px',
                background: kpi.badgeBg,
                color: kpi.badgeColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                lineHeight: 1.3
              }}>
                {kpi.pulse && (
                  <span style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: kpi.badgeColor,
                    display: 'inline-block',
                    animation: 'pulse 1.5s infinite'
                  }} />
                )}
                {kpi.badge}
              </span>
            </div>

            <div style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2
            }}>
              {kpi.value}
            </div>

            <div style={{
              fontSize: '11px',
              color: '#94a3b8',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: '1px'
            }}>
              {kpi.subtext}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
