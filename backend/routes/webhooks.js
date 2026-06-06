// ============================================================
// routes/webhooks.js
// TruGen webhook callback handler.
// TruGen POSTs events here during/after every conversation.
// See: https://docs.trugen.ai/docs/agents/callback.md
// ============================================================
import { Router } from 'express'

const router = Router()

// In-memory session store (use Redis/DB in production)
const sessions = new Map()

// ============================================================
// POST /webhooks/trugen
// Main webhook receiver for all TruGen callback events
// ============================================================
router.post('/trugen', (req, res) => {
  const event = req.body

  // Always 200 immediately — TruGen requires fast ack
  res.status(200).json({ received: true })

  const { event_type, conversation_id, agent_id } = event

  // Initialise session record if first event
  if (conversation_id && !sessions.has(conversation_id)) {
    sessions.set(conversation_id, {
      conversation_id,
      agent_id,
      started_at:  new Date().toISOString(),
      ended_at:    null,
      utterances:  [],
      events:      [],
      transcript:  [],
    })
  }

  const session = sessions.get(conversation_id)
  if (session) session.events.push({ type: event_type, ts: new Date().toISOString() })

  // ---- Handle specific event types ----
  switch (event_type) {

    case 'utterance_committed': {
      // A complete utterance was committed (user or agent)
      const { role, transcript: text, is_final } = event
      if (is_final && text) {
        session.utterances.push({ role, text, ts: new Date().toISOString() })
        session.transcript.push(`[${role?.toUpperCase()}]: ${text}`)

        // Log for ML analysis trigger (in production: emit to ML pipeline)
        console.log(`[WEBHOOK] utterance_committed | ${conversation_id} | ${role}: ${text?.slice(0,80)}...`)
      }
      break
    }

    case 'agent.started_speaking':
      console.log(`[WEBHOOK] Shark started speaking | ${conversation_id}`)
      break

    case 'agent.stopped_speaking':
      console.log(`[WEBHOOK] Shark stopped speaking | ${conversation_id}`)
      break

    case 'agent.interrupted':
      console.log(`[WEBHOOK] Agent interrupted | ${conversation_id}`)
      break

    case 'user.started_speaking':
      console.log(`[WEBHOOK] Founder started speaking | ${conversation_id}`)
      break

    case 'user.stopped_speaking':
      console.log(`[WEBHOOK] Founder stopped speaking | ${conversation_id}`)
      break

    case 'call_ended':
    case 'participant_left':
    case 'max_call_duration_timeout': {
      // Session over — finalise record
      if (session) {
        session.ended_at   = new Date().toISOString()
        session.duration_s = Math.round(
          (new Date(session.ended_at) - new Date(session.started_at)) / 1000
        )
        session.full_transcript = session.transcript.join('\n')
        console.log(`[WEBHOOK] Session ended | ${conversation_id} | Duration: ${session.duration_s}s`)
        console.log(`[WEBHOOK] Full transcript:\n${session.full_transcript}`)
      }
      break
    }

    default:
      console.log(`[WEBHOOK] Unhandled event: ${event_type}`)
  }
})

// ============================================================
// GET /webhooks/session/:conversationId
// Frontend polls this to get transcript + events
// ============================================================
router.get('/session/:id', (req, res) => {
  const session = sessions.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json(session)
})

// ============================================================
// GET /webhooks/sessions
// List all sessions (dev/debug)
// ============================================================
router.get('/sessions', (_req, res) => {
  const list = [...sessions.values()].map(s => ({
    conversation_id: s.conversation_id,
    started_at:      s.started_at,
    ended_at:        s.ended_at,
    utterance_count: s.utterances.length,
  }))
  res.json(list)
})

export default router