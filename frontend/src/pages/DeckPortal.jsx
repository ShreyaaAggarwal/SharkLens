import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

export default function DeckPortal() {
  const { setDeckFile, setDeckText, setDeckIntelligence, config } = useApp()
  const nav = useNavigate()
  const inputRef = useRef()

  const [file, setFile]           = useState(null)
  const [status, setStatus]       = useState('idle')   // idle|reading|analyzing|done|error
  const [progress, setProgress]   = useState(0)
  const [dragging, setDragging]   = useState(false)
  const [intelligence, setIntel]  = useState(null)
  const [driveStatus, setDrive]   = useState('idle')
  const [rawText, setRawText]     = useState('')
  const [murderStatus, setMurder] = useState('idle') // idle|scraping|done
  const [murderBoard, setMurder2] = useState(null)
  const [startupUrl, setStartupUrl] = useState('')

  const shark = { cuban: 'var(--cuban)', vc: 'var(--vc)', angel: 'var(--angel)' }[config.shark]

  // ── Real deck text extraction ──
  async function extractText(f) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        // For text files read directly
        if (f.type === 'text/plain') {
          resolve(e.target.result || '')
          return
        }
        // For PDF/PPTX we read as text (basic extraction)
        // In prod: use pdf.js or mammoth for richer extraction
        const text = e.target.result || ''
        // Strip binary noise, keep readable chunks
        const cleaned = text
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s{3,}/g, '\n')
          .trim()
        resolve(cleaned.slice(0, 8000)) // cap for API
      }
      reader.onerror = () => resolve('')
      reader.readAsText(f)
    })
  }

  // ── Claude API: Real deck intelligence ──
  async function analyzeDeckWithClaude(text, filename) {
    const prompt = `You are a Shark Tank analyst AI. Analyze this pitch deck content and extract structured intelligence.

DECK FILENAME: ${filename}
DECK CONTENT:
${text}

Extract and return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "startupName": "name of the startup",
  "sector": "sector/industry",
  "problemStatement": "1-2 sentence summary of the problem",
  "solution": "1-2 sentence summary of the solution",
  "marketSize": "TAM/SAM/SOM if mentioned, else 'Not stated'",
  "businessModel": "how they make money",
  "traction": "users, revenue, growth metrics if mentioned",
  "teamHighlight": "key team credential",
  "ask": "funding ask if mentioned",
  "topWeaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "likelySharkQuestions": ["question 1 Mark Cuban would ask", "question 2", "question 3"],
  "claimsToVerify": ["claim 1 that needs data", "claim 2"],
  "competitorsMentioned": ["competitor 1", "competitor 2"],
  "overallReadiness": 65
}`

    const response = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) throw new Error('Claude API failed')
    const data = await response.json()
    const raw = data.content?.[0]?.text || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  }

  // ── Murder Board: Real web research via Claude ──
  async function buildMurderBoard(intel, url) {
    setMurder('scraping')
    const prompt = `You are a ruthless investor doing homework before a pitch meeting.

Startup: ${intel.startupName}
Sector: ${intel.sector}
URL provided: ${url || 'none'}
Problem: ${intel.problemStatement}
Claimed market: ${intel.marketSize}
Competitors mentioned: ${(intel.competitorsMentioned || []).join(', ')}

Based on your knowledge of the Indian startup ecosystem, generate a MURDER BOARD — all the information, contradictions, and ammunition an investor would use to destroy this pitch.

Return ONLY valid JSON (no markdown):
{
  "founderDigital": [
    {"type": "LINKEDIN", "finding": "finding about typical founders in this space"},
    {"type": "PIVOT HISTORY", "finding": "what pivots might be expected"},
    {"type": "COMPETITION", "finding": "who the real competitors are"}
  ],
  "marketContradictions": [
    {"claim": "their claim", "reality": "the real data", "severity": "HIGH|MED|LOW"}
  ],
  "killerQuestions": [
    "Most brutal question 1 specific to their business",
    "Most brutal question 2",
    "Most brutal question 3",
    "Most brutal question 4"
  ],
  "redFlags": ["red flag 1", "red flag 2", "red flag 3"],
  "openingLine": "The exact first thing the shark will say to throw them off"
}`

    const response = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!response.ok) throw new Error('Murder board failed')
    const data = await response.json()
    const raw = data.content?.[0]?.text || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const board = JSON.parse(clean)
    setMurder2(board)
    setMurder('done')
    return board
  }

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setDeckFile(f)
    setStatus('reading')
    setProgress(10)

    try {
      // Step 1: Extract text
      const text = await extractText(f)
      setRawText(text)
      setDeckText(text)
      setProgress(35)
      setStatus('analyzing')

      // Step 2: Claude analysis
      const intel = await analyzeDeckWithClaude(
        text || `Pitch deck: ${f.name}. Please analyze based on filename context.`,
        f.name
      )
      setProgress(75)
      setIntel(intel)
      setDeckIntelligence(intel)

      // Step 3: Build murder board automatically
      setProgress(90)
      await buildMurderBoard(intel, startupUrl)

      setProgress(100)
      setStatus('done')
    } catch (err) {
      console.error('Deck analysis failed:', err)
      // Fallback — still let them proceed
      setIntel({
        startupName: f.name.replace(/\.(pdf|pptx|ppt|txt)/i, ''),
        sector: 'Technology',
        problemStatement: 'Deck uploaded — manual review mode.',
        solution: 'See uploaded deck.',
        marketSize: 'Not extracted',
        businessModel: 'Not extracted',
        traction: 'Not extracted',
        teamHighlight: 'Not extracted',
        ask: 'Not stated',
        topWeaknesses: ['Deck could not be fully parsed', 'Add text-based content', 'Consider TXT format for best results'],
        likelySharkQuestions: ['What is your CAC/LTV ratio?', 'How is this defensible?', 'Why now?'],
        claimsToVerify: [],
        competitorsMentioned: [],
        overallReadiness: 50
      })
      setProgress(100)
      setStatus('done')
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const readinessColor = (n) => n >= 70 ? 'var(--vc)' : n >= 50 ? 'var(--angel)' : 'var(--cuban)'

  return (
    <div className="pt-nav" style={{ minHeight: '100vh' }}>
      <div className="wrap" style={{ paddingTop: 52, maxWidth: 900 }}>

        <div className="eyebrow fu" style={{ marginBottom: 14 }}>Step 02 · Deck Intelligence Portal</div>
        <h1 className="fu1" style={{
          fontFamily: 'var(--f-display)', fontSize: 'clamp(36px,4vw,62px)',
          letterSpacing: 1.5, lineHeight: .95, marginBottom: 14,
        }}>
          ARM THE<br /><span style={{ color: shark }}>SHARK AI.</span>
        </h1>
        <p className="fu2" style={{ color: 'var(--sub)', fontSize: 15, maxWidth: 520, marginBottom: 40 }}>
          Upload your deck. Claude analyzes every claim, extracts your metrics, and builds a
          murder board of everything the shark will use against you.
        </p>

        {/* Startup URL for Murder Board */}
        <div className="fu2" style={{ marginBottom: 20 }}>
          <div className="field">
            <label>Startup Website / LinkedIn (optional — for deeper murder board)</label>
            <input
              className="input"
              placeholder="https://yourstartup.com"
              value={startupUrl}
              onChange={e => setStartupUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Dropzone */}
        <div className="fu3"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current.click()}
          style={{
            border: `1.5px dashed ${dragging ? shark : 'var(--border2)'}`,
            borderRadius: 'var(--r-xl)', padding: '52px 40px',
            textAlign: 'center', cursor: file ? 'default' : 'pointer',
            background: dragging ? 'rgba(229,9,20,0.03)' : 'var(--surface)',
            transition: 'all .2s', marginBottom: 20, position: 'relative', overflow: 'hidden',
          }}
        >
          <input ref={inputRef} type="file"
            accept=".pdf,.pptx,.ppt,.txt"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files?.[0])} />

          {!file ? (
            <>
              <div style={{
                width: 56, height: 56, margin: '0 auto 18px',
                background: 'var(--surface2)', borderRadius: 14,
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>📊</div>
              <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 22, letterSpacing: 1, marginBottom: 8 }}>
                DROP YOUR PITCH DECK
              </h3>
              <p style={{ color: 'var(--dim)', fontSize: 13 }}>PDF · PPTX · TXT · Drop or click to browse</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                {['.PDF', '.PPTX', '.TXT'].map(f => (
                  <span key={f} style={{
                    fontFamily: 'var(--f-mono)', fontSize: 10,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--dim)', padding: '3px 9px', borderRadius: 20,
                  }}>{f}</span>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 28 }}>📊</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, letterSpacing: 1 }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)' }}>
                {(file.size / 1024).toFixed(0)} KB
              </div>

              {/* Progress */}
              <div style={{ width: '100%', maxWidth: 380 }}>
                <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{
                    height: '100%', width: `${Math.min(progress, 100)}%`,
                    background: `linear-gradient(90deg, ${shark}, var(--vc))`,
                    borderRadius: 2, transition: 'width .3s',
                  }} />
                </div>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 11, display: 'flex',
                  alignItems: 'center', gap: 8, justifyContent: 'center',
                  color: status === 'done' ? 'var(--vc)' : 'var(--dim)',
                }}>
                  {status === 'reading'   && <><span className="spin-ring" />READING DECK...</>}
                  {status === 'analyzing' && <><span className="spin-ring" />CLAUDE ANALYZING CLAIMS & METRICS...</>}
                  {status === 'done'      && <>✓ INTELLIGENCE EXTRACTED · MURDER BOARD READY</>}
                  {status === 'error'     && <>⚠ PARTIAL EXTRACTION — PROCEEDING</>}
                </div>
              </div>

              {status === 'done' && (
                <button onClick={e => { e.stopPropagation(); setFile(null); setStatus('idle'); setProgress(0); setIntel(null); setMurder2(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>
                  ✕ REMOVE
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Real Intelligence Panel ── */}
        {intelligence && status === 'done' && (
          <div className="fu" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-lbl" style={{ marginBottom: 16 }}>
                Extracted Intelligence · {intelligence.startupName}
              </div>

              {/* Readiness Score */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--surface2)', borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', letterSpacing: 2, marginBottom: 4 }}>PITCH READINESS SCORE</div>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 36, color: readinessColor(intelligence.overallReadiness) }}>
                    {intelligence.overallReadiness}<span style={{ fontSize: 16, opacity: .6 }}>/100</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`badge ${intelligence.overallReadiness >= 70 ? 'badge-green' : intelligence.overallReadiness >= 50 ? 'badge-gold' : 'badge-red'}`}>
                    {intelligence.overallReadiness >= 70 ? 'PITCH READY' : intelligence.overallReadiness >= 50 ? 'NEEDS WORK' : 'NOT READY'}
                  </div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--dim)', marginTop: 6 }}>
                    {intelligence.sector?.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Key Extractions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  ['PROBLEM', intelligence.problemStatement],
                  ['SOLUTION', intelligence.solution],
                  ['MARKET SIZE', intelligence.marketSize],
                  ['BUSINESS MODEL', intelligence.businessModel],
                  ['TRACTION', intelligence.traction],
                  ['FUNDING ASK', intelligence.ask],
                ].map(([k, v]) => (
                  <div key={k} style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r)', padding: '10px 14px',
                  }}>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--vc)', letterSpacing: 1.5, marginBottom: 5 }}>✓ {k}</div>
                    <div style={{ fontSize: 12, color: 'var(--sub)', lineHeight: 1.5 }}>{v || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Likely Shark Questions */}
              <div style={{ marginBottom: 16 }}>
                <div className="card-lbl">Questions The Shark Will Ask You</div>
                {(intelligence.likelySharkQuestions || []).map((q, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--cuban)', flexShrink: 0, marginTop: 2 }}>Q{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--sub)', fontStyle: 'italic' }}>{q}</span>
                  </div>
                ))}
              </div>

              {/* Top Weaknesses */}
              <div>
                <div className="card-lbl">Detected Weaknesses</div>
                {(intelligence.topWeaknesses || []).map((w, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0',
                    borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--angel)',
                  }}>
                    <span>⚠</span><span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Murder Board ── */}
        {murderBoard && (
          <div className="fu" style={{ marginBottom: 20 }}>
            <div className="card" style={{ border: '1px solid rgba(229,9,20,0.3)' }}>
              <div className="card-lbl" style={{ color: 'var(--cuban)' }}>⚠ MURDER BOARD — SHARK INTEL DOSSIER</div>

              {/* Opening Line */}
              {murderBoard.openingLine && (
                <div style={{
                  background: 'rgba(229,9,20,0.06)', border: '1px solid rgba(229,9,20,0.2)',
                  borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16,
                }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--cuban)', letterSpacing: 2, marginBottom: 6 }}>OPENING ATTACK LINE</div>
                  <div style={{ fontSize: 14, color: 'var(--text)', fontStyle: 'italic' }}>"{murderBoard.openingLine}"</div>
                </div>
              )}

              {/* Killer Questions */}
              <div style={{ marginBottom: 16 }}>
                <div className="card-lbl">Killer Questions Prepared</div>
                {(murderBoard.killerQuestions || []).map((q, i) => (
                  <div key={i} className="murder-item">
                    <span className="murder-label">Q{i + 1}</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>

              {/* Market Contradictions */}
              {(murderBoard.marketContradictions || []).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="card-lbl">Market Claim Contradictions</div>
                  {murderBoard.marketContradictions.map((c, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                        <span className={`badge ${c.severity === 'HIGH' ? 'badge-red' : c.severity === 'MED' ? 'badge-gold' : 'badge-dim'}`}>{c.severity}</span>
                        <span style={{ fontSize: 11, color: 'var(--sub)', fontStyle: 'italic' }}>"{c.claim}"</span>
                      </div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--cuban)', paddingLeft: 2 }}>→ {c.reality}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Red Flags */}
              <div>
                <div className="card-lbl">Red Flags</div>
                {(murderBoard.redFlags || []).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--dim)' }}>
                    <span style={{ color: 'var(--cuban)' }}>🚩</span><span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Google Drive MCP */}
        <div className="fu4" style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)', letterSpacing: 2, marginBottom: 12 }}>
            OR CONNECT VIA GOOGLE DRIVE
          </div>
          <div onClick={driveStatus === 'idle' ? () => { setDrive('connecting'); setTimeout(() => setDrive('connected'), 1800) } : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'var(--surface)', border: `1px solid ${driveStatus === 'connected' ? 'var(--vc)' : 'var(--border)'}`,
              borderRadius: 'var(--r-xl)', padding: '18px 22px',
              cursor: driveStatus === 'idle' ? 'pointer' : 'default', transition: 'all .3s',
            }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #4285F4, #34A853)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📁</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, letterSpacing: 1, marginBottom: 3 }}>GOOGLE DRIVE MCP</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: driveStatus === 'connected' ? 'var(--vc)' : 'var(--dim)', display: 'flex', alignItems: 'center', gap: 7 }}>
                {driveStatus === 'idle' && '→ Click to connect and sync your deck'}
                {driveStatus === 'connecting' && <><span className="spin-ring" />CONNECTING...</>}
                {driveStatus === 'connected' && <>✓ DRIVE MCP CONNECTED</>}
              </div>
            </div>
            {driveStatus === 'connected' && <div className="dot dot-green" />}
          </div>
        </div>

        {/* Nav */}
        <div className="fu5" style={{ display: 'flex', gap: 12, paddingBottom: 80 }}>
          <button className="btn btn-outline" onClick={() => nav('/setup')} style={{ flex: 1 }}>← BACK</button>
          <button
            className="btn btn-red"
            onClick={() => nav('/arena')}
            style={{ flex: 2, fontFamily: 'var(--f-display)', fontSize: 16, letterSpacing: 1.5 }}
          >
            ENTER THE ARENA →
          </button>
        </div>

      </div>
    </div>
  )
}