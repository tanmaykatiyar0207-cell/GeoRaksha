import React, { useState, useEffect, useRef } from 'react';

export default function ToastManager({ activities = [] }) {
  const [toasts, setToasts] = useState([]);
  const lastSeenRef = useRef(0);

  useEffect(() => {
    if (activities.length === 0) return;

    // Only process NEW activities (not ones we already showed)
    const newActivities = activities.slice(0, 3); // Check latest 3
    
    newActivities.forEach(activity => {
      const activityTime = activity.timestamp ? new Date(activity.timestamp).getTime() : Date.now();
      if (activityTime <= lastSeenRef.current) return;
      
      // Only show toasts for important events
      const isImportant = 
        activity.description?.toLowerCase().includes('reroute') ||
        activity.description?.toLowerCase().includes('congestion') ||
        activity.description?.toLowerCase().includes('closure') ||
        activity.description?.toLowerCase().includes('signal') ||
        activity.description?.toLowerCase().includes('green wave') ||
        activity.agent === 'route';

      if (!isImportant) return;

      const AGENT_ICONS = {
        traffic: '??',
        route: '???',
        eta: '??',
        signal: '??'
      };

      const toast = {
        id: "toast__",
        icon: AGENT_ICONS[activity.agent] || '?',
        text: activity.description,
        agent: activity.agent,
        createdAt: Date.now()
      };

      setToasts(prev => [toast, ...prev.slice(0, 4)]); // Max 5 toasts visible

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 5000);
    });

    lastSeenRef.current = Date.now();
  }, [activities.length]); // Trigger when activity count changes

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: '80px', right: '20px', zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: '8px',
      pointerEvents: 'none', maxWidth: '360px'
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(12px)',
            color: '#ffffff', padding: '12px 16px', borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            fontSize: '13px', lineHeight: 1.4, fontWeight: 600,
            animation: 'slideInRight 0.3s ease-out',
            pointerEvents: 'auto'
          }}
        >
          <span style={{ fontSize: '18px', flexShrink: 0 }}>{toast.icon}</span>
          <div style={{ flex: 1 }}>{toast.text}</div>
        </div>
      ))}
    </div>
  );
}
