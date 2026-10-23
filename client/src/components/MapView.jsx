import React, { useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import roadNetwork from '../data/roadNetwork.json';
import MapLegend from './MapLegend';
import 'leaflet/dist/leaflet.css';

// ── Utility: compute bearing between 2 coordinates in degrees ──────────
function computeBearing(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// ── Map Tile Layers Configuration ──────────────────────────────────────
const MAP_TILES = {
  google: {
    name: 'Map',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    icon: '🗺️',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    icon: '🛰️',
  },
};

// Removed SVG in favor of realistic 3D PNG

const createBusIcon = (heading = 0) => L.divIcon({
  html: `
    <div class="vehicle-marker-wrapper" style="transform: rotate(${heading}deg);">
      <img src="/bus_3d.png" style="width: 16px; height: 48px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));" />
    </div>
  `,
  className: 'custom-bus-marker',
  iconSize: [16, 48],
  iconAnchor: [8, 24],
});

const createAmbulanceIcon = (heading = 0) => L.divIcon({
  html: `
    <div class="ambulance-pulse-ring"></div>
    <div class="vehicle-marker-wrapper" style="transform: rotate(${heading}deg);">
      <img src="/ambulance_3d.png" style="width: 44px; height: 93px; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));" />
    </div>
  `,
  className: 'custom-ambulance-marker',
  iconSize: [44, 93],
  iconAnchor: [22, 46],
});

// ── Destination Hospital Marker Icon ──────────────────────────────────
const destinationIcon = L.divIcon({
  html: `<div style="
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ea4335;
    color: #ffffff;
    width: 34px;
    height: 34px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 3px 8px rgba(234, 67, 53, 0.5);
    border: 2px solid #ffffff;
  ">
    <span style="transform: rotate(45deg); font-weight: bold; font-size: 16px;">🏥</span>
  </div>`,
  className: 'custom-destination-icon',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

// Inject keyframes into document head for lightbar animation
if (typeof document !== 'undefined' && !document.getElementById('vehicle-animation-style')) {
  const style = document.createElement('style');
  style.id = 'vehicle-animation-style';
  style.textContent = `
    @keyframes lightbarRed {
      0%, 100% { fill: #ef4444; filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.95)); }
      50% { fill: #7f1d1d; filter: none; }
    }
    @keyframes lightbarBlue {
      0%, 100% { fill: #1e3a8a; filter: none; }
      50% { fill: #38bdf8; filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.95)); }
    }
    @keyframes emergencyBeaconRing {
      0% {
        transform: translate(-50%, -50%) scale(0.6);
        opacity: 0.85;
      }
      60% {
        transform: translate(-50%, -50%) scale(1.6);
        opacity: 0.25;
      }
      100% {
        transform: translate(-50%, -50%) scale(2.1);
        opacity: 0;
      }
    }
    .lightbar-red, .strobe-red {
      animation: lightbarRed 0.35s infinite alternate ease-in-out;
    }
    .lightbar-blue, .strobe-blue {
      animation: lightbarBlue 0.35s infinite alternate ease-in-out;
    }
    .custom-bus-marker, .custom-ambulance-marker, .custom-destination-icon {
      background: none !important;
      border: none !important;
    }
    .leaflet-marker-pane .leaflet-marker-icon.custom-bus-marker {
      transition: transform 2.4s linear !important;
      will-change: transform;
    }
    .leaflet-marker-pane .leaflet-marker-icon.custom-ambulance-marker {
      transition: transform 0.95s linear !important;
      will-change: transform;
    }
    .vehicle-marker-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center center;
      position: relative;
      z-index: 2;
    }
    .ambulance-pulse-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 75%);
      animation: emergencyBeaconRing 1.3s infinite cubic-bezier(0.2, 0, 0.2, 1);
      pointer-events: none;
      z-index: 1;
    }
  `;
  document.head.appendChild(style);
}

export default function MapView({ busPositions = {}, segmentStatus = {}, activeRoute = null, ambulancePosition = null }) {
  const center = [12.9716, 77.5946];
  const [mapMode, setMapMode] = useState('google'); // 'google' | 'satellite' | 'uber'

  const { edges, nodes } = roadNetwork;
  const prevPositions = useRef({});

  const currentTile = MAP_TILES[mapMode] || MAP_TILES.google;

  const trafficPolylines = useMemo(() => {
    return Object.entries(edges).flatMap(([edgeId, edge]) => {
      const status = segmentStatus[edgeId]?.status;
      if (status !== 'congested' && status !== 'slow' && status !== 'blocked') return [];

      const from = nodes[edge.fromNode];
      const to = nodes[edge.toNode];
      if (!from || !to) return [];
      
      const positions = [
        [from.lat, from.lon],
        [to.lat, to.lon]
      ];
      
      if (status === 'blocked') {
        const midLat = (from.lat + to.lat) / 2;
        const midLon = (from.lon + to.lon) / 2;
        const icon = L.divIcon({
          html: `<div style="font-size: 20px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🚧</div>`,
          className: 'blocked-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        return [
          <Polyline key={`${edgeId}-black`} positions={positions} pathOptions={{ color: '#1e293b', weight: 8, opacity: 0.9, dashArray: '12, 8' }} />,
          <Polyline key={`${edgeId}-yellow`} positions={positions} pathOptions={{ color: '#eab308', weight: 8, opacity: 0.9, dashArray: '12, 8', dashOffset: '12' }} />,
          <Marker key={`${edgeId}-icon`} position={[midLat, midLon]} icon={icon} />
        ];
      }

      const color = status === 'congested' ? '#ea4335' : '#fbbc04';
      
      return [
        <Polyline 
          key={edgeId} 
          positions={positions} 
          pathOptions={{ color, weight: 6, opacity: 0.95, lineCap: 'round' }} 
        />
      ];
    });
  }, [edges, nodes, segmentStatus]);

  const busMarkers = useMemo(() => {
    return Object.values(busPositions).map(bus => {
      let heading = bus.heading;
      if (heading === undefined || heading === null) {
        const prev = prevPositions.current[bus.busId];
        if (prev) {
          heading = computeBearing(prev.lat, prev.lon, bus.lat, bus.lon);
        } else {
          heading = 0;
        }
      }
      prevPositions.current[bus.busId] = { lat: bus.lat, lon: bus.lon };

      return (
        <Marker
          key={bus.busId}
          position={[bus.lat, bus.lon]}
          icon={createBusIcon(heading)}
        />
      );
    });
  }, [busPositions]);

  // Active Green Wave emergency corridor on Command Center
  const activeRoutePolyline = useMemo(() => {
    if (!activeRoute?.geoJson?.coordinates) return null;
    const positions = activeRoute.geoJson.coordinates.map(([lon, lat]) => [lat, lon]);
    return (
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#059669',
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round',
        }}
      />
    );
  }, [activeRoute]);

  // Destination Hospital Pin on Command Center
  const destinationMarker = useMemo(() => {
    if (!activeRoute?.geoJson?.coordinates) return null;
    const coords = activeRoute.geoJson.coordinates;
    const lastCoord = coords[coords.length - 1];
    return (
      <Marker
        position={[lastCoord[1], lastCoord[0]]}
        icon={destinationIcon}
      />
    );
  }, [activeRoute]);

  // Ambulance Marker on Command Center
  const ambulanceMarker = useMemo(() => {
    if (!ambulancePosition?.lat || !ambulancePosition?.lon) return null;
    return (
      <Marker
        position={[ambulancePosition.lat, ambulancePosition.lon]}
        icon={createAmbulanceIcon(ambulancePosition.heading || 0)}
      />
    );
  }, [ambulancePosition]);

  return (
    <div className="map-container-wrapper" style={{ position: 'relative' }}>
      {/* ── Top-Right Map Style Switcher Toggle ─────────────────── */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        display: 'flex',
        gap: '6px',
        background: '#ffffff',
        padding: '6px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        border: '1px solid #e2e8f0',
      }}>
        {Object.entries(MAP_TILES).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setMapMode(key)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              backgroundColor: mapMode === key ? '#1a73e8' : 'transparent',
              color: mapMode === key ? '#ffffff' : '#475569',
            }}
          >
            <span>{config.icon}</span>
            <span>{config.name}</span>
          </button>
        ))}
      </div>

      {/* ── Floating Color Legend ──────────────────────────────── */}
      {/* <MapLegend /> */}

      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
        <TileLayer
          key={mapMode}
          url={currentTile.url}
          attribution={currentTile.attribution}
        />
        {trafficPolylines}
        {activeRoutePolyline}
        {destinationMarker}
        {busMarkers}
        {ambulanceMarker}
      </MapContainer>
    </div>
  );
}


