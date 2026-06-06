import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const TICKER_ITEMS = [
  ['LAST SESSION','71/100'], ['FUNDED PITCHES','247'],
  ['AVG SESSION','12 MIN'], ['TOP SHARK','MARK CUBAN'],
  ['BILINGUAL PITCHES','EN · HI'], ['FILLER REDUCTION','68%'],
  ['EYE CONTACT AVG','78%'], ['MCP INTEGRATIONS','4 ACTIVE'],
]

const QUOTES = [
  { q: "\"That's not a business, that's a hobby.\"", who: '— Mark Cuban Persona' },
  { q: '"Where did that 10cr TAM number come from?"', who: '— Shark AI, Session #312' },
  { q: '"Tell me your CAC/LTV ratio. Right now."', who: '— Mark Cuban Persona' },
  { q: '"I love the vision but I have serious concerns about execution."', who: '— Soft VC Persona' },
]

export default function Login() {
  const { setUser }     = useApp()
  const nav             = useNavigate()
  const [tab, setTab]   = useState('login')   // 'login' | 'signup'
  const [form, setForm] = useState({ name:'', email:'', password:'' })
  const [err, setErr]   = useState('')
  const [loading, setLoading] = useState(false)
  const [quoteIdx, setQuoteIdx]   = useState(0)
  const [showQuote, setShowQuote] = useState(true)
  const bgRef = useRef()

  // Rotate quote
  useEffect(() => {
    const iv = setInterval(() => {
      setShowQuote(false)
      setTimeout(() => { setQuoteIdx(i => (i+1) % QUOTES.length); setShowQuote(true) }, 400)
    }, 4000)
    return () => clearInterval(iv)
  }, [])

  // Subtle parallax on bg
  useEffect(() => {
    const onMove = e => {
      if (!bgRef.current) return
      const x = (e.clientX / window.innerWidth - .5) * 12
      const y = (e.clientY / window.innerHeight - .5) * 12
      bgRef.current.style.transform = `translate(${x}px,${y}px) scale(1.04)`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.email || !form.password) { setErr('Fill in all fields.'); return }
    if (tab === 'signup' && !form.name) { setErr('Enter your name.'); return }
    setLoading(true)
    setTimeout(() => {
      setUser({ name: form.name || form.email.split('@')[0], email: form.email })
      nav('/setup')
    }, 900)
  }

  const q = QUOTES[quoteIdx]

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* ---- Cinematic background ---- */}
      <div style={{
        position:'absolute', inset:0, overflow:'hidden', zIndex:0,
      }}>
        {/* Layered gradient — not flat AI purple, actual brand palette */}
        <div ref={bgRef} style={{
          position:'absolute', inset:'-5%',
          background:`
            radial-gradient(ellipse 70% 60% at 20% 50%, rgba(224,82,82,0.09) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 20%, rgba(217,158,50,0.06) 0%, transparent 55%),
            radial-gradient(ellipse 60% 80% at 60% 80%, rgba(63,185,126,0.04) 0%, transparent 55%),
            #0F1115
          `,
          transition:'transform .12s ease-out',
        }}/>

        {/* Grid overlay */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:`
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize:'48px 48px',
        }}/>

        {/* Vignette */}
        <div style={{
          position:'absolute', inset:0,
          background:'radial-gradient(ellipse at center, transparent 40%, rgba(15,17,21,.85) 100%)',
        }}/>
      </div>

      {/* ---- Logo ---- */}
      <header style={{
        position:'relative', zIndex:10,
        padding:'28px 48px', display:'flex', alignItems:'center', gap:12,
      }}>
        <span style={{ fontSize:26 }}>🦈</span>
        <span style={{ fontFamily:'var(--f-display)', fontSize:26, letterSpacing:3 }}>
          SHARK<span style={{ color:'var(--cuban)' }}>LENS</span>
        </span>
        <span style={{
          marginLeft:12, fontFamily:'var(--f-mono)', fontSize:10,
          color:'var(--dim)', border:'1px solid var(--border)',
          padding:'3px 9px', borderRadius:20,
        }}>
          Array to Heaven · #ps41
        </span>
      </header>

      {/* ---- Main content ---- */}
      <div style={{
        flex:1, position:'relative', zIndex:10,
        display:'grid', gridTemplateColumns:'1fr 1fr',
        alignItems:'center', padding:'0 48px', gap:60,
        maxWidth:1200, margin:'0 auto', width:'100%',
      }}>

        {/* LEFT — hero copy */}
        <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
          <div className="eyebrow fu" style={{ fontSize:11, letterSpacing:4 }}>
            TruGen AI · Real-time Video Agent · PS4.1
          </div>

          <h1 className="fu1" style={{
            fontFamily:'var(--f-display)',
            fontSize:'clamp(52px,5.5vw,82px)',
            lineHeight:.95, letterSpacing:2,
            color:'var(--text)',
          }}>
            FACE THE<br/>
            <span style={{ color:'var(--cuban)' }}>SHARKS.</span><br/>
            WIN YOUR<br/>RAISE.
          </h1>

          <p className="fu2" style={{
            fontSize:17, color:'var(--sub)',
            lineHeight:1.65, maxWidth:400,
            fontWeight:300,
          }}>
            Real-time AI pitch coach with live ML telemetry.
            Practice against <em style={{ color:'var(--text)', fontStyle:'normal' }}>brutal investor personas</em> and
            walk out fundable.
          </p>

          {/* Rotating shark quote */}
          <div className="fu3" style={{
            borderLeft:'2px solid var(--cuban)',
            paddingLeft:18, minHeight:60,
          }}>
            <div style={{
              fontSize:15, color:'var(--text)', lineHeight:1.5, fontStyle:'italic',
              opacity: showQuote ? 1 : 0,
              transform: showQuote ? 'translateY(0)' : 'translateY(6px)',
              transition:'opacity .35s, transform .35s',
            }}>
              {q.q}
              <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)', marginTop:6, fontStyle:'normal' }}>
                {q.who}
              </div>
            </div>
          </div>

          {/* Stat chips */}
          <div className="fu4" style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[['247','Pitches Coached'],['71','Avg Score'],['4','MCP Tools']].map(([n,l]) => (
              <div key={l} style={{
                background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:'var(--r)', padding:'10px 16px',
              }}>
                <div style={{ fontFamily:'var(--f-display)', fontSize:28, color:'var(--cuban)', lineHeight:1 }}>{n}</div>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)', marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — auth card */}
        <div className="fu2" style={{
          background:'var(--surface)',
          border:'1px solid var(--border)',
          borderRadius:16,
          padding:'36px 40px',
          backdropFilter:'blur(12px)',
        }}>
          {/* Tab switcher */}
          <div style={{ display:'flex', gap:0, marginBottom:28, borderBottom:'1px solid var(--border)' }}>
            {['login','signup'].map(t => (
              <button key={t} onClick={() => { setTab(t); setErr('') }}
                style={{
                  flex:1, padding:'12px 0', border:'none',
                  background:'transparent',
                  fontFamily:'var(--f-cond)', fontSize:15, fontWeight:700,
                  letterSpacing:.5, cursor:'pointer',
                  color: tab===t ? 'var(--text)' : 'var(--dim)',
                  borderBottom: tab===t ? '2px solid var(--cuban)' : '2px solid transparent',
                  transition:'all .2s',
                }}>
                {t === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {tab === 'signup' && (
              <div className="field">
                <label>Your Name</label>
                <input className="input" placeholder="Shreya Aggarwal"
                  value={form.name}
                  onChange={e => setForm(p=>({...p,name:e.target.value}))}/>
              </div>
            )}

            <div className="field">
              <label>Email Address</label>
              <input className="input" type="email" placeholder="founder@startup.in"
                value={form.email}
                onChange={e => setForm(p=>({...p,email:e.target.value}))}/>
            </div>

            <div className="field">
              <label>Password</label>
              <input className="input" type="password" placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p=>({...p,password:e.target.value}))}/>
            </div>

            {err && (
              <div style={{
                background:'rgba(224,82,82,.1)', border:'1px solid rgba(224,82,82,.3)',
                borderRadius:'var(--r)', padding:'9px 14px',
                fontFamily:'var(--f-mono)', fontSize:12, color:'var(--cuban)',
              }}>{err}</div>
            )}

            <button type="submit" className="btn btn-red btn-lg"
              style={{ marginTop:4, position:'relative', overflow:'hidden' }}
              disabled={loading}
            >
              {loading
                ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className="spin-ring" style={{ borderTopColor:'#fff' }}/>
                    ENTERING THE TANK...
                  </span>
                : tab === 'login' ? 'ENTER THE TANK →' : 'START PRACTICING →'
              }
            </button>

            <div style={{ textAlign:'center', fontFamily:'var(--f-mono)', fontSize:11, color:'var(--dim)' }}>
              {tab === 'login' ? "Don't have an account? " : 'Already practising? '}
              <span
                onClick={() => { setTab(tab==='login'?'signup':'login'); setErr('') }}
                style={{ color:'var(--cuban)', cursor:'pointer' }}
              >
                {tab === 'login' ? 'Sign up free' : 'Sign in'}
              </span>
            </div>
          </form>

          {/* Feature list */}
          <div style={{ marginTop:24, paddingTop:20, borderTop:'1px solid var(--border)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                '🦈 3 Shark Personas','📊 Live ML Telemetry',
                '🎯 Real-time Radar','👁 Eye Contact Track',
                '💡 AI Hint System','📧 Gmail · Drive MCP',
              ].map(f => (
                <div key={f} style={{
                  fontFamily:'var(--f-mono)', fontSize:10,
                  color:'var(--dim)', padding:'5px 0',
                }}>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Ticker bar ---- */}
      <div style={{ position:'relative', zIndex:10 }}>
        <div className="ticker-wrap">
          <div className="ticker-inner">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map(([k,v], i) => (
              <div key={i} className="ticker-item">
                {k} · <span>{v}</span>
                <span style={{ color:'var(--border2)', marginLeft:28 }}>◆</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
