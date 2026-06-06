import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { sharkPrompt } from '../services/trugen'

const SHARKS = [
  {
    id:'cuban', initials:'MC', name:'Mark Cuban',
    color:'var(--cuban)', mute:'var(--cuban-mute)', ring:'var(--cuban-ring)',
    tags:['BRUTAL','NUMBERS','MARGINS'],
    desc:'Only cares about margins. Will destroy your TAM if it\'s not bulletproof. Interrupts every 30 seconds.',
    label:'HARDEST',
  },
  {
    id:'vc', initials:'SV', name:'Soft VC',
    color:'var(--vc)', mute:'var(--vc-mute)', ring:'var(--vc-ring)',
    tags:['POLITE','VISION','TEAM'],
    desc:'Very polite — but every question is a trap. Asks about team culture and long-term vision.',
    label:'SNEAKY',
  },
  {
    id:'angel', initials:'IA', name:'Indian Angel',
    color:'var(--angel)', mute:'var(--angel-mute)', ring:'var(--angel-ring)',
    tags:['INDIA-SPECIFIC','PRACTICAL','TIER 2'],
    desc:'Asks if your app works on 2G. Tier 2 scalability, unit economics, govt regulations.',
    label:'LOCAL',
  },
]

export default function CommandCenter() {
  const { config, updateConfig } = useApp()
  const nav = useNavigate()
  const [showPrompt, setShowPrompt] = useState(false)
  const selected = SHARKS.find(s => s.id === config.shark) || SHARKS[0]

  function proceed() {
    nav('/deck')
  }

  return (
    <div className="pt-nav" style={{ minHeight:'100vh' }}>

      {/* Header */}
      <div className="wrap" style={{ paddingTop:52, paddingBottom:40 }}>
        <div className="eyebrow fu" style={{ marginBottom:14 }}>Step 01 · Command Center</div>
        <h1 className="fu1" style={{
          fontFamily:'var(--f-display)', fontSize:'clamp(40px,4.5vw,64px)',
          letterSpacing:1.5, lineHeight:.95, marginBottom:14,
        }}>
          CONFIGURE YOUR<br/>
          <span style={{ color:'var(--cuban)' }}>SESSION.</span>
        </h1>
        <p className="fu2" style={{ color:'var(--sub)', fontSize:16, fontWeight:300, maxWidth:420 }}>
          Pick your investor, set the difficulty, and choose how long you want to suffer.
        </p>
      </div>

      {/* 2-col grid */}
      <div className="wrap fu3" style={{
        display:'grid', gridTemplateColumns:'1fr 400px', gap:24, paddingBottom:80,
      }}>

        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

          {/* Shark Selector */}
          <div className="card">
            <div className="card-lbl">Investor Persona</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {SHARKS.map(s => {
                const active = config.shark === s.id
                return (
                  <button key={s.id}
                    onClick={() => updateConfig({ shark:s.id })}
                    style={{
                      display:'flex', alignItems:'center', gap:16,
                      background: active ? s.mute : 'var(--surface2)',
                      border:`1.5px solid ${active ? s.color : 'var(--border)'}`,
                      borderRadius:'var(--r-lg)', padding:'16px 18px',
                      cursor:'pointer', transition:'all .2s', textAlign:'left',
                    }}
                  >
                    <div style={{
                      width:48, height:48, borderRadius:10, flexShrink:0,
                      background: active ? 'rgba(0,0,0,0.25)' : 'var(--surface3)',
                      border:`1px solid ${active ? s.color : 'var(--border)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:'var(--f-display)', fontSize:16,
                      color: active ? s.color : 'var(--dim)',
                    }}>
                      {s.initials}
                    </div>

                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                        <span style={{
                          fontFamily:'var(--f-cond)', fontSize:16, fontWeight:700,
                          color: active ? s.color : 'var(--text)',
                        }}>{s.name}</span>
                        <span style={{
                          fontFamily:'var(--f-mono)', fontSize:9, letterSpacing:1.5,
                          background: active ? s.mute : 'var(--surface3)',
                          border:`1px solid ${active ? s.color : 'var(--border)'}`,
                          color: active ? s.color : 'var(--dim)',
                          padding:'2px 7px', borderRadius:20,
                        }}>{s.label}</span>
                      </div>
                      <div style={{ display:'flex', gap:5, marginBottom:6 }}>
                        {s.tags.map(t => (
                          <span key={t} style={{
                            fontFamily:'var(--f-mono)', fontSize:9, letterSpacing:1,
                            background:'var(--surface3)', color:'var(--dim)',
                            padding:'2px 7px', borderRadius:20,
                          }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ fontSize:12, color:'var(--dim)', lineHeight:1.4 }}>{s.desc}</div>
                    </div>

                    <div style={{
                      width:22, height:22, borderRadius:'50%', flexShrink:0,
                      border:`1.5px solid ${active ? s.color : 'var(--border2)'}`,
                      background: active ? s.color : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontSize:11, transition:'all .2s',
                    }}>
                      {active ? '✓' : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div className="card">
            <div className="card-lbl">Difficulty Mode</div>
            <div className="seg">
              {['Easy','Realistic','Hardcore'].map(d => (
                <button key={d} className={`seg-opt${config.difficulty===d?' on':''}`}
                  onClick={() => updateConfig({ difficulty:d })}>
                  {d}
                </button>
              ))}
            </div>
            <div style={{ marginTop:12, fontFamily:'var(--f-mono)', fontSize:11, color:'var(--dim)' }}>
              {config.difficulty === 'Easy'      && '💚 Encouraging questions. Helpful follow-ups. Great for first practice.'}
              {config.difficulty === 'Realistic' && '🟡 Real investor pressure. Limited patience. Standard pitch setting.'}
              {config.difficulty === 'Hardcore'  && '🔴 Maximum aggression. Constant interruptions. No mercy mode.'}
            </div>
          </div>

          {/* Session Settings */}
          <div className="card">
            <div className="card-lbl">Session Settings</div>
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 0', borderBottom:'1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500 }}>Bilingual Pitching</div>
                <div style={{ fontSize:12, color:'var(--dim)', marginTop:2 }}>
                  Pitch in Hindi or English — AI responds in kind (EN/HI)
                </div>
              </div>
              <div className={`tog${config.bilingual?' on':''}`}
                onClick={() => updateConfig({ bilingual:!config.bilingual })}/>
            </div>
            <div style={{ paddingTop:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>Session Duration</div>
                <div style={{ fontFamily:'var(--f-mono)', fontSize:13, color:'var(--cuban)' }}>
                  {config.duration} min
                </div>
              </div>
              <input type="range" className="sl" style={{ width:'100%' }}
                min={3} max={20} step={1} value={config.duration}
                onChange={e => updateConfig({ duration:parseInt(e.target.value) })}/>
              <div style={{
                display:'flex', justifyContent:'space-between',
                fontFamily:'var(--f-mono)', fontSize:9, color:'var(--dim)', marginTop:5,
              }}>
                <span>3 MIN</span><span>20 MIN</span>
              </div>
            </div>
          </div>

          {/* System Prompt Preview */}
          <div className="card">
            <button onClick={() => setShowPrompt(p=>!p)} style={{
              background:'none', border:'none', cursor:'pointer',
              fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)',
              padding:0, letterSpacing:1,
            }}>
              {showPrompt ? '▲ HIDE' : '▼ PREVIEW'} SHARK SYSTEM PROMPT
            </button>
            {showPrompt && (
              <div style={{
                marginTop:10, background:'var(--surface2)',
                border:'1px solid var(--border)', borderRadius:'var(--r)',
                padding:'12px 14px',
                fontFamily:'var(--f-mono)', fontSize:11, color:'var(--sub)',
                lineHeight:1.6, maxHeight:160, overflowY:'auto',
                whiteSpace:'pre-wrap',
              }}>
                {sharkPrompt(config.shark, config.difficulty, config.bilingual)}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT — sticky preview */}
        <div style={{ position:'sticky', top:76, alignSelf:'start', display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-lbl">Session Preview</div>

            <div style={{
              background: selected.mute,
              border:`1px solid ${selected.color}`,
              borderRadius:'var(--r-lg)', padding:'20px',
              marginBottom:16, textAlign:'center',
            }}>
              <div style={{
                width:64, height:64, borderRadius:14, margin:'0 auto 12px',
                background:'rgba(0,0,0,0.3)',
                border:`1.5px solid ${selected.color}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--f-display)', fontSize:22, color:selected.color,
              }}>{selected.initials}</div>
              <div style={{ fontFamily:'var(--f-display)', fontSize:22, color:selected.color }}>
                {selected.name}
              </div>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)', marginTop:4 }}>
                {selected.label} MODE
              </div>
            </div>

            {[
              ['DIFFICULTY', config.difficulty, config.difficulty==='Hardcore'?'var(--cuban)':config.difficulty==='Easy'?'var(--vc)':'var(--angel)'],
              ['DURATION',   `${config.duration} min`, 'var(--sub)'],
              ['LANGUAGE',   config.bilingual ? 'EN + HI' : 'English', 'var(--sub)'],
              ['ML PIPELINE','4 Models Active', 'var(--vc)'],
              ['MCP TOOLS',  '4 Connected', 'var(--vc)'],
            ].map(([k,v,c]) => (
              <div key={k} style={{
                display:'flex', justifyContent:'space-between',
                padding:'8px 0', borderBottom:'1px solid var(--border)',
              }}>
                <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)' }}>{k}</span>
                <span style={{ fontFamily:'var(--f-mono)', fontSize:11, color:c, fontWeight:500 }}>{v}</span>
              </div>
            ))}

            <div style={{
              marginTop:14, background:'var(--surface2)',
              border:'1px solid var(--border)', borderRadius:'var(--r)',
              padding:'12px', display:'flex', flexDirection:'column', gap:6,
            }}>
              {[
                ['TruGen Huma-1','Avatar · Real-time Video','var(--cuban)'],
                ['Wav2Vec2','Filler Word Detection','var(--vc)'],
                ['MediaPipe Iris','Gaze Estimation','var(--angel)'],
                ['MobileViT','Emotion Classification','var(--sub)'],
                ['Fusion Net','Confidence Score','var(--cuban)'],
              ].map(([name,role,col]) => (
                <div key={name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:col, flexShrink:0 }}/>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)', flex:1 }}>{name}</span>
                  <span style={{ fontFamily:'var(--f-mono)', fontSize:9, color:'var(--border2)' }}>{role}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-red btn-lg" style={{ marginTop:20 }} onClick={proceed}>
              UPLOAD DECK →
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}