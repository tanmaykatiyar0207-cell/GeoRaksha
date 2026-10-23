import React, { useMemo, useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import AgentActivityFeed from './AgentActivityFeed';
import DemoController from './DemoController';
import MapLegend from './MapLegend';
import HospitalCommsModal from './HospitalCommsModal';
import MissionSummaryModal from './MissionSummaryModal';
import 'leaflet/dist/leaflet.css';

// ── Utility: compute bearing ────────────────────────────────────────────
function computeBearing(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ── Haversine distance in meters ────────────────────────────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const createNavAmbulanceIcon = (heading = 0) => L.divIcon({
  html: `
    <div class="ambulance-pulse-ring"></div>
    <div class="vehicle-marker-wrapper" style="transform: rotate(${heading}deg);">
      <img src="/ambulance_3d.png" style="width: 44px; height: 93px; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));" />
    </div>
  `,
  className: 'nav-ambulance-icon',
  iconSize: [44, 93],
  iconAnchor: [22, 46],
});

// ── Destination Pin ─────────────────────────────────────────────────────
const navDestIcon = L.divIcon({
  html: `<div style="
    display:flex;align-items:center;justify-content:center;
    background:#ea4335;color:#fff;width:36px;height:36px;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    box-shadow:0 3px 10px rgba(234,67,53,0.6);border:2.5px solid #fff;
  "><span style="transform:rotate(45deg);font-size:18px;">🏥</span></div>`,
  className: 'nav-dest-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// ── Map Controller: auto-follows ambulance (north-up, no rotation) ──────
function MapFollower({ ambulancePosition }) {
  const map = useMap();

  useEffect(() => {
    if (!ambulancePosition) return;
    map.setView(
      [ambulancePosition.lat, ambulancePosition.lon],
      map.getZoom(),
      { animate: true, duration: 0.8 },
    );
  }, [ambulancePosition, map]);

  return null;
}

// ── Inject nav-specific styles ──────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('nav-view-styles')) {
  const s = document.createElement('style');
  s.id = 'nav-view-styles';
  s.textContent = `
    .nav-ambulance-icon, .nav-dest-icon {
      background: none !important;
      border: none !important;
    }
    .nav-map-wrapper {
      position: absolute;
      inset: 0;
    }
    .nav-map-wrapper .leaflet-container {
      width: 100%;
      height: 100%;
    }
    @keyframes overlay-fade {
      0% { opacity: 0; }
      10% { opacity: 1; }
      80% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes warning-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.5); }
      50% { transform: scale(1.15); box-shadow: 0 0 40px rgba(239, 68, 68, 0.8); }
    }
    @keyframes reroute-text-fade {
      0%, 30% { opacity: 0; transform: translateY(6px); }
      50% { opacity: 1; transform: translateY(0); }
      85% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes blink {
      0% { opacity: 0.3; }
      100% { opacity: 1; }
    }
    .reroute-banner {
      animation: banner-pop 5s ease-in-out forwards;
    }
    @keyframes banner-pop {
      0% { transform: scale(0.8); opacity: 0; }
      8% { transform: scale(1.02); opacity: 1; }
      12% { transform: scale(1); }
      82% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0; }
    }
    @keyframes signal-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
      50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
    }
    .vehicle-marker-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 1.2s ease-out;
      transform-origin: center center;
    }
    @keyframes emergencyBeaconRing {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .ambulance-pulse-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 75%);
      animation: emergencyBeaconRing 1.3s infinite cubic-bezier(0.2, 0, 0.2, 1);
      pointer-events: none;
      z-index: 1;
    }
    @keyframes strobeRed {
      0%, 4%, 8% { opacity: 1; fill: #ef4444; filter: drop-shadow(0 0 4px #ef4444); }
      2%, 6%, 10%, 100% { opacity: 0.3; fill: #7f1d1d; filter: none; }
    }
    @keyframes strobeBlue {
      50%, 54%, 58% { opacity: 1; fill: #3b82f6; filter: drop-shadow(0 0 4px #3b82f6); }
      52%, 56%, 60%, 100%, 0% { opacity: 0.3; fill: #1e3a8a; filter: none; }
    }
    .strobe-red { animation: strobeRed 1.2s infinite; }
    .strobe-blue { animation: strobeBlue 1.2s infinite; }
    .lightbar-red { animation: strobeRed 1.2s infinite; }
    .lightbar-blue { animation: strobeBlue 1.2s infinite; }
    .leaflet-marker-pane .leaflet-marker-icon.custom-ambulance-marker {
      transition: transform 0.95s linear !important;
      will-change: transform;
    }
  `;
  document.head.appendChild(s);
}

// ═════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════
export default function AmbulanceNavView({ 
  ambulancePosition = null, 
  activeRoute = null, 
  abandonedRoutes = [],
  alerts = [],
  agentActivities = [],
  hospitalMessages = [],
  timeSaved = 0,
  missionSummary = null,
  sendHospitalMessage,
  getHospitals,
  getAlternativeRoutes,
  selectRoute,
  endNavigation,
  injectCongestion,
  clearCongestion,
  triggerSignalTest,
  injectRoadClosure,
  clearRoadClosure,
  clearMissionSummary,
  onOpenTelemedicine
}) {
  const prevRouteRef = useRef(null);
  const prevAmbPosRef = useRef(null);
  const [showRerouteBanner, setShowRerouteBanner] = useState(false);
  const [heading, setHeading] = useState(0);
  const [showAgentDrawer, setShowAgentDrawer] = useState(false);
  // showHospitalComms lifted to App.jsx
  const rerouteTimerRef = useRef(null);
  const [geofenceTriggered, setGeofenceTriggered] = useState(false);
  const [geofenceMessage, setGeofenceMessage] = useState(null);
  const [liveStats, setLiveStats] = useState({ pings: 0, signals: 0 });

  // New states for Hospital & Route Selection
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [backgroundRoutes, setBackgroundRoutes] = useState([]); // Store unselected routes for dimming
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [isFetchingRoutes, setIsFetchingRoutes] = useState(false);

  useEffect(() => {
    if (!activeRoute && hospitals.length === 0 && getHospitals) {
      getHospitals().then(data => setHospitals(data));
    }
  }, [activeRoute, hospitals.length, getHospitals]);

  // ── Geofence: Hospital Proximity Alert ──────────────────────────────
  useEffect(() => {
    if (!ambulancePosition || !activeRoute || geofenceTriggered) return;
    if (!activeRoute.routeGeoJson?.geometry?.coordinates) return;

    const coords = activeRoute.routeGeoJson.geometry.coordinates;
    const dest = coords[coords.length - 1]; // [lon, lat] of destination
    if (!dest) return;

    const toRad = d => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(dest[1] - ambulancePosition.lat);
    const dLon = toRad(dest[0] - ambulancePosition.lon);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(ambulancePosition.lat)) * Math.cos(toRad(dest[1])) * Math.sin(dLon/2)**2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    if (distance < 500) {
      setGeofenceTriggered(true);
      setGeofenceMessage('🏥 Approaching hospital — ER team notified. Trauma bay on standby.');
      speak('Approaching destination hospital. Emergency receiving team has been notified.');
      // Auto-hide after 8 seconds
      setTimeout(() => setGeofenceMessage(null), 8000);
    }
  }, [ambulancePosition, activeRoute, geofenceTriggered]);

  // ── Real Signal Preemption Tracking ────────────────────────────────
  useEffect(() => {
    if (!activeRoute) return;
    if (alerts && alerts.length > 0) {
      setLiveStats(prev => ({
        ...prev,
        signals: Math.max(prev.signals, alerts.length)
      }));
    }
  }, [alerts, activeRoute]);

  const handleHospitalSelect = async (hospital) => {
    setSelectedHospital(hospital);
    setIsFetchingRoutes(true);
    // Assuming ambulance is starting near stop_22628 for the demo
    const routes = await getAlternativeRoutes('stop_22628', hospital.nodeId);
    setAlternativeRoutes(routes);
    setSelectedRouteIdx(0);
    setIsFetchingRoutes(false);
  };

  // ── Tactical Audio Dispatch ───────────────────────────────────────
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartNavigation = () => {
    if (alternativeRoutes[selectedRouteIdx]) {
      // Store unselected routes as dimmed background routes
      const unselected = alternativeRoutes.filter((_, idx) => idx !== selectedRouteIdx);
      setBackgroundRoutes(unselected);
      
      selectRoute(alternativeRoutes[selectedRouteIdx]);
      setAlternativeRoutes([]);
      speak("Emergency corridor established. Green wave protocol active.");
    }
  };

  const handleEndNavigation = () => {
    setSelectedHospital(null);
    setAlternativeRoutes([]);
    setBackgroundRoutes([]);
    if (endNavigation) endNavigation();
  };

  // ── Compute heading from successive ambulance positions ───────────
  useEffect(() => {
    if (!ambulancePosition) return;
    const prev = prevAmbPosRef.current;
    if (prev) {
      const dist = haversineMeters(prev.lat, prev.lon, ambulancePosition.lat, ambulancePosition.lon);
      if (dist > 2) {
        const newHeading = computeBearing(prev.lat, prev.lon, ambulancePosition.lat, ambulancePosition.lon);
        setHeading(newHeading);
      }
    }
    prevAmbPosRef.current = { lat: ambulancePosition.lat, lon: ambulancePosition.lon };
  }, [ambulancePosition]);

  // ── Detect reroute (route GeoJSON coordinates changed) ────────────
  useEffect(() => {
    if (!activeRoute?.routeGeoJson?.coordinates) return;
    const coords = activeRoute.routeGeoJson.coordinates;
    const key = coords.map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join('|');

    if (prevRouteRef.current && prevRouteRef.current !== key && !alternativeRoutes.length) {
      setShowRerouteBanner(true);
      speak("Alert. Corridor obstruction detected. Rerouting. Optimizing new green wave path.");
      if (rerouteTimerRef.current) clearTimeout(rerouteTimerRef.current);
      rerouteTimerRef.current = setTimeout(() => setShowRerouteBanner(false), 5000);
    }
    prevRouteRef.current = key;
  }, [activeRoute, alternativeRoutes.length]);

  // ── Ambulance icon (memoized per heading) ─────────────────────────
  const ambulanceIcon = useMemo(() => createNavAmbulanceIcon(heading), [heading]);

  // ── Route polyline ────────────────────────────────────────────────
  const routePositions = useMemo(() => {
    if (!activeRoute?.routeGeoJson?.coordinates) return null;
    return activeRoute.routeGeoJson.coordinates.map(c => [c[1], c[0]]);
  }, [activeRoute]);

  // ── Destination marker ────────────────────────────────────────────
  const destPosition = useMemo(() => {
    if (!activeRoute?.routeGeoJson?.coordinates) return null;
    const coords = activeRoute.routeGeoJson.coordinates;
    const last = coords[coords.length - 1];
    return [last[1], last[0]];
  }, [activeRoute]);

  // ── Split Route and Distance Remaining ────────────────────────────
  const { distanceRemaining, pastRoute, futureRoute } = useMemo(() => {
    if (!routePositions) return { distanceRemaining: null, pastRoute: null, futureRoute: null };
    if (!ambulancePosition) return { distanceRemaining: null, pastRoute: null, futureRoute: routePositions };

    // Find the segment the ambulance is currently on
    // Since ambulancePos is generated by turf.along, it lies exactly on a segment
    let bestSegmentIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < routePositions.length - 1; i++) {
      const p1 = routePositions[i];
      const p2 = routePositions[i+1];
      const d1 = haversineMeters(p1[0], p1[1], ambulancePosition.lat, ambulancePosition.lon);
      const d2 = haversineMeters(ambulancePosition.lat, ambulancePosition.lon, p2[0], p2[1]);
      const dSeg = haversineMeters(p1[0], p1[1], p2[0], p2[1]);
      const diff = Math.abs(d1 + d2 - dSeg);
      if (diff < minDiff) {
        minDiff = diff;
        bestSegmentIdx = i;
      }
    }

    let total = haversineMeters(ambulancePosition.lat, ambulancePosition.lon, routePositions[bestSegmentIdx + 1][0], routePositions[bestSegmentIdx + 1][1]);
    for (let i = bestSegmentIdx + 1; i < routePositions.length - 1; i++) {
      total += haversineMeters(routePositions[i][0], routePositions[i][1], routePositions[i + 1][0], routePositions[i + 1][1]);
    }

    // Slice the route precisely at the ambulance position
    const ambPos = [ambulancePosition.lat, ambulancePosition.lon];
    const past = routePositions.slice(0, bestSegmentIdx + 1);
    past.push(ambPos);
    
    const future = [ambPos, ...routePositions.slice(bestSegmentIdx + 1)];

    return { distanceRemaining: total, pastRoute: past, futureRoute: future };
  }, [routePositions, ambulancePosition]);

  const navInstruction = useMemo(() => {
    if (!activeRoute) return { text: "Awaiting Destination", icon: "📡", distText: "--" };
    if (!futureRoute || futureRoute.length < 3) return { text: "Arriving shortly", icon: "📍", distText: "0 m" };

    const dist = (p1, p2) => {
      const R = 6371e3;
      const lat1 = p1[0]*Math.PI/180;
      const lat2 = p2[0]*Math.PI/180;
      const dlat = (p2[0]-p1[0])*Math.PI/180;
      const dlon = (p2[1]-p1[1])*Math.PI/180;
      const a = Math.sin(dlat/2)*Math.sin(dlat/2) + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)*Math.sin(dlon/2);
      const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    let distSoFar = 0;
    for (let i = 0; i < futureRoute.length - 2; i++) {
      const p1 = futureRoute[i];
      const p2 = futureRoute[i+1];
      const p3 = futureRoute[i+2];
      
      distSoFar += dist(p1, p2);
      
      const b1 = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]);
      const b2 = Math.atan2(p3[0] - p2[0], p3[1] - p2[1]);
      let angle = (b2 - b1) * (180 / Math.PI);
      if (angle > 180) angle -= 360;
      if (angle <= -180) angle += 360;
      
      if (Math.abs(angle) > 25) {
        let direction = angle > 0 ? "Turn Left" : "Turn Right";
        let icon = angle > 0 ? "⬅️" : "➡️";
        
        if (distSoFar > 1000) return { text: "Continue straight", icon: "⬆️", distText: (distSoFar/1000).toFixed(1) + " km" };
        return { text: direction, icon, distText: Math.round(distSoFar/10)*10 + " m" };
      }
    }
    
    let totalDist = distSoFar + dist(futureRoute[futureRoute.length-2], futureRoute[futureRoute.length-1]);
    if (totalDist > 1000) return { text: "Continue straight", icon: "⬆️", distText: (totalDist/1000).toFixed(1) + " km" };
    if (totalDist > 50) return { text: "Continue straight", icon: "⬆️", distText: Math.round(totalDist/10)*10 + " m" };
    return { text: "Arriving shortly", icon: "📍", distText: "0 m" };
  }, [futureRoute]);


  // 🔊 Voice Navigation Effect
  const lastSpokenRef = React.useRef(null);
  
  React.useEffect(() => {
    if (!navInstruction) return;

    const { text, distText } = navInstruction;
    let shouldSpeak = false;
    let message = "";

    const prev = lastSpokenRef.current;
    
    if (!prev || prev.text !== text) {
      if (text !== "Awaiting Destination") {
        shouldSpeak = true;
        message = text === "Arriving shortly" ? text : `In ${distText}, ${text.toLowerCase()}`;
      }
    } else if (text !== "Arriving shortly") {
      if (distText === "500 m" || distText === "200 m" || distText === "100 m" || distText === "50 m") {
        if (prev.distText !== distText) {
          shouldSpeak = true;
          message = `In ${distText}, ${text.toLowerCase()}`;
        }
      }
    }

    if (shouldSpeak && message) {
      lastSpokenRef.current = { text, distText };
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [navInstruction]);


  // 🔊 Voice Reroute Alert Effect
  const lastAbandonedCount = React.useRef(abandonedRoutes.length);
  React.useEffect(() => {
    if (abandonedRoutes.length > lastAbandonedCount.current) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Traffic gridlock detected ahead. Autonomously diverting to faster route.");
        utterance.rate = 1.05;
        utterance.pitch = 1.1; // slightly higher pitch for urgency
        window.speechSynthesis.speak(utterance);
      }
    }
    lastAbandonedCount.current = abandonedRoutes.length;
  }, [abandonedRoutes]);

  const etaSeconds = ambulancePosition?.etaSeconds
 ?? activeRoute?.totalTimeSeconds ?? 0;

  const speed = ambulancePosition?.speed ?? 0;
  const currentAlert = alerts?.length > 0 ? alerts[0] : null;

  const defaultCenter = ambulancePosition
    ? [ambulancePosition.lat, ambulancePosition.lon]
    : [12.955, 77.699];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>

      {/* ── Full-screen Map (First-Person View) ────────────────── */}
      <div className="nav-map-wrapper" style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}>
        <div style={{
          width: '150%', height: '150%', position: 'absolute', left: '-25%', top: '-25%',
          transform: `rotateX(45deg) rotateZ(${-heading}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 1s ease-out'
        }}>
          <MapContainer
            center={defaultCenter}
            zoom={17} // Zoom in a bit more for 3D
            zoomControl={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
            <MapFollower ambulancePosition={ambulancePosition} />
            
            {/* Alternative Routes — multi-color for selection */}
            {!activeRoute && alternativeRoutes.length > 0 && alternativeRoutes.map((route, idx) => {
              const positions = route.geoJson.coordinates.map(c => [c[1], c[0]]);
              const isSelected = idx === selectedRouteIdx;
              const colors = ['#1a73e8', '#10b981', '#f59e0b']; // Blue, Green, Orange
              const routeColor = colors[idx % colors.length];
              return (
                <React.Fragment key={idx}>
                  <Polyline positions={positions} pathOptions={{ color: isSelected ? '#1557b0' : '#475569', weight: isSelected ? 12 : 8, opacity: isSelected ? 0.9 : 0.6, lineCap: 'round', lineJoin: 'round' }} />
                  <Polyline positions={positions} pathOptions={{ color: isSelected ? routeColor : '#94a3b8', weight: isSelected ? 7 : 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
                </React.Fragment>
              );
            })}

            {/* Background (Dimmed) Routes — visible during active navigation */}
            {activeRoute && backgroundRoutes.length > 0 && backgroundRoutes.map((route, idx) => {
              const positions = route.geoJson.coordinates.map(c => [c[1], c[0]]);
              return (
                <Polyline key={`bg-${idx}`} positions={positions} pathOptions={{ color: '#64748b', weight: 5, opacity: 0.4, lineCap: 'round', lineJoin: 'round', dashArray: '8, 8' }} />
              );
            })}

            {/* Abandoned / Congested Routes - Bright Red dashed to show divergence */}
            {abandonedRoutes.map((route, idx) => {
              if (!route?.geoJson?.coordinates) return null;
              const positions = route.geoJson.coordinates.map(c => [c[1], c[0]]);
              return (
                <Polyline key={`abandoned-${idx}`} positions={positions} 
                  pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.7, dashArray: '10, 15', lineCap: 'round', lineJoin: 'round' }} />
              );
            })}

            {/* Past Route — faint grey */}
            {activeRoute && pastRoute && pastRoute.length > 1 && (
              <Polyline positions={pastRoute}
                pathOptions={{ color: '#64748b', weight: 8, opacity: 0.5, lineCap: 'round', lineJoin: 'round' }} />
            )}

            {/* Future Route — dark casing + Google blue fill */}
            {activeRoute && futureRoute && futureRoute.length > 1 && (
              <>
                <Polyline positions={futureRoute}
                  pathOptions={{ color: '#1557b0', weight: 12, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
                <Polyline positions={futureRoute}
                  pathOptions={{ color: '#4285f4', weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
              </>
            )}

          {/* Destination pin */}
          {(destPosition || (selectedHospital && !activeRoute)) && (
            <Marker position={destPosition || [selectedHospital.lat, selectedHospital.lon]} icon={navDestIcon} zIndexOffset={900} />
          )}

          {/* Ambulance marker — arrow rotates to show heading */}
          {(ambulancePosition || (!activeRoute && !selectedHospital)) && (
            <Marker
              position={ambulancePosition ? [ambulancePosition.lat, ambulancePosition.lon] : defaultCenter}
              icon={ambulanceIcon}
              zIndexOffset={1000}
            />
          )}
        </MapContainer>
        {/* <MapLegend isNav={true} /> Removed per user request */}
        </div>
      </div>

      {/* ── Top Navigation HUD ─────────────────────────────────────── */}
      {activeRoute && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
          padding: '20px 24px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
          pointerEvents: 'none',
        }}>
                      <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: '#ffffff', borderRadius: '14px', padding: '12px 20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)', pointerEvents: 'auto',
            }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '12px', background: '#1a73e8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '28px', fontWeight: 'bold', flexShrink: 0,
              }}>{navInstruction.icon}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '20px', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.5px' }}>
                  {navInstruction.text}
                </div>
                <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 700 }}>
                  In {navInstruction.distText}
                </div>
              </div>
            
            <button
              onClick={onOpenTelemedicine}
              style={{
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.15)'
              }}
            >
              <span>🏥</span> Message ER ({hospitalMessages.length})
            </button>

            <button
              onClick={() => setShowAgentDrawer(!showAgentDrawer)}
              style={{
                background: showAgentDrawer ? '#0f172a' : '#f1f5f9',
                color: showAgentDrawer ? '#ffffff' : '#334155',
                border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '6px', transition: 'all 0.2s'
              }}
            >
              <span>🤖</span> {showAgentDrawer ? 'Close Feed' : 'Agent Feed'}
            </button>

            <div style={{
              textAlign: 'right', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center'
            }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#1a73e8', lineHeight: 1 }}>
                {etaSeconds != null
                  ? `${Math.floor(etaSeconds / 60)}:${Math.floor(etaSeconds % 60).toString().padStart(2, '0')}`
                  : '--:--'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETA</div>
              {timeSaved > 0 && (
                <div style={{
                  marginTop: '4px', background: '#d1fae5', color: '#047857',
                  padding: '2px 8px', borderRadius: '12px', fontSize: '10px',
                  fontWeight: 800, border: '1px solid #a7f3d0',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  ⚡ Saved {Math.floor(timeSaved / 60)}m {timeSaved % 60}s
                </div>
              )}
            </div>
            <button 
              onClick={handleEndNavigation}
              style={{
                marginLeft: '8px', background: '#ef4444', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              End
            </button>
          </div>

          {/* AI Autonomous Co-Pilot Decision Ticker */}
          {agentActivities.length > 0 && (
            <div style={{
              marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
              padding: '6px 14px', borderRadius: '20px', color: '#ffffff',
              fontSize: '12px', fontWeight: 600, pointerEvents: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <span>{agentActivities[0].icon || '🤖'}</span>
              <span style={{ color: '#93c5fd', fontWeight: 700 }}>
                {agentActivities[0].agent === 'traffic' ? 'Traffic Monitor' :
                 agentActivities[0].agent === 'route' ? 'Route Optimizer' :
                 agentActivities[0].agent === 'eta' ? 'ETA Predictor' : 'Signal Coordinator'}:
              </span>
              <span style={{ color: '#f8fafc' }}>{agentActivities[0].title}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Emergency Hospital Telemedicine Modal (Moved to App.jsx for Menu Access) ── */}

      {/* ── Pre-Navigation Hospital Selection Overlay ──────────────── */}
      {!activeRoute && !selectedHospital && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2000,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', overflowY: 'auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff',
              color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
              fontWeight: 700, marginBottom: '8px'
            }}>
              <span>🚑</span> Emergency Dispatch & Corridor Routing
            </div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0 6px' }}>Select Destination Hospital</h2>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>
              The <strong>Route Optimization Agent</strong> will evaluate live BMTC traffic speeds to compute 3 optimal alternatives.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', width: '100%', maxWidth: '960px' }}>
            {hospitals.map((h, idx) => {
              const tags = ['Level-1 Trauma', 'Cardiac ICU', '24/7 Emergency', 'Multi-Specialty', 'Critical Care'];
              const tag = tags[idx % tags.length];
              return (
                <button 
                  key={h.nodeId}
                  onClick={() => handleHospitalSelect(h)}
                  style={{
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 18px',
                    textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'flex-start', gap: '14px'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.15)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px', background: '#fee2e2',
                    border: '1px solid #fecaca', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '22px', flexShrink: 0
                  }}>🏥</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>{h.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span style={{
                        fontSize: '11px', background: '#eff6ff', color: '#1d4ed8',
                        padding: '2px 8px', borderRadius: '6px', fontWeight: 700
                      }}>
                        {tag}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Whitefield Corridor</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pre-Navigation Route Selection Overlay ─────────────────── */}
      {!activeRoute && selectedHospital && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 2000,
          background: '#ffffff', borderRadius: '20px', padding: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxWidth: '960px', margin: '0 auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Select Emergency Corridor</h3>
                <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  3 AI Routes Computed
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Destination: <strong>{selectedHospital.name}</strong></p>
            </div>
            <button onClick={() => setSelectedHospital(null)} style={{ background: '#f8fafc', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>
              Cancel
            </button>
          </div>

          {isFetchingRoutes ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              <div className="pulse-dot" style={{ display: 'inline-block', margin: '0 auto 12px' }}></div>
              <div>Route Optimization Agent evaluating live floating bus speeds...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {alternativeRoutes.map((route, idx) => {
                const colors = ['#1a73e8', '#10b981', '#f59e0b'];
                const routeColor = colors[idx % colors.length];
                const isSelected = selectedRouteIdx === idx;
                const etaMins = (route.totalTimeSeconds / 60).toFixed(1);
                const badges = [
                  { title: 'Route 1 (AI Recommended)', tag: 'Fastest • Low Traffic', color: '#2563eb' },
                  { title: 'Route 2 (Alternative)', tag: 'Moderate Traffic', color: '#059669' },
                  { title: 'Route 3 (Detour)', tag: 'Higher Volume', color: '#d97706' },
                ];
                const badge = badges[idx % badges.length];

                return (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedRouteIdx(idx)}
                    style={{
                      border: `2px solid ${isSelected ? routeColor : '#e2e8f0'}`,
                      borderRadius: '14px', padding: '16px', cursor: 'pointer',
                      background: isSelected ? `${routeColor}0c` : '#fff',
                      display: 'flex', flexDirection: 'column', gap: '10px',
                      boxShadow: isSelected ? `0 4px 16px ${routeColor}33` : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: routeColor }}></div>
                        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>{badge.title}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: badge.color, fontWeight: 700 }}>{badge.tag}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '26px', fontWeight: 900, color: isSelected ? routeColor : '#0f172a' }}>
                        {etaMins} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>min</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{route.edgePath.length} segments</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button 
            disabled={isFetchingRoutes || alternativeRoutes.length === 0}
            onClick={handleStartNavigation}
            style={{
              width: '100%', background: '#1a73e8', color: '#fff', border: 'none', padding: '16px',
              borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: isFetchingRoutes ? 'not-allowed' : 'pointer',
              opacity: (isFetchingRoutes || alternativeRoutes.length === 0) ? 0.6 : 1,
              boxShadow: '0 4px 16px rgba(26, 115, 232, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <span>🚑</span> Start Navigation & Engage Green Wave
          </button>
        </div>
      )}

      {/* ── Slide-over Agent Activity Drawer ────────────────────────── */}
      {showAgentDrawer && (
        <div style={{
          position: 'absolute', top: '80px', right: '20px', bottom: '100px', width: '360px',
          zIndex: 1500, animation: 'fadeIn 0.2s ease-out'
        }}>
          <AgentActivityFeed activities={agentActivities} />
        </div>
      )}

      {/* ── Live Metrics Floating Pill ──────────────────────────────── */}
      {activeRoute && (
        <div style={{
          position: 'absolute', top: '150px', left: '24px', zIndex: 1100,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)',
          borderRadius: '14px', padding: '10px 16px',
          display: 'flex', gap: '20px', alignItems: 'center',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          color: '#ffffff', fontSize: '12px', fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10b981', fontSize: '14px' }}>📡</span>
            <div>
              <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sensor Grid</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>364 Probes</div>
            </div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10b981', fontSize: '14px' }}>🚦</span>
            <div>
              <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Green Waves</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>{alerts?.length || liveStats.signals || 1} Active</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Color Legend ──────────────────────────────── */}        {/* MapLegend removed */}

      {/* ── Live Demo Controller Pill ──────────────────────────────── */}
      <DemoController
        injectCongestion={injectCongestion}
        clearCongestion={clearCongestion}
        triggerSignalTest={triggerSignalTest}
        injectRoadClosure={injectRoadClosure}
        clearRoadClosure={clearRoadClosure}
      />

      {/* ── Bottom Stats Bar ───────────────────────────────────────── */}
      {activeRoute && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
          padding: '0 24px 24px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
          pointerEvents: 'none',
        }}>
          {/* Signal Priority Alert */}
          {currentAlert && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: '#fef9c3', // solid light yellow (Amber 100)
              border: '2px solid #facc15', // Amber 400
              borderRadius: '12px',
              padding: '12px 16px', marginBottom: '12px', pointerEvents: 'auto',
              animation: 'signal-pulse 2s infinite',
              boxShadow: '0 4px 12px rgba(250, 204, 21, 0.3)'
            }}>
              <span style={{ fontSize: '26px' }}>🚦</span>
              <div>
                <div style={{ color: '#854d0e', fontWeight: 900, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Signal Priority Requested (Green Wave)
                </div>
                <div style={{ color: '#a16207', fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  Approaching <strong>{currentAlert.junctionName || currentAlert.junctionId}</strong> — arrival in <strong>{currentAlert.secondsToArrival}s</strong> {currentAlert.distMeters ? `(${currentAlert.distMeters}m to stop line)` : ''}
                </div>
              </div>
            </div>
          )}

          {/* Geofence Hospital Proximity Alert */}
          {geofenceMessage && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)', backdropFilter: 'blur(10px)',
              borderRadius: '14px', padding: '14px 18px', pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: '12px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: '12px',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <span style={{ fontSize: '26px' }}>🏥</span>
              <div>
                <div style={{ color: '#059669', fontWeight: 900, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Hospital Proximity Alert
                </div>
                <div style={{ color: '#047857', fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {geofenceMessage}
                </div>
              </div>
            </div>
          )}

          {/* Speed + Distance + ETA Row */}
          <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
            <div style={{
              flex: 1, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)',
              borderRadius: '14px', padding: '14px 18px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {speed > 0 ? Math.round(speed) : '0'}
              </div>
              <div style={{ fontSize: '11px', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>km/h</div>
            </div>

            <div style={{
              flex: 1, background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)',
              borderRadius: '14px', padding: '14px 18px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                {distanceRemaining != null
                  ? distanceRemaining >= 1000
                    ? `${(distanceRemaining / 1000).toFixed(1)}`
                    : `${Math.round(distanceRemaining)}`
                  : '--'}
              </div>
              <div style={{ fontSize: '11px', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
                {distanceRemaining != null && distanceRemaining >= 1000 ? 'km left' : 'm left'}
              </div>
            </div>

            <div style={{
              flex: 1, background: '#1a73e8', borderRadius: '14px',
              padding: '14px 18px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
                {etaSeconds != null ? `${Math.floor(etaSeconds / 60)}` : '--'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>min</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Road Blocked + Reroute Banner (Two-Phase) ─────────────── */}
      {showRerouteBanner && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {/* Dark overlay flash */}
          <div className="reroute-overlay" style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            animation: 'overlay-fade 5s ease-in-out forwards',
          }} />
          {/* Main banner card */}
          <div className="reroute-banner" style={{
            position: 'relative', zIndex: 1101,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff', padding: '24px 36px',
            borderRadius: '16px', fontSize: '16px', fontWeight: 700,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 60px rgba(239, 68, 68, 0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            minWidth: '320px', textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.4)',
          }}>
            {/* Warning icon */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
              animation: 'warning-pulse 0.8s ease-in-out 3',
            }}>
              ⚠️
            </div>
            {/* Phase 1: Bottleneck Detected */}
            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '0.5px', color: '#ef4444' }}>
              CORRIDOR BOTTLENECK DETECTED
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              Live telemetry speed anomaly — Dijkstra MinHeap calculating detour
            </div>
            {/* Divider */}
            <div style={{
              width: '100%', height: '1px', margin: '4px 0',
              background: 'linear-gradient(to right, transparent, #475569, transparent)',
            }} />
            {/* Phase 2: Rerouting */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              animation: 'reroute-text-fade 5s ease-in-out forwards',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#10b981',
                animation: 'blink 0.6s ease-in-out infinite alternate',
              }} />
              <span style={{ fontSize: '15px', color: '#10b981', fontWeight: 700 }}>
                Route Optimizer Agent — Rerouting...
              </span>
            </div>
          </div>
        </div>
      )}
      {/* ── Mission Summary Modal ────────────────────────────────────── */}
      {missionSummary && (
        <MissionSummaryModal
          summary={missionSummary}
          onClose={clearMissionSummary}
        />
      )}
    </div>
  );
}
