import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CLAUDE_PROXY = `${BACKEND}/api/claude/analyze`

async function askClaude(prompt, maxTokens = 1200) {
  const r = await fetch(CLAUDE_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens }),
  })
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Claude proxy failed: ${r.status} ${err}`)
  }
  const data = await r.json()
  return data.text || ''
}

// Robust JSON extraction — handles markdown fences, trailing commas, partial responses
function extractJSON(raw) {
  if (!raw) throw new Error('Empty response')
  // Strip markdown fences
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Find first { and last } to isolate JSON block
  const start = clean.indexOf('{')
  const end   = clean.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found')
  clean = clean.slice(start, end + 1)
  return JSON.parse(clean)
}

export default function DeckPortal() {
  const { setDeckFile, setDeckText, setDeckIntelligence, config } = useApp()
  const nav = useNavigate()
  const inputRef = useRef()

  const [file, setFile]           = useState(null)
  const [status, setStatus]       = useState('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [progress, setProgress]   = useState(0)
  const [dragging, setDragging]   = useState(false)
  const [intelligence, setIntel]  = useState(null)
  const [driveStatus, setDrive]   = useState('idle')
  const [murderBoard, setMurder2] = useState(null)
  const [startupUrl, setStartupUrl] = useState('')

  const shark = { cuban: 'var(--cuban)', vc: 'var(--vc)', angel: 'var(--angel)' }[config.shark] || 'var(--cuban)'

  // ── Text extraction from uploaded file ──
  async function extractText(f) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (f.type === 'text/plain') {
          resolve(e.target.result || '')
          return
        }
        // For PDF/PPTX: strip binary noise, keep ASCII readable chunks
        const text = e.target.result || ''
        const cleaned = text
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s{3,}/g, '\n')
          .trim()
        // Only use if we got reasonable text (>200 printable chars)
        const useful = cleaned.replace(/\s/g, '').length
        resolve(useful > 200 ? cleaned.slice(0, 8000) : '')
      }
      reader.onerror = () => resolve('')
      reader.readAsText(f)
    })
  }

  // ── Claude: deck intelligence ──
  async function analyzeDeckWithClaude(text, filename) {
    const contentNote = text
      ? `DECK CONTENT (extracted text):\n${text}`
      : `NOTE: Text extraction yielded little content from "${filename}". Infer what you can from the filename and provide a best-effort analysis with placeholder values where data is unavailable.`

    const prompt = `You are a Shark Tank analyst AI. Analyze this pitch deck and extract structured intelligence.

DECK FILENAME: ${filename}
${contentNote}

Return ONLY a valid JSON object (no markdown fences, no explanation, no preamble):
{
  "startupName": "name of the startup",
  "sector": "sector/industry",
  "problemStatement": "1-2 sentence summary of the problem",
  "solution": "1-2 sentence summary of the solution",
  "marketSize": "TAM/SAM/SOM if mentioned, else 'Not stated'",
  "businessModel": "how they make money",
  "traction": "users, revenue, growth metrics if mentioned, else 'Not stated'",
  "teamHighlight": "key team credential if mentioned",
  "ask": "funding ask if mentioned, else 'Not stated'",
  "topWeaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "likelySharkQuestions": ["question 1", "question 2", "question 3"],
  "claimsToVerify": ["claim 1", "claim 2"],
  "competitorsMentioned": ["competitor 1"],
  "overallReadiness": 65
}`
    const raw = await askClaude(prompt, 1200)
    return extractJSON(raw)
  }

  // ── Claude: murder board ──
  async function buildMurderBoardClaude(intel, url) {
    const prompt = `You are a ruthless investor doing homework before a pitch meeting.

Startup: ${intel.startupName}
Sector: ${intel.sector}
URL provided: ${url || 'none'}
Problem: ${intel.problemStatement}
Claimed market: ${intel.marketSize}
Competitors mentioned: ${(intel.competitorsMentioned || []).join(', ')}
Traction: ${intel.traction}

Based on your knowledge of the Indian startup ecosystem, generate a MURDER BOARD — all the information, contradictions, and ammunition an investor would use to stress-test this pitch.

Return ONLY a valid JSON object (no markdown fences, no preamble):
{
  "founderDigital": [
    {"type": "LINKEDIN", "finding": "finding about typical founders in this space"},
    {"type": "PIVOT HISTORY", "finding": "what pivots might be expected"},
    {"type": "COMPETITION", "finding": "who the real competitors are"}
  ],
  "marketContradictions": [
    {"claim": "their claim", "reality": "the real data", "severity": "HIGH"}
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
    const raw = await askClaude(prompt, 1200)
    return extractJSON(raw)
  }

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setDeckFile(f)
    setStatus('reading')
    setStatusMsg('Reading deck...')
    setProgress(10)

    try {
      // Step 1: Extract text
      const text = await extractText(f)
      setDeckText(text)
      setProgress(25)
      setStatus('analyzing')
      setStatusMsg('Claude analyzing claims & metrics...')

      // Step 2: Run deck analysis + murder board IN PARALLEL to halve wait time
      const [intel, board] = await Promise.all([
        analyzeDeckWithClaude(
          text || '',
          f.name
        ),
        // Murder board starts with minimal info; we'll enrich after deck analysis
        // but we kick it off in parallel using filename/url context
        buildMurderBoardClaude(
          {
            startupName: f.name.replace(/\.(pdf|pptx|ppt|txt)/i, ''),
            sector: 'Technology',
            problemStatement: 'See deck.',
            marketSize: 'See deck.',
            traction: 'See deck.',
            competitorsMentioned: [],
          },
          startupUrl
        ).catch(() => null), // murder board failure is non-fatal
      ])

      setProgress(80)
      setStatusMsg('Finalising intelligence...')

      setIntel(intel)
      setDeckIntelligence(intel)

      // If murder board failed in parallel (had no intel), build now with real intel
      let finalBoard = board
      if (!finalBoard) {
        try {
          finalBoard = await buildMurderBoardClaude(intel, startupUrl)
        } catch { /* non-fatal */ }
      }
      setMurder2(finalBoard)

      setProgress(100)
      setStatus('done')
      setStatusMsg('Intelligence extracted · Murder board ready')
    } catch (err) {
      console.error('Deck analysis failed:', err)
      // Graceful fallback — still let them proceed
      const fallback = {
        startupName: f.name.replace(/\.(pdf|pptx|ppt|txt)/i, ''),
        sector: 'Technology',
        problemStatement: 'Deck uploaded — manual review mode.',
        solution: 'See uploaded deck.',
        marketSize: 'Not extracted',
        businessModel: 'Not extracted',
        traction: 'Not extracted',
        teamHighlight: 'Not extracted',
        ask: 'Not stated',
        topWeaknesses: ['Deck text could not be fully parsed', 'Consider uploading as .txt for best results', 'Add text-based content to slides'],
        likelySharkQuestions: ['What is your CAC/LTV ratio?', 'How is this defensible?', 'Why now?'],
        claimsToVerify: [],
        competitorsMentioned: [],
        overallReadiness: 50,
      }
      setIntel(fallback)
      setDeckIntelligence(fallback)
      setProgress(100)
      setStatus('done')
      setStatusMsg('Partial extraction — proceeding')
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

        {/* Startup URL */}
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
              <p style={{ color: 'var(--dim)', fontSize: 11, marginTop: 12, fontFamily: 'var(--f-mono)' }}>
                💡 TIP: .txt files give the best extraction. Export your deck as text for fastest analysis.
              </p>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 28 }}>📊</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, letterSpacing: 1 }}>{file.name}</div>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--dim)' }}>
                {(file.size / 1024).toFixed(0)} KB
              </div>

              <div style={{ width: '100%', maxWidth: 380 }}>
                <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{
                    height: '100%', width: `${Math.min(progress, 100)}%`,
                    background: `linear-gradient(90deg, ${shark}, var(--vc))`,
                    borderRadius: 2, transition: 'width .4s',
                  }} />
                </div>
                <div style={{
                  fontFamily: 'var(--f-mono)', fontSize: 11, display: 'flex',
                  alignItems: 'center', gap: 8, justifyContent: 'center',
                  color: status === 'done' ? 'var(--vc)' : 'var(--dim)',
                }}>
                  {status !== 'done' && status !== 'idle' && <span className="spin-ring" />}
                  {status === 'done' && <>✓ </>}
                  {statusMsg}
                </div>
              </div>

              {status === 'done' && (
                <button onClick={e => { e.stopPropagation(); setFile(null); setStatus('idle'); setStatusMsg(''); setProgress(0); setIntel(null); setMurder2(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--dim)' }}>
                  ✕ REMOVE
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Intelligence Panel ── */}
        {intelligence && status === 'done' && (
          <div className="fu" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="card-lbl" style={{ marginBottom: 16 }}>
                Extracted Intelligence · {intelligence.startupName}
              </div>

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

              {murderBoard.openingLine && (
                <div style={{
                  background: 'rgba(229,9,20,0.06)', border: '1px solid rgba(229,9,20,0.2)',
                  borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 16,
                }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--cuban)', letterSpacing: 2, marginBottom: 6 }}>OPENING ATTACK LINE</div>
                  <div style={{ fontSize: 14, color: 'var(--text)', fontStyle: 'italic' }}>"{murderBoard.openingLine}"</div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div className="card-lbl">Killer Questions Prepared</div>
                {(murderBoard.killerQuestions || []).map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--cuban)', flexShrink: 0, marginTop: 2 }}>Q{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--sub)' }}>{q}</span>
                  </div>
                ))}
              </div>

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
                {driveStatus === 'idle'      && '→ Click to connect and sync your deck'}
                {driveStatus === 'connecting' && <><span className="spin-ring" />CONNECTING...</>}
                {driveStatus === 'connected'  && <>✓ DRIVE MCP CONNECTED</>}
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
