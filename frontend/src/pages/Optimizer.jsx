import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const ORIGINAL_LINES = [
  { id:1, text:'"So, uh, we\'re building like a platform that helps, um, small businesses kind of manage their inventory and like track stuff in real-time..."' },
  { id:2, text:'"The market is like really huge, I mean there\'s literally like 50 million small businesses in India alone and they all kind of need this..."' },
  { id:3, text:'"We\'ve got like 200 users and they seem pretty happy, our MRR is around... um, let me think... yeah about 80,000 rupees right now..."' },
  { id:4, text:'"The team is like really strong, we all went to IIT so we\'re kind of technical and we know how to build this stuff..."' },
]

const REWRITTEN_LINES = [
  { id:1, text:'"We\'re building India\'s first real-time inventory intelligence layer for SMBs — think Shopify\'s inventory OS, built for Bharat\'s supply chain reality."', note:'Removed 4 fillers. Led with category definition.' },
  { id:2, text:'"India has 63 million MSMEs. Only 18% use any digital inventory tool. That\'s a ₹4,200 crore untouched market growing at 34% CAGR."', note:'Replaced vague "huge" with specific data.' },
  { id:3, text:'"200 paying customers in 90 days, ₹80K MRR, zero churn. Our CAC is ₹1,200 against LTV of ₹28,000 — a 23x ratio."', note:'Eliminated hesitation. Added CAC/LTV ratio.' },
  { id:4, text:'"Three IIT engineers who\'ve shipped production systems at scale. Our CTO built Razorpay\'s reconciliation engine before founding this."', note:'Named a credible prior role instead of vague "strong".' },
]

const IMPROVEMENTS = [
  { label:'Filler Words Removed',        pct:82, note:'43 → 8 instances across script' },
  { label:'Data Density Improved',       pct:71, note:'Abstract claims replaced with metrics' },
  { label:'Investor Language Alignment', pct:88, note:'CAC/LTV/CAGR terminology added' },
  { label:'Narrative Clarity Score',     pct:74, note:'Category-first structure applied' },
  { label:'Cuban Bias Optimisation',     pct:79, note:'Numbers-first framing throughout' },
]

const MCP_ACTIONS = [
  { id:'gmail',    icon:'📧', label:'Scorecard Report',   sub:'Gmail MCP',    action:'Sending to inbox...', done:'Sent to founder@startup.in ✓' },
  { id:'calendar', icon:'📅', label:'Follow-up Session',  sub:'Calendar MCP', action:'Scheduling...', done:'Booked: Thu 10 AM — Financials focus ✓' },
  { id:'drive',    icon:'💾', label:'Session Logs + Deck', sub:'Drive MCP',   action:'Saving...', done:'Saved to /SharkLens/Sessions/ ✓' },
]

export default function Optimizer() {
  const { sessionData, config } = useApp()
  const nav = useNavigate()
  const [mcpDone, setMcpDone]   = useState({})
  const [barsReady, setBarsReady] = useState(false)
  const [activeTab, setActiveTab] = useState('rewrite')

  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 300)
    MCP_ACTIONS.forEach((a, i) => {
      setTimeout(() => setMcpDone(prev => ({ ...prev, [a.id]:true })), 1200 + i*900)
    })
    return () => clearTimeout(t)
  }, [])

  function downloadScript() {
    const content = [
      'SHARKLENS — OPTIMISED PITCH SCRIPT',
      `Generated: ${new Date().toLocaleString()}`,
      `Shark: ${config.shark?.toUpperCase()} | Difficulty: ${config.difficulty}`,
      `Score: ${sessionData?.overall || 71}/100`,
      '='.repeat(50), '',
      '--- OPTIMISED TRANSCRIPT ---', '',
      ...REWRITTEN_LINES.map(l => l.text + '\n[Note: ' + l.note + ']\n'),
      '='.repeat(50),
      'NEXT: Focus on Financials section (weakest area)',
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type:'text/plain' }))
    a.download = 'sharklens-optimised-pitch.txt'
    a.click()
  }

  return (
    <div className="pt-nav" style={{ minHeight:'100vh' }}>
      <div className="wrap" style={{ paddingTop:52, paddingBottom:80 }}>

        <div className="fu" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:40, flexWrap:'wrap', gap:16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom:12 }}>Step 05 · Optimization Engine</div>
            <h1 style={{ fontFamily:'var(--f-display)', fontSize:'clamp(36px,4vw,56px)', letterSpacing:1.5, lineHeight:.95 }}>
              REWRITE.<br/><span style={{ color:'var(--cuban)' }}>REFINE.</span><br/>RAISE.
            </h1>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-outline" onClick={()=>nav('/scorecard')}>← BACK</button>
            <button className="btn btn-red" onClick={downloadScript}>↓ DOWNLOAD SCRIPT</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="fu1" style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:28 }}>
          {[['rewrite','AI REWRITE SUITE'],['script','FULL SCRIPT'],['mcp','MCP AUTOMATION']].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              padding:'10px 20px', border:'none', background:'transparent',
              fontFamily:'var(--f-cond)', fontSize:13, fontWeight:700, letterSpacing:.5,
              cursor:'pointer',
              color: activeTab===id ? 'var(--text)' : 'var(--dim)',
              borderBottom: activeTab===id ? '2px solid var(--cuban)' : '2px solid transparent',
              transition:'all .2s',
            }}>{label}</button>
          ))}
        </div>

        {/* Tab: Rewrite */}
        {activeTab === 'rewrite' && (
          <div className="fu2">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)', letterSpacing:2 }}>ORIGINAL TRANSCRIPT</span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:9, background:'var(--surface3)', border:'1px solid var(--border)', color:'var(--sub)', padding:'2px 8px', borderRadius:20 }}>RAW</span>
                </div>
                <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
                  {ORIGINAL_LINES.map(l => (
                    <div key={l.id} style={{ fontSize:13, color:'var(--sub)', lineHeight:1.7, fontStyle:'italic', borderLeft:'2px solid var(--border)', paddingLeft:12 }}>
                      {l.text}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background:'var(--surface)', border:'1px solid rgba(63,185,126,.25)', borderRadius:'var(--r-xl)', overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', borderBottom:'1px solid rgba(63,185,126,.15)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)', letterSpacing:2 }}>AI OPTIMISED</span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:9, background:'rgba(63,185,126,.12)', border:'1px solid rgba(63,185,126,.4)', color:'var(--vc)', padding:'2px 8px', borderRadius:20 }}>GEMINI · REWRITTEN</span>
                </div>
                <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
                  {REWRITTEN_LINES.map(l => (
                    <div key={l.id}>
                      <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.7, fontStyle:'italic', borderLeft:'2px solid var(--vc)', paddingLeft:12, marginBottom:6 }}>{l.text}</div>
                      <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--vc)', paddingLeft:12 }}>✓ {l.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-lbl">Structural Improvements Applied</div>
              {IMPROVEMENTS.map((b, i) => (
                <div key={b.label} style={{ marginBottom: i<IMPROVEMENTS.length-1?14:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                    <span style={{ color:'var(--sub)' }}>{b.label}</span>
                    <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--vc)' }}>+{b.pct}%</span>
                  </div>
                  <div style={{ height:5, background:'var(--surface3)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, background:'var(--vc)', width:barsReady?`${b.pct}%`:'0%', transition:`width 1s ease ${i*.1}s` }}/>
                  </div>
                  <div style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--dim)', marginTop:3 }}>{b.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Full Script */}
        {activeTab === 'script' && (
          <div className="fu2">
            <div className="card">
              <div className="card-lbl" style={{ marginBottom:20 }}>Auto-Improved Pitch Script</div>
              {[
                { section:'HOOK (0:00–0:30)', color:'var(--cuban)', text:'We\'re building India\'s first real-time inventory intelligence layer for SMBs — think Shopify\'s inventory OS, built for Bharat\'s supply chain reality. In 90 days: 200 paying customers, ₹80K MRR, zero churn.' },
                { section:'PROBLEM (0:30–1:30)', color:'var(--angel)', text:'63 million MSMEs in India. Only 18% use any digital inventory tool. Every day of inventory blindness = 12–18% margin leakage. That\'s the problem we solve.' },
                { section:'MARKET (1:30–2:30)', color:'var(--vc)', text:'₹4,200 crore SAM growing at 34% CAGR. Our beachhead: D2C brands and food-and-beverage SMBs in Tier 1 cities — 1.2M businesses, underserved by every existing tool.' },
                { section:'TRACTION (2:30–3:30)', color:'var(--vc)', text:'200 customers, ₹80K MRR. CAC ₹1,200 · LTV ₹28,000 = 23x ratio. NPS: 71. Cohort retention at month 3: 89%.' },
                { section:'THE ASK (3:30–4:00)', color:'var(--cuban)', text:'We\'re raising ₹2 crore at a ₹12 crore valuation. 18 months of runway to hit ₹8L MRR and 2,000 customers.' },
              ].map(s => (
                <div key={s.section} style={{ marginBottom:24, paddingBottom:24, borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:s.color, letterSpacing:2, marginBottom:10, textTransform:'uppercase' }}>{s.section}</div>
                  <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, fontWeight:300, fontStyle:'italic' }}>"{s.text}"</div>
                </div>
              ))}
              <button className="btn btn-red" onClick={downloadScript}>↓ DOWNLOAD FULL SCRIPT</button>
            </div>
          </div>
        )}

        {/* Tab: MCP */}
        {activeTab === 'mcp' && (
          <div className="fu2">
            <div className="card" style={{ marginBottom:20 }}>
              <div className="card-lbl">MCP Automation Pipeline</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {MCP_ACTIONS.map(a => (
                  <div key={a.id} style={{
                    display:'flex', alignItems:'center', gap:16,
                    background: mcpDone[a.id] ? 'rgba(63,185,126,0.06)' : 'var(--surface2)',
                    border:`1px solid ${mcpDone[a.id] ? 'rgba(63,185,126,.3)' : 'var(--border)'}`,
                    borderRadius:'var(--r-lg)', padding:'16px 20px', transition:'all .5s',
                  }}>
                    <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background: mcpDone[a.id] ? 'rgba(63,185,126,.12)' : 'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{a.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--f-cond)', fontSize:15, fontWeight:700, color: mcpDone[a.id] ? 'var(--text)' : 'var(--sub)', marginBottom:3 }}>{a.label}</div>
                      <div style={{ fontFamily:'var(--f-mono)', fontSize:11, color: mcpDone[a.id] ? 'var(--vc)' : 'var(--dim)', display:'flex', alignItems:'center', gap:7 }}>
                        {!mcpDone[a.id] && <span className="spin-ring"/>}
                        {mcpDone[a.id] ? a.done : `${a.sub} · ${a.action}`}
                      </div>
                    </div>
                    {mcpDone[a.id] && <div style={{ fontSize:20 }}>✅</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="fu5" style={{ marginTop:40, textAlign:'center' }}>
          <button className="btn btn-red btn-lg" style={{ maxWidth:320, margin:'0 auto' }} onClick={() => nav('/setup')}>
            START NEW SESSION →
          </button>
        </div>

      </div>
    </div>
  )
}