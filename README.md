<p align="center">
  <img src="client/public/logo.png" alt="GeoRaksha Logo" width="120" />
</p>

<h1 align="center">GeoRaksha</h1>
<h3 align="center">Autonomous Emergency Corridor Platform</h3>

<p align="center">
  <em>A Multi-Agent Geo-Agentic Framework to Support Emergency Vehicle Movement in Dense Urban Networks</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-ESM-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-blue" />
</p>

---

## 🚑 The Problem

In medical emergencies, the **Golden Hour** — the first 60 minutes after a critical incident — directly determines patient survival. In congested megacities like Bengaluru:

- Ambulances lose **12–20 minutes** stuck in traffic.
- Consumer navigation apps (Google Maps, Waze) treat ambulances like ordinary cars.
- Installing physical road sensors city-wide costs **hundreds of crores** and takes years.

## 💡 Our Solution

**GeoRaksha** turns an asset the city already owns — the **6,500+ BMTC public transit buses** — into a distributed, zero-cost traffic sensor network.

As buses drive through every arterial road with onboard GPS, GeoRaksha's 4 autonomous AI agents ingest their speed telemetry in real-time to detect congestion, compute optimal emergency corridors, preempt traffic signals, and coordinate with hospital ERs — **all without human intervention**.

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────┐
│           BMTC Public Transit Fleet                  │
│        (360+ Live GPS Probe Telemetry)               │
└────────────────────────┬─────────────────────────────┘
                         │ GPS Pings (lat, lng, speed)
                         ▼
┌──────────────────────────────────────────────────────┐
│              GEORAKSHA BACKEND ENGINE                 │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │         SPATIAL GRAPH ENGINE                   │  │
│  │  21,371 Nodes │ 47,491 Edges │ 10 Hospitals   │  │
│  │  3,401 Spatial Grid Cells (O(1) map-matching)  │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │                                │
│    ┌────────┐ ┌─────┴────┐ ┌──────────┐ ┌────────┐  │
│    │Traffic │ │  Route   │ │   ETA    │ │Signal  │  │
│    │Monitor │ │Optimizer │ │Predictor │ │  Coord │  │
│    └────┬───┘ └────┬─────┘ └────┬─────┘ └────┬───┘  │
│         └──────────┴────────────┴─────────────┘      │
│                     │                                │
│           Socket.IO Server (Port 3000)               │
└─────────────────────┬────────────────────────────────┘
                      │ WebSocket (Full-Duplex)
                      ▼
┌──────────────────────────────────────────────────────┐
│            GEORAKSHA FRONTEND CLIENT                 │
│          React 18 + Vite + Leaflet + Canvas          │
│                                                      │
│  🏢 Command Center    ⚡ Tactical Corridor           │
│  🚨 Triage & Beds     🩺 Telemedicine Hub            │
│  📐 System Architecture                             │
│                                                      │
│         Supabase Authentication Gate                 │
└──────────────────────────────────────────────────────┘
```

---

## 🤖 The 4 Autonomous Agents

| Agent | Role | Algorithm / Technique |
|-------|------|-----------------------|
| 🚦 **Traffic Monitor** | Ingests live bus GPS, classifies road segments as Clear / Slow / Congested | Spatial Hash Grid + Rolling 5-ping buffer + Dwell-Time Filter |
| 🗺️ **Route Optimizer** | Computes & dynamically reroutes the fastest emergency corridor | MinHeap Dijkstra with live edge weights + Recomputation Guard |
| ⏱️ **ETA Predictor** | Forecasts arrival time with trend-aware smoothing | Holt's Double Exponential Smoothing (α=0.6, β=0.4) |
| 📡 **Signal Coordinator** | Preempts traffic lights to create Green Wave corridors | Time-to-Junction (TTJ) < 60s advisory protocol |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **BMTC GTFS Data** (see [Data Setup](#-data-setup) below)

### 1. Clone the Repository

```bash
git clone https://github.com/tanmaykatiyar0207-cell/GeoRaksha.git
cd GeoRaksha
```

### 2. Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd client
npm install
cd ..
```

### 3. Data Setup

Download the **Bengaluru BMTC GTFS Static Feed** and place it in the project root:

```
GeoRaksha/
└── gtfs-data/
    ├── stops.txt
    ├── routes.txt
    ├── trips.txt
    ├── stop_times.txt
    ├── shapes.txt
    └── ... (other GTFS files)
```

> **Source:** [BMTC Open Transit Data](https://otd.delhi.gov.in/) or equivalent GTFS feed for Bengaluru.

### 4. Configure Environment

Create `client/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Run Locally

```bash
# Terminal 1 — Start Backend (loads GTFS graph + starts simulation)
node server/server.js

# Terminal 2 — Start Frontend
cd client
npx vite --host
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
GeoRaksha/
├── server/
│   ├── server.js                  # Entry point — wires agents, socket, simulation
│   ├── sharedState.js             # Central event bus & in-memory state store
│   ├── agents/
│   │   ├── trafficMonitoring.js   # Agent 1: GPS → edge speed classification
│   │   ├── routeOptimizer.js      # Agent 2: Dynamic Dijkstra pathfinding
│   │   ├── etaPredictor.js        # Agent 3: Holt's trend-adjusted ETA
│   │   └── signalCoordinator.js   # Agent 4: Green Wave junction preemption
│   ├── simulator/
│   │   ├── busSimulator.js        # 364-bus fleet telemetry simulation
│   │   └── ambulanceSimulator.js  # Emergency vehicle movement engine
│   └── data/
│       ├── roadGraph.js           # Graph caching & hospital tagging
│       └── gtfsLoader.js          # GTFS CSV → directed graph builder
├── client/
│   ├── src/
│   │   ├── App.jsx                # Root — auth gate, routing, layout
│   │   ├── supabaseClient.js      # Supabase auth configuration
│   │   ├── hooks/
│   │   │   └── useSocket.js       # Socket.IO React hook
│   │   └── components/
│   │       ├── LandingPage.jsx        # Mission Briefing & auth modal
│   │       ├── MapView.jsx            # Leaflet city-scale operations map
│   │       ├── AmbulanceNavView.jsx   # Tactical Corridor driver HUD
│   │       ├── CommandKpiBar.jsx      # Top 5-module operational KPI bar
│   │       ├── DemoController.jsx     # Presenter controls (inject events)
│   │       ├── AlertPanel.jsx         # Signal preemption alerts
│   │       ├── ETADisplay.jsx         # Real-time ETA with sparkline
│   │       ├── LiveNarrationPanel.jsx # AI Agent Activity Feed
│   │       ├── TriageHospitalPanel.jsx# Hospital bed & triage monitoring
│   │       ├── HospitalCommsModal.jsx # Bidirectional ER telemedicine chat
│   │       ├── MissionSummaryModal.jsx# Post-mission analytics report
│   │       ├── ToastManager.jsx       # Live notification toasts
│   │       └── AboutPage.jsx          # System Architecture page
│   └── index.html
├── gtfs-data/                     # BMTC GTFS static feed (not in repo)
├── package.json
└── .gitignore
```

---

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Zero-Infrastructure Sensing** | Uses existing BMTC buses as floating traffic probes — no cameras or road sensors needed |
| **Dwell-Time Filter** | Algorithmically distinguishes scheduled bus stops from actual road congestion |
| **Autonomous Rerouting** | AI detects gridlock on the active corridor and diverts the ambulance without human input |
| **Green Wave Preemption** | Automatically holds traffic lights green as the ambulance approaches intersections |
| **Predictive ETA** | Holt's ML trend model forecasts arrival time accounting for downstream speed decay |
| **Hospital Telemedicine** | Pre-arrival vitals and trauma protocols sent directly to the receiving ER |
| **Triage Bed Monitoring** | Real-time visibility into trauma bay and ICU bed capacity at destination hospitals |
| **Mission Summary** | Auditable post-trip report comparing time saved vs. congested baseline |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Runtime** | Node.js (ESM), Socket.IO 4.x |
| **Graph & Geo** | Custom Dijkstra MinHeap, Turf.js, Spatial Hash Grid, GTFS Loader |
| **Frontend** | React 19, Vite 8, Leaflet, React-Leaflet, Three.js, Framer Motion |
| **Auth & DB** | Supabase (PostgreSQL + Auth) |
| **Algorithms** | Holt's Double Exponential Smoothing, Dynamic Edge-Cost Dijkstra, Haversine Distance |

---

## 🧪 Running Tests

```bash
# From project root
node --experimental-vm-modules node_modules/.bin/jest server/tests/
```

---

## 📊 Simulation Metrics (Scripted Demo Run)

| Metric | Value |
|--------|-------|
| Graph Nodes | 21,371 |
| Graph Edges | 47,491 |
| Spatial Grid Cells | 3,401 |
| Active Bus Probes | 364 |
| Tagged Hospitals | 10 |
| Map-Match Latency | < 1 ms |
| Avg. Time Saved per Trip | ~4 min |

---

## 👩‍💻 Team

**Team 1 — Say My Name**  
GIRL GEEKS 2026 Hackathon | RIT Bengaluru

| USN | Name | Role |
|-----|------|------|
| 1MS25IS125 | Tanmay Katiyar | Backend & Routing Engine |
| 1MS25IS122 | Sumanth Halyal | Multi-Agent Simulation Engine |
| 1MS25IS097 | S M Rashmita | Frontend & Tactical Navigation UI |
| 1MS25IS089 | Riddhi | Spatial Graph & Triage Systems |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>GeoRaksha</strong> — Turning Public Buses into Lifesavers 🚌➡️🚑
</p>
