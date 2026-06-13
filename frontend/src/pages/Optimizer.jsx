import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const BACKEND      = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CLAUDE_PROXY = `${BACKEND}/api/claude/analyze`

async function askClaude(prompt, maxTokens = 2000) {
  const r = await fetch(CLAUDE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens }),
  })
  if (!r.ok) throw new Error(`Claude proxy failed: ${r.status}`)
  const data = await r.json()
  return data.text || ''
}

function extractJSON(raw) {
  if (!raw) throw new Error('Empty response')
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = clean.indexOf('{')
  const end   = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found')
  return JSON.parse(clean.slice(start, end + 1))
}

const PITCH_FOCUS_OPTIONS = [
  {
    id:       'product',
    icon:     '🔬',
    label:    'Product Focus',
    sub:      'Innovation & differentiation',
    color:    '#8B5CF6',
    emphasis: ['product innovation', 'problem solved', 'technology advantage', 'differentiation', 'user value'],
    prompt:   `You are rewriting this pitch for an investor who primarily cares about PRODUCT and TECHNOLOGY.
Lead with the breakthrough insight behind the product. Explain the problem with visceral detail, then reveal the solution as an elegant "of course" moment.
Emphasize: why this specific technology approach wins, what makes the product defensible, why users genuinely need this.
Remove or minimize financial figures from the opening. The product story IS the argument.
Write in a natural, confident speaking voice — as if the founder is in the room with investors.`,
  },
  {
    id:       'growth',
    icon:     '📈',
    label:    'Growth Focus',
    sub:      'Traction & scale story',
    color:    '#2ECC71',
    emphasis: ['user acquisition', 'traction metrics', 'expansion strategy', 'scalability', 'growth rate'],
    prompt:   `You are rewriting this pitch for an investor who primarily cares about GROWTH and TRACTION.
Open with the growth numbers — make the trajectory undeniable in the first 30 seconds.
Emphasize: month-over-month growth rates, network effects, viral or organic acquisition, expansion playbook, why this scales.
Every claim should connect to a number or a proven repeatable motion.
Write in a natural, confident speaking voice — as if the founder is in the room with investors.`,
  },
  {
    id:       'revenue',
    icon:     '💰',
    label:    'Revenue Focus',
    sub:      'Monetization & unit economics',
    color:    '#F59E0B',
    emphasis: ['business model', 'revenue streams', 'unit economics', 'profitability path', 'LTV/CAC'],
    prompt:   `You are rewriting this pitch for an investor who primarily cares about REVENUE MODEL and UNIT ECONOMICS.
Open with proof of monetization — real paying customers, real numbers. Make the business model crystal clear within 60 seconds.
Emphasize: revenue streams, pricing rationale, CAC/LTV dynamics, path to profitability, financial scalability.
Every paragraph should connect product to money. Remove fluff about vision if it doesn't tie to financial outcomes.
Write in a natural, confident speaking voice — as if the founder is in the room with investors.`,
  },
  {
    id:       'market',
    icon:     '🌏',
    label:    'Market Focus',
    sub:      'TAM, timing & competition',
    color:    '#06B6D4',
    emphasis: ['TAM/SAM/SOM', 'market opportunity', 'competitive landscape', 'market timing', 'industry tailwinds'],
    prompt:   `You are rewriting this pitch for an investor who primarily cares about MARKET SIZE and TIMING.
Open with the market failure — why the status quo is broken and why now is the exact right moment.
Emphasize: TAM/SAM breakdown with bottom-up logic, why existing solutions are failing, industry tailwinds, why this team in this market now.
Position the company as the obvious winner in a market that is about to explode.
Write in a natural, confident speaking voice — as if the founder is in the room with investors.`,
  },
]

const MCP_ACTIONS = [
  { id: 'gmail',    icon: '📧', label: 'Scorecard Report',    sub: 'Gmail MCP',    done: 'Sent to inbox ✓' },
  { id: 'calendar', icon: '📅', label: 'Follow-up Session',   sub: 'Calendar MCP', done: 'Booked: Thu 10 AM ✓' },
  { id: 'drive',    icon: '💾', label: 'Session Logs + Deck', sub: 'Drive MCP',    done: 'Saved to /SharkLens/ ✓' },
]

export default function Optimizer() {
  const { sessionData, config, deckText, deckIntelligence, addSessionToPassport, transcript } = useApp()
  const nav = useNavigate()

  const [activeTab, setActiveTab]           = useState('rewrite')
  const [mcpDone, setMcpDone]               = useState({})
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [rewriteData, setRewriteData]       = useState(null)
  const [scriptData, setScriptData]         = useState(null)
  const [scoreAnalysis, setScoreAnalysis]   = useState(null)
  const [pitchFocus, setPitchFocus]         = useState('product')
  const [focusLoading, setFocusLoading]     = useState(false)
  const [focusResult, setFocusResult]       = useState(null)

  const data = sessionData || {
    overall: 71,
    breakdown: [
      { label: 'Confidence',    pct: 64, color: 'var(--cuban)' },
      { label: 'Market Sizing', pct: 72, color: 'var(--vc)'    },
      { label: 'Financials',    pct: 48, color: 'var(--angel)' },
      { label: 'Vision',        pct: 80, color: 'var(--vc)'    },
      { label: 'Delivery',      pct: 70, color: 'var(--sub)'   },
    ],
    shark: config.shark || 'cuban',
    difficulty: config.difficulty || 'Realistic',
    durationSec: 623,
  }

  const worst = [...data.breakdown].sort((a, b) => a.pct - b.pct)[0]

  // Build shared context string — used by all prompts
  function buildDeckContext() {
    if (!deckIntelligence) return deckText ? deckText.slice(0, 3000) : 'No deck provided.'
    return `Startup: ${deckIntelligence.startupName}
Sector: ${deckIntelligence.sector}
Problem: ${deckIntelligence.problemStatement}
Solution: ${deckIntelligence.solution}
Market: ${deckIntelligence.marketSize}
Business Model: ${deckIntelligence.businessModel}
Traction: ${deckIntelligence.traction}
Team: ${deckIntelligence.teamHighlight || 'Not stated'}
Ask: ${deckIntelligence.ask}
Detected weaknesses: ${(deckIntelligence.topWeaknesses || []).join(', ')}`
  }

  function buildTranscriptContext() {
    if (!transcript || transcript.trim().length < 20) return null
    return `FOUNDER PITCH TRANSCRIPT (what they actually said during the session):\n${transcript.slice(0, 3000)}`
  }

  useEffect(() => {
    const t = setTimeout(() => {}, 300)
    MCP_ACTIONS.forEach((a, i) => {
      setTimeout(() => setMcpDone(prev => ({ ...prev, [a.id]: true })), 1200 + i * 900)
    })
    generateRewrite()
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (sessionData) {
      addSessionToPassport({
        ...sessionData,
        startupName:  deckIntelligence?.startupName || 'Unknown',
        sector:       deckIntelligence?.sector || '',
        fundingRound: config.fundingRound,
        ask:          deckIntelligence?.ask || '',
        traction:     deckIntelligence?.traction || '',
      })
    }
  }, [])

  // ── AI REWRITE TAB ─────────────────────────────────────────
  async function generateRewrite() {
    setRewriteLoading(true)
    try {
      const deckCtx       = buildDeckContext()
      const transcriptCtx = buildTranscriptContext()
      const sessionCtx    = `Session Performance:
- Overall score: ${data.overall}/100
- Weakest area: ${worst.label} (${worst.pct}%)
- Shark: ${data.shark} / Difficulty: ${data.difficulty}
- Breakdown: ${data.breakdown.map(b => `${b.label}: ${b.pct}%`).join(', ')}`

      const prompt = `You are a world-class pitch coach. Based on the deck intelligence and session data, suggest concrete pitch improvements.

IMPORTANT: Do NOT invent or fabricate quotes. Based on what the deck says:
- "current": how this weakness is typically or weakly communicated based on the deck data
- "suggested": a stronger investor-ready version specific to THIS startup's content
- "note": why this phrasing works better, in 1-2 plain sentences

DECK INTELLIGENCE:
${deckCtx}

${transcriptCtx ? transcriptCtx + '\n' : ''}
${sessionCtx}

Return ONLY valid JSON (no markdown fences):
{
  "improvements": [
    {
      "area": "section name",
      "current": "how this is weakly communicated based on the deck",
      "suggested": "stronger version specific to their deck content — 2-4 sentences",
      "note": "why this version wins with investors",
      "pct": 82
    }
  ],
  "fullScript": [
    {"section": "HOOK (0:00-0:30)",      "text": "full hook paragraph — 3-5 sentences based on actual deck", "color": "#E50914"},
    {"section": "PROBLEM (0:30-1:30)",   "text": "full problem paragraph — 3-5 sentences", "color": "#F39C12"},
    {"section": "SOLUTION (1:30-2:30)",  "text": "full solution paragraph — 3-5 sentences", "color": "#2ECC71"},
    {"section": "TRACTION (2:30-3:30)",  "text": "full traction paragraph — 3-5 sentences", "color": "#2ECC71"},
    {"section": "THE ASK (3:30-4:00)",   "text": "full ask paragraph — 2-3 sentences", "color": "#E50914"}
  ],
  "topInsight": "The single most important fix, specific to this deck",
  "nextSessionFocus": "What to practice next time, in plain words"
}`

      const raw    = await askClaude(prompt, 2000)
      const parsed = extractJSON(raw)
      setRewriteData(parsed.improvements || [])
      setScriptData(parsed.fullScript || [])
      setScoreAnalysis({ topInsight: parsed.topInsight, nextSessionFocus: parsed.nextSessionFocus })
    } catch (err) {
      console.error('Rewrite failed:', err)
      const sn = deckIntelligence?.startupName || 'your startup'
      setRewriteData([
        {
          area:      'Opening Hook',
          current:   'The deck leads with the solution before establishing why the problem is urgent.',
          suggested: `"Every day, our target user loses time and money to [core problem]. We built ${sn} to fix exactly that — and we already have early traction to prove it works."`,
          note:      'Open with the pain, not the product. Investors fund problems, not features.',
          pct:       85,
        },
        {
          area:      'Market Claim',
          current:   `Market size stated as "${deckIntelligence?.marketSize || 'a large number'}" without a bottom-up breakdown.`,
          suggested: `"We're targeting [specific segment] — that's [N] customers at [₹price], giving us a reachable market of [₹X]. We get to the first 1,000 through [channel]."`,
          note:      'Sharks trust bottom-up math more than top-down TAM claims.',
          pct:       78,
        },
        {
          area:      'Traction Story',
          current:   `Traction listed as "${deckIntelligence?.traction || 'Not stated'}" without a narrative arc.`,
          suggested: `"In [timeframe] we went from [0] to [milestone]. Our [key metric] is growing [X]% month-on-month, and [retention/repeat stat] shows users keep coming back."`,
          note:      'Show the trajectory. Growth rate is more convincing than any single number.',
          pct:       71,
        },
      ])
      setScriptData([])
      setScoreAnalysis({
        topInsight:       `Your ${worst.label} section scored ${worst.pct}% — translate the deck's content into clearer spoken language with specific numbers.`,
        nextSessionFocus: `Practice defending your ${worst.label} with 2-3 concrete data points. Never say "a lot" or "significant".`,
      })
    } finally {
      setRewriteLoading(false)
    }
  }

  // ── PITCH FOCUS TAB — full multi-paragraph script ──────────
  async function generateFocusedPitch(focusId) {
    const focus = PITCH_FOCUS_OPTIONS.find(f => f.id === focusId)
    if (!focus) return
    setFocusLoading(true)
    setFocusResult(null)

    try {
      const deckCtx       = buildDeckContext()
      const transcriptCtx = buildTranscriptContext()

      const prompt = `You are an expert VC pitch coach and speechwriter.

You have access to:

1. FOUNDER PITCH DECK:
${deckCtx}

${transcriptCtx ? `2. ${transcriptCtx}\n` : '2. No transcript available — work from deck content.\n'}

INVESTOR FOCUS: ${focus.label.toUpperCase()}

${focus.prompt}

YOUR TASK:
Analyze both sources completely. Then rewrite the pitch as a complete, professional investor presentation speech.

The output must sound like the founder is speaking DIRECTLY to investors in the room.

Requirements:
- Natural, confident speaking tone
- Clear storytelling with a beginning, middle, end
- Specific numbers and claims from the deck (do not invent numbers not in the deck)
- 3 to 5 minutes of speaking content (approximately 450-750 words)
- Written in paragraphs, NOT bullet points
- Each section flows naturally into the next

Structure the script as these 5 sections (write each as a full paragraph of 3-6 sentences):

HOOK — grab attention immediately, establish stakes
PROBLEM — make the pain visceral and real
SOLUTION — reveal the product as the elegant answer
TRACTION — prove it is working with specific evidence
THE ASK — close with clarity and confidence

After the full script, provide:
- keyMessage: the single anchor sentence for this ${focus.label} investor (1 sentence)
- improvements: 3 specific things you changed and why (each 1-2 sentences)

Return ONLY valid JSON (no markdown fences, no preamble):
{
  "focusTitle": "${focus.label} Pitch Script",
  "keyMessage": "The single sentence that anchors everything for a ${focus.label} investor",
  "script": {
    "hook":     "Full HOOK paragraph — 3-6 natural speaking sentences",
    "problem":  "Full PROBLEM paragraph — 3-6 natural speaking sentences",
    "solution": "Full SOLUTION paragraph — 3-6 natural speaking sentences",
    "traction": "Full TRACTION paragraph — 3-6 natural speaking sentences",
    "ask":      "Full ASK paragraph — 3-5 natural speaking sentences"
  },
  "improvements": [
    {"what": "what changed", "why": "why this makes it stronger for a ${focus.label} investor"},
    {"what": "what changed", "why": "why this makes it stronger"},
    {"what": "what changed", "why": "why this makes it stronger"}
  ]
}`

      const raw    = await askClaude(prompt, 3000)
      const parsed = extractJSON(raw)
      setFocusResult(parsed)
    } catch (err) {
      console.error('Focus pitch failed:', err)
      const sn = deckIntelligence?.startupName || 'our startup'
      setFocusResult({
        focusTitle:   `${focus.label} Pitch Script`,
        keyMessage:   `Lead with what matters most to a ${focus.label.toLowerCase()} investor.`,
        script: {
          hook:     `Every founder in this room has seen the same pitch problem: too much deck, too little clarity. ${sn} changes that. We built an AI-powered pitch simulation platform that gives founders real investor pressure before they walk into the real room. And it is working.`,
          problem:  `Eighty thousand funded startups in India alone — and most founders still walk into investor meetings underprepared. Pitch coaches are expensive and unavailable at 2am before a big meeting. There is no feedback loop. Founders practice on friends, not sharks.`,
          solution: `${sn} puts a real AI investor in the room with you, right now, for free. Our platform simulates six distinct investor personalities — from Mark Cuban's margin obsession to Nikhil Kamath's contrarian philosophy — and gives you real-time ML scoring on confidence, filler density, and financial clarity.`,
          traction: `We launched eight weeks ago. We have early users and the feedback is clear: founders who practice on ${sn} walk into real meetings measurably more prepared. Our session completion rate is above seventy percent, which tells us people are not just trying it — they are finishing the full pitch.`,
          ask:      `We are raising to scale the platform, expand the AI shark roster, and bring this to every founder accelerator in India. The ask is [₹X] for [Y]% equity. We know exactly what we will do with it, and we know exactly what success looks like in twelve months.`,
        },
        improvements: [
          { what: 'Opened with a market reality, not a product description', why: `${focus.label} investors need to see the problem before the solution` },
          { what: 'Added specific proof points and completion rate', why: 'Numbers replace claims — credibility is built on data, not assertions' },
          { what: 'Closed with a clear ask and 12-month vision', why: 'Investors need to know exactly what they are funding and what they get back' },
        ],
      })
    } finally {
      setFocusLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'focus') generateFocusedPitch(pitchFocus)
  }, [pitchFocus, activeTab])

  function downloadScript() {
    const focus = PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)
    const lines = [
      'SHARKLENS — AI OPTIMISED PITCH SCRIPT',
      `Generated: ${new Date().toLocaleString()}`,
      `Startup: ${deckIntelligence?.startupName || 'Unknown'}`,
      `Shark: ${data.shark?.toUpperCase()} | Score: ${data.overall}/100`,
      '='.repeat(50), '',
    ]

    if (focusResult?.script && activeTab === 'focus') {
      lines.push(`INVESTOR FOCUS: ${focusResult.focusTitle?.toUpperCase()}`)
      lines.push(`KEY MESSAGE: "${focusResult.keyMessage}"`)
      lines.push('')
      const sectionLabels = { hook: 'HOOK (0:00-0:30)', problem: 'PROBLEM (0:30-1:30)', solution: 'SOLUTION (1:30-2:30)', traction: 'TRACTION (2:30-3:30)', ask: 'THE ASK (3:30-4:00)' }
      Object.entries(focusResult.script).forEach(([k, v]) => {
        lines.push(`--- ${sectionLabels[k] || k.toUpperCase()} ---`)
        lines.push(v)
        lines.push('')
      })
      if (focusResult.improvements?.length) {
        lines.push('--- KEY IMPROVEMENTS ---')
        focusResult.improvements.forEach(imp => lines.push(`• ${imp.what}: ${imp.why}`))
      }
    } else if (scriptData?.length) {
      scriptData.forEach(s => {
        lines.push(`--- ${s.section} ---`)
        lines.push(s.text)
        lines.push('')
      })
    }

    if (scoreAnalysis && activeTab !== 'focus') {
      lines.push('--- KEY INSIGHT ---')
      lines.push(scoreAnalysis.topInsight || '')
      lines.push('')
      lines.push('--- NEXT SESSION FOCUS ---')
      lines.push(scoreAnalysis.nextSessionFocus || '')
    }

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }))
    a.download = `sharklens-${focusResult && activeTab === 'focus' ? pitchFocus : 'optimised'}-${deckIntelligence?.startupName || 'pitch'}.txt`
    a.click()
  }

  const activeFocusOpt = PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)

  return (
    <div className="pt-nav" style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes focusCardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .script-section {
          margin-bottom: 28px;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--border);
          animation: focusCardIn 0.35s ease both;
        }
        .script-section:last-of-type { border-bottom: none; }
      `}</style>

      <div className="wrap" style={{ paddingTop: 52, paddingBottom: 80 }}>

        {/* Header */}
        <div className="fu" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Step 05 · AI Optimization Engine</div>
            <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(36px,4vw,56px)', letterSpacing: 1.5, lineHeight: .95 }}>
              REWRITE.<br /><span style={{ color: 'var(--cuban)' }}>RAISE.</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => nav('/scorecard')}>← BACK</button>
            <button className="btn btn-red" onClick={downloadScript}>↓ DOWNLOAD SCRIPT</button>
          </div>
        </div>

        {/* Top Insight Banner */}
        {scoreAnalysis?.topInsight && (
          <div className="fu1" style={{
            background: 'rgba(229,9,20,0.06)', border: '1px solid rgba(229,9,20,0.2)',
            borderRadius: 'var(--r-lg)', padding: '14px 20px', marginBottom: 24,
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--cuban)', letterSpacing: 2, marginBottom: 4 }}>TOP INSIGHT</div>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{scoreAnalysis.topInsight}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="fu1" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28, overflowX: 'auto' }}>
          {[['rewrite', 'AI REWRITE'], ['focus', '🎯 PITCH FOCUS'], ['script', 'FULL SCRIPT'], ['mcp', 'MCP AUTOMATION']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '10px 20px', border: 'none', background: 'transparent',
              fontFamily: 'var(--f-display)', fontSize: 14, letterSpacing: .5, cursor: 'pointer',
              color: activeTab === id ? 'var(--text)' : 'var(--dim)',
              borderBottom: activeTab === id ? '2px solid var(--cuban)' : '2px solid transparent',
              transition: 'all .2s', whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>

        {/* ── PITCH FOCUS TAB ── */}
        {activeTab === 'focus' && (
          <div className="fu2">
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', marginBottom: 20, letterSpacing: 1 }}>
              DIFFERENT INVESTORS CARE ABOUT DIFFERENT THINGS — SELECT A FOCUS TO GET A COMPLETE REWRITTEN PITCH SCRIPT
            </div>

            {/* Focus selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
              {PITCH_FOCUS_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setPitchFocus(opt.id)}
                  style={{
                    background: pitchFocus === opt.id ? `${opt.color}12` : 'var(--surface)',
                    border: `1.5px solid ${pitchFocus === opt.id ? opt.color : 'var(--border)'}`,
                    borderRadius: 'var(--r-lg)', padding: '16px 18px',
                    cursor: 'pointer', transition: 'all 0.2s',
                    transform: pitchFocus === opt.id ? 'translateY(-1px)' : 'none',
                    boxShadow: pitchFocus === opt.id ? `0 4px 20px ${opt.color}22` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 15, letterSpacing: 0.5, color: pitchFocus === opt.id ? opt.color : 'var(--text)', transition: 'color 0.2s' }}>{opt.label}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>{opt.sub}</div>
                    </div>
                    {pitchFocus === opt.id && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {opt.emphasis.map(e => (
                      <span key={e} style={{
                        fontFamily: 'var(--f-mono)', fontSize: 9,
                        background: pitchFocus === opt.id ? `${opt.color}20` : 'var(--surface2)',
                        color: pitchFocus === opt.id ? opt.color : 'var(--dim)',
                        padding: '2px 8px', borderRadius: 10, transition: 'all 0.2s',
                      }}>{e}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Loading */}
            {focusLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '48px 0', color: 'var(--sub)' }}>
                <span className="spin-ring" />
                <div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>
                    WRITING FULL {activeFocusOpt?.label.toUpperCase()} SCRIPT...
                  </div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
                    Generating 3-5 minute investor speech based on your deck
                  </div>
                </div>
              </div>
            )}

            {/* Full script result */}
            {focusResult && !focusLoading && (
              <div style={{ animation: 'focusCardIn 0.4s ease' }}>

                {/* Key message banner */}
                {focusResult.keyMessage && (
                  <div style={{
                    background: `${activeFocusOpt?.color}10`,
                    border: `1px solid ${activeFocusOpt?.color}44`,
                    borderRadius: 'var(--r-lg)', padding: '16px 20px', marginBottom: 24,
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
                    <div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: activeFocusOpt?.color, letterSpacing: 2, marginBottom: 5 }}>
                        ANCHOR MESSAGE · {focusResult.focusTitle?.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.55, fontStyle: 'italic', fontWeight: 400 }}>
                        "{focusResult.keyMessage}"
                      </div>
                    </div>
                  </div>
                )}

                {/* Full pitch script — paragraph view */}
                {focusResult.script && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div>
                        <div className="card-lbl">AI OPTIMISED PITCH SCRIPT</div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                          Investor Focus: {focusResult.focusTitle} · ~4 min speaking time
                        </div>
                      </div>
                      <button className="btn btn-outline" onClick={downloadScript} style={{ fontSize: 11, padding: '6px 14px' }}>
                        ↓ DOWNLOAD
                      </button>
                    </div>

                    {[
                      { key: 'hook',     label: 'HOOK',     time: '0:00–0:30',  color: '#E50914' },
                      { key: 'problem',  label: 'PROBLEM',  time: '0:30–1:30',  color: '#F59E0B' },
                      { key: 'solution', label: 'SOLUTION', time: '1:30–2:30',  color: activeFocusOpt?.color || '#2ECC71' },
                      { key: 'traction', label: 'TRACTION', time: '2:30–3:30',  color: '#2ECC71' },
                      { key: 'ask',      label: 'THE ASK',  time: '3:30–4:00',  color: '#E50914' },
                    ].map((sec, i) => focusResult.script[sec.key] ? (
                      <div key={sec.key} className="script-section" style={{ animationDelay: `${i * 0.07}s` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div style={{
                            fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 2,
                            color: sec.color, background: `${sec.color}14`,
                            border: `1px solid ${sec.color}44`,
                            padding: '3px 10px', borderRadius: 20,
                          }}>
                            {sec.label}
                          </div>
                          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)' }}>{sec.time}</div>
                        </div>
                        <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85, fontWeight: 300 }}>
                          {focusResult.script[sec.key]}
                        </div>
                      </div>
                    ) : null)}
                  </div>
                )}

                {/* Key improvements */}
                {(focusResult.improvements || []).length > 0 && (
                  <div className="card">
                    <div className="card-lbl" style={{ marginBottom: 14 }}>KEY IMPROVEMENTS MADE</div>
                    {focusResult.improvements.map((imp, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                        padding: '10px 0', borderBottom: i < focusResult.improvements.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                          background: `${activeFocusOpt?.color}20`,
                          border: `1px solid ${activeFocusOpt?.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--f-mono)', fontSize: 9, color: activeFocusOpt?.color,
                        }}>{i + 1}</div>
                        <div>
                          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 3 }}>{imp.what}</div>
                          <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.5 }}>{imp.why}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── AI REWRITE TAB ── */}
        {activeTab === 'rewrite' && (
          <div className="fu2">
            {rewriteLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px 0', color: 'var(--sub)' }}>
                <span className="spin-ring" />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>CLAUDE ANALYSING YOUR DECK...</span>
              </div>
            ) : (
              <>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)',
                  marginBottom: 18, padding: '8px 14px',
                  background: 'var(--surface2)', borderRadius: 'var(--r)',
                  border: '1px solid var(--border)',
                }}>
                  📋 Based on your deck content and session score — suggested phrasings to use out loud, not a transcript.
                  {transcript ? ' Transcript context included.' : ''}
                </div>

                {(rewriteData || []).map((item, i) => (
                  <div key={i} className="card" style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, letterSpacing: .5 }}>{item.area}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--vc)' }}>↑ {item.pct}% stronger</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px 14px', borderLeft: '2px solid var(--border2)' }}>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: 2, marginBottom: 6 }}>AS CURRENTLY FRAMED</div>
                        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.65 }}>{item.current}</div>
                      </div>
                      <div style={{ background: 'rgba(46,204,113,0.04)', borderRadius: 'var(--r)', padding: '12px 14px', borderLeft: '2px solid var(--vc)' }}>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--vc)', letterSpacing: 2, marginBottom: 6 }}>SAY IT LIKE THIS</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65, fontStyle: 'italic' }}>{item.suggested}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--vc)' }}>✓ {item.note}</div>
                  </div>
                ))}

                {scoreAnalysis?.nextSessionFocus && (
                  <div className="card" style={{ border: '1px solid rgba(46,204,113,0.2)' }}>
                    <div className="card-lbl">Next Session Focus</div>
                    <div style={{ fontSize: 14, color: 'var(--sub)', lineHeight: 1.6 }}>{scoreAnalysis.nextSessionFocus}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── FULL SCRIPT TAB ── */}
        {activeTab === 'script' && (
          <div className="fu2">
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="card-lbl">
                  AI-Optimised Full Pitch Script · {deckIntelligence?.startupName || 'Your Startup'}
                </div>
                <button className="btn btn-outline" onClick={downloadScript} style={{ fontSize: 11, padding: '6px 14px' }}>↓ DOWNLOAD</button>
              </div>
              {rewriteLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '30px 0', color: 'var(--sub)' }}>
                  <span className="spin-ring" />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>GENERATING SCRIPT...</span>
                </div>
              ) : (scriptData || []).length > 0 ? (
                (scriptData).map((s, i) => (
                  <div key={i} className="script-section">
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: s.color || 'var(--cuban)', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>{s.section}</div>
                    <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.85, fontWeight: 300 }}>{s.text}</div>
                  </div>
                ))
              ) : (
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>
                  Use the PITCH FOCUS tab for a full investor-ready script tailored to a specific investor type.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MCP TAB ── */}
        {activeTab === 'mcp' && (
          <div className="fu2">
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-lbl">MCP Automation Pipeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MCP_ACTIONS.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: mcpDone[a.id] ? 'rgba(46,204,113,0.04)' : 'var(--surface2)',
                    border: `1px solid ${mcpDone[a.id] ? 'rgba(46,204,113,.3)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-lg)', padding: '16px 20px', transition: 'all .5s',
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: mcpDone[a.id] ? 'rgba(46,204,113,.1)' : 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{a.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 15, letterSpacing: .5, color: mcpDone[a.id] ? 'var(--text)' : 'var(--sub)', marginBottom: 3 }}>{a.label}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: mcpDone[a.id] ? 'var(--vc)' : 'var(--dim)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        {!mcpDone[a.id] && <span className="spin-ring" />}
                        {mcpDone[a.id] ? a.done : `${a.sub} · Processing...`}
                      </div>
                    </div>
                    {mcpDone[a.id] && <div style={{ fontSize: 18 }}>✅</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="fu5" style={{ marginTop: 40, textAlign: 'center' }}>
          <button className="btn btn-red btn-lg" style={{ maxWidth: 320, margin: '0 auto' }} onClick={() => nav('/setup')}>
            START NEW SESSION →
          </button>
        </div>

      </div>
    </div>
  )
}