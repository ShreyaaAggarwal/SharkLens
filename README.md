# 🦈 SharkLens — AI Shark Tank Pitch Coach
**Team: Array to Heaven | TruGen AI · PS4.1**

> Real-time AI video pitch coach. Practice against brutal investor personas with live ML telemetry, confidence fusion, and automated MCP actions.

---

## 📁 File Structure

```
sharklens/
│
├── public/index.html              HTML shell
├── package.json                   Frontend deps (React 18 + Vite)
├── vite.config.js                 Vite config
├── vercel.json                    SPA routing fix for Vercel
├── .env.example                   Copy → .env
│
├── src/
│   ├── main.jsx                   React entry point
│   ├── App.jsx                    Router + auth guard
│   │
│   ├── context/
│   │   └── AppContext.jsx         Global state (user, config, session data)
│   │
│   ├── styles/
│   │   └── globals.css            Design system: tokens, animations, base styles
│   │
│   ├── utils/
│   │   ├── trugen.js              TruGen API client + shark system prompts
│   │   └── mlEngine.js            Confidence fusion, gaze, filler detection
│   │
│   ├── components/
│   │   ├── Nav.jsx                Navigation bar with step tracker
│   │   ├── RadarChart.jsx         Canvas 5-axis radar chart
│   │   ├── ScoreRing.jsx          Animated circular score ring
│   │   ├── Sparkline.jsx          Mini inline line chart
│   │   └── MLSidebar.jsx          Live ML telemetry sidebar (Arena)
│   │
│   └── pages/
│       ├── Login.jsx              Cinematic login/signup with parallax
│       ├── CommandCenter.jsx      Step 1: Shark selector, difficulty, API config
│       ├── DeckPortal.jsx         Step 2: Drag-drop deck upload + Drive MCP
│       ├── PitchArena.jsx         Step 3+4: TruGen iFrame + live ML sidebar
│       ├── Scorecard.jsx          Step 5: Score ring, bars, timeline, leaderboard
│       └── Optimizer.jsx          Step 6: AI rewrite, full script, MCP automation
│
└── backend/
    ├── server.js                  Express server (port 3001)
    ├── package.json               Backend deps
    ├── .env.example               Backend env vars
    └── routes/
        ├── trugen.js              TruGen API proxy (protects key server-side)
        ├── webhooks.js            TruGen callback handler (session events)
        └── mcp.js                 Gmail · Calendar · Drive · Search MCP stubs
```

---

## 🚀 Quick Start

### Step 1 — Clone & Install

```bash
# Frontend
cd sharklens
npm install

# Backend
cd backend
npm install
```

### Step 2 — Environment Variables

```bash
# Root (frontend)
cp .env.example .env
# Fill: VITE_TRUGEN_API_KEY, VITE_TRUGEN_AGENT_ID

# Backend
cp backend/.env.example backend/.env
# Fill: TRUGEN_API_KEY
```

### Step 3 — Get your TruGen Agent ID

1. Go to https://app.trugen.ai
2. Create a new Agent
3. Copy the Agent ID (starts with `agt_...`)
4. Paste into `VITE_TRUGEN_AGENT_ID` in `.env`
5. Also paste into the API Config field on the Setup screen

### Step 4 — Run

```bash
# Terminal 1: Backend
cd backend && npm run dev    # runs on :3001

# Terminal 2: Frontend
npm run dev                  # runs on :5173
```

Open: http://localhost:5173

---

## ☁️ Deploy to Vercel

### Frontend (Static)
```bash
# In /sharklens root
vercel deploy

# Set environment variables in Vercel dashboard:
# VITE_TRUGEN_API_KEY = your_key
# VITE_TRUGEN_AGENT_ID = your_agent_id
```

### Backend (Serverless or separate service)
```bash
# Option A: Deploy backend to Railway / Render
# Option B: Convert routes to Vercel API functions in /api folder

# For Vercel API routes, move backend/routes/*.js → sharklens/api/*.js
# vercel.json already handles SPA routing
```

---

## 🔑 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_TRUGEN_API_KEY` | Frontend `.env` | TruGen API key |
| `VITE_TRUGEN_AGENT_ID` | Frontend `.env` | Your TruGen Agent ID |
| `TRUGEN_API_KEY` | Backend `.env` | Same key, server-side |
| `PORT` | Backend `.env` | Backend port (default 3001) |
| `FRONTEND_URL` | Backend `.env` | CORS origin |

---

## 🧠 ML Pipeline

| Model | Signal | Implementation |
|---|---|---|
| Wav2Vec2 | Filler word detection | Simulated in `mlEngine.js` |
| MediaPipe Iris | Gaze / eye contact % | Simulated in `mlEngine.js` |
| MobileViT | Facial emotion classification | Simulated in `mlEngine.js` |
| Silero VAD | Voice activity detection | Simulated in `mlEngine.js` |
| Fusion Net | Confidence score (weighted avg) | `fuseConfidence()` in `mlEngine.js` |

**Production upgrade path:** Replace `tickML()` simulation with real WebSocket messages from a Python edge server running actual Wav2Vec2 + MediaPipe inference.

---

## 🤝 TruGen Integration

### iFrame Embed (used in Arena)
```html
<iframe
  src="https://app.trugen.ai/embed?agentId=YOUR_AGENT_ID"
  allow="camera; microphone; autoplay; display-capture"
/>
```

### Webhook Events Handled
| Event | Action |
|---|---|
| `utterance_committed` | Store transcript, trigger ML |
| `call_ended` | Finalise session, compute score |
| `agent.started_speaking` | Update UI state |
| `max_call_duration_timeout` | Auto-end session |

---

## 📊 MCP Integrations

| MCP | Route | Action |
|---|---|---|
| Web Search | `POST /api/mcp/search` | Live competitor lookup mid-pitch |
| Gmail | `POST /api/mcp/gmail` | Auto-send scorecard post-session |
| Google Calendar | `POST /api/mcp/calendar` | Book follow-up on weak areas |
| Google Drive | `POST /api/mcp/drive` | Save logs + deck |

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0F1115` | Primary background |
| `--surface` | `#1A1D24` | Cards, containers |
| `--cuban` | `#E05252` | Mark Cuban / danger / primary CTA |
| `--vc` | `#3FB97E` | Soft VC / success / positive |
| `--angel` | `#D99E32` | Indian Angel / warning |
| `--text` | `#F5F6F8` | Primary text |
| `--sub` | `#8B949E` | Secondary text |
| Font Display | Bebas Neue | Headlines |
| Font Body | Barlow | Body copy |
| Font Mono | IBM Plex Mono | Data, labels, code |
