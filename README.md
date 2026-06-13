<div align="center">

#  SharkLens
### *Face the Sharks Before You Face the Real Ones.*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-SharkLens-red?style=for-the-badge)](https://shark-lens.vercel.app/)

<p align="center">
  An AI-powered Investor Simulation & Pitch Intelligence Platform that helps founders practice, analyze, optimize, and perfect startup pitches through real-time investor conversations, behavioral analytics, and AI-driven feedback.
</p>

<br/>

![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-Frontend-purple?style=for-the-badge&logo=vite)
![Express](https://img.shields.io/badge/Express-Backend-black?style=for-the-badge&logo=express)
![AI Powered](https://img.shields.io/badge/AI-Powered-red?style=for-the-badge)
![Hackathon](https://img.shields.io/badge/Hackathon-Ready-success?style=for-the-badge)
![Shark Tank](https://img.shields.io/badge/Shark_Tank-Simulator-orange?style=for-the-badge)

</div>

---

# The Problem

Every founder prepares for investor meetings by practicing in front of:

- Mirrors
- Friends
- Co-founders
- Generic AI chatbots

Yet the actual investor meeting feels completely different.

Investors interrupt.

They challenge assumptions.

They question market size.

They attack weak financials.

They notice hesitation.

They detect lack of conviction.

And most importantly:

**Nobody tells founders how they actually performed while speaking.**

Traditional pitch practice tools focus only on content.

They do not measure:

- Confidence
- Eye contact
- Delivery quality
- Filler words
- Emotional state
- Real-time investor pressure

As a result, founders walk into high-stakes meetings with no objective understanding of how they perform under pressure.

---

# Why SharkLens?

SharkLens was built around a simple idea:

> Founders shouldn't discover weaknesses during investor meetings. They should discover them before.

Instead of reading pitch decks or generating static feedback, SharkLens creates a realistic investor simulation environment where founders interact with AI investors while an intelligence layer continuously analyzes their communication.

The result is not just pitch practice.

It is investor readiness training.

---

#  Overview

SharkLens is an AI-powered startup pitch coaching platform that combines:

- AI Investor Simulations
- Real-Time Behavioral Analytics
- Multi-Investor Boardroom Mode
- Confidence Intelligence
- Pitch Optimization
- Automated Post-Pitch Workflows

The platform enables founders to practice against different investor personalities while receiving live performance insights normally available only through expensive coaching sessions.

---

#  Core Features

##  AI Investor Simulation

Practice against multiple AI investors with distinct personalities and questioning styles.

Current investor personas include:

| Investor | Style |
|-----------|--------|
| Mark Cuban | Aggressive, numbers-focused |
| Priya Sharma | Vision and growth oriented |
| Sunita Agarwal | Practical and execution-driven |
| Nikhil Kamath | Strategic and philosophical |
| Anupam Mittal | Brand and consumer focused |
| Aman Gupta | D2C and growth focused |

Each investor behaves differently, forcing founders to adapt in real time.

---

##  Boardroom Mode

Instead of talking to a single AI avatar, founders can create an investor panel and simulate a real boardroom environment.

Features:

- Multiple investors on screen
- Active speaker rotation
- Investor-specific questioning
- Realistic pressure environment
- Multi-perspective feedback

This transforms practice sessions into realistic fundraising simulations.

---

##  Real-Time Confidence Engine

SharkLens continuously calculates a confidence score during the pitch.

The confidence engine combines multiple signals:

- Speech quality
- Delivery consistency
- Speaking pace
- Behavioral indicators
- Communication effectiveness

Result:

A live confidence score that updates throughout the session.

---

##  Eye Contact Tracking

Investor trust is heavily influenced by visual engagement.

SharkLens monitors:

- Eye contact percentage
- Attention consistency
- Focus stability

Founders immediately see whether they are maintaining strong engagement throughout the pitch.

---

##  Filler Word Detection

The platform identifies communication patterns that weaken investor confidence.

Examples:

- Umm
- Like
- Basically
- Actually
- You know
- So

Instead of generic feedback, founders receive quantified filler-word analytics.

---

##  Emotion Intelligence

SharkLens evaluates emotional delivery and speaking presence.

Detected states include:

- Confidence
- Nervousness
- Neutrality
- Energy level

This helps founders understand how investors may perceive them during the pitch.

---

##  Performance Radar

Every session generates a multi-dimensional performance breakdown.

Metrics include:

- Confidence
- Communication
- Delivery
- Investor Readiness
- Clarity
- Engagement

The radar visualization provides an instant understanding of strengths and weaknesses.

---

##  AI Pitch Optimizer

After the session ends, SharkLens generates actionable improvement insights.

The optimizer:

- Identifies weak sections
- Highlights delivery issues
- Suggests improvements
- Recommends practice areas

This transforms feedback into a structured improvement plan.

---

##  AI Hint System

Founders can request contextual coaching during practice sessions.

Examples:

- Improve financial explanation
- Clarify business model
- Strengthen market positioning
- Handle investor objections

The result is a guided learning experience rather than passive evaluation.

---

##  Deck Intelligence

Users can upload startup decks before pitching.

SharkLens extracts:

- Startup information
- Product details
- Market context
- Business model insights

This allows investors and analytics systems to provide more relevant feedback.

---

##  MCP Automation Pipeline

SharkLens extends beyond coaching.

Post-session workflows can automatically trigger actions such as:

- Report generation
- Session scheduling
- Knowledge storage
- Search augmentation

This turns SharkLens into an intelligent founder workflow assistant.

---

#  System Architecture

```text
                 ┌─────────────────────┐
                 │     Founder         │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    SharkLens UI     │
                 │ React + Vite        │
                 └──────────┬──────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼

 ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐
 │ TruGen AI    │  │ ML Analytics   │  │ MCP Services    │
 │ Investors    │  │ Engine         │  │ Automation      │
 └──────────────┘  └────────────────┘  └─────────────────┘

          ▼                 ▼                 ▼

      Investor       Performance Data     Actions

                            ▼

                 ┌─────────────────────┐
                 │ Optimization Layer  │
                 └─────────────────────┘
```

---

#  AI Workflow

```text
Pitch Deck Upload
        │
        ▼
Deck Intelligence
        │
        ▼
AI Investor Session
        │
        ▼
Real-Time Analytics
        │
        ├── Confidence
        ├── Eye Contact
        ├── Emotion
        ├── Filler Words
        ├── Speech Rate
        └── Session Metrics
        │
        ▼
Scorecard Generation
        │
        ▼
AI Optimization
        │
        ▼
Actionable Founder Insights
```

---

#  Tech Stack

## Frontend

| Technology | Purpose |
|------------|----------|
| React 18 | User Interface |
| Vite | Build Tool |
| React Router | Navigation |
| Canvas APIs | Radar Visualizations |
| CSS Variables | Design System |

---

## Backend

| Technology | Purpose |
|------------|----------|
| Node.js | Runtime |
| Express.js | API Layer |
| REST APIs | Communication |

---

## AI & Intelligence

| Component | Purpose |
|------------|----------|
| TruGen AI | Investor Agents |
| Confidence Fusion Engine | Confidence Scoring |
| Emotion Analysis | Behavioral Signals |
| Eye Contact Analysis | Engagement Metrics |
| Filler Detection | Speech Quality Analysis |

---

#  Project Structure

```text
frontend/
│
├── pages/
│   ├── Login
│   ├── CommandCenter
│   ├── DeckPortal
│   ├── PitchArena
│   ├── Scorecard
│   └── Optimizer
│
├── components/
│   ├── MLSidebar
│   ├── RadarChart
│   ├── ScoreRing
│   └── Sparkline
│
├── services/
│   ├── trugen
│   └── mlEngine
│
└── context/
    └── AppContext

backend/
│
├── routes/
│   ├── trugen
│   ├── webhooks
│   └── mcp
│
└── server.js
```

---

# ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/sharklens.git
cd sharklens
```

### Install Frontend

```bash
npm install
```

### Install Backend

```bash
cd backend
npm install
```

### Start Backend

```bash
npm run dev
```

### Start Frontend

```bash
npm run dev
```

---

#  Environment Variables

### Frontend

```env
VITE_TRUGEN_API_KEY=
VITE_TRUGEN_AGENT_CUBAN=
VITE_TRUGEN_AGENT_VC=
VITE_TRUGEN_AGENT_ANGEL=
VITE_TRUGEN_AGENT_NIKHIL=
VITE_TRUGEN_AGENT_ANUPAM=
VITE_TRUGEN_AGENT_AMAN=
```

### Backend

```env
TRUGEN_API_KEY=
PORT=3001
FRONTEND_URL=
```

---

#  Integrations

| Integration | Purpose |
|-------------|----------|
| TruGen AI | Investor Conversations |
| Web Search MCP | Context Enrichment |
| Calendar MCP | Session Scheduling |
| Drive MCP | Storage Automation |
| Email MCP | Report Delivery |

---

#  Performance Optimizations

- Lightweight Vite architecture
- Modular component design
- Context-based state management
- Reusable analytics engine
- Efficient rendering strategy
- Lazy computation of session metrics
- Responsive boardroom layouts
- Optimized AI session handling

---

#  What Makes SharkLens Different?

Most pitch tools answer:

> "What should I say?"

SharkLens answers:

> "How did you actually perform?"

The platform evaluates both:

### Content Intelligence
- Pitch quality
- Narrative structure
- Business clarity

### Human Intelligence
- Confidence
- Eye contact
- Speaking habits
- Emotional delivery

This combination creates a far more realistic representation of investor readiness.

---

#  Challenges We Solved

### Real-Time Analytics

Combining multiple behavioral signals into a meaningful confidence score.

### Investor Simulation

Creating distinct investor personalities rather than generic chatbot responses.

### Multi-Investor Boardroom

Supporting realistic investor panel interactions.

### Actionable Feedback

Transforming raw metrics into useful founder guidance.

### Engagement Tracking

Measuring communication effectiveness beyond simple speech recognition.

---

#  Scalability Considerations

SharkLens has been designed with future expansion in mind.

Potential scaling paths:

- Real-time inference servers
- Live WebSocket analytics
- Team pitch sessions
- Investor matchmaking
- Founder benchmarking
- Organization dashboards
- Enterprise startup accelerators
- University incubation programs

---

#  Built For The Future

Future roadmap includes:

- Real AI eye-tracking inference
- Advanced emotion recognition
- Investor-specific scorecards
- Team collaboration mode
- Historical performance trends
- AI-generated pitch decks
- Startup readiness benchmarking
- Accelerator integrations

---

#  Overall

**SharkLens is an AI-powered investor simulation platform that helps founders practice fundraising conversations before they happen.**

Instead of receiving static feedback, founders interact with AI investors while SharkLens continuously analyzes confidence, eye contact, emotion, speech quality, and delivery performance in real time.

The platform combines investor simulation, behavioral analytics, pitch optimization, and workflow automation into a single experience, helping founders become truly investor-ready before entering the boardroom.


---

<div align="center">

###  Practice. Analyze. Improve. Fundraise.

**SharkLens — Face the Sharks Before You Face the Real Ones.**

</div>
