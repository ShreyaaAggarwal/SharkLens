// ML Engine — Real-time pitch analytics simulation
// Production swap: replace with MediaPipe/TF.js/Wav2Vec2 WebSocket feed

export const RADAR_AXES    = ['Confidence','Market','Financials','Vision','Delivery']
export const FILLER_WORDS  = ['umm','like','actually','so','you know','right','basically','kind of']
export const EMOTIONS      = ['Confident','Focused','Neutral','Anxious','Stressed','Nervous']
export const EMOTION_COLOR = {
  Confident:'#3FB97E', Focused:'#5B7FF0', Neutral:'#8B949E',
  Anxious:'#D99E32', Stressed:'#E05252', Nervous:'#D99E32',
}
export const MCP_TEXTS = [
  'Scanning Razorpay competitor data...','Fetching recent funding rounds in sector...',
  'Indexing MSME market reports Q1 2026...','Checking Khatabook / DukkanPe traction...',
  'Pulling VC sentiment on B2B SaaS India...','Searching competitor CAC benchmarks...',
  'Cross-referencing Tracxn for comps...','Analyzing YC W26 batch overlaps...',
]
export const NONSENSE = [
  { alert:false, text:'Monitoring pitch structure and claim consistency...' },
  { alert:true,  text:'"10cr TAM stated — but paused on unit economics for 8s. Cuban flagging.' },
  { alert:false, text:'Narrative coherence: within normal range.' },
  { alert:true,  text:'Filler density spike — 4 fillers in 20 seconds. Confidence impact: -12pts.' },
  { alert:false, text:'Eye contact stable. Posture signal: Good.' },
  { alert:true,  text:'Revenue projection gap — ₹50L Y1 vs 200 users × stated ₹1,200 ARPU = ₹28.8L.' },
  { alert:false, text:'Speech rate optimal. Delivery score holding.' },
  { alert:true,  text:'Claimed "market leader" — no data provided. Credibility risk flagged.' },
]

/* Smooth random walk */
export const drift = (v, min, max, vol=5) =>
  Math.max(min, Math.min(max, v + (Math.random()-.48)*vol))

/* Confidence fusion model */
export function fuseConfidence({ gaze, wpm, fillerDensity, stress }) {
  const g = gaze
  const s = Math.max(0, 100 - Math.abs(wpm-140)*1.1)
  const f = Math.max(0, 100 - fillerDensity*14)
  const e = 100 - stress
  return Math.min(99, Math.max(10, Math.round(g*.30 + s*.25 + f*.25 + e*.20)))
}

export function initML() {
  return {
    confidence:    64, gaze:     80, wpm:  142,
    stress:        35, fillerDensity:1.2,
    fillerCounts:  { umm:7, like:4, actually:2, so:3 },
    emotion:       'Anxious',
    radarData:     [64, 55, 48, 80, 70],
    mood:          68, turns: 4,
    mcpIdx:        0,  nonsenseIdx:0,
    history:       [],
  }
}

export function tickML(prev) {
  const n = { ...prev, fillerCounts:{ ...prev.fillerCounts } }

  n.gaze         = drift(prev.gaze, 30, 100, 5)
  n.wpm          = drift(prev.wpm, 85, 210, 11)
  n.stress       = drift(prev.stress, 10, 90, 7)
  n.fillerDensity= drift(prev.fillerDensity, 0, 8, .5)
  n.mood         = drift(prev.mood, 10, 100, 3.5)
  n.confidence   = fuseConfidence(n)

  if (Math.random() < .14) {
    const w = FILLER_WORDS[Math.floor(Math.random()*FILLER_WORDS.length)]
    n.fillerCounts[w] = (prev.fillerCounts[w]||0)+1
  }
  if (Math.random() < .11)
    n.emotion = EMOTIONS[Math.floor(Math.random()*EMOTIONS.length)]
  if (Math.random() < .06) n.turns = prev.turns+1
  n.radarData    = prev.radarData.map(v => drift(v, 20, 95, 6))
  if (Math.random() < .28) n.mcpIdx      = (prev.mcpIdx+1)  % MCP_TEXTS.length
  if (Math.random() < .18) n.nonsenseIdx = (prev.nonsenseIdx+1) % NONSENSE.length

  n.history = [...(prev.history||[]).slice(-79), n.confidence]
  return n
}

export function finalScore(mlHistory = []) {
  if (!mlHistory.length) mlHistory = Array.from({length:40},()=>50+Math.random()*30)
  const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length
  const conf = Math.round(avg(mlHistory))
  return {
    overall: Math.round(conf*.4 + 55*.6),
    breakdown:[
      { label:'Confidence',     pct: conf,                         color:'var(--cuban)' },
      { label:'Market Sizing',  pct: Math.round(55+Math.random()*25), color:'var(--vc)' },
      { label:'Financials',     pct: Math.round(35+Math.random()*25), color:'var(--angel)' },
      { label:'Vision & Story', pct: Math.round(60+Math.random()*25), color:'var(--vc)' },
      { label:'Delivery',       pct: Math.round(50+Math.random()*25), color:'var(--sub)' },
    ],
    history: mlHistory,
  }
}

export function startRealFillerDetection(onFillerDetected) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('[ML] Web Speech API not supported')
    return null
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-IN'

  const FILLER_SET = new Set(['umm', 'um', 'uh', 'like', 'actually', 'so', 'basically', 'you know', 'right', 'literally'])

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const transcript = result[0].transcript.toLowerCase().trim()

      transcript.split(/\s+/).forEach(word => {
        const clean = word.replace(/[^a-z\s]/g, '')
        if (FILLER_SET.has(clean)) onFillerDetected(clean)
      })

      // ← ADDED: pass full transcript text on final results
      if (result.isFinal) {
        onFillerDetected(null, result[0].transcript)
      }
    }
  }

  recognition.onerror = (e) => {
    if (e.error !== 'no-speech') console.warn('[ML] Speech error:', e.error)
  }

  try { recognition.start() } catch (e) {}
  return recognition
}