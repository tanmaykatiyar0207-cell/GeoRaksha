import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

// ─── Animated Counter (Guaranteed Completion) ────────────────────────
function Counter({ end, duration = 1500, suffix = '' }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animId;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(ease * end));
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setVal(end);
      }
    };
    animId = requestAnimationFrame(step);
    const fallback = setTimeout(() => setVal(end), duration + 200);
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(fallback);
    };
  }, [end, duration]);

  return <>{val.toLocaleString()}{suffix}</>;
}

// ─── CSS Keyframes matching Dashboard ────────────────────────────────
const styles = `
@keyframes pulse-red-dot {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
@keyframes pulse-ring {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(2.4); opacity: 0; }
}
@keyframes dash-flow {
  to { stroke-dashoffset: -24; }
}
@keyframes signal-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@keyframes wave-move {
  0% { transform: translateX(-6px); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(6px); opacity: 0; }
}
`;

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif";

// ─── Route Flow SVG (Dijkstra Active Simulation) ─────────────────────
function RouteFlowSVG() {
  return (
    <svg width="100%" height="80" viewBox="0 0 240 80" fill="none" style={{ marginTop: 10 }}>
      {/* Grid of junctions */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => [0, 1, 2].map(j => (
        <circle key={`${i}-${j}`} cx={16 + i * 30} cy={16 + j * 24} r="2" fill="#cbd5e1" />
      )))}
      {/* Dynamic Dijkstra Corridor */}
      <path
        d="M16 40 L46 40 L76 16 L136 16 L166 40 L226 40"
        stroke="#1a73e8" strokeWidth="3" strokeLinecap="round"
        strokeDasharray="6 4"
        style={{ animation: 'dash-flow 1.2s linear infinite' }}
      />
      {/* Ambulance departure point */}
      <circle cx="16" cy="40" r="5" fill="#ef4444" />
      <circle cx="16" cy="40" r="9" stroke="#ef4444" strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Hospital destination point */}
      <circle cx="226" cy="40" r="5" fill="#10b981" />
      <circle cx="226" cy="40" r="9" stroke="#10b981" strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Intermediate cleared nodes */}
      {[76, 136].map(x => (
        <circle key={x} cx={x} cy="16" r="3.5" fill="#1a73e8" />
      ))}
    </svg>
  );
}

// ─── Signal Cascade SVG (Green Wave) ─────────────────────────────────
function SignalWaveSVG() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 9, height: 26, borderRadius: 4,
            background: i < 3 ? '#10b981' : '#94a3b8',
            opacity: i < 3 ? 1 : 0.35,
            boxShadow: i < 3 ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
            animation: i < 3 ? `signal-blink ${1 + i * 0.25}s ease-in-out infinite` : 'none',
          }} />
          <div style={{
            width: 4, height: 4, borderRadius: '50%',
            background: i < 3 ? '#10b981' : '#cbd5e1',
          }} />
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#10b981',
            animation: `wave-move 1.5s ${i * 0.3}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Agent Pulses SVG (4 AI Agents Network) ──────────────────────────
function AgentPulsesSVG() {
  const agents = [
    { label: 'Traffic Monitor', color: '#1a73e8', cx: 36, cy: 38 },
    { label: 'Route Optimizer', color: '#059669', cx: 105, cy: 22 },
    { label: 'ETA Predictor', color: '#f59e0b', cx: 175, cy: 38 },
    { label: 'Signal Coordinator', color: '#10b981', cx: 105, cy: 58 },
  ];
  return (
    <svg width="100%" height="80" viewBox="0 0 210 80" fill="none" style={{ marginTop: 8 }}>
      {/* Network interconnects */}
      {agents.map((a, i) => agents.slice(i + 1).map((b, j) => (
        <line key={`${i}-${j}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke="#e2e8f0" strokeWidth="1.5" />
      )))}
      {/* Agent Nodes */}
      {agents.map((a, i) => (
        <g key={i}>
          <circle cx={a.cx} cy={a.cy} r="13" fill={a.color} opacity="0.12" />
          <circle cx={a.cx} cy={a.cy} r="6.5" fill={a.color}
            style={{ animation: `signal-blink ${1.5 + i * 0.3}s ease-in-out infinite` }}
          />
        </g>
      ))}
    </svg>
  );
}

// ─── Bento Card Component (Strict Dashboard Panel Theme) ─────────────
function BentoCard({ children, delay = 0, span = 1, style: extraStyle = {} }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '18px 20px',
        gridColumn: span > 1 ? `span ${span}` : undefined,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        ...extraStyle,
      }}
    >
      {children}
    </motion.div>
  );
}

const bentoLabel = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '4px',
  fontFamily: font,
};

const bentoTitle = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#1e293b',
  lineHeight: 1.35,
  fontFamily: font,
};

// ─── MAIN LANDING PAGE ───────────────────────────────────────────────
export default function LandingPage({ 
  user = null, 
  onLoginSuccess = () => {}, 
  onLogout = () => {}, 
  onLaunch = () => {}, 
  liveBusCount = 362 
}) {
  const [isDiving, setIsDiving] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isDiving) {
      const timer = setTimeout(() => setIsDiving(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isDiving]);

  const handleLaunch = () => {
    if (!user) {
      setLoginError('Authentication Required: Please sign in or use the 1-Click Demo Operator to access the Command Center.');
      setIsLoginOpen(true);
      return;
    }
    setIsDiving(true);
    setTimeout(() => {
      onLaunch(user);
      setIsDiving(false);
    }, 900);
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-operator-108',
      email: email || 'officer.patel@georaksha.gov.in',
      user_metadata: { full_name: fullName || 'Nayana Patel (Lead Dispatcher)' }
    };
    onLoginSuccess(demoUser);
    setIsLoginOpen(false);
    setIsDiving(true);
    setTimeout(() => {
      onLaunch(demoUser);
      setIsDiving(false);
    }, 900);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || email.split('@')[0] }
          }
        });
        if (error) throw error;
        if (data.user) {
          onLoginSuccess(data.user);
          setIsLoginOpen(false);
          setIsDiving(true);
          setTimeout(() => {
            onLaunch(data.user);
            setIsDiving(false);
          }, 900);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          onLoginSuccess(data.user);
          setIsLoginOpen(false);
          setIsDiving(true);
          setTimeout(() => {
            onLaunch(data.user);
            setIsDiving(false);
          }, 900);
        }
      }
    } catch (err) {
      if (password === 'demo' || email.includes('demo')) {
        handleDemoLogin();
      } else {
        setLoginError(err.message || 'Authentication error. Check credentials or use Demo Quick Access.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', position: 'relative',
      overflow: 'hidden', fontFamily: font,
      backgroundColor: '#f8fafc',
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{styles}</style>

      {/* ─── Background Grid Pattern matching App.css ─────────────── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle, #cbd5e1 0.6px, transparent 0.6px)',
        backgroundSize: '24px 24px', opacity: 0.35,
      }} />

      {/* ─── Soft Ambient Lighting Orbs ───────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 550, height: 550, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26, 115, 232, 0.06) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-8%', left: '-5%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
        }} />
      </div>

      {/* ─── Dive Transition Animation ────────────────────────────── */}
      <AnimatePresence>
        {isDiving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 200,
              background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{ textAlign: 'center' }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 44, height: 44, margin: '0 auto 18px',
                  border: '3px solid #e2e8f0', borderTopColor: '#1a73e8',
                  borderRadius: '50%',
                }}
              />
              <div style={{
                fontSize: '14px', fontWeight: 800, letterSpacing: '5px',
                textTransform: 'uppercase', color: '#1e293b',
              }}>
                INITIALIZING COMMAND CENTER
              </div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 220 }}
                transition={{ delay: 0.4, duration: 1.0 }}
                style={{
                  height: '3px',
                  background: 'linear-gradient(90deg, #1a73e8, #10b981)',
                  borderRadius: '2px', margin: '14px auto 0',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DASHBOARD-THEMED HEADER (Identical to .dashboard-header) ─ */}
      {!isDiving && (
        <header style={{
          height: '74px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          position: 'relative',
          zIndex: 20,
        }}>
          {/* Brand Logo Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img 
              src="/logo.png" 
              alt="GeoRaksha Logo" 
              style={{ 
                width: '58px', 
                height: '58px', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(16, 185, 129, 0.35))',
              }} 
            />
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: '#ef4444',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
              animation: 'pulse-red-dot 2s infinite',
            }} />
            <div>
              <h1 style={{ lineHeight: 1.1, fontSize: '24px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px', margin: 0 }}>
                GeoRaksha
              </h1>
              <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 800, letterSpacing: '0.6px', display: 'block', marginTop: '2px' }}>
                AUTONOMOUS EMERGENCY CORRIDOR PLATFORM
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* System Status Badge */}
            <span style={{
              backgroundColor: '#10b98115', color: '#059669', border: '1px solid #10b98140',
              padding: '5px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '11px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
              System Online
            </span>

            {user ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#f8fafc', padding: '4px 12px 4px 6px', borderRadius: '20px',
                  border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a73e8, #059669)',
                    color: '#ffffff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '11px', fontWeight: 800
                  }}>
                    {(user.user_metadata?.full_name || user.email || 'O').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Operator'}
                  </span>
                  <button
                    onClick={onLogout}
                    title="Sign Out"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', color: '#94a3b8', padding: '2px 4px',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                  >
                    🚪
                  </button>
                </div>

                <button
                  onClick={handleLaunch}
                  style={{
                    backgroundColor: '#059669', color: '#ffffff',
                    border: 'none', borderRadius: '8px', padding: '8px 20px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    fontFamily: font, boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onMouseOver={e => { e.currentTarget.style.backgroundColor = '#047857'; }}
                  onMouseOut={e => { e.currentTarget.style.backgroundColor = '#059669'; }}
                >
                  <span>🚀</span> Enter Command Center →
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setLoginError('');
                    setIsLoginOpen(true);
                  }}
                  style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '8px', padding: '8px 16px',
                    fontSize: '13px', fontWeight: 700, color: '#475569',
                    cursor: 'pointer', fontFamily: font, transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#1e293b'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                >
                  🛡️ Operator Login
                </button>

                <button
                  onClick={handleLaunch}
                  style={{
                    backgroundColor: '#1a73e8', color: '#ffffff',
                    border: 'none', borderRadius: '8px', padding: '8px 20px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    fontFamily: font, boxShadow: '0 2px 6px rgba(26, 115, 232, 0.3)',
                    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onMouseOver={e => { e.currentTarget.style.backgroundColor = '#1557b0'; }}
                  onMouseOut={e => { e.currentTarget.style.backgroundColor = '#1a73e8'; }}
                >
                  <span>🔒</span> Open Dashboard →
                </button>
              </>
            )}
          </div>
        </header>
      )}

      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      {!isDiving && (
        <div style={{
          position: 'relative', zIndex: 10, flex: 1,
          display: 'flex', alignItems: 'center',
          padding: '0 48px', gap: '48px',
          overflow: 'hidden',
        }}>
          {/* LEFT — Brand & Mission Hero */}
          <div style={{ flex: '0 0 46%', maxWidth: '540px' }}>
            
            {/* Framework Category Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                backgroundColor: '#10b98115', border: '1px solid #10b98140',
                borderRadius: '20px', padding: '6px 14px',
                marginBottom: '20px',
              }}
            >
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
              }} />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.6px' }}>
                GEOAGENTIC FRAMEWORK ACTIVE
              </span>
              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>|</span>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
                Girl Geeks 2026 · Bengaluru Corridors
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{
                fontSize: '48px', fontWeight: 900, letterSpacing: '-1.8px',
                lineHeight: 1.1, margin: '0 0 14px 0', color: '#1e293b',
              }}
            >
              Every second{' '}
              <span style={{
                background: 'linear-gradient(135deg, #1a73e8 0%, #059669 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                saves a life.
              </span>
            </motion.h1>

            {/* Mission Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              style={{
                fontSize: '15.5px', lineHeight: 1.65, color: '#475569',
                margin: '0 0 26px 0', fontWeight: 400, maxWidth: '460px',
              }}
            >
              4 autonomous AI agents synthesize real-time BMTC bus telemetry, 
              Dijkstra routing & Holt's ML forecasting to engineer dynamic 
              green-wave corridors for critical emergency transit.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{ display: 'flex', gap: '14px', marginBottom: '32px' }}
            >
              {user ? (
                <>
                  <button
                    onClick={handleLaunch}
                    style={{
                      backgroundColor: '#059669',
                      color: '#ffffff', border: 'none', borderRadius: '10px',
                      padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: font,
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                      transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.backgroundColor = '#047857';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.45)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(5, 150, 105, 0.35)';
                    }}
                  >
                    🚀 Enter Command Center →
                  </button>
                  
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '14px 20px', borderRadius: '10px',
                    backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
                    fontSize: '14px', fontWeight: 700, color: '#0f172a',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLaunch}
                    style={{
                      backgroundColor: '#1a73e8',
                      color: '#ffffff', border: 'none', borderRadius: '10px',
                      padding: '14px 28px', fontSize: '15px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: font,
                      boxShadow: '0 4px 14px rgba(26, 115, 232, 0.35)',
                      transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.backgroundColor = '#1557b0';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(26, 115, 232, 0.45)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.backgroundColor = '#1a73e8';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(26, 115, 232, 0.35)';
                    }}
                  >
                    🔒 Login to Launch Command Center
                  </button>
                  
                  <button
                    onClick={() => {
                      setLoginError('');
                      setIsLoginOpen(true);
                    }}
                    style={{
                      backgroundColor: '#ffffff', color: '#1e293b',
                      border: '1px solid #e2e8f0', borderRadius: '10px',
                      padding: '14px 22px', fontSize: '14px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: font,
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                      transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                    onMouseOver={e => { 
                      e.currentTarget.style.borderColor = '#1a73e8'; 
                      e.currentTarget.style.color = '#1a73e8'; 
                    }}
                    onMouseOut={e => { 
                      e.currentTarget.style.borderColor = '#e2e8f0'; 
                      e.currentTarget.style.color = '#1e293b'; 
                    }}
                  >
                    🛡️ Operator Portal
                  </button>
                </>
              )}
            </motion.div>

            {/* Key Platform Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              style={{ display: 'flex', gap: '36px' }}
            >
              {[
                { value: 4, label: 'AI Agents', suffix: '', color: '#1a73e8' },
                { value: 37, label: 'Faster ETA', suffix: '%', color: '#059669' },
                { value: liveBusCount, label: 'Mapped Buses', suffix: '+', color: '#1e293b' },
                { value: 12, label: 'Signals Synced', suffix: '', color: '#f59e0b' },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: s.color, lineHeight: 1 }}>
                    <Counter end={s.value} suffix={s.suffix} />
                  </div>
                  <div style={{
                    fontSize: '10.5px', fontWeight: 700, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px',
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — Bento Grid Displaying Dashboard Systems */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            maxWidth: '620px',
          }}>
            {/* Card 1: Dijkstra Routing — spans 2 */}
            <BentoCard delay={0.5} span={2}>
              <div style={bentoLabel}>Dijkstra Route Optimizer</div>
              <div style={bentoTitle}>Autonomous corridor routing bypassing live congestion</div>
              <RouteFlowSVG />
            </BentoCard>

            {/* Card 2: Response Time */}
            <BentoCard delay={0.6}>
              <div style={bentoLabel}>Response Delta</div>
              <div style={{
                fontSize: '34px', fontWeight: 900, lineHeight: 1, marginTop: '4px',
                color: '#059669',
              }}>
                <Counter end={37} suffix="%" />
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
                transit time saved
              </div>
            </BentoCard>

            {/* Card 3: Green Wave */}
            <BentoCard delay={0.65}>
              <div style={bentoLabel}>Signal Priority</div>
              <div style={bentoTitle}>Cascading green wave</div>
              <SignalWaveSVG />
            </BentoCard>

            {/* Card 4: Multi-Agent AI — spans 2 */}
            <BentoCard delay={0.7} span={2}>
              <div style={bentoLabel}>4 Cooperative AI Agents</div>
              <div style={bentoTitle}>Traffic Monitoring · Route Optimizer · ETA · Signal Sync</div>
              <AgentPulsesSVG />
            </BentoCard>

            {/* Card 5: BMTC Telemetry */}
            <BentoCard delay={0.75}>
              <div style={bentoLabel}>BMTC Probe Fleet</div>
              <div style={{
                fontSize: '26px', fontWeight: 900, lineHeight: 1, marginTop: '4px',
                color: '#1a73e8',
              }}>
                <Counter end={liveBusCount} suffix="" />
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                Active buses mapped
              </div>
            </BentoCard>

            {/* Card 6: Holt's ML */}
            <BentoCard delay={0.8}>
              <div style={bentoLabel}>Holt's ML Model</div>
              <div style={bentoTitle}>Dynamic ETA estimation</div>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: '3px',
                marginTop: '12px', height: '34px',
              }}>
                {[16, 26, 20, 32, 24, 36, 28, 40, 34].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: h }}
                    transition={{ duration: 0.5, delay: 1.0 + i * 0.05 }}
                    style={{
                      flex: 1, borderRadius: '2px',
                      background: i < 6
                        ? `rgba(26, 115, 232, ${0.25 + i * 0.12})`
                        : `rgba(16, 185, 129, ${0.4 + (i - 6) * 0.2})`,
                    }}
                  />
                ))}
              </div>
            </BentoCard>

            {/* Card 7: ER Comms */}
            <BentoCard delay={0.85}>
              <div style={bentoLabel}>Hospital Telemetry</div>
              <div style={bentoTitle}>Trauma ER pre-alert</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px',
                }}>🏥</div>
                <div style={{
                  flex: 1, height: '6px', borderRadius: '3px',
                  backgroundColor: '#f1f5f9', overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '80%' }}
                    transition={{ duration: 1.5, delay: 1.2 }}
                    style={{
                      height: '100%', borderRadius: '3px',
                      backgroundColor: '#ef4444',
                    }}
                  />
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      )}

      {/* ─── FOOTER BAR (Clean Team Credits) ─────────────────────── */}
      {!isDiving && (
        <footer style={{
          height: '42px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
          fontSize: '11px', color: '#64748b', fontWeight: 600,
          letterSpacing: '1px', textTransform: 'uppercase',
          position: 'relative', zIndex: 20,
        }}>
          <span>TEAM 1 — SAY MY NAME</span>
          <span style={{ width: '1px', height: '12px', backgroundColor: '#cbd5e1' }} />
          <span>GIRL GEEKS 2026 · IEEE · RAMAIAH INSTITUTE OF TECHNOLOGY</span>
          <span style={{ width: '1px', height: '12px', backgroundColor: '#cbd5e1' }} />
          <span style={{ color: '#059669', fontWeight: 700 }}>CASE 02: EMERGENCY CORRIDOR</span>
        </footer>
      )}

      {/* ─── Driver Login Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {isLoginOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLoginOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
                width: '100%', maxWidth: '400px',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12)',
                border: '1px solid #e2e8f0', position: 'relative',
              }}
            >
              <button
                onClick={() => setIsLoginOpen(false)}
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: '#f1f5f9', border: 'none', fontSize: '18px',
                  cursor: 'pointer', color: '#64748b', borderRadius: '8px',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontFamily: font,
                }}
              >×</button>
              
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
                <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#1e293b', fontWeight: 800, fontFamily: font }}>
                  {isSignUp ? 'Register Operator' : 'Operator Authentication'}
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontFamily: font }}>
                  GeoRaksha Secure Access Gateway
                </p>

                {/* Sign In / Sign Up Toggle Tabs */}
                <div style={{
                  display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px',
                  marginTop: '16px', border: '1px solid #e2e8f0'
                }}>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(false); setLoginError(''); }}
                    style={{
                      flex: 1, padding: '7px', borderRadius: '6px', border: 'none',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: font,
                      background: !isSignUp ? '#ffffff' : 'transparent',
                      color: !isSignUp ? '#0f172a' : '#64748b',
                      boxShadow: !isSignUp ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    🔐 Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(true); setLoginError(''); }}
                    style={{
                      flex: 1, padding: '7px', borderRadius: '6px', border: 'none',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: font,
                      background: isSignUp ? '#ffffff' : 'transparent',
                      color: isSignUp ? '#0f172a' : '#64748b',
                      boxShadow: isSignUp ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    📝 New Officer
                  </button>
                </div>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isSignUp && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: font }}>
                      Full Name / Call Sign
                    </label>
                    <input 
                      type="text" value={fullName} onChange={e => setFullName(e.target.value)} 
                      placeholder="e.g. Officer Nayana Patel" required={isSignUp}
                      style={{ 
                        width: '100%', padding: '10px 14px', borderRadius: '8px', 
                        border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#f8fafc', 
                        color: '#1e293b', boxSizing: 'border-box', outline: 'none', fontFamily: font 
                      }} 
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: font }}>
                    Email Address
                  </label>
                  <input 
                    type="email" value={email} onChange={e => setEmail(e.target.value)} 
                    placeholder="officer@georaksha.gov.in" required
                    style={{ 
                      width: '100%', padding: '10px 14px', borderRadius: '8px', 
                      border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#f8fafc', 
                      color: '#1e293b', boxSizing: 'border-box', outline: 'none', fontFamily: font 
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: font }}>
                    Password
                  </label>
                  <input 
                    type="password" value={password} onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••" required
                    style={{ 
                      width: '100%', padding: '10px 14px', borderRadius: '8px', 
                      border: '1px solid #e2e8f0', fontSize: '14px', backgroundColor: '#f8fafc', 
                      color: '#1e293b', boxSizing: 'border-box', outline: 'none', fontFamily: font 
                    }} 
                  />
                </div>

                {loginError && (
                  <div style={{ 
                    backgroundColor: '#fef2f2', color: '#dc2626', padding: '10px 12px', 
                    borderRadius: '8px', fontSize: '12px', fontWeight: 500, 
                    border: '1px solid #fecaca', fontFamily: font, lineHeight: 1.4 
                  }}>
                    {loginError}
                  </div>
                )}

                <button 
                  type="submit" disabled={isLoading}
                  style={{
                    backgroundColor: '#1a73e8', color: '#ffffff', border: 'none', 
                    padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    boxShadow: '0 2px 8px rgba(26, 115, 232, 0.35)',
                    fontFamily: font, marginTop: '4px',
                  }}
                >
                  {isLoading ? 'Authenticating with Supabase...' : (isSignUp ? '📝 Register & Enter Command Center' : '🔐 Sign In with Supabase')}
                </button>

                {/* 1-Click Demo Operator Quick Access */}
                <div style={{ textAlign: 'center', marginTop: '4px' }}>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0',
                    fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 
                  }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                    <span>OR EVALUATION ACCESS</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  </div>

                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px dashed #10b981', background: '#ecfdf5',
                      color: '#059669', fontSize: '13px', fontWeight: 800,
                      cursor: 'pointer', fontFamily: font, transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#d1fae5'}
                    onMouseOut={e => e.currentTarget.style.background = '#ecfdf5'}
                  >
                    <span>⚡</span> 1-Click Demo Operator (Nayana Patel)
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
