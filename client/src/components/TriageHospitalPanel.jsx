import React, { useState } from 'react';

export default function TriageHospitalPanel({ 
  onSwitchToNav = () => {},
  activeRoute = null
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'critical' | 'ready'

  const incidents = [
    {
      id: 'INC-8901',
      code: 'CODE RED: ACUTE STEMI',
      condition: 'Cardiac Arrest • Defib Required',
      severity: 'CRITICAL',
      severityColor: '#dc2626',
      severityBg: '#fef2f2',
      origin: 'Koramangala 5th Block',
      destination: "St. John's Hospital",
      eta: '4.8 min',
      unit: 'AMB-KA01-901',
      status: activeRoute ? 'GREEN CORRIDOR ACTIVE' : 'CORRIDOR SECURED',
      statusColor: '#059669',
      statusBg: '#ecfdf5',
      pulse: true,
      time: 'Just now'
    },
    {
      id: 'INC-8902',
      code: 'ROAD TRAFFIC ACCIDENT',
      condition: 'Multiple Polytrauma • High Impact',
      severity: 'CRITICAL',
      severityColor: '#dc2626',
      severityBg: '#fef2f2',
      origin: 'Indiranagar 100ft Rd',
      destination: 'Manipal Hospital (Old Airport Rd)',
      eta: '8.2 min',
      unit: 'AMB-KA03-412',
      status: 'UNIT EN ROUTE',
      statusColor: '#2563eb',
      statusBg: '#eff6ff',
      pulse: false,
      time: '3m ago'
    },
    {
      id: 'INC-8903',
      code: 'ACUTE ISCHEMIC STROKE',
      condition: 'Thrombolytic Window < 3.5h',
      severity: 'HIGH',
      severityColor: '#d97706',
      severityBg: '#fffbeb',
      origin: 'HSR Layout Sector 2',
      destination: 'Apollo Hospital (Bannerghatta)',
      eta: '11.5 min',
      unit: 'AMB-KA05-118',
      status: 'CATH LAB RESERVED',
      statusColor: '#7c3aed',
      statusBg: '#f5f3ff',
      pulse: false,
      time: '7m ago'
    },
    {
      id: 'INC-8904',
      code: 'ACUTE RESPIRATORY FAILURE',
      condition: 'SpO2 < 78% • High Flow O2',
      severity: 'HIGH',
      severityColor: '#d97706',
      severityBg: '#fffbeb',
      origin: 'Jayanagar 4th Block',
      destination: 'Victoria Emergency Hospital',
      eta: '14.0 min',
      unit: 'AMB-KA01-774',
      status: 'TRIAGE INTAKE PENDING',
      statusColor: '#475569',
      statusBg: '#f1f5f9',
      pulse: false,
      time: '12m ago'
    }
  ];

  const hospitals = [
    {
      name: "St. John's Medical College Hospital",
      location: 'Koramangala',
      icuBeds: 3,
      totalIcu: 8,
      traumaBays: 'Bay 1 & 2 Free',
      cathLab: 'Ready',
      status: 'READY FOR INTAKE',
      statusColor: '#059669',
      statusBg: '#ecfdf5',
      distance: '2.4 km'
    },
    {
      name: 'Manipal Hospital',
      location: 'HAL Old Airport Rd',
      icuBeds: 4,
      totalIcu: 10,
      traumaBays: 'Bay 3 Free',
      cathLab: 'Standby',
      status: 'READY FOR INTAKE',
      statusColor: '#059669',
      statusBg: '#ecfdf5',
      distance: '4.1 km'
    },
    {
      name: 'Apollo Hospital',
      location: 'Bannerghatta Rd',
      icuBeds: 1,
      totalIcu: 6,
      traumaBays: 'Full (Occupied)',
      cathLab: 'In Use',
      status: 'HIGH OCCUPANCY',
      statusColor: '#d97706',
      statusBg: '#fffbeb',
      distance: '6.8 km'
    },
    {
      name: 'Victoria Hospital Emergency Care',
      location: 'City Market / KR Market',
      icuBeds: 6,
      totalIcu: 12,
      traumaBays: 'Bay 1, 2, 4 Free',
      cathLab: 'Ready',
      status: 'READY FOR INTAKE',
      statusColor: '#059669',
      statusBg: '#ecfdf5',
      distance: '7.5 km'
    }
  ];

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'critical') return inc.severity === 'CRITICAL';
    return true;
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      height: '100%',
      overflowY: 'auto',
      paddingRight: '2px'
    }}>
      {/* ── Section 1: Active Triage Queue ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🚨</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                Live Incident Triage
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Bengaluru 108 Emergency Feed
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '2px', borderRadius: '8px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                border: 'none',
                background: filter === 'all' ? '#ffffff' : 'transparent',
                color: filter === 'all' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: filter === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              All ({incidents.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              style={{
                border: 'none',
                background: filter === 'critical' ? '#ffffff' : 'transparent',
                color: filter === 'critical' ? '#dc2626' : '#64748b',
                fontWeight: 700,
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: filter === 'critical' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Critical (2)
            </button>
          </div>
        </div>

        {/* Incident List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              {/* Header: ID, Severity, Time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>
                    {inc.id}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: inc.severityBg,
                    color: inc.severityColor,
                    border: `1px solid ${inc.severityColor}25`
                  }}>
                    {inc.severity}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                  {inc.time}
                </span>
              </div>

              {/* Condition Title */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  {inc.code}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                  {inc.condition}
                </div>
              </div>

              {/* Origin -> Destination */}
              <div style={{
                fontSize: '11px',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 600
              }}>
                <span style={{ color: '#94a3b8' }}>📍</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {inc.origin}
                </span>
                <span style={{ color: '#cbd5e1' }}>→</span>
                <span style={{ color: '#059669', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {inc.destination}
                </span>
              </div>

              {/* Status and Action */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '4px',
                paddingTop: '6px',
                borderTop: '1px dashed #e2e8f0'
              }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: inc.statusBg,
                  color: inc.statusColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {inc.pulse && (
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: inc.statusColor,
                      display: 'inline-block',
                      animation: 'pulse 1.5s infinite'
                    }} />
                  )}
                  {inc.status}
                </span>

                <button
                  onClick={onSwitchToNav}
                  style={{
                    border: 'none',
                    background: '#1a73e8',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 1px 3px rgba(26,115,232,0.25)'
                  }}
                >
                  🚑 View Corridor
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Receiving Hospital Network ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🏥</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                Receiving Facilities
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Real-Time Trauma Readiness
              </div>
            </div>
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '12px',
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #10b98130'
          }}>
            4 ONLINE
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {hospitals.map((h, idx) => (
            <div
              key={idx}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                    {h.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                    📍 {h.location} • {h.distance} away
                  </div>
                </div>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: h.statusBg,
                  color: h.statusColor
                }}>
                  {h.status}
                </span>
              </div>

              {/* Resource Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                marginTop: '4px',
                paddingTop: '6px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>ICU BEDS</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: h.icuBeds > 1 ? '#059669' : '#d97706' }}>
                    {h.icuBeds} / {h.totalIcu} Free
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>TRAUMA BAY</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.traumaBays}
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '4px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>CATH LAB</div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: h.cathLab === 'Ready' ? '#059669' : '#64748b' }}>
                    {h.cathLab}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
