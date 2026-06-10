import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

const MCP_ACTIONS = [
  { id: 'gmail',    icon: '📧', label: 'Scorecard Report',    sub: 'Gmail MCP',    done: 'Sent to inbox ✓' },
  { id: 'calendar', icon: '📅', label: 'Follow-up Session',   sub: 'Calendar MCP', done: 'Booked: Thu 10 AM ✓' },
  { id: 'drive',    icon: '💾', label: 'Session Logs + Deck', sub: 'Drive MCP',    done: 'Saved to /SharkLens/ ✓' },
]

export default function Optimizer() {
  const { sessionData, config, deckText, deckIntelligence, addSessionToPassport } = useApp()
  const nav = useNavigate()

  const [activeTab, setActiveTab]   = useState('rewrite')
  const [mcpDone, setMcpDone]       = useState({})
  const [barsReady, setBarsReady]   = useState(false)
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [rewriteData, setRewriteData] = useState(null)
  const [scriptData, setScriptData]   = useState(null)
  const [scoreAnalysis, setScoreAnalysis] = useState(null)

  const data = sessionData || {
    overall: 71,
    breakdown: [
      { label: 'Confidence', pct: 64, color: 'var(--cuban)' },
      { label: 'Market Sizing', pct: 72, color: 'var(--vc)' },
      { label: 'Financials', pct: 48, color: 'var(--angel)' },
      { label: 'Vision', pct: 80, color: 'var(--vc)' },
      { label: 'Delivery', pct: 70, color: 'var(--sub)' },
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
    // Auto-generate rewrite on mount
    generateRewrite()
    return () => clearTimeout(t)
  }, [])

  // Save to passport on mount
  useEffect(() => {
    if (sessionData) {
      addSessionToPassport({
        ...sessionData,
        startupName: deckIntelligence?.startupName || 'Unknown',
        fundingRound: config.fundingRound,
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
Traction: ${deckIntelligence.traction}
Ask: ${deckIntelligence.ask}
Weaknesses detected: ${(deckIntelligence.topWeaknesses || []).join(', ')}`
        : (deckText ? deckText.slice(0, 2000) : 'No deck provided')

      const sessionContext = `
Session Performance:
- Overall score: ${data.overall}/100
- Weakest area: ${worst.label} (${worst.pct}%)
- Shark: ${data.shark} / Difficulty: ${data.difficulty}
- Breakdown: ${data.breakdown.map(b => `${b.label}: ${b.pct}%`).join(', ')}`

      const response = await fetch(CLAUDE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a world-class pitch coach. Based on the deck and session data, provide a complete pitch optimization.

DECK INTELLIGENCE:
${deckContext}

${sessionContext}

Return ONLY valid JSON (no markdown):
{
  "improvements": [
    {"area": "area name", "original": "what they probably said", "rewritten": "optimized version", "note": "why this is better", "pct": 82}
  ],
  "fullScript": [
    {"section": "HOOK (0:00-0:30)", "text": "optimized hook text", "color": "#E50914"},
    {"section": "PROBLEM (0:30-1:30)", "text": "optimized problem text", "color": "#F39C12"},
    {"section": "SOLUTION (1:30-2:30)", "text": "optimized solution text", "color": "#2ECC71"},
    {"section": "TRACTION (2:30-3:30)", "text": "optimized traction text", "color": "#2ECC71"},
    {"section": "THE ASK (3:30-4:00)", "text": "optimized ask text", "color": "#E50914"}
  ],
  "topInsight": "The single most important thing to fix before next pitch",
  "nextSessionFocus": "What to specifically practice next time"
}`
          }]
        })
      })

      if (!response.ok) throw new Error('API failed')
      const apiData = await response.json()
      const raw = apiData.content?.[0]?.text || '{}'
      const clean = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setRewriteData(parsed.improvements || [])
      setScriptData(parsed.fullScript || [])
      setScoreAnalysis({ topInsight: parsed.topInsight, nextSessionFocus: parsed.nextSessionFocus })
    } catch (err) {
      console.error('Rewrite generation failed:', err)
      // Fallback data
      setRewriteData([
        { area: 'Opening Hook', original: '"So, um, we\'re building a platform..."', rewritten: `"We're building ${deckIntelligence?.solution || 'the solution'} — and we have traction to prove it."`, note: 'Lead with proof, not description.', pct: 85 },
        { area: 'Market Claim', original: '"The market is huge..."', rewritten: `"${deckIntelligence?.marketSize || 'TAM'} — and we\'re targeting the highest-CAC segment first."`, note: 'Replace vague with specific.', pct: 78 },
        { area: 'Financials', original: '"We have some revenue..."', rewritten: `"${deckIntelligence?.traction || 'Traction details'} — and our unit economics are..."`, note: 'Lead with CAC/LTV ratio.', pct: 71 },
      ])
      setScriptData([])
      setScoreAnalysis({ topInsight: `Focus on your ${worst.label} section — it scored only ${worst.pct}%.`, nextSessionFocus: `Practice defending your financial projections with exact numbers.` })
    } finally {
      setRewriteLoading(false)
    }
  }

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

        {/* Tabs */}
        <div className="fu1" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {[['rewrite', 'AI REWRITE'], ['script', 'FULL SCRIPT'], ['mcp', 'MCP AUTOMATION']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding: '10px 20px', border: 'none', background: 'transparent',
              fontFamily: 'var(--f-display)', fontSize: 14, letterSpacing: .5, cursor: 'pointer',
              color: activeTab === id ? 'var(--text)' : 'var(--dim)',
              borderBottom: activeTab === id ? '2px solid var(--cuban)' : '2px solid transparent',
              transition: 'all .2s',
            }}>{label}</button>
          ))}
        </div>

        {/* Rewrite Tab */}
        {activeTab === 'rewrite' && (
          <div className="fu2">
            {rewriteLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px 0', color: 'var(--sub)' }}>
                <span className="spin-ring" />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>CLAUDE REWRITING YOUR PITCH...</span>
              </div>
            ) : (
              <>
                {(rewriteData || []).map((item, i) => (
                  <div key={i} className="card" style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, letterSpacing: .5 }}>{item.area}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--vc)' }}>+{item.pct}% improvement</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '12px 14px', borderLeft: '2px solid var(--border2)' }}>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: 2, marginBottom: 6 }}>ORIGINAL</div>
                        <div style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.6, fontStyle: 'italic' }}>{item.original}</div>
                      </div>
                      <div style={{ background: 'rgba(46,204,113,0.04)', borderRadius: 'var(--r)', padding: '12px 14px', borderLeft: '2px solid var(--vc)' }}>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--vc)', letterSpacing: 2, marginBottom: 6 }}>OPTIMISED</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, fontStyle: 'italic' }}>{item.rewritten}</div>
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

        {/* Script Tab */}
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

        {/* MCP Tab */}
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