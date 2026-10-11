import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [busPositions, setBusPositions] = useState({});
  const [segmentStatus, setSegmentStatus] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null); // { routeGeoJson, etaSeconds }
  const [abandonedRoutes, setAbandonedRoutes] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ambulancePosition, setAmbulancePosition] = useState(null); // { lat, lon, etaSeconds }
  const [agentActivities, setAgentActivities] = useState([]);
  const [hospitalMessages, setHospitalMessages] = useState([
    {
      id: 'init_1',
      sender: 'hospital',
      senderName: 'ER Central Dispatch',
      text: 'Pre-arrival telemetry channel initialized. Paramedics may send trauma/cardiac status codes directly to receiving ER.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      protocol: 'System'
    }
  ]);
  const [timeSaved, setTimeSaved] = useState(0);
  const [missionSummary, setMissionSummary] = useState(null);
  
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:3000", { autoConnect: false });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.connect();

    socket.on('bus:update', (bus) => {
      setBusPositions(prev => ({ ...prev, [bus.busId]: bus }));
    });

    socket.on('segment:update', (data) => {
      setSegmentStatus(prev => ({ ...prev, [data.segmentId]: data }));
    });

    socket.on('signal:alert', (alert) => {
      if (alert.cleared) {
        setAlerts([]);
      } else {
        setAlerts([alert]);
      }
    });

    socket.on('route:update', (routeData) => {
      if (routeData && routeData.routeGeoJson) {
        setActiveRoute(routeData);
      } else {
        setActiveRoute(null);
        setAbandonedRoutes([]); // Clear abandoned routes when active route is cleared
      }
    });

    socket.on('route:diverted', (oldRoute) => {
      if (oldRoute && oldRoute.routeGeoJson) {
        setAbandonedRoutes(prev => [...prev, oldRoute]);
      }
    });

    socket.on('ambulance:update', (data) => {
      setAmbulancePosition(data);
    });

    socket.on('agent:activities', (activities) => {
      setAgentActivities(activities);
    });

    socket.on('agent:activity', (activity) => {
      setAgentActivities(prev => [activity, ...prev.slice(0, 49)]);
    });

    socket.on('hospital:message', (msg) => {
      setHospitalMessages(prev => [...prev, msg]);
    });

    socket.on('time_saved:update', (data) => {
      setTimeSaved(data.timeSaved);
    });

    socket.on('mission:summary', (data) => {
      setMissionSummary(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const sendHospitalMessage = (text, protocol = 'General Triage', hospitalName = 'Emergency Department', imageUrl = null) => {
    if (socketRef.current) {
      socketRef.current.emit('hospital:message_send', { text, protocol, hospitalName, imageUrl });
    }
  };

  const getHospitals = () => {
    return new Promise(resolve => {
      if (socketRef.current) socketRef.current.emit('hospitals:get', resolve);
      else resolve([]);
    });
  };

  const getAlternativeRoutes = (startNodeId, destNodeId) => {
    return new Promise(resolve => {
      if (socketRef.current) socketRef.current.emit('route:request_alternatives', { startNodeId, destNodeId }, resolve);
      else resolve([]);
    });
  };

  const selectRoute = (route) => {
    if (socketRef.current) socketRef.current.emit('route:select', route);
  };

  const endNavigation = () => {
    if (socketRef.current) socketRef.current.emit('route:end');
  };

  const injectCongestion = () => {
    if (socketRef.current) socketRef.current.emit('demo:inject_congestion');
  };

  const clearCongestion = () => {
    if (socketRef.current) socketRef.current.emit('demo:clear_congestion');
  };

  const triggerSignalTest = () => {
    if (socketRef.current) socketRef.current.emit('demo:trigger_signal');
  };

  const injectRoadClosure = () => {
    if (socketRef.current) socketRef.current.emit('demo:road_closure');
  };

  const clearRoadClosure = () => {
    if (socketRef.current) socketRef.current.emit('demo:clear_road_closure');
  };

  const clearMissionSummary = () => {
    setMissionSummary(null);
    setTimeSaved(0);
  };

  const addHospitalReply = (text, protocol = 'System') => {
    const msg = {
      id: `hospital_reply_${Date.now()}`,
      sender: 'hospital',
      senderName: 'ER Trauma Desk',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      protocol
    };
    setHospitalMessages(prev => [...prev, msg]);
  };

  return {
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
    injectCongestion,
    clearCongestion,
    triggerSignalTest,
    injectRoadClosure,
    clearRoadClosure,
    clearMissionSummary
  };
}

