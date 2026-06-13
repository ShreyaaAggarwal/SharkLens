import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const BACKEND      = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CLAUDE_PROXY = `${BACKEND}/api/claude/analyze`

async function askClaude(prompt, maxTokens = 1200) {
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
  clean = clean.slice(start, end + 1)
  return JSON.parse(clean)
}

// ADD: Pitch Focus options
const PITCH_FOCUS_OPTIONS = [
  {
    id:       'product',
    icon:     '🔬',
    label:    'Product Focus',
    sub:      'Innovation & differentiation',
    color:    '#8B5CF6',
    emphasis: ['product innovation', 'problem solved', 'technology advantage', 'differentiation', 'user value'],
    prompt:   'Emphasize product innovation, what makes the technology unique, and the depth of the problem being solved. Remove financial projections from the opening. Lead with the breakthrough.',
  },
  {
    id:       'growth',
    icon:     '📈',
    label:    'Growth Focus',
    sub:      'Traction & scale story',
    color:    '#2ECC71',
    emphasis: ['user acquisition', 'traction metrics', 'expansion strategy', 'scalability', 'growth rate'],
    prompt:   'Lead with traction numbers and growth trajectory. Emphasize month-over-month growth, expansion plans, and network effects. Make scalability the central argument.',
  },
  {
    id:       'revenue',
    icon:     '💰',
    label:    'Revenue Focus',
    sub:      'Monetization & unit economics',
    color:    '#F59E0B',
    emphasis: ['business model', 'revenue streams', 'unit economics', 'profitability path', 'LTV/CAC'],
    prompt:   'Prioritize monetization clarity, revenue model, and path to profitability. Every sentence should connect to financial value. Remove unnecessary storytelling.',
  },
  {
    id:       'market',
    icon:     '🌏',
    label:    'Market Focus',
    sub:      'TAM, timing & competition',
    color:    '#06B6D4',
    emphasis: ['TAM/SAM/SOM', 'market opportunity', 'competitive landscape', 'market timing', 'industry tailwinds'],
    prompt:   'Frame everything around market opportunity and why NOW is the right time. Lead with the market size and why existing solutions are failing. Position the company as the obvious winner in this space.',
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
  const [barsReady, setBarsReady]           = useState(false)
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [rewriteData, setRewriteData]       = useState(null)
  const [scriptData, setScriptData]         = useState(null)
  const [scoreAnalysis, setScoreAnalysis]   = useState(null)

  // ADD: Pitch focus state
  const [pitchFocus, setPitchFocus]         = useState('product')
  const [focusLoading, setFocusLoading]     = useState(false)
  const [focusResult, setFocusResult]       = useState(null)  // { before, after, note }[]

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

  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 300)
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

  async function generateRewrite() {
    setRewriteLoading(true)
    try {
      const deckContext = deckIntelligence
        ? `Startup: ${deckIntelligence.startupName}
Sector: ${deckIntelligence.sector}
Problem: ${deckIntelligence.problemStatement}
Solution: ${deckIntelligence.solution}
Market: ${deckIntelligence.marketSize}
Business Model: ${deckIntelligence.businessModel}
Traction: ${deckIntelligence.traction}
Ask: ${deckIntelligence.ask}
Detected weaknesses: ${(deckIntelligence.topWeaknesses || []).join(', ')}`
        : (deckText ? deckText.slice(0, 2000) : 'No deck provided')

      const sessionContext = `
Session Performance:
- Overall score: ${data.overall}/100
- Weakest area: ${worst.label} (${worst.pct}%)
- Shark: ${data.shark} / Difficulty: ${data.difficulty}
- Breakdown: ${data.breakdown.map(b => `${b.label}: ${b.pct}%`).join(', ')}`

      const prompt = `You are a world-class pitch coach for first-time/student founders. Based on the deck intelligence and session performance data below, suggest concrete improvements to how this founder should phrase key parts of their pitch.

IMPORTANT: Do NOT invent or fabricate quotes from the founder. You do not have a transcript. Instead, based on what the deck says, write:
- "current": what the deck currently communicates or how founders typically phrase this weakness
- "suggested": a stronger, investor-ready version they should say out loud
- "note": why this phrasing works better, in simple words

DECK INTELLIGENCE:
${deckContext}

${sessionContext}

Return ONLY valid JSON (no markdown fences):
{
  "improvements": [
    {
      "area": "area name (e.g. Opening Hook, Market Claim, Traction Story)",
      "current": "how this is typically (or weakly) communicated based on the deck data",
      "suggested": "the stronger version they should say — specific to THEIR deck content",
      "note": "why this is better, in 1-2 simple sentences",
      "pct": 82
    }
  ],
  "fullScript": [
    {"section": "HOOK (0:00-0:30)", "text": "optimized hook text based on their actual deck", "color": "#E50914"},
    {"section": "PROBLEM (0:30-1:30)", "text": "optimized problem statement based on their actual deck", "color": "#F39C12"},
    {"section": "SOLUTION (1:30-2:30)", "text": "optimized solution based on their actual deck", "color": "#2ECC71"},
    {"section": "TRACTION (2:30-3:30)", "text": "optimized traction narrative based on their actual deck", "color": "#2ECC71"},
    {"section": "THE ASK (3:30-4:00)", "text": "optimized ask based on their actual deck", "color": "#E50914"}
  ],
  "topInsight": "The single most important thing to fix, in simple words — specific to this deck",
  "nextSessionFocus": "What to specifically practice next time, in simple words"
}`

      const raw    = await askClaude(prompt, 1200)
      const parsed = extractJSON(raw)
      setRewriteData(parsed.improvements || [])
      setScriptData(parsed.fullScript || [])
      setScoreAnalysis({ topInsight: parsed.topInsight, nextSessionFocus: parsed.nextSessionFocus })
    } catch (err) {
      console.error('Rewrite generation failed:', err)
      setRewriteData([
        {
          area:      'Opening Hook',
          current:   `The deck leads with the solution before establishing why the problem is urgent.`,
          suggested: `"Every day, [specific user] loses [specific cost/time] because [core problem]. We built ${deckIntelligence?.startupName || 'this'} to fix exactly that — and we already have traction."`,
          note:      'Open with the pain, not the product. Investors fund problems, not features.',
          pct:       85,
        },
        {
          area:      'Market Claim',
          current:   `Market size stated as "${deckIntelligence?.marketSize || 'a large number'}" without a bottom-up breakdown.`,
          suggested: `"We're targeting [specific segment] — that's [number] customers at [price point], giving us a reachable market of [₹X]. Here's how we get the first 1,000."`,
          note:      'Sharks trust bottom-up math more than top-down TAM claims.',
          pct:       78,
        },
        {
          area:      'Traction Story',
          current:   `Traction section says: "${deckIntelligence?.traction || 'Not stated'}" — needs a narrative arc.`,
          suggested: `"In [timeframe], we went from [starting point] to [current milestone]. Our [key metric] is growing [X]% month-on-month."`,
          note:      'Show the trajectory, not just the number. Growth rate is more convincing than absolute figures.',
          pct:       71,
        },
      ])
      setScriptData([])
      setScoreAnalysis({
        topInsight:       `Your ${worst.label} section scored ${worst.pct}% — the deck's content here needs to be translated into clearer spoken language.`,
        nextSessionFocus: `Practice defending your ${worst.label} with 2-3 specific numbers. Don't use vague language like "a lot" or "significant".`,
      })
    } finally {
      setRewriteLoading(false)
    }
  }

  // ADD: Generate focus-specific before/after
  async function generateFocusedPitch(focusId) {
    const focus = PITCH_FOCUS_OPTIONS.find(f => f.id === focusId)
    if (!focus) return
    setFocusLoading(true)
    setFocusResult(null)
    try {
      const deckContext = deckIntelligence
        ? `Startup: ${deckIntelligence.startupName} | Sector: ${deckIntelligence.sector} | Problem: ${deckIntelligence.problemStatement} | Solution: ${deckIntelligence.solution} | Market: ${deckIntelligence.marketSize} | Traction: ${deckIntelligence.traction} | Business Model: ${deckIntelligence.businessModel}`
        : 'No deck provided — use a generic startup example'

      const prompt = `You are an expert VC pitch coach.

Deck context:
${deckContext}

${focus.prompt}

For each of 3 key pitch sections, show:
- "before": a weak/typical way this section is usually delivered
- "after": a powerful rewrite specifically for a ${focus.label} investor
- "section": name of the section (e.g. "Opening Hook", "Market Claim", "The Ask")
- "note": one-line tip on why this version works

Return ONLY valid JSON (no markdown fences):
{
  "focusTitle": "${focus.label} Pitch Version",
  "keyMessage": "The single sentence that should anchor this entire pitch for a ${focus.label} investor",
  "sections": [
    {
      "section": "section name",
      "before": "weak typical delivery (1-2 sentences)",
      "after": "powerful rewrite specific to this deck and focus (1-3 sentences)",
      "note": "why this version wins"
    }
  ]
}`

      const raw    = await askClaude(prompt, 900)
      const parsed = extractJSON(raw)
      setFocusResult(parsed)
    } catch {
      // Fallback
      setFocusResult({
        focusTitle:  `${focus.label} Version`,
        keyMessage:  `Lead with what matters most to a ${focus.label.toLowerCase()} investor.`,
        sections: [
          {
            section: 'Opening Hook',
            before:  `"So basically we're like a platform that helps founders practice pitches..."`,
            after:   `"${focus.id === 'revenue' ? 'We charge ₹2,999/month and already have 47 paying customers — that\'s ₹14L ARR in 3 months.' : focus.id === 'growth' ? 'We went from 0 to 847 users in 8 weeks — 40% week-over-week growth with zero paid acquisition.' : focus.id === 'market' ? 'India has 80,000 funded startups. Every single one needs investor practice. That\'s a ₹2,400 crore market and it\'s completely unserved.' : 'We built a real-time AI that catches your filler words mid-pitch — something no human coach can do at scale.'}"`,
            note:    `Start with what this investor type responds to immediately.`,
          },
        ],
      })
    } finally {
      setFocusLoading(false)
    }
  }

  // Trigger when focus changes (if we're on focus tab)
  useEffect(() => {
    if (activeTab === 'focus') {
      generateFocusedPitch(pitchFocus)
    }
  }, [pitchFocus, activeTab])

  function downloadScript() {
    const lines = [
      'SHARKLENS — AI OPTIMISED PITCH SCRIPT',
      `Generated: ${new Date().toLocaleString()}`,
      `Startup: ${deckIntelligence?.startupName || 'Unknown'}`,
      `Shark: ${data.shark?.toUpperCase()} | Score: ${data.overall}/100`,
      '='.repeat(50), '',
    ]
    if (scriptData?.length) {
      scriptData.forEach(s => {
        lines.push(`--- ${s.section} ---`)
        lines.push(s.text)
        lines.push('')
      })
    }
    if (scoreAnalysis) {
      lines.push('--- KEY INSIGHT ---')
      lines.push(scoreAnalysis.topInsight || '')
      lines.push('')
      lines.push('--- NEXT SESSION FOCUS ---')
      lines.push(scoreAnalysis.nextSessionFocus || '')
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }))
    a.download = `sharklens-optimised-${deckIntelligence?.startupName || 'pitch'}.txt`
    a.click()
  }

  return (
    <div className="pt-nav" style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes focusCardIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes beforeAfterSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="wrap" style={{ paddingTop: 52, paddingBottom: 80 }}>

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

        {/* Tabs — ADD: pitch focus tab */}
        <div className="fu1" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28, overflowX: 'auto' }}>
          {[
            ['rewrite', 'AI REWRITE'],
            ['focus',   '🎯 PITCH FOCUS'],
            ['script',  'FULL SCRIPT'],
            ['mcp',     'MCP AUTOMATION'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '10px 20px', border: 'none', background: 'transparent',
              fontFamily: 'var(--f-display)', fontSize: 14, letterSpacing: .5, cursor: 'pointer',
              color: activeTab === id ? 'var(--text)' : 'var(--dim)',
              borderBottom: activeTab === id ? '2px solid var(--cuban)' : '2px solid transparent',
              transition: 'all .2s', whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>

        {/* ADD: PITCH FOCUS TAB */}
        {activeTab === 'focus' && (
          <div className="fu2">
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)',
              marginBottom: 20, letterSpacing: 1,
            }}>
              DIFFERENT INVESTORS CARE ABOUT DIFFERENT THINGS — SELECT A FOCUS TO REWRITE YOUR PITCH ACCORDINGLY
            </div>

            {/* Focus selector cards */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28,
            }}>
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
                      <div style={{
                        fontFamily: 'var(--f-display)', fontSize: 15, letterSpacing: 0.5,
                        color: pitchFocus === opt.id ? opt.color : 'var(--text)',
                        transition: 'color 0.2s',
                      }}>{opt.label}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>{opt.sub}</div>
                    </div>
                    {pitchFocus === opt.id && (
                      <div style={{
                        marginLeft: 'auto',
                        width: 8, height: 8, borderRadius: '50%',
                        background: opt.color, flexShrink: 0,
                      }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {opt.emphasis.map(e => (
                      <span key={e} style={{
                        fontFamily: 'var(--f-mono)', fontSize: 9,
                        background: pitchFocus === opt.id ? `${opt.color}20` : 'var(--surface2)',
                        color: pitchFocus === opt.id ? opt.color : 'var(--dim)',
                        padding: '2px 8px', borderRadius: 10,
                        transition: 'all 0.2s',
                      }}>{e}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Focus result: Before / After */}
            {focusLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '40px 0', color: 'var(--sub)' }}>
                <span className="spin-ring" />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>
                  REWRITING FOR {PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)?.label.toUpperCase()}...
                </span>
              </div>
            )}

            {focusResult && !focusLoading && (
              <div style={{ animation: 'focusCardIn 0.4s ease' }}>
                {/* Key message banner */}
                {focusResult.keyMessage && (
                  <div style={{
                    background: `${PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)?.color}10`,
                    border: `1px solid ${PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)?.color}44`,
                    borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: 20,
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: 16 }}>🎯</span>
                    <div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)?.color, letterSpacing: 2, marginBottom: 4 }}>
                        KEY MESSAGE FOR {focusResult.focusTitle?.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, fontStyle: 'italic' }}>
                        "{focusResult.keyMessage}"
                      </div>
                    </div>
                  </div>
                )}

                {/* Before / After sections */}
                {(focusResult.sections || []).map((s, i) => (
                  <div key={i} className="card" style={{ marginBottom: 14, animation: `beforeAfterSlide 0.4s ease ${i * 0.1}s both` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, letterSpacing: 0.5 }}>{s.section}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      {/* BEFORE */}
                      <div style={{
                        background: 'rgba(229,9,20,0.04)',
                        border: '1px solid rgba(229,9,20,0.15)',
                        borderLeft: '3px solid rgba(229,9,20,0.5)',
                        borderRadius: 'var(--r)', padding: '14px 16px',
                      }}>
                        <div style={{
                          fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--cuban)',
                          letterSpacing: 2, marginBottom: 8,
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          ✗ BEFORE
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.65, fontStyle: 'italic' }}>
                          {s.before}
                        </div>
                      </div>

                      {/* AFTER */}
                      <div style={{
                        background: 'rgba(46,204,113,0.04)',
                        border: '1px solid rgba(46,204,113,0.2)',
                        borderLeft: `3px solid ${PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)?.color || 'var(--vc)'}`,
                        borderRadius: 'var(--r)', padding: '14px 16px',
                      }}>
                        <div style={{
                          fontFamily: 'var(--f-mono)', fontSize: 9,
                          color: PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)?.color || 'var(--vc)',
                          letterSpacing: 2, marginBottom: 8,
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          ✓ AFTER ({PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)?.label.toUpperCase()})
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65, fontStyle: 'italic', fontWeight: 400 }}>
                          {s.after}
                        </div>
                      </div>
                    </div>

                    {s.note && (
                      <div style={{
                        fontFamily: 'var(--f-mono)', fontSize: 10,
                        color: PITCH_FOCUS_OPTIONS.find(f => f.id === pitchFocus)?.color || 'var(--vc)',
                      }}>
                        💡 {s.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REWRITE TAB — existing, unchanged */}
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
                  📋 Based on your deck content and session score — these are suggested phrasings to use out loud, not a transcript.
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
                        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.6 }}>{item.current}</div>
                      </div>
                      <div style={{ background: 'rgba(46,204,113,0.04)', borderRadius: 'var(--r)', padding: '12px 14px', borderLeft: '2px solid var(--vc)' }}>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--vc)', letterSpacing: 2, marginBottom: 6 }}>SAY IT LIKE THIS</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic' }}>{item.suggested}</div>
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

        {/* SCRIPT TAB — unchanged */}
        {activeTab === 'script' && (
          <div className="fu2">
            <div className="card">
              <div className="card-lbl" style={{ marginBottom: 20 }}>
                AI-Optimised Full Pitch Script · {deckIntelligence?.startupName || 'Your Startup'}
              </div>
              {rewriteLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '30px 0', color: 'var(--sub)' }}>
                  <span className="spin-ring" />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>GENERATING SCRIPT...</span>
                </div>
              ) : (
                (scriptData || []).map((s, i) => (
                  <div key={i} style={{ marginBottom: 22, paddingBottom: 22, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: s.color || 'var(--cuban)', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>{s.section}</div>
                    <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, fontStyle: 'italic' }}>"{s.text}"</div>
                  </div>
                ))
              )}
              <button className="btn btn-red" onClick={downloadScript} style={{ marginTop: 8 }}>↓ DOWNLOAD FULL SCRIPT</button>
            </div>
          </div>
        )}

        {/* MCP TAB — unchanged */}
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