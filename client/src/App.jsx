import React, { useState, useEffect } from 'react';
import MapView from './components/MapView';
import AlertPanel from './components/AlertPanel';
import ETADisplay from './components/ETADisplay';
import AmbulanceNavView from './components/AmbulanceNavView';
import AgentActivityFeed from './components/AgentActivityFeed';
import LiveNarrationPanel from './components/LiveNarrationPanel';
import DemoController from './components/DemoController';
import HospitalCommsModal from './components/HospitalCommsModal';
import LandingPage from './components/LandingPage';
import AboutPage from './components/AboutPage';
import ToastManager from './components/ToastManager';
import CommandKpiBar from './components/CommandKpiBar';
import TriageHospitalPanel from './components/TriageHospitalPanel';
import { useSocket } from './hooks/useSocket';
import { supabase } from './supabaseClient';
import './App.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showTelemedicine, setShowTelemedicine] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('georaksha_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('georaksha_auth_user', JSON.stringify(session.user));
      }
    }).catch(() => {});

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('georaksha_auth_user', JSON.stringify(session.user));
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('georaksha_auth_user');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // offline fallback
    }
    setUser(null);
    localStorage.removeItem('georaksha_auth_user');
    setShowLanding(true);
  };
  
  const { 
    busPositions, 
    segmentStatus, 
    alerts, 
    activeRoute, 
    abandonedRoutes,
    isConnected, 
    ambulancePosition, 
    agentActivities,
    hospitalMessages,
    timeSaved,
    missionSummary,
    sendHospitalMessage,
    addHospitalReply,
    getHospitals, 
    getAlternativeRoutes,
    selectRoute,
    endNavigation,
    injectRoadClosure,
    clearRoadClosure,
    injectCongestion,
    clearCongestion,
    triggerSignalTest,
    clearMissionSummary
  } = useSocket();

  const [viewMode, setViewMode] = useState('nav'); // 'dashboard' | 'nav'igation'
  const [sidebarTab, setSidebarTab] = useState('agents'); // 'agents' | 'overview'

  useEffect(() => {
    document.title = viewMode === 'dashboard' 
      ? 'GeoRaksha | Command Center' 
      : viewMode === 'about'
      ? 'GeoRaksha | System Architecture'
      : 'GeoRaksha | Tactical Corridor';
  }, [viewMode]);

  const busCount = Object.keys(busPositions).length || 362;
  const congestedCount = Object.values(segmentStatus).filter(s => s.status === 'congested').length;

  return (
    <>
      {showLanding || !user ? (
        <LandingPage 
          user={user}
          onLoginSuccess={(authedUser) => {
            setUser(authedUser);
            localStorage.setItem('georaksha_auth_user', JSON.stringify(authedUser));
          }}
          onLogout={handleLogout}
          onLaunch={(authedUser) => {
            if (authedUser) {
              setUser(authedUser);
              localStorage.setItem('georaksha_auth_user', JSON.stringify(authedUser));
            }
            setShowLanding(false);
          }} 
          liveBusCount={busCount} 
        />
      ) : (
        <div className="dashboard">
          <ToastManager activities={agentActivities} />
          <header className={`dashboard-header ${activeRoute ? 'nav-active-focus-ui' : ''}`}>
            <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer',
                  color: '#334155', padding: '4px', display: 'flex', alignItems: 'center'
                }}
              >
                ☰
              </button>
              <div 
                onClick={() => setShowLanding(true)}
                title="Return to Landing Page"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              >
                <img 
                  src="/logo.png" 
                  alt="GeoRaksha Logo" 
                  style={{ 
                    width: '52px', 
                    height: '52px', 
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 8px rgba(16, 185, 129, 0.35))',
                    transition: 'transform 0.2s ease',
                  }} 
                />
                <div className="pulse-dot"></div>
                <div>
                  <h1 style={{ lineHeight: 1.1, fontSize: '22px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.2px' }}>GeoRaksha</h1>
                  <span style={{ fontSize: '10px', color: '#059669', fontWeight: 800, letterSpacing: '0.6px' }}>
                    AUTONOMOUS EMERGENCY CORRIDOR PLATFORM
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* View Mode Toggle */}
              <div style={{
                display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px',
                border: '1px solid #e2e8f0',
              }}>
                <button
                  onClick={() => setShowLanding(true)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', border: 'none', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: 'transparent',
                    color: '#475569',
                    display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                  onMouseOver={e => { 
                    e.currentTarget.style.backgroundColor = '#e2e8f0'; 
                    e.currentTarget.style.color = '#0f172a'; 
                  }}
                  onMouseOut={e => { 
                    e.currentTarget.style.backgroundColor = 'transparent'; 
                    e.currentTarget.style.color = '#475569'; 
                  }}
                  title="Return to Mission Briefing"
                >
                  🎯 Mission Briefing
                </button>
                <button
                  onClick={() => setViewMode('dashboard')}
                  style={{
                    padding: '6px 16px', borderRadius: '8px', border: 'none', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: viewMode === 'dashboard' ? '#1a73e8' : 'transparent',
                    color: viewMode === 'dashboard' ? '#ffffff' : '#475569',
                    boxShadow: viewMode === 'dashboard' ? '0 2px 6px rgba(26, 115, 232, 0.3)' : 'none'
                  }}
                >
                  🏢 Command Center
                </button>
                <button
                  onClick={() => setViewMode('navigation')}
                  style={{
                    padding: '6px 16px', borderRadius: '8px', border: 'none', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: viewMode === 'navigation' ? '#1a73e8' : 'transparent',
                    color: viewMode === 'navigation' ? '#ffffff' : '#475569',
                    boxShadow: viewMode === 'navigation' ? '0 2px 6px rgba(26, 115, 232, 0.3)' : 'none'
                  }}
                >
                  ⚡ Tactical Corridor
                </button>
                <button
                  onClick={() => setViewMode('about')}
                  style={{
                    padding: '6px 16px', borderRadius: '8px', border: 'none', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    backgroundColor: viewMode === 'about' ? '#1a73e8' : 'transparent',
                    color: viewMode === 'about' ? '#ffffff' : '#475569',
                    boxShadow: viewMode === 'about' ? '0 2px 6px rgba(26, 115, 232, 0.3)' : 'none'
                  }}
                >
                  📐 System Architecture
                </button>
              </div>

              <div className="status-area" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isConnected ? (
                  <span className="status-badge online" style={{
                    backgroundColor: '#10b98115', color: '#059669', border: '1px solid #10b98140',
                    padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '11px',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                    System Online
                  </span>
                ) : (
                  <span className="status-badge offline" style={{
                    backgroundColor: '#ef444415', color: '#dc2626', border: '1px solid #ef444440',
                    padding: '4px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '11px'
                  }}>
                    Offline
                  </span>
                )}

                {/* Logged in User Profile Pill */}
                {user && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: '#f8fafc', padding: '3px 10px 3px 4px', borderRadius: '24px',
                    border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1a73e8, #059669)',
                      color: '#ffffff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '12px', fontWeight: 800,
                      boxShadow: '0 2px 4px rgba(26,115,232,0.25)'
                    }}>
                      {(user.user_metadata?.full_name || user.email || 'O').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                        {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Operator'}
                      </span>
                      <span style={{ fontSize: '9px', color: '#059669', fontWeight: 700 }}>
                        ● Verified Dispatcher
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      title="Sign Out to Landing Page"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '13px', color: '#94a3b8', padding: '3px 6px',
                        borderRadius: '6px', marginLeft: '4px', transition: 'all 0.15s'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.color = '#dc2626';
                        e.currentTarget.style.background = '#fee2e2';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      🚪
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
          
          {viewMode === 'dashboard' ? (
            <>
              <CommandKpiBar
                busCount={busCount}
                activeRoute={activeRoute}
                ambulancePosition={ambulancePosition}
                timeSaved={timeSaved}
                congestedCount={congestedCount}
              />
              <main className="dashboard-content">
              <div className={`map-area ${activeRoute ? 'nav-active-focus nav-active-focus-vignette' : ''}`} style={{ position: 'relative' }}>
                {/* Live City Telemetry Overlay Bar removed per user request */}

                <MapView busPositions={busPositions} segmentStatus={segmentStatus} activeRoute={activeRoute} ambulancePosition={ambulancePosition} />

                {/* Floating Demo Controller */}
                <DemoController
                  injectCongestion={injectCongestion}
                  clearCongestion={clearCongestion}
                  triggerSignalTest={triggerSignalTest}
                  injectRoadClosure={injectRoadClosure}
                  clearRoadClosure={clearRoadClosure}
                />
              </div>

              <aside className={`sidebar-area ${activeRoute ? 'nav-active-focus-ui' : ''}`} style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Sidebar Tab Switcher */}
                <div style={{
                  display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px',
                  border: '1px solid #e2e8f0'
                }}>
                  <button
                    onClick={() => setSidebarTab('agents')}
                    style={{
                      flex: 1, padding: '6px 8px', borderRadius: '8px', border: 'none',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      background: sidebarTab === 'agents' ? '#ffffff' : 'transparent',
                      color: sidebarTab === 'agents' ? '#0f172a' : '#64748b',
                      boxShadow: sidebarTab === 'agents' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    🤖 Agents
                  </button>
                  <button
                    onClick={() => setSidebarTab('triage')}
                    style={{
                      flex: 1, padding: '6px 8px', borderRadius: '8px', border: 'none',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      background: sidebarTab === 'triage' ? '#ffffff' : 'transparent',
                      color: sidebarTab === 'triage' ? '#dc2626' : '#64748b',
                      boxShadow: sidebarTab === 'triage' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    🚨 Triage & Beds
                  </button>
                  <button
                    onClick={() => setSidebarTab('overview')}
                    style={{
                      flex: 1, padding: '6px 8px', borderRadius: '8px', border: 'none',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      background: sidebarTab === 'overview' ? '#ffffff' : 'transparent',
                      color: sidebarTab === 'overview' ? '#0f172a' : '#64748b',
                      boxShadow: sidebarTab === 'overview' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    📊 Alerts
                  </button>
                </div>

                {sidebarTab === 'agents' ? (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <AgentActivityFeed activities={agentActivities} />
                  </div>
                ) : sidebarTab === 'triage' ? (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <TriageHospitalPanel 
                      onSwitchToNav={() => setViewMode('navigation')}
                      activeRoute={activeRoute}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <LiveNarrationPanel activities={agentActivities} />
                    <ETADisplay eta={activeRoute ? (ambulancePosition?.etaSeconds || activeRoute?.etaSeconds) : null} />
                    <AlertPanel alerts={alerts} />
                  </div>
                )}
              </aside>
            </main>
          </>
        ) : viewMode === 'about' ? (
            <AboutPage />
          ) : (
            <main className={activeRoute ? 'nav-active-focus nav-active-focus-vignette' : ''} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <AmbulanceNavView
                ambulancePosition={ambulancePosition}
                activeRoute={activeRoute}
                abandonedRoutes={abandonedRoutes}
                alerts={alerts}
                agentActivities={agentActivities}
                hospitalMessages={hospitalMessages}
                timeSaved={timeSaved}
                missionSummary={missionSummary}
                sendHospitalMessage={sendHospitalMessage}
                getHospitals={getHospitals}
                getAlternativeRoutes={getAlternativeRoutes}
                selectRoute={selectRoute}
                endNavigation={endNavigation}
                injectCongestion={injectCongestion}
                clearCongestion={clearCongestion}
                triggerSignalTest={triggerSignalTest}
                injectRoadClosure={injectRoadClosure}
                clearRoadClosure={clearRoadClosure}
                clearMissionSummary={clearMissionSummary}
                onOpenTelemedicine={() => setShowTelemedicine(true)}
              />
            </main>
          )}

          {/* ── Main Sidebar Menu Overlay ── */}
          {isSidebarOpen && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 3000, display: 'flex'
            }}>
              {/* Backdrop */}
              <div 
                style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }} 
                onClick={() => setIsSidebarOpen(false)}
              />
              {/* Sidebar */}
              <div style={{
                position: 'relative', width: '280px', background: '#f8fafc', height: '100%',
                display: 'flex', flexDirection: 'column', color: '#ffffff',
                boxShadow: '4px 0 20px rgba(0,0,0,0.5)', animation: 'slideInLeft 0.2s ease-out'
              }}>
                <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>GeoRaksha Menu</div>
                  <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '24px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 10px', gap: '8px' }}>
                  <button onClick={() => { setShowLanding(true); setIsSidebarOpen(false); }} style={{
                    background: 'transparent', color: '#cbd5e1',
                    padding: '12px 16px', borderRadius: '8px', textAlign: 'left', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '12px'
                  }}>
                    <span>🎯</span> Mission Briefing
                  </button>
                  <button onClick={() => { setViewMode('dashboard'); setIsSidebarOpen(false); }} style={{
                    background: viewMode === 'dashboard' ? '#1e293b' : 'transparent', color: viewMode === 'dashboard' ? '#38bdf8' : '#cbd5e1',
                    padding: '12px 16px', borderRadius: '8px', textAlign: 'left', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '12px'
                  }}>
                    <span>🏢</span> Command Center
                  </button>
                  <button onClick={() => { setViewMode('navigation'); setIsSidebarOpen(false); }} style={{
                    background: viewMode === 'navigation' ? '#1e293b' : 'transparent', color: viewMode === 'navigation' ? '#38bdf8' : '#cbd5e1',
                    padding: '12px 16px', borderRadius: '8px', textAlign: 'left', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '12px'
                  }}>
                    <span>⚡</span> Tactical Corridor
                  </button>
                  <button onClick={() => { setViewMode('about'); setIsSidebarOpen(false); }} style={{
                    background: viewMode === 'about' ? '#1e293b' : 'transparent', color: viewMode === 'about' ? '#38bdf8' : '#cbd5e1',
                    padding: '12px 16px', borderRadius: '8px', textAlign: 'left', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '12px'
                  }}>
                    <span>📐</span> System Architecture
                  </button>
                  <button onClick={() => { setShowTelemedicine(true); setIsSidebarOpen(false); }} style={{
                    background: 'transparent', color: '#475569',
                    padding: '12px 16px', borderRadius: '8px', textAlign: 'left', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '12px'
                  }}>
                    <span>🩺</span> Telemedicine Hub
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Telemedicine Modal (Accessible via Sidebar or Nav Button) ── */}
          <HospitalCommsModal
            isOpen={showTelemedicine}
            onClose={() => setShowTelemedicine(false)}
            hospitalName={'Destination Hospital'}
            etaSeconds={ambulancePosition?.etaSeconds || 0}
            messages={hospitalMessages}
            onSendMessage={sendHospitalMessage}
            onHospitalReply={addHospitalReply}
          />
        </div>
      )}
    </>
  );
}

export default App;
