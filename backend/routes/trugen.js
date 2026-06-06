// ============================================================
// routes/trugen.js
// Server-side proxy for all TruGen API calls.
// Keeps TRUGEN_API_KEY out of the browser bundle.
// ============================================================
import { Router } from 'express'
import fetch from 'node-fetch'

const router  = Router()
const TRUGEN  = 'https://api.trugen.ai/v1'
const apiKey  = () => process.env.TRUGEN_API_KEY || ''
const headers = () => ({ 'Content-Type': 'application/json', 'x-api-key': apiKey() })

// ---- Helper: forward to TruGen ----
async function fwd(method, path, body = null) {
  const opts = { method, headers: headers() }
  if (body) opts.body = JSON.stringify(body)
  const res  = await fetch(`${TRUGEN}${path}`, opts)
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { status: res.status, data }
}

// ============================================================
// AGENTS
// ============================================================

// GET  /api/trugen/agents           — list all agents
router.get('/agents', async (_req, res) => {
  try {
    const { status, data } = await fwd('GET', '/agent/api')
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET  /api/trugen/agents/:id       — get single agent
router.get('/agents/:id', async (req, res) => {
  try {
    const { status, data } = await fwd('GET', `/agent/api/${req.params.id}`)
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/trugen/agents           — create agent with shark system prompt
router.post('/agents', async (req, res) => {
  try {
    const payload = {
      name:          req.body.name          || 'SharkLens Agent',
      system_prompt: req.body.system_prompt || 'You are a Shark Tank investor.',
      avatar_ids:    req.body.avatar_ids    || ['ava_ae61c9e28b'],
      is_active:     true,
      record:        true,
      config: {
        timeout: (req.body.durationMin || 10) * 60,
      },
      // Webhook back to this server
      callback_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/webhooks/trugen`,
      callback_events: [
        'call_ended',
        'participant_left',
        'agent.started_speaking',
        'agent.stopped_speaking',
        'agent.interrupted',
        'user.started_speaking',
        'user.stopped_speaking',
        'utterance_committed',
        'max_call_duration_timeout',
      ],
    }
    const { status, data } = await fwd('POST', '/agent/api', payload)
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT  /api/trugen/agents/:id       — update agent (e.g. inject KB)
router.put('/agents/:id', async (req, res) => {
  try {
    const { status, data } = await fwd('PUT', `/agent/api/${req.params.id}`, req.body)
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// CONVERSATIONS
// ============================================================

// POST /api/trugen/conversations     — start conversation
router.post('/conversations', async (req, res) => {
  try {
    const { status, data } = await fwd('POST', '/conversations', {
      agent_id: req.body.agent_id,
      mode:     req.body.mode     || 'e2e',
      language: req.body.language || 'en-US',
    })
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/trugen/conversations/:id — end conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { status, data } = await fwd('DELETE', `/conversations/${req.params.id}`)
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/trugen/conversations/:id  — get transcript
router.get('/conversations/:id', async (req, res) => {
  try {
    const { status, data } = await fwd('GET', `/ext/conversation/${req.params.id}`)
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/trugen/conversations/:id/speak — make agent say something
router.post('/conversations/:id/speak', async (req, res) => {
  try {
    const { status, data } = await fwd('POST', `/conversations/${req.params.id}/speak`, {
      text: req.body.text,
    })
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// KNOWLEDGE BASE
// ============================================================

// POST /api/trugen/kb               — create KB from text
router.post('/kb', async (req, res) => {
  try {
    const { name, text } = req.body
    if (!name || !text) return res.status(400).json({ error: 'name and text required' })

    // Build multipart manually using node-fetch FormData
    const { FormData, Blob } = await import('node:buffer').catch(() => ({ FormData: global.FormData, Blob: global.Blob }))

    // Fallback: use native fetch FormData if available
    const fd = new (global.FormData || (await import('formdata-node').then(m=>m.FormData)))()
    const blob = new Blob([text], { type: 'text/plain' })
    fd.append('file', blob, `${name}.txt`)
    fd.append('name', name)

    const r = await fetch(`${TRUGEN}/knowledge-base`, {
      method:  'POST',
      headers: { 'x-api-key': apiKey() },
      body:    fd,
    })
    const data = await r.json()
    res.status(r.status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// AVATARS
// ============================================================

// GET /api/trugen/avatars           — list stock avatars
router.get('/avatars', async (_req, res) => {
  try {
    const { status, data } = await fwd('GET', '/avatar')
    res.status(status).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// EMBED URL (helper — just returns url, no TruGen call needed)
// ============================================================
router.get('/embed-url', (req, res) => {
  const { agentId, username, userId } = req.query
  if (!agentId) return res.status(400).json({ error: 'agentId required' })
  const params = new URLSearchParams()
  if (username) params.set('username', username)
  if (userId)   params.set('id',       userId)
  const qs  = params.toString()
  const url = `https://app.trugen.ai/embed?agentId=${agentId}${qs ? '&'+qs : ''}`
  res.json({ url })
})

export default router