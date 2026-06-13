import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import MLSidebar from '../components/MLSidebar'
import { initML, tickML, finalScore, NONSENSE, startRealFillerDetection } from '../services/mlEngine'
import { embedUrl } from '../services/trugen'

// ─── Constants ────────────────────────────────────────────────────────────────

const SHARK_LABEL = {
  cuban:  'MARK CUBAN',
  vc:     'PRIYA SHARMA',
  angel:  'SUNITA AGARWAL',
  nikhil: 'NIKHIL KAMATH',
  anupam: 'ANUPAM MITTAL',
  aman:   'AMAN GUPTA',
}
const SHARK_MODE = {
  cuban:  'BRUTAL',
  vc:     'VISION',
  angel:  'PRACTICAL',
  nikhil: 'PHILOSOPHER',
  anupam: 'BRAND',
  aman:   'D2C',
}
const SHARK_COL = {
  cuban:  'var(--cuban)',
  vc:     'var(--vc)',
  angel:  'var(--angel)',
  nikhil: 'var(--vc)',
  anupam: 'var(--angel)',
  aman:   'var(--cuban)',
}
const SHARK_INI = {
  cuban:  'MC',
  vc:     'PS',
  angel:  'SA',
  nikhil: 'NK',
  anupam: 'AM',
  aman:   'AG',
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

// ADD: Investor interruption questions per shark personality
const INTERRUPTION_QUESTIONS = {
  cuban:  [
    'Wait — you just said you\'ll reach 10,000 users. What\'s your CAC right now?',
    'Stop. How does this actually make money on day one?',
    'I\'m going to stop you there — who is your biggest competitor and why do you win?',
    'Hold on. What are your margins? Because everything else is irrelevant without that.',
  ],
  vc:     [
    'Pause — what does your 5-year vision look like beyond India?',
    'I want to understand the moat. What stops a well-funded player from copying this?',
    'Let\'s talk about your team — why are YOU the right people to build this?',
  ],
  angel:  [
    'Wait — you mentioned traction. Give me the exact number, not a range.',
    'How are you planning to reach your first 100 paying customers?',
    'What\'s the unit economics look like at scale?',
  ],
  nikhil: [
    'Interesting — but philosophically, what problem in society does this solve?',
    'I\'d push back on your market assumption. Have you stress-tested this?',
    'What\'s the contrarian view on your own business?',
  ],
  anupam: [
    'Let me interrupt — how does the brand story resonate with consumers emotionally?',
    'What\'s the community play here? How do users become advocates?',
  ],
  aman:   [
    'Stop — what\'s the D2C play? How do you own the customer relationship?',
    'Tell me your repeat purchase rate. That\'s the only metric I care about.',
    'How does this work on social? Because that\'s where D2C is won or lost.',
  ],
}

// ADD: Grid layout calculator
function getGridColumns(count) {
  if (count === 1) return '1fr'
  if (count === 2) return '1fr 1fr'
  if (count <= 4)  return '1fr 1fr'
  return '1fr 1fr 1fr'
}

// ─── Keyframes ────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes boardroomGlowPulse {
  0%, 100% { box-shadow: 0 0 0 2px var(--panel-glow), 0 0 28px 4px var(--panel-glow-soft); }
  50%       { box-shadow: 0 0 0 2px var(--panel-glow), 0 0 52px 12px var(--panel-glow-soft); }
}
@keyframes badgeFade {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes waveBar {
  0%, 100% { transform: scaleY(0.4); }
  50%       { transform: scaleY(1); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.95); }
}
@keyframes activeDot {
  0%, 100% { box-shadow: 0 0 0 0 var(--panel-glow); opacity: 1; }
  50%       { box-shadow: 0 0 0 5px transparent; opacity: 0.7; }
}
@keyframes fillerPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.35); color: #ff4444; }
  100% { transform: scale(1); }
}
@keyframes interruptSlide {
  from { opacity: 0; transform: translateY(20px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes interruptPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(229,9,20,0.4); }
  50%       { box-shadow: 0 0 0 12px rgba(229,9,20,0); }
}
`

// ─── Component ────────────────────────────────────────────────────────────────

export default function PitchArena() {
  const { config, setSessionData, user, deckIntelligence, setTranscript } = useApp()
  const nav = useNavigate()

  const [ml, setML]                         = useState(initML)
  const [seconds, setSeconds]               = useState(0)
  const [hint, setHint]                     = useState(null)
  const [hintVisible, setHintVisible]       = useState(false)
  const [showPermHint, setShowPermHint]     = useState(true)
  const [activeSharkIdx, setActiveSharkIdx] = useState(0)

  // ADD: Live filler word state
  const [liveFillCount, setLiveFillCount]   = useState(0)
  const [lastFiller, setLastFiller]         = useState('')
  const [fillerFlash, setFillerFlash]       = useState(false)

  // ADD: Investor interruption state
  const [interruption, setInterruption]     = useState(null)  // { question, shark }
  const [interruptVisible, setInterruptVisible] = useState(false)
  const silenceTimerRef = useRef(null)
  const lastSpeechRef   = useRef(Date.now())
  const interruptedRef  = useRef(false)  // prevent spam

  const timerRef      = useRef()
  const mlRef         = useRef()
  const mlStateRef    = useRef(ml)
  const speechRef     = useRef(null)
  const transcriptRef = useRef('')

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
    const recognition = startRealFillerDetection((word, fullTranscript) => {
      if (word) {
        // ADD: Update live filler counter with flash animation
        setLiveFillCount(prev => prev + 1)
        setLastFiller(word)
        setFillerFlash(true)
        setTimeout(() => setFillerFlash(false), 600)

        // Reset silence timer on speech detected
        lastSpeechRef.current = Date.now()
        interruptedRef.current = false
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)

        setML(prev => ({
          ...prev,
          fillerCounts: {
            ...prev.fillerCounts,
            [word]: (prev.fillerCounts[word] || 0) + 1,
          },
          fillerDensity: Math.min(8, prev.fillerDensity + 0.3),
        }))
      }
      if (fullTranscript) {
        transcriptRef.current += ' ' + fullTranscript
        // Reset silence on any speech
        lastSpeechRef.current = Date.now()
        interruptedRef.current = false
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        // ADD: Start silence detection countdown after speech
        silenceTimerRef.current = setTimeout(() => {
          triggerInterruption()
        }, 2200)
      }
    })
    speechRef.current = recognition
    return () => {
      if (speechRef.current) { try { speechRef.current.stop() } catch {} }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  // ADD: Trigger investor interruption after silence
  const triggerInterruption = useCallback(() => {
    if (interruptedRef.current) return  // don't spam
    if (seconds < 15) return            // give founder 15s warmup
    interruptedRef.current = true

    const shark = isBoardroom ? boardSharks[activeSharkIdx] : (config.shark || 'cuban')
    const pool  = INTERRUPTION_QUESTIONS[shark] || INTERRUPTION_QUESTIONS.cuban
    const q     = pool[Math.floor(Math.random() * pool.length)]

    setInterruption({ question: q, shark })
    setInterruptVisible(true)
    setTimeout(() => setInterruptVisible(false), 12000)
    // Allow next interruption after 30s
    setTimeout(() => { interruptedRef.current = false }, 30000)
  }, [seconds, activeSharkIdx, config.shark])

  // Boardroom: rotate active shark every 60s
  useEffect(() => {
    if (config.sessionMode !== 'boardroom') return
    const sharks = config.boardroomSharks || config.selectedSharks || ['cuban', 'angel']
    const iv = setInterval(() => {
      setActiveSharkIdx(i => (i + 1) % sharks.length)
    }, 60000)
    return () => clearInterval(iv)
  }, [config.sessionMode, config.boardroomSharks, config.selectedSharks])

  useEffect(() => {
    const t = setTimeout(() => setShowPermHint(false), 15000)
    return () => clearTimeout(t)
  }, [])

  // ── Derived values ─────────────────────────────────────────────────────────
  const recStr      = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const isBoardroom = config.sessionMode === 'boardroom'
  const boardSharks = config.boardroomSharks || config.selectedSharks || ['cuban', 'angel']
  const activeShark = isBoardroom ? boardSharks[activeSharkIdx] : (config.shark || 'cuban')
  const sharkColor  = SHARK_COL[activeShark]

  const soloIframeUrl = embedUrl(activeShark, {
    username: user?.name  || 'Founder',
    userId:   user?.email || 'sharklens-user',
  })

  const triggerHint = useCallback(() => {
    const h = HINT_POOL[Math.floor(Math.random() * HINT_POOL.length)]
    setHint(h)
    setHintVisible(true)
    setTimeout(() => setHintVisible(false), 10000)
  }, [])

  function endSession() {
    clearInterval(timerRef.current)
    clearInterval(mlRef.current)
    if (speechRef.current) { try { speechRef.current.stop() } catch {} }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    const score = finalScore(mlStateRef.current.history)
    // ADD: pass liveFillCount into session data for Scorecard verdict
    setTranscript(transcriptRef.current.trim())
    setSessionData({
      ...score,
      shark: activeShark,
      difficulty: config.difficulty,
      durationSec: seconds,
      liveFillCount,  // ADD: real filler count from session
    })
    nav('/scorecard')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: 60, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{KEYFRAMES}</style>

      {/* ── Top bar ── */}
      <TopBar
        recStr={recStr}
        isBoardroom={isBoardroom}
        boardSharks={boardSharks}
        activeSharkIdx={activeSharkIdx}
        activeShark={activeShark}
        sharkColor={sharkColor}
        ml={ml}
        config={config}
      />

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* ── Video area ── */}
        <div style={{ flex: 1, position: 'relative', background: '#060608', overflow: 'hidden' }}>
          <div className="scanline" />

          {isBoardroom
            ? (
              <BoardroomLayout
                boardSharks={boardSharks}
                activeSharkIdx={activeSharkIdx}
                setActiveSharkIdx={setActiveSharkIdx}
                user={user}
              />
            )
            : (
              <SoloSharkLayout
                iframeUrl={soloIframeUrl}
                shark={activeShark}
                sharkColor={sharkColor}
              />
            )
          }

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

          {/* Deck intelligence banner */}
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

          {/* AI Hint overlay */}
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

          {/* ADD: Investor Interruption Overlay */}
          {interruption && interruptVisible && (
            <div style={{
              position: 'absolute', bottom: 80, left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(8,10,14,0.97)',
              border: '1px solid var(--cuban)',
              borderRadius: 'var(--r-xl)', padding: '20px 28px',
              maxWidth: 480, width: '90%',
              zIndex: 60,
              animation: 'interruptSlide 0.35s cubic-bezier(0.16,1,0.3,1)',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                {/* Pulsing shark dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'var(--cuban)',
                  animation: 'interruptPulse 1.2s infinite',
                  flexShrink: 0,
                }} />
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--cuban)', letterSpacing: 2 }}>
                  🦈 {SHARK_LABEL[interruption.shark]} INTERRUPTS
                </div>
                <button
                  onClick={() => setInterruptVisible(false)}
                  style={{
                    marginLeft: 'auto', background: 'none', border: 'none',
                    color: 'var(--dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
                    padding: '0 4px',
                  }}
                >✕</button>
              </div>
              <div style={{
                fontSize: 15, color: 'var(--text)', lineHeight: 1.65,
                fontStyle: 'italic',
              }}>
                "{interruption.question}"
              </div>
              <div style={{
                marginTop: 10, fontFamily: 'var(--f-mono)', fontSize: 9,
                color: 'var(--dim)', letterSpacing: 1,
              }}>
                PAUSE · TAKE A BREATH · ANSWER DIRECTLY
              </div>
            </div>
          )}

          {/* ADD: Live Filler Word Counter — bottom left above nonsense panel */}
          <LiveFillerCounter
            count={liveFillCount}
            lastFiller={lastFiller}
            flash={fillerFlash}
          />

          <NonsensePanel ml={ml} />
        </div>

        <MLSidebar ml={ml} onHint={triggerHint} onEnd={endSession} />
      </div>
    </div>
  )
}

// ─── ADD: Live Filler Counter Component ──────────────────────────────────────

function LiveFillerCounter({ count, lastFiller, flash }) {
  return (
    <div style={{
      position: 'absolute', bottom: 80, left: 20,
      background: count > 0 ? 'rgba(229,9,20,0.10)' : 'rgba(10,12,16,0.75)',
      border: `1px solid ${count > 0 ? 'rgba(229,9,20,0.5)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)', padding: '10px 16px',
      backdropFilter: 'blur(12px)', zIndex: 22,
      transition: 'all 0.4s ease',
      minWidth: 130,
    }}>
      <div style={{
        fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 2,
        color: count > 0 ? 'var(--cuban)' : 'var(--dim)', marginBottom: 6,
      }}>
        🚨 FILLER WORDS
      </div>
      <div style={{
        fontFamily: 'var(--f-display)',
        fontSize: 38,
        lineHeight: 1,
        color: count === 0 ? 'var(--sub)' : count < 5 ? 'var(--angel)' : 'var(--cuban)',
        animation: flash ? 'fillerPop 0.6s ease' : 'none',
        transition: 'color 0.3s',
      }}>
        {count}
      </div>
      {lastFiller ? (
        <div style={{
          fontFamily: 'var(--f-mono)', fontSize: 9,
          color: 'var(--cuban)', marginTop: 5,
          letterSpacing: 1,
        }}>
          caught: "{lastFiller}"
        </div>
      ) : (
        <div style={{
          fontFamily: 'var(--f-mono)', fontSize: 9,
          color: 'var(--dim)', marginTop: 5,
        }}>
          none yet
        </div>
      )}
    </div>
  )
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ recStr, isBoardroom, boardSharks, activeSharkIdx, activeShark, sharkColor, ml, config }) {
  return (
    <div style={{
      height: 44, borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', flexShrink: 0,
    }}>
      {/* Left: REC + mode badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="dot dot-red dot-pulse" />
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>REC {recStr}</span>
        {isBoardroom && (
          <span style={{
            fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 1.5,
            background: 'rgba(229,9,20,0.1)', border: '1px solid var(--cuban)',
            color: 'var(--cuban)', padding: '2px 8px', borderRadius: 20, marginLeft: 8,
          }}>⚡ BOARDROOM · {boardSharks.length} SHARKS</span>
        )}
      </div>

      {/* Center */}
      {isBoardroom ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: 1.5 }}>ACTIVE:</span>
          {boardSharks.map((s, i) => (
            <div key={s} style={{
              padding: '3px 10px', borderRadius: 20,
              background: i === activeSharkIdx ? SHARK_COL[s] + '20' : 'transparent',
              border: `1px solid ${i === activeSharkIdx ? SHARK_COL[s] : 'var(--border)'}`,
              fontFamily: 'var(--f-mono)', fontSize: 10,
              color: i === activeSharkIdx ? SHARK_COL[s] : 'var(--dim)',
              transition: 'all .3s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {i === activeSharkIdx && (
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: SHARK_COL[s], display: 'inline-block',
                  animation: 'pulse 1.5s infinite',
                }} />
              )}
              {SHARK_INI[s]}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>SHARK:</span>
          <span style={{ fontFamily: 'var(--f-display)', fontSize: 14, letterSpacing: .5, color: sharkColor }}>
            {SHARK_LABEL[activeShark]} · {SHARK_MODE[activeShark]}
          </span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', marginLeft: 8 }}>
            {config.difficulty?.toUpperCase()} · {(config.fundingRound || 'SEED').toUpperCase()}
          </span>
        </div>
      )}

      {/* Right: patience bar */}
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
  )
}

// ─── Solo Shark Layout ────────────────────────────────────────────────────────

function SoloSharkLayout({ iframeUrl, shark, sharkColor }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          allow="camera *; microphone *; autoplay *; display-capture *; fullscreen *"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="TruGen AI Agent"
        />
      ) : (
        <AgentPlaceholder shark={shark} sharkColor={sharkColor} />
      )}
    </div>
  )
}

// ─── Boardroom Layout ─────────────────────────────────────────────────────────

function BoardroomLayout({ boardSharks, activeSharkIdx, setActiveSharkIdx, user }) {
  const count = boardSharks.length
  const cols  = getGridColumns(count)

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'grid', gridTemplateColumns: cols, gridAutoRows: '1fr',
      gap: 3, background: '#020204', padding: 3, boxSizing: 'border-box',
    }}>
      {boardSharks.map((shark, idx) => {
        const isActive  = idx === activeSharkIdx
        const color     = SHARK_COL[shark]
        const iframeUrl = embedUrl(shark, {
          username: user?.name  || 'Founder',
          userId:   user?.email || 'sharklens-user',
        })
        return (
          <SharkPanel
            key={shark}
            shark={shark}
            sharkColor={color}
            iframeUrl={iframeUrl}
            isActive={isActive}
            onClick={() => setActiveSharkIdx(idx)}
            totalCount={count}
          />
        )
      })}
    </div>
  )
}

// ─── Shark Panel ──────────────────────────────────────────────────────────────

function SharkPanel({ shark, sharkColor, iframeUrl, isActive, onClick, totalCount }) {
  const [hovered, setHovered] = useState(false)

  const panelStyle = {
    position: 'relative', borderRadius: 6, overflow: 'hidden',
    cursor: isActive ? 'default' : 'pointer',
    transition: 'box-shadow .4s ease', background: '#0a0c10',
    '--panel-glow':      sharkColor,
    '--panel-glow-soft': `${sharkColor}44`,
    boxShadow: isActive
      ? undefined
      : hovered
        ? `0 0 0 1px ${sharkColor}60, 0 0 16px 2px ${sharkColor}22`
        : '0 0 0 1px rgba(255,255,255,0.06)',
    animation: isActive ? 'boardroomGlowPulse 2.6s ease-in-out infinite' : 'none',
  }

  return (
    <div
      style={panelStyle}
      onClick={isActive ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          allow="camera *; microphone *; autoplay *; display-capture *; fullscreen *"
          style={{
            width: '100%', height: '100%', border: 'none', display: 'block',
            filter: isActive ? 'none' : 'brightness(0.82) saturate(0.9)',
            transition: 'filter .4s ease',
          }}
          title={`TruGen AI Agent — ${SHARK_LABEL[shark]}`}
        />
      ) : (
        <AgentPlaceholder shark={shark} sharkColor={sharkColor} />
      )}

      {isActive && (
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(8,10,14,0.90)', border: `1px solid ${sharkColor}`,
          borderRadius: 20, padding: '5px 12px',
          fontFamily: 'var(--f-mono)', fontSize: 10, color: sharkColor,
          backdropFilter: 'blur(8px)', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 7, letterSpacing: 1.4,
          animation: 'badgeFade .35s ease', pointerEvents: 'none',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: sharkColor,
            display: 'inline-block', animation: 'activeDot 1.4s ease-in-out infinite',
          }} />
          ACTIVE · SPEAKING
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(4,5,8,0.92) 0%, transparent 100%)',
        padding: '18px 12px 10px', pointerEvents: 'none', zIndex: 9,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isActive && (
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14, flexShrink: 0 }}>
              {[0.4, 0.75, 1, 0.6, 0.35].map((h, i) => (
                <div key={i} style={{
                  width: 2.5, height: `${h * 100}%`, background: sharkColor,
                  borderRadius: 1, animation: `waveBar 1.4s ease ${i * 0.13}s infinite`,
                }} />
              ))}
            </div>
          )}
          <div>
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: totalCount > 4 ? 9 : 11,
              color: isActive ? sharkColor : 'var(--sub)', letterSpacing: 1.2, transition: 'color .3s',
            }}>{SHARK_LABEL[shark]}</div>
            <div style={{
              fontFamily: 'var(--f-mono)', fontSize: 9,
              color: isActive ? `${sharkColor}bb` : 'var(--dim)', letterSpacing: 1, marginTop: 1,
            }}>{SHARK_MODE[shark]} {isActive ? '· SPEAKING' : '· LISTENING'}</div>
          </div>
        </div>
      </div>

      {!isActive && hovered && (
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(8,10,14,0.88)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '4px 10px',
          fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: 1.2,
          backdropFilter: 'blur(6px)', zIndex: 10, pointerEvents: 'none',
          animation: 'badgeFade .2s ease',
        }}>CLICK TO FOCUS</div>
      )}
    </div>
  )
}

// ─── Agent Placeholder ────────────────────────────────────────────────────────

function AgentPlaceholder({ shark, sharkColor }) {
  const ini   = SHARK_INI[shark]
  const label = SHARK_LABEL[shark]
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
      background: `radial-gradient(ellipse 50% 50% at 50% 45%, ${sharkColor}08 0%, transparent 70%)`,
    }}>
      <div style={{
        width: 110, height: 110, borderRadius: '50%',
        border: `2px solid ${sharkColor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: -10, borderRadius: '50%',
          border: `1px solid ${sharkColor}20`, animation: 'pulse 2.5s infinite',
        }} />
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 36, color: sharkColor }}>{ini}</div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, letterSpacing: 1, textAlign: 'center', color: 'var(--text)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--vc)', textAlign: 'center', marginTop: 4, letterSpacing: 2 }}>LISTENING</div>
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24 }}>
        {[.3, .7, 1, .6, .4].map((h, i) => (
          <div key={i} style={{
            width: 3, height: `${h * 100}%`, background: sharkColor,
            borderRadius: 2, opacity: .7, animation: `waveBar 1.4s ease ${i * .12}s infinite`,
          }} />
        ))}
      </div>
      <div style={{
        fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)',
        border: '1px solid var(--border)', padding: '4px 12px', borderRadius: 20,
      }}>ADD AGENT IDs IN .env TO ACTIVATE TRUGEN</div>
    </div>
  )
}

// ─── Nonsense Panel ───────────────────────────────────────────────────────────

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
      <div style={{
        fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 2,
        color: ns.alert ? 'var(--cuban)' : 'var(--dim)', marginBottom: 5,
      }}>{ns.alert ? '⚠ NONSENSE DETECTOR' : 'PITCH MONITOR'}</div>
      <div style={{ fontSize: 12, color: ns.alert ? 'var(--text)' : 'var(--sub)', lineHeight: 1.5 }}>{ns.text}</div>
    </div>
  )
}