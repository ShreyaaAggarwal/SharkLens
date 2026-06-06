import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function DeckPortal() {
  const { setDeckFile, setDeckText, config } = useApp()
  const nav = useNavigate()
  const inputRef  = useRef()

  const [file, setFile]         = useState(null)
  const [status, setStatus]     = useState('idle')   // idle | indexing | done
  const [driveStatus, setDrive] = useState('idle')   // idle | connecting | connected
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)

  function handleFile(f) {
    if (!f) return
    setFile(f)
    setDeckFile(f)
    setStatus('indexing')
    setProgress(0)

    // Simulate indexing animation
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setStatus('done'); return 100 }
        return p + Math.random()*15
      })
    }, 150)

    // Read text if plain file
    const reader = new FileReader()
    reader.onload = e => setDeckText(e.target.result || '')
    reader.readAsText(f)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  function connectDrive() {
    setDrive('connecting')
    setTimeout(() => setDrive('connected'), 1800)
  }

  const shark = { cuban:'var(--cuban)', vc:'var(--vc)', angel:'var(--angel)' }[config.shark]

  return (
    <div className="pt-nav" style={{ minHeight:'100vh' }}>
      <div className="wrap" style={{ paddingTop:52, maxWidth:780 }}>

        <div className="eyebrow fu" style={{ marginBottom:14 }}>Step 02 · Pitch Deck Portal</div>
        <h1 className="fu1" style={{
          fontFamily:'var(--f-display)', fontSize:'clamp(36px,4vw,56px)',
          letterSpacing:1.5, lineHeight:.95, marginBottom:14,
        }}>
          ARM THE<br/><span style={{ color:shark }}>AI SHARK.</span>
        </h1>
        <p className="fu2" style={{
          color:'var(--sub)', fontSize:16, fontWeight:300, maxWidth:480, marginBottom:40,
        }}>
          Upload your deck. The AI parses every slide and primes the Shark with
          context-specific counter-questions before you even say hello.
        </p>

        {/* Dropzone */}
        <div className="fu3"
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={handleDrop}
          onClick={()=>!file&&inputRef.current.click()}
          style={{
            border:`1.5px dashed ${dragging?shark:'var(--border2)'}`,
            borderRadius:'var(--r-xl)', padding:'56px 40px',
            textAlign:'center', cursor: file?'default':'pointer',
            background: dragging?`rgba(224,82,82,0.04)`:'var(--surface)',
            transition:'all .2s', marginBottom:20,
            position:'relative', overflow:'hidden',
          }}
        >
          <input ref={inputRef} type="file"
            accept=".pdf,.pptx,.ppt,.txt"
            style={{ display:'none' }}
            onChange={e=>handleFile(e.target.files?.[0])}/>

          {!file ? (
            <>
              <div style={{
                width:56, height:56, margin:'0 auto 18px',
                background:'var(--surface2)', borderRadius:14,
                border:'1px solid var(--border)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:22,
              }}>📊</div>
              <h3 style={{
                fontFamily:'var(--f-cond)', fontSize:20, fontWeight:700, marginBottom:8,
              }}>Drop your pitch deck here</h3>
              <p style={{ color:'var(--dim)', fontSize:14 }}>
                or click to browse · PDF, PPTX, TXT supported
              </p>
              <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:16 }}>
                {['.PDF','.PPTX','.PPT','.TXT'].map(f => (
                  <span key={f} style={{
                    fontFamily:'var(--f-mono)', fontSize:10,
                    background:'var(--surface2)', border:'1px solid var(--border)',
                    color:'var(--dim)', padding:'3px 9px', borderRadius:20,
                  }}>{f}</span>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'center' }}>
              <div style={{ fontSize:28 }}>📊</div>
              <div style={{ fontFamily:'var(--f-cond)', fontSize:18, fontWeight:700 }}>{file.name}</div>
              <div style={{ fontFamily:'var(--f-mono)', fontSize:11, color:'var(--dim)' }}>
                {(file.size/1024).toFixed(0)} KB
              </div>

              {/* Progress bar */}
              <div style={{ width:'100%', maxWidth:340 }}>
                <div style={{
                  height:4, background:'var(--surface3)', borderRadius:2, overflow:'hidden',
                  marginBottom:8,
                }}>
                  <div style={{
                    height:'100%', width:`${Math.min(progress,100)}%`,
                    background:`linear-gradient(90deg, ${shark}, var(--vc))`,
                    borderRadius:2, transition:'width .2s',
                  }}/>
                </div>
                <div style={{
                  fontFamily:'var(--f-mono)', fontSize:11,
                  color: status==='done'?'var(--vc)':'var(--dim)',
                  display:'flex', alignItems:'center', gap:8, justifyContent:'center',
                }}>
                  {status === 'indexing' && <><span className="spin-ring"/>INDEXING SLIDES INTO TRUGEN KB...</>}
                  {status === 'done' && <>✓ KNOWLEDGE BASE READY · SHARK ARMED</>}
                </div>
              </div>

              {status === 'done' && (
                <button
                  onClick={e=>{e.stopPropagation();setFile(null);setStatus('idle');setProgress(0)}}
                  style={{
                    background:'none', border:'none', cursor:'pointer',
                    fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)',
                  }}>
                  ✕ REMOVE
                </button>
              )}
            </div>
          )}
        </div>

        {/* What the AI extracts */}
        {status === 'done' && (
          <div className="card fu" style={{ marginBottom:20 }}>
            <div className="card-lbl">Extracted Intelligence</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                ['Problem Statement', 'Parsed from slide 2'],
                ['Market Size', 'TAM/SAM/SOM extracted'],
                ['Business Model', 'Revenue logic mapped'],
                ['Team Slide', 'Founder profiles indexed'],
                ['Financials', 'Projections flagged for Q&A'],
                ['Competition', '3 competitors identified'],
              ].map(([k,v]) => (
                <div key={k} style={{
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:'var(--r)', padding:'10px 14px',
                }}>
                  <div style={{ fontFamily:'var(--f-cond)', fontSize:13, fontWeight:600, color:'var(--vc)', marginBottom:2 }}>✓ {k}</div>
                  <div style={{ fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drive MCP */}
        <div className="fu4" style={{ marginBottom:16 }}>
          <div style={{
            fontFamily:'var(--f-mono)', fontSize:10, color:'var(--dim)',
            letterSpacing:2, textTransform:'uppercase', marginBottom:12,
          }}>
            Or connect via Google Drive
          </div>
          <div
            onClick={driveStatus==='idle'?connectDrive:undefined}
            style={{
              display:'flex', alignItems:'center', gap:16,
              background:'var(--surface)', border:`1px solid ${driveStatus==='connected'?'var(--vc)':'var(--border)'}`,
              borderRadius:'var(--r-xl)', padding:'18px 22px',
              cursor: driveStatus==='idle'?'pointer':'default',
              transition:'all .3s',
            }}
          >
            <div style={{
              width:44, height:44, borderRadius:10, flexShrink:0,
              background:'linear-gradient(135deg, #4285F4, #34A853)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20,
            }}>📁</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--f-cond)', fontSize:16, fontWeight:700, marginBottom:3 }}>
                Google Drive MCP
              </div>
              <div style={{
                fontFamily:'var(--f-mono)', fontSize:11,
                color: driveStatus==='connected'?'var(--vc)':driveStatus==='connecting'?'var(--angel)':'var(--dim)',
                display:'flex', alignItems:'center', gap:7,
              }}>
                {driveStatus==='idle'      && '→ Click to connect and sync your deck'}
                {driveStatus==='connecting'&& <><span className="spin-ring"/>CONNECTING...</>}
                {driveStatus==='connected' && <>✓ DRIVE MCP CONNECTED · INDEXING COMPLETE</>}
              </div>
            </div>
            {driveStatus === 'connected' && (
              <div className="dot dot-green"/>
            )}
          </div>
        </div>

        {/* Nav buttons */}
        <div className="fu5" style={{ display:'flex', gap:12, paddingBottom:80 }}>
          <button className="btn btn-outline" onClick={()=>nav('/setup')} style={{ flex:1 }}>
            ← BACK
          </button>
          <button
            className="btn btn-red"
            onClick={()=>nav('/arena')}
            style={{ flex:2, padding:'13px 28px', fontSize:15, fontFamily:'var(--f-display)', letterSpacing:1 }}
          >
            ENTER THE ARENA →
          </button>
        </div>

      </div>
    </div>
  )
}
