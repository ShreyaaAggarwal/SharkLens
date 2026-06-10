import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import ScoreRing from '../components/ScoreRing'

const SHARK_LABELS = {
  cuban: 'Mark Cuban', vc: 'Soft VC', angel: 'Indian Angel',
  nikhil: 'Nikhil Kamath', anupam: 'Anupam Mittal', aman: 'Aman Gupta',
}
const SHARK_COLORS = {
  cuban: 'var(--cuban)', vc: 'var(--vc)', angel: 'var(--angel)',
  nikhil: '#8B5CF6', anupam: '#06B6D4', aman: '#F97316',
}

export default function Scorecard() {
  const { sessionData, config, deckIntelligence, sessionHistory, passportStats } = useApp()
  const nav = useNavigate()
  const timelineRef = useRef()
  const [barsReady, setBarsReady] = useState(false)
  const [activeTab, setActiveTab] = useState('score')

  const data = sessionData || {
    overall: 71,
    breakdown: [
      { label: 'Confidence', pct: 64, color: 'var(--cuban)' },
      { label: 'Market Sizing', pct: 72, color: 'var(--vc)' },
      { label: 'Financials', pct: 48, color: 'var(--angel)' },
      { label: 'Vision', pct: 80, color: 'var(--vc)' },
      { label: 'Delivery', pct: 70, color: 'var(--sub)' },
    ],
    history: Array.from({ length: 60 }, (_, i) => 45 + Math.sin(i * .18) * 20 + Math.random() * 12),
    shark: config.shark || 'cuban',
    difficulty: config.difficulty || 'Realistic',
    durationSec: 623,
  }

  const worst = [...data.breakdown].sort((a, b) => a.pct - b.pct)[0]
  const best  = [...data.breakdown].sort((a, b) => b.pct - a.pct)[0]
  const sharkLabel = SHARK_LABELS[data.shark] || 'Shark'
  const durStr = data.durationSec
    ? `${Math.floor(data.durationSec / 60)}:${String(data.durationSec % 60).padStart(2, '0')}`
    : '10:23'

  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 300)
    return () => clearTimeout(t)
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
      <div className="wrap" style={{ paddingTop: 52, paddingBottom: 80 }}>

        <div className="fu" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Session Complete · {sharkLabel} · {data.difficulty}
          </div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(36px,4vw,56px)', letterSpacing: 1.5, lineHeight: .95, marginBottom: 10 }}>
            YOUR INVESTOR<br /><span style={{ color: 'var(--cuban)' }}>SCORECARD.</span>
          </h1>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)' }}>
            Duration: {durStr} · {deckIntelligence?.startupName || 'Startup'}
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
            <div className="fu1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap', marginBottom: 36 }}>
              <ScoreRing score={data.overall} size={200} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <PolarCard type="WEAKEST AREA"   label={worst.label} pct={worst.pct} color="var(--cuban)" note="Focus here next session." />
                <PolarCard type="STRONGEST AREA" label={best.label}  pct={best.pct}  color="var(--vc)"   note="Build your narrative around this." />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--f-display)', fontSize: 72, lineHeight: 1,
                  color: data.overall >= 80 ? 'var(--vc)' : data.overall >= 70 ? 'var(--angel)' : 'var(--cuban)',
                }}>
                  {data.overall >= 80 ? 'A' : data.overall >= 70 ? 'B' : data.overall >= 60 ? 'C' : 'D'}
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
                  {data.overall >= 80 ? 'FUNDABLE' : data.overall >= 70 ? 'PROMISING' : data.overall >= 60 ? 'NEEDS WORK' : 'BACK TO BASICS'}
                </div>
              </div>
            </div>

            <div className="card fu2" style={{ marginBottom: 20 }}>
              <div className="card-lbl">Performance Breakdown</div>
              {data.breakdown.map((b, i) => (
                <div key={b.label} style={{ marginBottom: i < data.breakdown.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--sub)' }}>{b.label}</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 500 }}>{b.pct}%</span>
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

            <div className="card fu3" style={{ marginBottom: 20 }}>
              <div className="card-lbl">Confidence Timeline</div>
              <canvas ref={timelineRef} style={{ width: '100%', height: 80, display: 'block' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', marginTop: 8 }}>
                <span>START</span><span>MIDPOINT</span><span>END</span>
              </div>
            </div>
          </>
        )}

        {/* PITCH PASSPORT TAB */}
        {activeTab === 'passport' && (
          <div className="fu1">
            {/* Passport Card */}
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
                    ['SESSIONS', passportStats.totalSessions, 'var(--text)'],
                    ['BEST SCORE', passportStats.bestScore, 'var(--vc)'],
                    ['TREND', `${passportStats.trend >= 0 ? '+' : ''}${passportStats.trend}`, passportStats.trend >= 0 ? 'var(--vc)' : 'var(--cuban)'],
                    ['TOP SHARK', (SHARK_LABELS[passportStats.mostPracticed] || 'Cuban').split(' ')[0].toUpperCase(), 'var(--angel)'],
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

            {/* Session History */}
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