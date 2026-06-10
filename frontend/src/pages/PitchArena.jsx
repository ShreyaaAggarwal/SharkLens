import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import MLSidebar from '../components/MLSidebar'
import { initML, tickML, finalScore, NONSENSE, startRealFillerDetection } from '../services/mlEngine'
import { embedUrl } from '../services/trugen'

const SHARK_LABEL = {
  cuban: 'MARK CUBAN', vc: 'SOFT VC', angel: 'INDIAN ANGEL',
  nikhil: 'NIKHIL KAMATH', anupam: 'ANUPAM MITTAL', aman: 'AMAN GUPTA',
}
const SHARK_MODE = {
  cuban: 'BRUTAL', vc: 'VISION', angel: 'PRACTICAL',
  nikhil: 'CONTRARIAN', anupam: 'BRAND', aman: 'D2C',
}
const SHARK_COL = {
  cuban: 'var(--cuban)', vc: 'var(--vc)', angel: 'var(--angel)',
  nikhil: '#8B5CF6', anupam: '#06B6D4', aman: '#F97316',
}
const SHARK_INI = {
  cuban: 'MC', vc: 'SV', angel: 'IA',
  nikhil: 'NK', anupam: 'AM', aman: 'AG',
}

const HINT_POOL = [
  'Lead with the number: CAC/LTV ratio, then validate with cohort data.',
  'Don\'t defend — redirect. "Great point, here\'s how we solve that..."',
  'Drop the filler. Pause. Breathe. Then speak with conviction.',
  'Cuban wants to know: How does this business make money TODAY?',
  'State your assumption out loud — it shows rigour, not weakness.',
  'The market size is wrong. Use bottom-up: users × ARPU.',
  'Name a specific competitor and explain exactly why you win.',
  'If you don\'t know the number, say you\'ll follow up. Never guess.',
]

export default function PitchArena() {
  const { config, setSessionData, user, deckIntelligence } = useApp()
  const nav = useNavigate()

  const [ml, setML]                     = useState(initML)
  const [seconds, setSeconds]           = useState(0)
  const [hint, setHint]                 = useState(null)
  const [hintVisible, setHintVisible]   = useState(false)
  const [camAllowed, setCamAllowed]     = useState(false)
  const [camError, setCamError]         = useState(false)
  const [showPermHint, setShowPermHint] = useState(true)
  const [activeSharkIdx, setActiveSharkIdx] = useState(0) // for boardroom mode

  const videoRef   = useRef()
  const timerRef   = useRef()
  const mlRef      = useRef()
  const mlStateRef = useRef(ml)
  const speechRef  = useRef(null)

  useEffect(() => { mlStateRef.current = ml }, [ml])

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // ML tick
  useEffect(() => {
    mlRef.current = setInterval(() => setML(prev => tickML(prev)), 1400)
    return () => clearInterval(mlRef.current)
  }, [])

  // Real filler detection via Web Speech API
  useEffect(() => {
    const recognition = startRealFillerDetection((word) => {
      setML(prev => ({
        ...prev,
        fillerCounts: {
          ...prev.fillerCounts,
          [word]: (prev.fillerCounts[word] || 0) + 1,
        },
        fillerDensity: Math.min(8, prev.fillerDensity + 0.3),
      }))
    })
    speechRef.current = recognition
    return () => {
      if (speechRef.current) {
        try { speechRef.current.stop() } catch {}
      }
    }
  }, [])

  // Camera
  useEffect(() => {
    let stream = null
    async function startCam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCamAllowed(true)
        }
      } catch (e) {
        setCamError(true)
      }
    }
    startCam()
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()) }
  }, [])

  // Boardroom: rotate active shark every 45s
  useEffect(() => {
    if (config.sessionMode !== 'boardroom') return
    const sharks = config.boardroomSharks || ['cuban', 'angel']
    const iv = setInterval(() => {
      setActiveSharkIdx(i => (i + 1) % sharks.length)
    }, 45000)
    return () => clearInterval(iv)
  }, [config.sessionMode, config.boardroomSharks])

  useEffect(() => {
    const t = setTimeout(() => setShowPermHint(false), 15000)
    return () => clearTimeout(t)
  }, [])

  const recStr     = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const isBoardroom = config.sessionMode === 'boardroom'
  const boardSharks = config.boardroomSharks || ['cuban', 'angel']
  const shark       = isBoardroom ? boardSharks[activeSharkIdx] : (config.shark || 'cuban')
  const sharkColor  = SHARK_COL[shark]

  const iframeUrl = embedUrl(shark, {
    username: user?.name || 'Founder',
    userId:   user?.email || 'sharklens-user',
  })

  const triggerHint = useCallback(() => {
    const h = HINT_POOL[Math.floor(Math.random() * HINT_POOL.length)]
    setHint(h); setHintVisible(true)
    setTimeout(() => setHintVisible(false), 10000)
  }, [])

  function endSession() {
    clearInterval(timerRef.current)
    clearInterval(mlRef.current)
    if (speechRef.current) { try { speechRef.current.stop() } catch {} }
    const score = finalScore(mlStateRef.current.history)
    setSessionData({ ...score, shark, difficulty: config.difficulty, durationSec: seconds })
    nav('/scorecard')
  }

  return (
    <div style={{ paddingTop: 60, height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        height: 44, borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="dot dot-red dot-pulse" />
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>REC {recStr}</span>
          {isBoardroom && (
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 1.5,
              background: 'rgba(229,9,20,0.1)', border: '1px solid var(--cuban)',
              color: 'var(--cuban)', padding: '2px 8px', borderRadius: 20, marginLeft: 8,
            }}>⚡ BOARDROOM</span>
          )}
        </div>

        {/* Boardroom shark tabs */}
        {isBoardroom ? (
          <div style={{ display: 'flex', gap: 6 }}>
            {boardSharks.map((s, i) => (
              <div key={s} style={{
                padding: '4px 12px', borderRadius: 20,
                background: i === activeSharkIdx ? SHARK_COL[s] + '20' : 'transparent',
                border: `1px solid ${i === activeSharkIdx ? SHARK_COL[s] : 'var(--border)'}`,
                fontFamily: 'var(--f-mono)', fontSize: 10,
                color: i === activeSharkIdx ? SHARK_COL[s] : 'var(--dim)',
                transition: 'all .3s',
              }}>
                {SHARK_INI[s]} {i === activeSharkIdx && '← ACTIVE'}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>SHARK:</span>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: 14, letterSpacing: .5, color: sharkColor }}>
              {SHARK_LABEL[shark]} · {SHARK_MODE[shark]}
            </span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', marginLeft: 8 }}>
              {config.difficulty?.toUpperCase()} · {(config.fundingRound || 'SEED').toUpperCase()}
            </span>
          </div>
        )}

        {/* Patience bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>PATIENCE</span>
          <div style={{ width: 90, height: 4, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${ml.mood}%`,
              background: ml.mood > 50 ? 'var(--vc)' : ml.mood > 25 ? 'var(--angel)' : 'var(--cuban)',
              borderRadius: 2, transition: 'width .8s ease',
            }} />
          </div>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--sub)' }}>{Math.round(ml.mood)}%</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Video area */}
        <div style={{ flex: 1, position: 'relative', background: '#060608', overflow: 'hidden' }}>
          <div className="scanline" />

          {/* TruGen iframe */}
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              allow="camera *; microphone *; autoplay *; display-capture *; fullscreen *"
              style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0, zIndex: 1 }}
              title="TruGen AI Agent"
            />
          ) : (
            <AgentPlaceholder shark={shark} sharkColor={sharkColor} />
          )}

          {/* Permission hint */}
          {showPermHint && (
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(10,12,16,0.88)', border: '1px solid var(--angel)',
              borderRadius: 'var(--r-lg)', padding: '8px 18px',
              fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--angel)',
              zIndex: 25, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap', pointerEvents: 'none',
            }}>
              ⚡ Click inside video → Allow mic → Start pitching
            </div>
          )}

          {/* Deck intelligence injected banner */}
          {deckIntelligence && (
            <div style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(10,12,16,0.88)', border: '1px solid rgba(46,204,113,0.3)',
              borderRadius: 'var(--r-lg)', padding: '8px 14px',
              fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--vc)',
              zIndex: 25, backdropFilter: 'blur(8px)',
            }}>
              ✓ DECK ARMED · {deckIntelligence.startupName}
            </div>
          )}

          {/* User cam PIP */}
          <div style={{
            position: 'absolute', bottom: 20, right: 20,
            width: 190, height: 140, borderRadius: 'var(--r-lg)',
            border: '2px solid var(--border2)', overflow: 'hidden',
            background: '#0a0c10', zIndex: 30,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            <video ref={videoRef} autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camAllowed ? 'block' : 'none' }} />
            {!camAllowed && (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--dim)', fontSize: 12, fontFamily: 'var(--f-mono)' }}>
                <span style={{ fontSize: 24, opacity: .4 }}>📷</span>
                <span>{camError ? 'CAM DENIED' : 'LOADING...'}</span>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 6, left: 8, fontFamily: 'var(--f-mono)', fontSize: 9, color: 'rgba(255,255,255,.6)', background: 'rgba(0,0,0,.4)', padding: '2px 6px', borderRadius: 4 }}>YOU</div>
          </div>

          <NonsensePanel ml={ml} />

          {/* Hint overlay */}
          {hint && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              background: 'rgba(10,12,16,0.96)', border: '1px solid var(--angel)',
              borderRadius: 'var(--r-xl)', padding: '24px 32px',
              maxWidth: 420, textAlign: 'center', zIndex: 50,
              opacity: hintVisible ? 1 : 0, transition: 'opacity .4s',
              backdropFilter: 'blur(16px)',
            }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--angel)', letterSpacing: 2, marginBottom: 12 }}>⏸ AI HINT</div>
              <div style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text)', fontWeight: 300 }}>{hint}</div>
            </div>
          )}
        </div>

        <MLSidebar ml={ml} onHint={triggerHint} onEnd={endSession} />
      </div>
    </div>
  )
}

function AgentPlaceholder({ shark, sharkColor }) {
  const ini   = SHARK_INI[shark]
  const label = SHARK_LABEL[shark]
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
      background: `radial-gradient(ellipse 50% 50% at 50% 45%, ${sharkColor}08 0%, transparent 70%)`,
    }}>
      <div style={{ width: 110, height: 110, borderRadius: '50%', border: `2px solid ${sharkColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `1px solid ${sharkColor}20`, animation: 'pulse 2.5s infinite' }} />
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 36, color: sharkColor }}>{ini}</div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, letterSpacing: 1, textAlign: 'center', color: 'var(--text)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--vc)', textAlign: 'center', marginTop: 4, letterSpacing: 2 }}>LISTENING</div>
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24 }}>
        {[.3, .7, 1, .6, .4].map((h, i) => (
          <div key={i} style={{ width: 3, height: `${h * 100}%`, background: sharkColor, borderRadius: 2, opacity: .7, animation: `waveBar 1.4s ease ${i * .12}s infinite` }} />
        ))}
      </div>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 20 }}>
        ADD AGENT IDs IN .env TO ACTIVATE TRUGEN
      </div>
    </div>
  )
}

function NonsensePanel({ ml }) {
  const ns = NONSENSE[ml.nonsenseIdx] || NONSENSE[0]
  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20, maxWidth: 300,
      background: ns.alert ? 'rgba(229,9,20,0.12)' : 'rgba(10,12,16,0.75)',
      border: `1px solid ${ns.alert ? 'var(--cuban)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)', padding: '10px 14px',
      backdropFilter: 'blur(12px)', zIndex: 20, transition: 'all .5s',
    }}>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 2, color: ns.alert ? 'var(--cuban)' : 'var(--dim)', marginBottom: 5 }}>
        {ns.alert ? '⚠ NONSENSE DETECTOR' : 'PITCH MONITOR'}
      </div>
      <div style={{ fontSize: 12, color: ns.alert ? 'var(--text)' : 'var(--sub)', lineHeight: 1.5 }}>{ns.text}</div>
    </div>
  )
}