import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import ScoreRing from '../components/ScoreRing'

const MOCK_LEADERBOARD = [
  { rank:1, name:'Aditya K.',  score:88 },
  { rank:2, name:'Priya M.',   score:84 },
  { rank:3, name:'Rohan S.',   score:77 },
  { rank:4, name:'You',        score:71, me:true },
  { rank:5, name:'Sneha T.',   score:64 },
  { rank:6, name:'Vikram P.',  score:58 },
]

export default function Scorecard() {
  const { sessionData, config } = useApp()
  const nav = useNavigate()
  const timelineRef = useRef()
  const [barsReady, setBarsReady] = useState(false)

  const data = sessionData || {
    overall: 71,
    breakdown: [
      { label:'Confidence',    pct:64, color:'var(--cuban)' },
      { label:'Market Sizing', pct:72, color:'var(--vc)'    },
      { label:'Financials',    pct:48, color:'var(--angel)' },
      { label:'Vision',        pct:80, color:'var(--vc)'    },
      { label:'Delivery',      pct:70, color:'var(--sub)'   },
    ],
    history: Array.from({length:60}, (_,i) => 45 + Math.sin(i*.18)*20 + Math.random()*12),
    shark: config.shark || 'cuban',
    difficulty: config.difficulty || 'Realistic',
    durationSec: 623,
  }

  const worst = [...data.breakdown].sort((a,b)=>a.pct-b.pct)[0]
  const best  = [...data.breakdown].sort((a,b)=>b.pct-a.pct)[0]

  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const canvas = timelineRef.current
    if (!canvas || !data.history?.length) return
    const W = canvas.offsetWidth || 900
    const H = 80
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,W,H)
    const pts = data.history
    const min = Math.min(...pts), max = Math.max(...pts), range = max-min||1
    const grad = ctx.createLinearGradient(0,0,0,H)
    grad.addColorStop(0, 'rgba(224,82,82,0.18)')
    grad.addColorStop(1, 'transparent')
    ctx.beginPath()
    pts.forEach((v,i) => {
      const x=(i/(pts.length-1))*(W-2)+1
      const y=H-6-((v-min)/range)*(H-14)
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
    })
    ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath()
    ctx.fillStyle=grad; ctx.fill()
    ctx.beginPath()
    pts.forEach((v,i) => {
      const x=(i/(pts.length-1))*(W-2)+1
      const y=H-6-((v-min)/range)*(H-14)
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
    })
    ctx.strokeStyle='#E05252'; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke()
    const minI=pts.indexOf(Math.min(...pts))
    const mx=(minI/(pts.length-1))*(W-2)+1
    const my=H-6-((pts[minI]-min)/range)*(H-14)
    ctx.beginPath(); ctx.arc(mx,my,4,0,Math.PI*2)
    ctx.fillStyle='#E05252'; ctx.fill()
  }, [data.history])

  const sharkLabel = { cuban:'Mark Cuban', vc:'Soft VC', angel:'Indian Angel' }[data.shark||'cuban']
  const durStr = data.durationSec
    ? `${Math.floor(data.durationSec/60)}:${String(data.durationSec%60).padStart(2,'0')}`
    : '10:23'

  return (
    <div className="pt-nav" style={{ minHeight:'100vh' }}>
      <div className="wrap" style={{ paddingTop:52, paddingBottom:80 }}>

        <div className="fu" style={{ textAlign:'center', marginBottom:52 }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>
            Session Complete · {sharkLabel} · {data.difficulty}
          </div>
          <h1 style={{
            fontFamily:'var(--f-display)', fontSize:'clamp(36px,4vw,56px)',
            letterSpacing:1.5, lineHeight:.95, marginBottom:14,
          }}>
            YOUR INVESTOR<br/><span style={{ color:'var(--cuban)' }}>SCORECARD.</span>
          </h1>
          <div style={{ fontFamily:'var(--f-mono)', fontSize:12, color:'var(--dim)' }}>
            Duration: {durStr}
          </div>
        </div>

        <div className="fu1" style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          gap:40, flexWrap:'wrap', marginBottom:48,
        }}>
          <ScoreRing score={data.overall} size={200} />
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <PolarCard type="WEAKEST AREA"   label={worst.label} pct={worst.pct} color="var(--cuban)" note="Needs focused work before next session." />
            <PolarCard type="STRONGEST AREA" label={best.label}  pct={best.pct}  color="var(--vc)"   note="Your standout — build narrative around this." />
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{
              fontFamily:'var(--f-display)', fontSize:72, lineHeight:1,
              color: data.overall>=80?'var(--vc)':data.overall>=70?'var(--angel)':'var(--cuban)',
            }}>
              {data.overall>=80?'A':data.overall>=70?'B':data.overall>=60?'C':'D'}
            </div>
            <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)', marginTop:4 }}>
              {data.overall>=80?'FUNDABLE':data.overall>=70?'PROMISING':data.overall>=60?'NEEDS WORK':'BACK TO BASICS'}
            </div>
          </div>
        </div>

        <div className="card fu2" style={{ marginBottom:20 }}>
          <div className="card-lbl">Performance Breakdown</div>
          {data.breakdown.map((b, i) => (
            <div key={b.label} style={{ marginBottom: i<data.breakdown.length-1?16:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                <span style={{ color:'var(--sub)' }}>{b.label}</span>
                <span style={{ fontFamily:'var(--f-mono)', fontWeight:500 }}>{b.pct}%</span>
              </div>
              <div style={{ height:6, background:'var(--surface3)', borderRadius:3, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:3, background:b.color,
                  width: barsReady ? `${b.pct}%` : '0%',
                  transition:`width 1.1s cubic-bezier(.4,0,.2,1) ${i*.1}s`,
                }}/>
              </div>
            </div>
          ))}
        </div>

        <div className="card fu3" style={{ marginBottom:20 }}>
          <div className="card-lbl">Confidence Timeline</div>
          <canvas ref={timelineRef} style={{ width:'100%', height:80, display:'block' }}/>
          <div style={{
            display:'flex', justifyContent:'space-between',
            fontFamily:'var(--f-mono)', fontSize:9, color:'var(--dim)', marginTop:8,
          }}>
            <span>START</span><span>MIDPOINT</span><span>END</span>
          </div>
        </div>

        <div className="fu4" style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--r-xl)', overflow:'hidden', marginBottom:32,
        }}>
          <div style={{
            padding:'16px 22px', borderBottom:'1px solid var(--border)',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{ fontFamily:'var(--f-cond)', fontSize:15, fontWeight:700 }}>
              Peer Leaderboard · {sharkLabel} Persona
            </span>
            <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)' }}>THIS WEEK</span>
          </div>
          {MOCK_LEADERBOARD.map(row => (
            <div key={row.rank} style={{
              display:'flex', alignItems:'center', gap:16, padding:'12px 22px',
              background: row.me ? 'rgba(224,82,82,0.06)' : 'transparent',
              borderLeft: row.me ? '2px solid var(--cuban)' : '2px solid transparent',
              borderBottom:'1px solid var(--border)',
            }}>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:12, color:'var(--dim)', width:22 }}>#{row.rank}</div>
              <div style={{ flex:1, fontSize:14, fontWeight: row.me?600:400 }}>{row.name}</div>
              {row.me && (
                <span style={{
                  fontFamily:'var(--f-mono)', fontSize:9,
                  background:'rgba(224,82,82,.12)', border:'1px solid var(--cuban)',
                  color:'var(--cuban)', padding:'2px 8px', borderRadius:20,
                }}>YOU</span>
              )}
              <div style={{ fontFamily:'var(--f-mono)', fontSize:14, color: row.me?'var(--cuban)':'var(--text)' }}>
                {row.score}
              </div>
            </div>
          ))}
        </div>

        <div className="fu5" style={{ display:'flex', gap:14 }}>
          <button className="btn btn-outline" onClick={()=>nav('/arena')} style={{ flex:1 }}>← RETRY SESSION</button>
          <button className="btn btn-red" onClick={()=>nav('/optimize')}
            style={{ flex:2, padding:'13px 28px', fontFamily:'var(--f-display)', fontSize:17, letterSpacing:1 }}>
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
      background:'var(--surface)', border:'1px solid var(--border)',
      borderLeft:`3px solid ${color}`, borderRadius:'var(--r-lg)',
      padding:'16px 20px', minWidth:240,
    }}>
      <div style={{ fontFamily:'var(--f-mono)', fontSize:9, letterSpacing:2, color, marginBottom:6, textTransform:'uppercase' }}>{type}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:6 }}>
        <span style={{ fontFamily:'var(--f-display)', fontSize:26 }}>{label}</span>
        <span style={{ fontFamily:'var(--f-mono)', fontSize:16, color }}>{pct}%</span>
      </div>
      <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.4 }}>{note}</div>
    </div>
  )
}CDATASection.apply
