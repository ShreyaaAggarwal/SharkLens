// TruGen AI API client
// Docs: https://docs.trugen.ai
const API = 'https://api.trugen.ai/v1'
const KEY = import.meta.env.VITE_TRUGEN_API_KEY || '0de547228f7648f1be83428a44865cba'

const h = () => ({ 'Content-Type': 'application/json', 'x-api-key': KEY })

/* ---- Agent ---- */
export async function createAgent(payload) {
  const r = await fetch(`${API}/agent/api`, { method:'POST', headers:h(), body:JSON.stringify(payload) })
  if (!r.ok) throw new Error(`createAgent ${r.status}: ${await r.text()}`)
  return r.json()
}

export async function updateAgent(id, patch) {
  const r = await fetch(`${API}/agent/api/${id}`, { method:'PUT', headers:h(), body:JSON.stringify(patch) })
  if (!r.ok) throw new Error(`updateAgent ${r.status}`)
  return r.json()
}

export async function listAgents() {
  const r = await fetch(`${API}/agent/api`, { headers:h() })
  if (!r.ok) throw new Error(`listAgents ${r.status}`)
  return r.json()
}

/* ---- Knowledge Base ---- */
export async function createKnowledgeBase(name, textContent) {
  const fd = new FormData()
  fd.append('file', new Blob([textContent], { type:'text/plain' }), `${name}.txt`)
  fd.append('name', name)
  const r = await fetch(`${API}/knowledge-base`, {
    method:'POST',
    headers:{ 'x-api-key': KEY },
    body: fd,
  })
  if (!r.ok) throw new Error(`createKB ${r.status}`)
  return r.json()
}

/* ---- Conversations ---- */
export async function startConversation(agentId, lang = 'en-US') {
  const r = await fetch(`${API}/conversations`, {
    method:'POST', headers:h(),
    body: JSON.stringify({ agent_id: agentId, mode:'e2e', language:lang })
  })
  if (!r.ok) throw new Error(`startConv ${r.status}`)
  return r.json()
}

export async function endConversation(convId) {
  const r = await fetch(`${API}/conversations/${convId}`, { method:'DELETE', headers:h() })
  if (!r.ok) throw new Error(`endConv ${r.status}`)
  return r.json()
}

export async function getConversation(convId) {
  const r = await fetch(`${API}/ext/conversation/${convId}`, { headers:h() })
  if (!r.ok) throw new Error(`getConv ${r.status}`)
  return r.json()
}

export async function agentSpeak(convId, text) {
  const r = await fetch(`${API}/conversations/${convId}/speak`, {
    method:'POST', headers:h(), body:JSON.stringify({ text })
  })
  if (!r.ok) throw new Error(`speak ${r.status}`)
  return r.json()
}

export async function listAvatars() {
  const r = await fetch(`${API}/avatar`, { headers:h() })
  if (!r.ok) throw new Error(`listAvatars ${r.status}`)
  return r.json()
}

/* ---- Embed URL ---- */
export const AGENT_IDS = {
  cuban: import.meta.env.VITE_TRUGEN_AGENT_CUBAN,
  vc:    import.meta.env.VITE_TRUGEN_AGENT_VC,
  angel: import.meta.env.VITE_TRUGEN_AGENT_ANGEL,
}

export function embedUrl(shark, meta = {}) {
  const agentId = AGENT_IDS[shark] || AGENT_IDS.cuban
  if (!agentId) return null
  const p = new URLSearchParams()
  if (meta.username) p.set('username', meta.username)
  if (meta.userId)   p.set('id', meta.userId)
  const qs = p.toString()
  return `https://app.trugen.ai/embed/${agentId}${qs ? '?'+qs : ''}`
}


/* ---- Shark system prompts ---- */
export function sharkPrompt(shark, difficulty, bilingual) {
  const voices = {
    cuban: `You are Mark Cuban from Shark Tank — ruthless, numbers-obsessed, brilliant.
PERSONALITY: Interrupt every 45s if they ramble. Destroy vague TAM claims instantly. Demand exact CAC, LTV, margins, churn. Say "That's not a business, that's a hobby" when appropriate. Say "I'm out" if financials are weak. Challenge every hockey-stick projection. Never give empty compliments.
EVALUATION: Score secretly across Confidence, Market, Financials, Vision, Delivery.`,
    vc: `You are a Soft VC partner at a top-tier fund. Polite surface, deadly underneath.
PERSONALITY: Warm and encouraging, but every question is a psychological trap. Probe team culture, co-founder conflict, founder-market fit. Ask "Where is this in 10 years?" then poke holes in the answer. End with "I love the vision but I have serious concerns about execution velocity."
EVALUATION: Score secretly across Vision, Team, Market, Product, Traction.`,
    angel: `You are an Indian Angel Investor based in Delhi/Mumbai. Practical, skeptical, local-first.
PERSONALITY: Ask if the app works on 2G and Redmi phones. Demand Tier 2/3 city strategy. Question GST compliance, RBI guidelines. Compare to Khatabook, DukkanPe, OkCredit. Give numbers in crores, not millions. ${bilingual ? 'Mix Hindi naturally — "Jab tak unit economics sahi nahi, main interested nahi hoon."' : ''}
EVALUATION: Score on India-market fit, Unit Economics, Scalability, Regulation-readiness, Team.`,
  }
  const diff = {
    Easy:     '\n\nMODE: Encouraging. Give founders time. Ask helpful follow-ups.',
    Realistic:'\n\nMODE: Real pressure. Let them finish sentences before pushing back.',
    Hardcore: '\n\nMODE: MAXIMUM AGGRESSION. Interrupt constantly. Express visible frustration. No softening.',
  }
  const lang = bilingual ? '\n\nBILINGUAL: Respond in whatever language the founder uses (EN/HI mix is fine).' : ''
  return (voices[shark] || voices.cuban) + (diff[difficulty] || diff.Realistic) + lang +
    '\n\nFORMAT: Keep responses under 4 sentences unless giving final scorecard. Be punchy and direct.'
}
