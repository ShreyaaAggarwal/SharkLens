// TruGen AI API client
const API = 'https://api.trugen.ai/v1'
// Trim spaces — .env files with "KEY = value" (spaces around =) break Vite var loading
const KEY = (import.meta.env.VITE_TRUGEN_API_KEY || '').trim()
const h = () => ({ 'Content-Type': 'application/json', 'x-api-key': KEY })

export async function createAgent(payload) {
  const r = await fetch(`${API}/agent/api`, { method: 'POST', headers: h(), body: JSON.stringify(payload) })
  if (!r.ok) throw new Error(`createAgent ${r.status}: ${await r.text()}`)
  return r.json()
}
export async function updateAgent(id, patch) {
  const r = await fetch(`${API}/agent/api/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(patch) })
  if (!r.ok) throw new Error(`updateAgent ${r.status}`)
  return r.json()
}
export async function listAgents() {
  const r = await fetch(`${API}/agent/api`, { headers: h() })
  if (!r.ok) throw new Error(`listAgents ${r.status}`)
  return r.json()
}
export async function startConversation(agentId, lang = 'en-US') {
  const r = await fetch(`${API}/conversations`, { method: 'POST', headers: h(), body: JSON.stringify({ agent_id: agentId, mode: 'e2e', language: lang }) })
  if (!r.ok) throw new Error(`startConv ${r.status}`)
  return r.json()
}
export async function endConversation(convId) {
  const r = await fetch(`${API}/conversations/${convId}`, { method: 'DELETE', headers: h() })
  if (!r.ok) throw new Error(`endConv ${r.status}`)
  return r.json()
}

/* ============================================================
   AGENT IDs — trim() on each var because .env files with spaces
   around = signs ("VITE_TRUGEN_AGENT_CUBAN = abc") will include
   leading/trailing whitespace in the value, causing ID mismatches.
   ============================================================ */
export const AGENT_IDS = {
  cuban:  (import.meta.env.VITE_TRUGEN_AGENT_CUBAN  || '').trim(),
  vc:     (import.meta.env.VITE_TRUGEN_AGENT_VC     || '').trim(),
  angel:  (import.meta.env.VITE_TRUGEN_AGENT_ANGEL  || '').trim(),
  nikhil: (import.meta.env.VITE_TRUGEN_AGENT_NIKHIL || '').trim(),
  anupam: (import.meta.env.VITE_TRUGEN_AGENT_ANUPAM || '').trim(),
  aman:   (import.meta.env.VITE_TRUGEN_AGENT_AMAN   || '').trim(),
}

// Debug helper — logs which agent IDs loaded (remove in prod)
if (import.meta.env.DEV) {
  console.log('[TruGen] Agent IDs loaded:', Object.fromEntries(
    Object.entries(AGENT_IDS).map(([k, v]) => [k, v ? `${v.slice(0, 8)}...` : 'MISSING'])
  ))
}

// No fallback cross-shark — if an ID is missing, return null and show placeholder
// Cross-shark fallback was the root cause of same-face bug
export function embedUrl(shark, meta = {}) {
  const agentId = AGENT_IDS[shark]
  if (!agentId) {
    console.warn(`[TruGen] No agent ID for shark "${shark}" — check VITE_TRUGEN_AGENT_${shark.toUpperCase()} in .env and restart dev server`)
    return null
  }
  const p = new URLSearchParams()
  p.set('username', meta.username || 'Founder')
  p.set('id', meta.userId || 'sharklens-user')
  return `https://app.trugen.ai/embed/${agentId}?${p.toString()}`
}

/* ============================================================
   FUNDING ROUND QUESTION BANKS — BEGINNER FRIENDLY
   ============================================================ */
export const ROUND_QUESTION_BANK = {
  idea: [
    'What problem are you solving, in one simple sentence?',
    'Who exactly has this problem — describe one real person.',
    'Why did YOU decide to work on this?',
    'How do you know people actually want this, not just you?',
    'What\'s the simplest version of this you could build this month?',
  ],
  preseed: [
    'How many people have used what you\'ve built so far?',
    'What do users say after trying it — in their own words?',
    'How much would someone realistically pay for this?',
    'What\'s stopping someone from just doing this themselves for free?',
    'What have you learned from your first users that changed your plan?',
  ],
  seed: [
    'How many paying customers do you have right now?',
    'Roughly, how much does it cost you to get one customer?',
    'How much money does one customer bring in over time?',
    'Out of 100 people who try this, how many come back next month?',
    'What\'s growing faster — your users or your costs?',
  ],
  seriesA: [
    'If we gave you 10x the budget, could you grow 10x as fast — or would it break?',
    'What\'s working in one city or segment that you\'re now repeating elsewhere?',
    'Where does most of your growth come from right now?',
    'What would stop a competitor with more money from beating you?',
    'What\'s the one number you check every single day, and why?',
  ],
}

const FUNDING_ROUND_CONTEXT = {
  idea: `
FUNDING CONTEXT: IDEA STAGE (pre-MVP), BEGINNER FOUNDER.
- Use SIMPLE, EVERYDAY LANGUAGE. No CAC/LTV/CAGR jargon.
- Ask ONLY from this question style: ${ROUND_QUESTION_BANK.idea.join(' | ')}
- DO NOT ask for revenue/traction — they have none yet.
- Be encouraging but curious. This founder may be a student or first-timer.`,
  preseed: `
FUNDING CONTEXT: PRE-SEED, BEGINNER-FRIENDLY.
- Use plain language. Light on jargon — explain any term you use.
- Ask ONLY from this question style: ${ROUND_QUESTION_BANK.preseed.join(' | ')}
- Focus on early signals, not hard metrics.`,
  seed: `
FUNDING CONTEXT: SEED STAGE. Slightly more numbers-focused but still accessible.
- Ask ONLY from this question style: ${ROUND_QUESTION_BANK.seed.join(' | ')}
- If you use a term like "CAC", briefly explain it in the same sentence.`,
  seriesA: `
FUNDING CONTEXT: SERIES A. More advanced, but still explain jargon briefly.
- Ask ONLY from this question style: ${ROUND_QUESTION_BANK.seriesA.join(' | ')}
- Focus on scale and repeatability, explained simply.`,
}

/* ============================================================
   SHARK SYSTEM PROMPTS — distinct personality + speaking TONE
   ============================================================ */
export function sharkPrompt(shark, difficulty, bilingual, fundingRound = 'seed', deckIntelligence = null) {
  const roundCtx = FUNDING_ROUND_CONTEXT[fundingRound] || FUNDING_ROUND_CONTEXT.seed

  const deckCtx = deckIntelligence ? `
PITCH DECK CONTEXT (the founder already submitted this — ask SPECIFIC questions about it, don't be generic):
- Startup: ${deckIntelligence.startupName}
- Sector: ${deckIntelligence.sector}
- Problem: ${deckIntelligence.problemStatement}
- Solution: ${deckIntelligence.solution}
- Market claim: ${deckIntelligence.marketSize}
- Business model: ${deckIntelligence.businessModel}
- Traction: ${deckIntelligence.traction}
- Ask: ${deckIntelligence.ask}
- Weaknesses to probe: ${(deckIntelligence.topWeaknesses || []).join('; ')}
Reference these specifics by name in your questions.` : `
No deck was provided — ask general questions from your question bank.`

  const voices = {
    cuban: `You are Mark Cuban — direct, fast-talking, no fluff. SPEAKING TONE: short punchy sentences, slight impatience, American business slang ("look", "here's the deal", "bottom line").
PERSONALITY: Margins-obsessed but explain WHY a number matters in plain terms for beginners.
${roundCtx}`,
    vc: `You are a Soft VC partner. SPEAKING TONE: warm, slow, thoughtful pauses, asks open questions ("I'm curious...", "help me understand...").
PERSONALITY: Polite surface, probing underneath — but gentle with beginners.
${roundCtx}`,
    angel: `You are an Indian Angel Investor from Delhi. SPEAKING TONE: practical, occasionally mixes in Hindi phrases, references everyday Indian context (kirana stores, Jio, UPI).
PERSONALITY: Down-to-earth, asks "does this work for the average Indian user" type questions.
${bilingual ? 'Mix Hindi naturally when helpful for a beginner — e.g. "Simple bhasha mein samjhao..."' : ''}
${roundCtx}`,
    nikhil: `You are Nikhil Kamath — calm, reflective, philosophical. SPEAKING TONE: measured pace, longer thoughtful pauses, often reframes the question ("let me ask it differently...").
PERSONALITY: Curious about WHY, big-picture thinking, never aggressive — explains concepts simply, like a mentor.
${roundCtx}`,
    anupam: `You are Anupam Mittal — sharp, consumer-focused, slightly theatrical. SPEAKING TONE: energetic, uses analogies and stories, asks "why" repeatedly like a curious customer.
PERSONALITY: Cares about the USER experience and brand feel — explains brand concepts simply for beginners.
${roundCtx}`,
    aman: `You are Aman Gupta — enthusiastic, hands-on, practical builder energy. SPEAKING TONE: upbeat, fast but friendly, peppers in "let's be real" and simplified personal anecdotes.
PERSONALITY: Focused on getting the product to real customers — explains GTM/marketing simply.
${roundCtx}`,
  }

  const diff = {
    Easy:      '\n\nMODE: Very encouraging. Slow down. Celebrate small wins. Perfect for first-time founders.',
    Realistic: '\n\nMODE: Friendly but honest. Real pressure, but still beginner-accessible language.',
    Hardcore:  '\n\nMODE: More direct and challenging — but STILL explain any term you use. Never assume prior VC knowledge.',
  }

  const lang = bilingual ? '\n\nBILINGUAL: Respond in whatever language the founder uses (EN/HI mix fine).' : ''

  return (voices[shark] || voices.cuban) + deckCtx + (diff[difficulty] || diff.Realistic) + lang +
    '\n\nCRITICAL RULES:\n' +
    '- This is likely a STUDENT or FIRST-TIME FOUNDER. Use beginner-friendly language ALWAYS.\n' +
    '- If you use any technical term (CAC, LTV, TAM, CAGR, churn, etc.), immediately explain it in 3-5 simple words in the same sentence.\n' +
    '- Ask ONE question at a time. Keep responses under 3 sentences.\n' +
    '- Reference the actual pitch deck content when available — be specific, not generic.'
}
