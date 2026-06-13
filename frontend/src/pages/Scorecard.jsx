import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import ScoreRing from '../components/ScoreRing'

const BACKEND      = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CLAUDE_PROXY = `${BACKEND}/api/claude/analyze`

const SHARK_LABELS = {
  cuban: 'Mark Cuban', vc: 'Soft VC', angel: 'Indian Angel',
  nikhil: 'Nikhil Kamath', anupam: 'Anupam Mittal', aman: 'Aman Gupta',
}
const SHARK_COLORS = {
  cuban: 'var(--cuban)', vc: 'var(--vc)', angel: 'var(--angel)',
  nikhil: '#8B5CF6', anupam: '#06B6D4', aman: '#F97316',
}
const SHARK_FULL = {
  cuban:  'MARK CUBAN',
  vc:     'PRIYA SHARMA',
  angel:  'SUNITA AGARWAL',
  nikhil: 'NIKHIL KAMATH',
  anupam: 'ANUPAM MITTAL',
  aman:   'AMAN GUPTA',
}

// ADD: Benchmark data — realistic static values
const BENCHMARKS = {
  averageFounder:    61,
  topQuartile:       78,
  seriesAThreshold:  80,
}

function getBenchmarkLabel(score) {
  if (score >= BENCHMARKS.seriesAThreshold) return { label: 'Series A Ready', pct: 95, color: 'var(--vc)' }
  if (score >= BENCHMARKS.topQuartile)      return { label: 'Top 25% of founders', pct: 78, color: 'var(--vc)' }
  if (score >= BENCHMARKS.averageFounder)   return { label: 'Above average founder', pct: 55, color: 'var(--angel)' }
  return { label: 'Below average — keep practicing', pct: 30, color: 'var(--cuban)' }
}

// ADD: Animated counter hook
function useCountUp(target, duration = 1400, startDelay = 400) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let startTime = null
    let raf
    const delay = setTimeout(() => {
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplay(Math.round(eased * target))
        if (progress < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, startDelay)
    return () => { clearTimeout(delay); cancelAnimationFrame(raf) }
  }, [target, duration, startDelay])
  return display
}

// ADD: Tooltip component
function MetricTooltip({ label, pct, color, note }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          fontFamily: 'var(--f-mono)', fontSize: 10, color,
          cursor: 'help', borderBottom: `1px dashed ${color}55`,
        }}
      >
        {pct}% {pct < 70 ? '⚠️' : '✓'}
      </span>
      {show && (
        <div style={{
          position: 'absolute', bottom: '130%', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface)', border: `1px solid ${color}44`,
          borderRadius: 'var(--r-lg)', padding: '10px 14px',
          width: 240, zIndex: 100,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color, letterSpacing: 1.5, marginBottom: 5 }}>
            {label.toUpperCase()} · {pct}/100
          </div>
          <div style={{ fontSize: 12, color: 'var(--sub)', lineHeight: 1.55 }}>{note}</div>
          {/* Arrow */}
          <div style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 10, background: 'var(--surface)',
            border: `1px solid ${color}44`, borderTop: 'none', borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}
    </div>
  )
}

// ADD: Verdict card using Claude
async function generateVerdict(sessionData, shark, fillerCount) {
  const prompt = `You are ${SHARK_FULL[shark] || 'an investor'} giving a verdict after watching a founder's pitch.

Pitch data:
- Overall score: ${sessionData.overall}/100
- Filler words used: ${fillerCount || 0}
- Breakdown: ${(sessionData.breakdown || []).map(b => `${b.label}: ${b.pct}%`).join(', ')}
- Duration: ${sessionData.durationSec ? Math.round(sessionData.durationSec / 60) + ' minutes' : 'unknown'}

Write a SHORT, IN-CHARACTER verdict (2-3 sentences max) as ${SHARK_FULL[shark] || 'this investor'} would actually say it. Be specific about one strength and one weakness. Sound like a real TV investor, not a chatbot.

Then give a verdict status: FUNDED, CONDITIONAL, or PASS based on the score.
- FUNDED if score >= 78
- CONDITIONAL if score >= 62
- PASS if score < 62

Return ONLY valid JSON (no markdown):
{
  "verdict": "the 2-3 sentence spoken verdict in character",
  "status": "FUNDED" | "CONDITIONAL" | "PASS",
  "reason": "one-line reason for the status"
}`

  const r = await fetch(CLAUDE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens: 400 }),
  })
  if (!r.ok) throw new Error('Verdict fetch failed')
  const data = await r.json()
  const raw  = (data.text || '').replace(/```json|```/g, '').trim()
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
  return JSON.parse(raw.slice(start, end + 1))
}

// ADD: Metric tooltip notes
const METRIC_NOTES = {
  'Confidence':     'Funded founders average 74+ here. Reduce filler words and slow your pace by 15 WPM to sound more assured.',
  'Market Sizing':  'Investors want bottom-up math: users × ARPU. Vague TAM claims score poorly — give a specific reachable market.',
  'Financials':     'If you can\'t defend your numbers in 30 seconds, practice until you can. This is the most common derailer.',
  'Vision & Story': 'The best pitches connect the product to a bigger change happening in the world. Make them believe in the future.',
  'Delivery':       'Pace, pauses, and presence. Aim for 130-150 WPM. Too fast = nervous. Too slow = unsure.',
  'Vision':         'The best pitches connect the product to a bigger change in the world. Make them believe in the future.',
}

const VERDICT_CONFIG = {
  FUNDED:      { badge: '✅ FUNDED',            color: 'var(--vc)',    bg: 'rgba(46,204,113,0.08)',  border: 'rgba(46,204,113,0.3)'  },
  CONDITIONAL: { badge: '⚡ CONDITIONAL INTEREST', color: 'var(--angel)', bg: 'rgba(243,156,18,0.08)', border: 'rgba(243,156,18,0.3)'  },
  PASS:        { badge: '❌ PASS',               color: 'var(--cuban)', bg: 'rgba(229,9,20,0.08)',   border: 'rgba(229,9,20,0.3)'    },
}

export default function Scorecard() {
  const { sessionData, config, deckIntelligence, sessionHistory, passportStats, transcript } = useApp()
  const nav = useNavigate()
  const timelineRef = useRef()
  const [barsReady, setBarsReady]       = useState(false)
  const [activeTab, setActiveTab]       = useState('score')

  // ADD: Verdict state
  const [verdict, setVerdict]           = useState(null)
  const [verdictLoading, setVerdictLoad] = useState(false)
  const [verdictError, setVerdictErr]   = useState(false)

  const data = sessionData || {
    overall: 71,
    breakdown: [
      { label: 'Confidence',     pct: 64, color: 'var(--cuban)' },
      { label: 'Market Sizing',  pct: 72, color: 'var(--vc)'    },
      { label: 'Financials',     pct: 48, color: 'var(--angel)' },
      { label: 'Vision',         pct: 80, color: 'var(--vc)'    },
      { label: 'Delivery',       pct: 70, color: 'var(--sub)'   },
    ],
    history: Array.from({ length: 60 }, (_, i) => 45 + Math.sin(i * .18) * 20 + Math.random() * 12),
    shark: config.shark || 'cuban',
    difficulty: config.difficulty || 'Realistic',
    durationSec: 623,
    liveFillCount: 0,
  }

  // ADD: animated score
  const animatedScore = useCountUp(data.overall, 1400, 500)

  const worst      = [...data.breakdown].sort((a, b) => a.pct - b.pct)[0]
  const best       = [...data.breakdown].sort((a, b) => b.pct - a.pct)[0]
  const sharkLabel = SHARK_LABELS[data.shark] || 'Shark'
  const durStr     = data.durationSec
    ? `${Math.floor(data.durationSec / 60)}:${String(data.durationSec % 60).padStart(2, '0')}`
    : '10:23'
  const fillerCount = data.liveFillCount || 0
  const benchmark  = getBenchmarkLabel(data.overall)

  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 300)
    return () => clearTimeout(t)
  }, [])

  // ADD: Generate verdict on mount
  useEffect(() => {
    if (activeTab !== 'score') return
    async function fetchVerdict() {
      setVerdictLoad(true)
      setVerdictErr(false)
      try {
        const v = await generateVerdict(data, data.shark || 'cuban', fillerCount)
        setVerdict(v)
      } catch {
        setVerdictErr(true)
      } finally {
        setVerdictLoad(false)
      }
    }
    fetchVerdict()
  }, [])

  useEffect(() => {
    const canvas = timelineRef.current
    if (!canvas || !data.history?.length) return
    const W = canvas.offsetWidth || 900, H = 80
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    const pts = data.history
    const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, 'rgba(229,9,20,0.18)')
    grad.addColorStop(1, 'transparent')
    ctx.beginPath()
    pts.forEach((v, i) => {
      const x = (i / (pts.length - 1)) * (W - 2) + 1
      const y = H - 6 - ((v - min) / range) * (H - 14)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()
    ctx.beginPath()
    pts.forEach((v, i) => {
      const x = (i / (pts.length - 1)) * (W - 2) + 1
      const y = H - 6 - ((v - min) / range) * (H - 14)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#E50914'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke()
  }, [data.history, activeTab])

  return (
    <div className="pt-nav" style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes verdictReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scoreGlow {
          0%, 100% { text-shadow: 0 0 0px transparent; }
          50%       { text-shadow: 0 0 40px rgba(229,9,20,0.4); }
        }
        @keyframes benchmarkFill {
          from { width: 0%; }
        }
      `}</style>

      <div className="wrap" style={{ paddingTop: 52, paddingBottom: 80 }}>

        <div className="fu" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Session Complete · {sharkLabel} · {data.difficulty}
          </div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(36px,4vw,56px)', letterSpacing: 1.5, lineHeight: .95, marginBottom: 10 }}>
            YOUR INVESTOR<br /><span style={{ color: 'var(--cuban)' }}>SCORECARD.</span>
          </h1>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)' }}>
            Duration: {durStr} · {deckIntelligence?.startupName || 'Startup'} · {fillerCount} filler words
          </div>
        </div>

        {/* Tabs */}
        <div className="fu1" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {[['score', 'SESSION SCORE'], ['passport', 'PITCH PASSPORT']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '10px 20px', border: 'none', background: 'transparent',
              fontFamily: 'var(--f-display)', fontSize: 14, letterSpacing: .5, cursor: 'pointer',
              color: activeTab === id ? 'var(--text)' : 'var(--dim)',
              borderBottom: activeTab === id ? '2px solid var(--cuban)' : '2px solid transparent',
              transition: 'all .2s',
            }}>{label}</button>
          ))}
        </div>

        {/* SESSION SCORE TAB */}
        {activeTab === 'score' && (
          <>
            {/* Score + Polar cards row */}
            <div className="fu1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap', marginBottom: 36 }}>
              <ScoreRing score={data.overall} size={200} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <PolarCard type="WEAKEST AREA"   label={worst.label} pct={worst.pct} color="var(--cuban)" note="Focus here next session." />
                <PolarCard type="STRONGEST AREA" label={best.label}  pct={best.pct}  color="var(--vc)"   note="Build your narrative around this." />
              </div>

              {/* ADD: Animated big score number */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--f-display)', fontSize: 86, lineHeight: 1,
                  color: data.overall >= 80 ? 'var(--vc)' : data.overall >= 70 ? 'var(--angel)' : 'var(--cuban)',
                  animation: 'scoreGlow 3s ease-in-out infinite',
                  transition: 'color 0.5s',
                }}>
                  {animatedScore}
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>/100</div>
                <div style={{
                  fontFamily: 'var(--f-display)', fontSize: 28, letterSpacing: 1,
                  color: data.overall >= 80 ? 'var(--vc)' : data.overall >= 70 ? 'var(--angel)' : data.overall >= 60 ? 'var(--cuban)' : 'var(--cuban)',
                  marginTop: 8,
                }}>
                  {data.overall >= 80 ? 'A' : data.overall >= 70 ? 'B' : data.overall >= 60 ? 'C' : 'D'}
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
                  {data.overall >= 80 ? 'FUNDABLE' : data.overall >= 70 ? 'PROMISING' : data.overall >= 60 ? 'NEEDS WORK' : 'BACK TO BASICS'}
                </div>
              </div>
            </div>

            {/* ADD: Benchmark Card */}
            <div className="card fu1" style={{ marginBottom: 20, padding: '18px 22px' }}>
              <div className="card-lbl" style={{ marginBottom: 14 }}>How You Compare</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                {[
                  { label: 'YOUR SCORE',           value: data.overall, color: benchmark.color },
                  { label: 'AVERAGE FOUNDER',       value: BENCHMARKS.averageFounder, color: 'var(--dim)' },
                  { label: 'SERIES A THRESHOLD',    value: BENCHMARKS.seriesAThreshold, color: 'var(--vc)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: 36, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', marginTop: 4, letterSpacing: 1.5 }}>{label}</div>
                  </div>
                ))}
              </div>
              {/* Benchmark bar */}
              <div style={{ position: 'relative', height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'visible' }}>
                {/* Average marker */}
                <div style={{
                  position: 'absolute', left: `${BENCHMARKS.averageFounder}%`, top: -8, bottom: -8,
                  width: 1, background: 'var(--dim)', opacity: 0.5,
                }} />
                {/* Series A marker */}
                <div style={{
                  position: 'absolute', left: `${BENCHMARKS.seriesAThreshold}%`, top: -8, bottom: -8,
                  width: 1, background: 'var(--vc)', opacity: 0.7,
                }} />
                {/* Score fill */}
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: barsReady ? `${data.overall}%` : '0%',
                  background: `linear-gradient(90deg, ${benchmark.color}, ${benchmark.color}bb)`,
                  transition: 'width 1.4s cubic-bezier(.4,0,.2,1)',
                  animation: barsReady ? 'benchmarkFill 1.4s cubic-bezier(.4,0,.2,1)' : 'none',
                }} />
              </div>
              <div style={{ marginTop: 10, fontFamily: 'var(--f-mono)', fontSize: 10, color: benchmark.color }}>
                {benchmark.label}
              </div>
            </div>

            {/* ADD: Filler Word Summary Card */}
            {fillerCount > 0 && (
              <div className="card fu2" style={{
                marginBottom: 20,
                background: 'rgba(229,9,20,0.04)',
                border: '1px solid rgba(229,9,20,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="card-lbl" style={{ color: 'var(--cuban)' }}>🚨 Filler Words Detected</div>
                    <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>
                      You used <strong style={{ color: 'var(--cuban)' }}>{fillerCount} filler words</strong> in this session.{' '}
                      {fillerCount <= 3
                        ? 'Great control — you\'re in the top tier.'
                        : fillerCount <= 8
                          ? 'Room for improvement — practice deliberate pauses instead.'
                          : 'This is hurting your confidence score significantly. Slow down and breathe.'}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--f-display)', fontSize: 52, lineHeight: 1,
                    color: fillerCount <= 3 ? 'var(--vc)' : fillerCount <= 8 ? 'var(--angel)' : 'var(--cuban)',
                    flexShrink: 0, marginLeft: 20,
                  }}>{fillerCount}</div>
                </div>
              </div>
            )}

            {/* Performance breakdown with tooltips */}
            <div className="card fu2" style={{ marginBottom: 20 }}>
              <div className="card-lbl">Performance Breakdown <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', fontWeight: 400 }}>(hover scores for tips)</span></div>
              {data.breakdown.map((b, i) => (
                <div key={b.label} style={{ marginBottom: i < data.breakdown.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--sub)' }}>{b.label}</span>
                    {/* ADD: Tooltip on score */}
                    <MetricTooltip
                      label={b.label}
                      pct={b.pct}
                      color={b.color}
                      note={METRIC_NOTES[b.label] || 'Focus on this area to improve your overall score.'}
                    />
                  </div>
                  <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, background: b.color,
                      width: barsReady ? `${b.pct}%` : '0%',
                      transition: `width 1.1s cubic-bezier(.4,0,.2,1) ${i * .1}s`,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Confidence timeline */}
            <div className="card fu3" style={{ marginBottom: 20 }}>
              <div className="card-lbl">Confidence Timeline</div>
              <canvas ref={timelineRef} style={{ width: '100%', height: 80, display: 'block' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', marginTop: 8 }}>
                <span>START</span><span>MIDPOINT</span><span>END</span>
              </div>
            </div>

            {/* ADD: Investor Verdict Card */}
            <div className="card fu4" style={{ marginBottom: 20 }}>
              <div className="card-lbl">🦈 Investor Verdict</div>

              {verdictLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: 'var(--sub)' }}>
                  <span className="spin-ring" />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>
                    {SHARK_FULL[data.shark] || 'INVESTOR'} IS DELIBERATING...
                  </span>
                </div>
              )}

              {verdictError && !verdict && (
                <div style={{
                  padding: '16px', background: 'var(--surface2)',
                  borderRadius: 'var(--r)', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)',
                }}>
                  {/* Fallback static verdict */}
                  {(() => {
                    const status = data.overall >= 78 ? 'FUNDED' : data.overall >= 62 ? 'CONDITIONAL' : 'PASS'
                    const vc = VERDICT_CONFIG[status]
                    return (
                      <div style={{ animation: 'verdictReveal 0.5s ease' }}>
                        <div style={{
                          background: vc.bg, border: `1px solid ${vc.border}`,
                          borderRadius: 'var(--r-lg)', padding: '16px 20px', marginBottom: 14,
                        }}>
                          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', marginBottom: 8 }}>
                            {SHARK_FULL[data.shark] || 'INVESTOR'} · VERDICT
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, fontStyle: 'italic' }}>
                            "{data.overall >= 78
                              ? `Your score shows real potential. I'd want to see the numbers hold up in diligence.`
                              : data.overall >= 62
                                ? `Interesting concept. Work on your ${worst.label.toLowerCase()} and come back stronger.`
                                : `Not ready yet. Focus on ${worst.label.toLowerCase()} — that's where you're losing me.`}"
                          </div>
                        </div>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          background: vc.bg, border: `1px solid ${vc.border}`,
                          borderRadius: 20, padding: '6px 16px',
                          fontFamily: 'var(--f-display)', fontSize: 14, color: vc.color,
                        }}>
                          {vc.badge}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {verdict && (() => {
                const vc = VERDICT_CONFIG[verdict.status] || VERDICT_CONFIG.CONDITIONAL
                return (
                  <div style={{ animation: 'verdictReveal 0.5s ease' }}>
                    <div style={{
                      background: vc.bg, border: `1px solid ${vc.border}`,
                      borderRadius: 'var(--r-lg)', padding: '16px 20px', marginBottom: 14,
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                          background: `${vc.color}18`, border: `1px solid ${vc.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--f-display)', fontSize: 13, color: vc.color,
                        }}>
                          {(SHARK_FULL[data.shark] || 'MC').split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: vc.color, letterSpacing: 1.5 }}>
                            {SHARK_FULL[data.shark] || 'INVESTOR'}
                          </div>
                          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)' }}>
                            Post-session verdict
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, fontStyle: 'italic' }}>
                        "{verdict.verdict}"
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: vc.bg, border: `1px solid ${vc.border}`,
                        borderRadius: 20, padding: '8px 18px',
                        fontFamily: 'var(--f-display)', fontSize: 15, letterSpacing: 0.5, color: vc.color,
                      }}>
                        {vc.badge}
                      </div>
                      {verdict.reason && (
                        <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic' }}>
                          {verdict.reason}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          </>
        )}

        {/* PITCH PASSPORT TAB — unchanged */}
        {activeTab === 'passport' && (
          <div className="fu1">
            <div className="passport" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--cuban)', letterSpacing: 3, marginBottom: 8 }}>SHARKLENS · PITCH PASSPORT</div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 24, letterSpacing: 1 }}>
                    {sessionHistory.length > 0 ? 'VERIFIED PITCHER' : 'NEW PITCHER'}
                  </div>
                </div>
                {passportStats && (
                  <div style={{ textAlign: 'right' }}>
                    <div className="passport-score">{passportStats.avgScore}</div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)' }}>AVG SCORE</div>
                  </div>
                )}
              </div>

              {passportStats ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    ['SESSIONS',   passportStats.totalSessions, 'var(--text)'],
                    ['BEST SCORE', passportStats.bestScore,     'var(--vc)'],
                    ['TREND',      `${passportStats.trend >= 0 ? '+' : ''}${passportStats.trend}`, passportStats.trend >= 0 ? 'var(--vc)' : 'var(--cuban)'],
                    ['TOP SHARK',  (SHARK_LABELS[passportStats.mostPracticed] || 'Cuban').split(' ')[0].toUpperCase(), 'var(--angel)'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r)', padding: '12px 8px' }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, color: c, lineHeight: 1 }}>{v}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', marginTop: 4 }}>{k}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '20px 0' }}>
                  Complete your first session to build your Pitch Passport.
                </div>
              )}
            </div>

            {sessionHistory.length > 0 && (
              <div className="card">
                <div className="card-lbl">Session History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[...sessionHistory].reverse().slice(0, 10).map((s, i) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', width: 20 }}>#{sessionHistory.length - i}</div>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: `${SHARK_COLORS[s.shark] || 'var(--cuban)'}15`,
                        border: `1px solid ${SHARK_COLORS[s.shark] || 'var(--cuban)'}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--f-display)', fontSize: 11,
                        color: SHARK_COLORS[s.shark] || 'var(--cuban)',
                      }}>
                        {(SHARK_LABELS[s.shark] || 'MC').split(' ').map(w => w[0]).join('')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 2 }}>
                          {s.startupName !== 'Unknown' ? s.startupName : SHARK_LABELS[s.shark] || 'Session'} · {s.difficulty}
                        </div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>
                          {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {s.fundingRound?.toUpperCase() || 'SEED'}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, color: s.overall >= 70 ? 'var(--vc)' : s.overall >= 50 ? 'var(--angel)' : 'var(--cuban)' }}>
                        {s.overall}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="fu5" style={{ display: 'flex', gap: 14, marginTop: 32 }}>
          <button className="btn btn-outline" onClick={() => nav('/arena')} style={{ flex: 1 }}>← RETRY</button>
          <button className="btn btn-red" onClick={() => nav('/optimize')}
            style={{ flex: 2, fontFamily: 'var(--f-display)', fontSize: 16, letterSpacing: 1 }}>
            VIEW OPTIMIZATION ENGINE →
          </button>
        </div>

      </div>
    </div>
  )
}

function PolarCard({ type, label, pct, color, note }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderLeft: `3px solid ${color}`, borderRadius: 'var(--r-lg)',
      padding: '14px 18px', minWidth: 220,
    }}>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 2, color, marginBottom: 5, textTransform: 'uppercase' }}>{type}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--f-display)', fontSize: 22, letterSpacing: .5 }}>{label}</span>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 14, color }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.4 }}>{note}</div>
    </div>
  )
}