import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const STEPS = [
  { path:'/setup',    label:'01 SETUP'    },
  { path:'/deck',     label:'02 DECK'     },
  { path:'/arena',    label:'03 ARENA'    },
  { path:'/scorecard',label:'04 SCORE'    },
  { path:'/optimize', label:'05 OPTIMIZE' },
]

export default function Nav() {
  const { user, logout } = useApp()
  const nav  = useNavigate()
  const loc  = useLocation()

  const currentIdx = STEPS.findIndex(s => loc.pathname.startsWith(s.path))

  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:200,
      height:60,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 32px',
      background:'rgba(15,17,21,0.88)',
      backdropFilter:'blur(18px)',
      borderBottom:'1px solid var(--border)',
    }}>
      {/* Logo */}
      <div
        onClick={() => nav(user ? '/setup' : '/')}
        style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}
      >
        <span style={{ fontSize:22 }}>🦈</span>
        <span style={{ fontFamily:'var(--f-display)', fontSize:22, letterSpacing:2 }}>
          SHARK<span style={{ color:'var(--cuban)' }}>LENS</span>
        </span>
      </div>

      {/* Step pills — only show when in session */}
      {user && (
        <div style={{ display:'flex', gap:3 }}>
          {STEPS.map((s, i) => {
            const done   = i < currentIdx
            const active = i === currentIdx
            return (
              <button key={s.path}
                onClick={() => nav(s.path)}
                style={{
                  padding:'4px 12px',
                  borderRadius:20, border:'none',
                  background: active ? 'var(--surface2)' : 'transparent',
                  color: active ? 'var(--text)' : done ? 'var(--sub)' : 'var(--dim)',
                  fontFamily:'var(--f-mono)', fontSize:10, letterSpacing:1,
                  cursor:'pointer', transition:'all .2s',
                }}
              >
                {done ? '✓ ' : ''}{s.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Right */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {user ? (
          <>
            <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--dim)' }}>
              {user.name}
            </span>
            <button className="btn btn-outline" style={{ padding:'5px 14px', fontSize:12 }}
              onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <div style={{
            fontFamily:'var(--f-mono)', fontSize:11, color:'var(--dim)',
            background:'var(--surface)', border:'1px solid var(--border)',
            padding:'4px 12px', borderRadius:20,
          }}>
            SHARKLENS v1.0 · #ps41
          </div>
        )}
      </div>
    </nav>
  )
}
