import React from 'react';

export default function AboutPage() {
  return (
    <div style={{
      flex: 1, padding: '40px', background: '#f8fafc', overflowY: 'auto',
      display: 'flex', justifyContent: 'center'
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', padding: '40px',
        maxWidth: '800px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255,255,255,0.08)', color: '#475569', lineHeight: 1.6
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b', marginBottom: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
          GeoRaksha
        </h1>
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#059669', marginBottom: '32px' }}>
          Autonomous Emergency Corridor Platform
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Project Overview</h2>
          <p>
            GeoRaksha is an AI-powered multi-agent system designed to support emergency vehicle movement across dense urban networks. 
            By leveraging real-time telemetry from public transit (BMTC buses) acting as floating traffic sensors, GeoRaksha autonomously 
            establishes dynamic "Green Wave" corridors for ambulances.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>The 4 Intelligent Agents</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1a73e8' }}>🚦 Traffic Monitor Agent</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Constantly ingests GTFS live data from buses to detect dynamic bottlenecks, accidents, or metro construction road closures in real-time.</p>
            </div>

            <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#10b981' }}>🗺️ Route Optimization Agent</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Continuously evaluates the active corridor using Dijkstra's shortest-path algorithm, ready to autonomously diverge the ambulance to a faster route if gridlock is detected.</p>
            </div>

            <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f59e0b' }}>⏱️ ETA Predictor Agent</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Uses Holt's Machine Learning Time-Series Forecasting to calculate hyper-accurate arrival times based on historical trends and live velocity decay.</p>
            </div>

            <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '12px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#ef4444' }}>📡 Signal Coordinator Agent</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Preemptively communicates with smart city infrastructure to hold traffic lights green as the ambulance approaches a junction.</p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Live Demo Capabilities</h2>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li><strong>Turn-by-Turn Navigation:</strong> Dynamic heading tracking and Google Maps-style instructions using geometric path analysis.</li>
            <li><strong>Hands-Free Autonomous Reroute:</strong> Hardcoded scenario specifically for Manipal Hospital demonstrating AI sensing 1 km/h gridlock and mathematically choosing an evasion route.</li>
            <li><strong>ER Telemedicine Comms:</strong> Bidirectional socket connection between the driver and the destination hospital to communicate trauma details pre-arrival.</li>
          </ul>
        </section>
        
        <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          Created by Team 1 - Say My Name | GIRL GEEKS 2026 Hackathon
        </div>
      </div>
    </div>
  );
}
