import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { sharkPrompt } from '../services/trugen'

const SHARKS = [
  {
    id: 'cuban', initials: 'MC', name: 'Mark Cuban',
    color: 'var(--cuban)', mute: 'var(--cuban-mute)', ring: 'var(--cuban-ring)',
    tags: ['BRUTAL', 'NUMBERS', 'MARGINS'],
    desc: 'Only cares about margins. Will destroy your TAM if it\'s not bulletproof. Interrupts every 30 seconds.',
    label: 'HARDEST',
  },
  {
    id: 'vc', initials: 'SV', name: 'Soft VC',
    color: 'var(--vc)', mute: 'var(--vc-mute)', ring: 'var(--vc-ring)',
    tags: ['POLITE', 'VISION', 'TEAM'],
    desc: 'Very polite — but every question is a trap. Asks about team culture and long-term vision.',
    label: 'SNEAKY',
  },
  {
    id: 'angel', initials: 'IA', name: 'Indian Angel',
    color: 'var(--angel)', mute: 'var(--angel-mute)', ring: 'var(--angel-ring)',
    tags: ['INDIA-SPECIFIC', 'PRACTICAL', 'TIER 2'],
    desc: 'Asks if your app works on 2G. Tier 2 scalability, unit economics, govt regulations.',
    label: 'LOCAL',
  },
  {
    id: 'nikhil', initials: 'NK', name: 'Nikhil Kamath',
    color: '#8B5CF6', mute: 'rgba(139,92,246,0.08)', ring: 'rgba(139,92,246,0.2)',
    tags: ['CONTRARIAN', 'CRYPTO', 'LONG-TERM'],
    desc: 'Questions conventional wisdom. Will ask about wealth creation moats, not just revenue. Built Zerodha.',
    label: 'PHILOSOPHER',
  },
  {
    id: 'anupam', initials: 'AM', name: 'Anupam Mittal',
    color: '#06B6D4', mute: 'rgba(6,182,212,0.08)', ring: 'rgba(6,182,212,0.2)',
    tags: ['CONSUMER', 'BRAND', 'PRODUCT'],
    desc: 'Obsessed with brand, consumer psychology, and retention. Built Shaadi.com. Will grill product decisions.',
    label: 'BRAND SHARK',
  },
  {
    id: 'aman', initials: 'AG', name: 'Aman Gupta',
    color: '#F97316', mute: 'rgba(249,115,22,0.08)', ring: 'rgba(249,115,22,0.2)',
    tags: ['D2C', 'MARKETING', 'BOAT'],
    desc: 'Challenges your GTM strategy, marketing spend, distribution. Built boAt to ₹3,000Cr. Will compare everything to it.',
    label: 'D2C SHARK',
  },
]

const FUNDING_ROUNDS = [
  {
    id: 'idea', label: 'IDEA STAGE', amount: '₹10L–₹50L',
    desc: 'Pre-MVP. Shark evaluates founder, vision, problem clarity.',
    focus: ['Team credibility', 'Problem validation', 'Market intuition'],
  },
  {
    id: 'preseed', label: 'PRE-SEED', amount: '₹50L–₹2Cr',
    desc: 'Early product, some users. Shark probes traction signals.',
    focus: ['Early traction', 'Unit economics hypothesis', 'Competitive moat'],
  },
  {
    id: 'seed', label: 'SEED', amount: '₹2Cr–₹15Cr',
    desc: 'Product-market fit signals. Shark goes deep on metrics.',
    focus: ['CAC/LTV ratio', 'Retention cohorts', 'Revenue trajectory'],
  },
  {
    id: 'seriesA', label: 'SERIES A', amount: '₹15Cr–₹100Cr',
    desc: 'Scaling. Shark demands repeatable growth engine.',
    focus: ['Scalability proof', 'Unit economics at scale', 'Market expansion plan'],
  },
]

export default function CommandCenter() {
  const { config, updateConfig } = useApp()
  const nav = useNavigate()
  const [showPrompt, setShowPrompt] = useState(false)
  const [mode, setMode] = useState('solo') // solo | boardroom

  const selected = SHARKS.find(s => s.id === config.shark) || SHARKS[0]
  const selectedRound = FUNDING_ROUNDS.find(r => r.id === (config.fundingRound || 'seed')) || FUNDING_ROUNDS[2]

  // Boardroom: selected sharks (multi-select)
  const boardroomSharks = config.boardroomSharks || ['cuban', 'angel']
  const toggleBoardroomShark = (id) => {
    if (boardroomSharks.includes(id)) {
      if (boardroomSharks.length <= 2) return // min 2
      updateConfig({ boardroomSharks: boardroomSharks.filter(s => s !== id) })
    } else {
      if (boardroomSharks.length >= 3) return // max 3
      updateConfig({ boardroomSharks: [...boardroomSharks, id] })
    }
  }

  function proceed() { nav('/deck') }

  return (
    <div className="pt-nav" style={{ minHeight: '100vh' }}>
      <div className="wrap" style={{ paddingTop: 52, paddingBottom: 40 }}>
        <div className="eyebrow fu" style={{ marginBottom: 14 }}>Step 01 · Command Center</div>
        <h1 className="fu1" style={{
          fontFamily: 'var(--f-display)', fontSize: 'clamp(40px,4.5vw,64px)',
          letterSpacing: 1.5, lineHeight: .95, marginBottom: 14,
        }}>
          CONFIGURE YOUR<br /><span style={{ color: 'var(--cuban)' }}>SESSION.</span>
        </h1>
        <p className="fu2" style={{ color: 'var(--sub)', fontSize: 15, maxWidth: 420, marginBottom: 32 }}>
          Choose your investor, funding stage, and how much pain you want.
        </p>
      </div>

      <div className="wrap fu3" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, paddingBottom: 80 }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Mode Toggle: Solo vs Boardroom */}
          <div className="card">
            <div className="card-lbl">Session Mode</div>
            <div className="seg">
              {[['solo', '🦈 SOLO SHARK'], ['boardroom', '⚡ BOARDROOM PANEL']].map(([id, label]) => (
                <button key={id} className={`seg-opt${mode === id ? ' on' : ''}`}
                  onClick={() => { setMode(id); updateConfig({ sessionMode: id }) }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)' }}>
              {mode === 'solo' && '💡 Practice against one investor persona with full ML telemetry.'}
              {mode === 'boardroom' && '⚡ Face 2-3 sharks simultaneously. They interrupt each other. Pure chaos — exactly like real panels.'}
            </div>
          </div>

          {/* Solo: Shark Selector */}
          {mode === 'solo' && (
            <div className="card">
              <div className="card-lbl">Investor Persona</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SHARKS.map(s => {
                  const active = config.shark === s.id
                  return (
                    <button key={s.id} onClick={() => updateConfig({ shark: s.id })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        background: active ? s.mute : 'var(--surface2)',
                        border: `1.5px solid ${active ? s.color : 'var(--border)'}`,
                        borderRadius: 'var(--r-lg)', padding: '14px 18px',
                        cursor: 'pointer', transition: 'all .2s', textAlign: 'left',
                      }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: active ? 'rgba(0,0,0,0.25)' : 'var(--surface3)',
                        border: `1px solid ${active ? s.color : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--f-display)', fontSize: 14,
                        color: active ? s.color : 'var(--dim)',
                      }}>{s.initials}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontFamily: 'var(--f-display)', fontSize: 16, letterSpacing: .5, color: active ? s.color : 'var(--text)' }}>{s.name}</span>
                          <span style={{
                            fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: 1.5,
                            background: active ? s.mute : 'var(--surface3)',
                            border: `1px solid ${active ? s.color : 'var(--border)'}`,
                            color: active ? s.color : 'var(--dim)',
                            padding: '2px 7px', borderRadius: 20,
                          }}>{s.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                          {s.tags.map(t => (
                            <span key={t} style={{ fontFamily: 'var(--f-mono)', fontSize: 9, background: 'var(--surface3)', color: 'var(--dim)', padding: '2px 7px', borderRadius: 20 }}>{t}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.4 }}>{s.desc}</div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        border: `1.5px solid ${active ? s.color : 'var(--border2)'}`,
                        background: active ? s.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 10, transition: 'all .2s',
                      }}>{active ? '✓' : ''}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Boardroom: Multi-shark */}
          {mode === 'boardroom' && (
            <div className="card">
              <div className="card-lbl">Select Boardroom Panel (2-3 Sharks)</div>
              <div style={{ marginBottom: 12, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>
                {boardroomSharks.length}/3 selected — they will interrupt each other and disagree
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {SHARKS.map(s => {
                  const active = boardroomSharks.includes(s.id)
                  return (
                    <button key={s.id} onClick={() => toggleBoardroomShark(s.id)}
                      className="boardroom-panel"
                      style={{
                        cursor: 'pointer', textAlign: 'left',
                        borderColor: active ? s.color : undefined,
                        background: active ? s.mute : undefined,
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: active ? 'rgba(0,0,0,0.2)' : 'var(--surface2)',
                          border: `1px solid ${active ? s.color : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--f-display)', fontSize: 11, color: active ? s.color : 'var(--dim)',
                        }}>{s.initials}</div>
                        <span style={{ fontFamily: 'var(--f-display)', fontSize: 14, color: active ? s.color : 'var(--sub)' }}>{s.name}</span>
                        {active && <span style={{ marginLeft: 'auto', color: s.color, fontSize: 12 }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.4 }}>{s.desc.slice(0, 60)}...</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Funding Round Mode ── */}
          <div className="card">
            <div className="card-lbl">Funding Round Mode</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FUNDING_ROUNDS.map(r => {
                const active = (config.fundingRound || 'seed') === r.id
                return (
                  <button key={r.id} onClick={() => updateConfig({ fundingRound: r.id })}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      background: active ? 'rgba(229,9,20,0.05)' : 'var(--surface2)',
                      border: `1px solid ${active ? 'var(--cuban)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-lg)', padding: '12px 16px',
                      cursor: 'pointer', textAlign: 'left', transition: 'all .2s',
                    }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--f-display)', fontSize: 15, letterSpacing: .5, color: active ? 'var(--cuban)' : 'var(--text)' }}>{r.label}</span>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: active ? 'var(--cuban)' : 'var(--dim)', background: 'var(--surface3)', padding: '2px 8px', borderRadius: 20 }}>{r.amount}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 6 }}>{r.desc}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.focus.map(f => (
                          <span key={f} style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', background: 'var(--surface3)', padding: '2px 8px', borderRadius: 20 }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      border: `1.5px solid ${active ? 'var(--cuban)' : 'var(--border2)'}`,
                      background: active ? 'var(--cuban)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 9,
                    }}>{active ? '✓' : ''}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div className="card">
            <div className="card-lbl">Difficulty Mode</div>
            <div className="seg">
              {['Easy', 'Realistic', 'Hardcore'].map(d => (
                <button key={d} className={`seg-opt${config.difficulty === d ? ' on' : ''}`}
                  onClick={() => updateConfig({ difficulty: d })}>
                  {d}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)' }}>
              {config.difficulty === 'Easy' && '💚 Helpful questions. Great for first practice.'}
              {config.difficulty === 'Realistic' && '🟡 Real investor pressure. Standard pitch setting.'}
              {config.difficulty === 'Hardcore' && '🔴 Maximum aggression. Constant interruptions. No mercy.'}
            </div>
          </div>

          {/* Session Settings */}
          <div className="card">
            <div className="card-lbl">Session Settings</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Bilingual Pitching</div>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>Pitch in Hindi or English — AI responds in kind</div>
              </div>
              <div className={`tog${config.bilingual ? ' on' : ''}`} onClick={() => updateConfig({ bilingual: !config.bilingual })} />
            </div>
            <div style={{ paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Session Duration</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, color: 'var(--cuban)' }}>{config.duration} min</div>
              </div>
              <input type="range" className="sl" style={{ width: '100%' }}
                min={3} max={20} step={1} value={config.duration}
                onChange={e => updateConfig({ duration: parseInt(e.target.value) })} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', marginTop: 5 }}>
                <span>3 MIN</span><span>20 MIN</span>
              </div>
            </div>
          </div>

          {/* System Prompt Preview */}
          <div className="card">
            <button onClick={() => setShowPrompt(p => !p)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', padding: 0, letterSpacing: 1,
            }}>
              {showPrompt ? '▲ HIDE' : '▼ PREVIEW'} SHARK SYSTEM PROMPT
            </button>
            {showPrompt && (
              <div style={{
                marginTop: 10, background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 'var(--r)', padding: '12px 14px',
                fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--sub)',
                lineHeight: 1.6, maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap',
              }}>
                {sharkPrompt(config.shark, config.difficulty, config.bilingual, config.fundingRound)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — sticky preview */}
        <div style={{ position: 'sticky', top: 76, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-lbl">Session Preview</div>

            {mode === 'solo' ? (
              <div style={{
                background: selected.mute, border: `1px solid ${selected.color}`,
                borderRadius: 'var(--r-lg)', padding: '18px', marginBottom: 16, textAlign: 'center',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12, margin: '0 auto 10px',
                  background: 'rgba(0,0,0,0.3)', border: `1.5px solid ${selected.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--f-display)', fontSize: 20, color: selected.color,
                }}>{selected.initials}</div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, color: selected.color, letterSpacing: 1 }}>{selected.name}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', marginTop: 3 }}>{selected.label} MODE</div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
                {boardroomSharks.map(id => {
                  const s = SHARKS.find(x => x.id === id)
                  return s ? (
                    <div key={id} style={{
                      width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                      background: s.mute, border: `1.5px solid ${s.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--f-display)', fontSize: 16, color: s.color,
                    }}>{s.initials}</div>
                  ) : null
                })}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, paddingLeft: 8 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, letterSpacing: .5 }}>BOARDROOM</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)' }}>{boardroomSharks.length} SHARKS · PANEL MODE</div>
                </div>
              </div>
            )}

            {[
              ['DIFFICULTY', config.difficulty, config.difficulty === 'Hardcore' ? 'var(--cuban)' : config.difficulty === 'Easy' ? 'var(--vc)' : 'var(--angel)'],
              ['FUNDING ROUND', selectedRound.label, 'var(--cuban)'],
              ['DURATION', `${config.duration} min`, 'var(--sub)'],
              ['LANGUAGE', config.bilingual ? 'EN + HI' : 'English', 'var(--sub)'],
              ['ML PIPELINE', '4 Models Active', 'var(--vc)'],
              ['MCP TOOLS', '4 Connected', 'var(--vc)'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: c, fontWeight: 500 }}>{v}</span>
              </div>
            ))}

            {/* Funding Round Focus */}
            <div style={{ marginTop: 14, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '12px' }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--cuban)', letterSpacing: 1.5, marginBottom: 8 }}>SHARK FOCUS AREAS</div>
              {selectedRound.focus.map((f, i) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <div style={{ width: 5, height: 5, borderRadius: 1, background: 'var(--cuban)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>{f}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-red btn-lg" style={{ marginTop: 20, width: '100%' }} onClick={proceed}>
              UPLOAD DECK →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}