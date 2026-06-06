// ============================================================
// routes/mcp.js
// MCP (Model Context Protocol) integration stubs.
// In production: swap each handler for real OAuth + API calls.
// ============================================================
import { Router } from 'express'

const router = Router()

// ============================================================
// POST /api/mcp/gmail
// Send scorecard report to user's inbox
// ============================================================
router.post('/gmail', async (req, res) => {
  const { to, subject, score, breakdown, shark, difficulty } = req.body

  console.log(`[MCP/Gmail] Sending report to ${to}`)

  // --- PRODUCTION: use Nodemailer + OAuth2 or Gmail API here ---
  // import { google } from 'googleapis'
  // const gmail = google.gmail({ version:'v1', auth })
  // await gmail.users.messages.send({ ... })

  // Simulate async send (replace with real implementation)
  await new Promise(r => setTimeout(r, 400))

  const emailBody = buildEmailBody({ to, score, breakdown, shark, difficulty })
  console.log(`[MCP/Gmail] Email body preview:\n${emailBody.slice(0, 300)}...`)

  res.json({
    success: true,
    message: `Report sent to ${to}`,
    // In production this would be the Gmail message ID
    messageId: `mock_${Date.now()}`,
  })
})

// ============================================================
// POST /api/mcp/calendar
// Book a follow-up practice session
// ============================================================
router.post('/calendar', async (req, res) => {
  const { userEmail, weakestArea, preferredTime } = req.body

  console.log(`[MCP/Calendar] Booking follow-up for ${userEmail} | Focus: ${weakestArea}`)

  // --- PRODUCTION: use Google Calendar API here ---
  // const calendar = google.calendar({ version:'v3', auth })
  // await calendar.events.insert({ calendarId:'primary', requestBody:{ ... } })

  await new Promise(r => setTimeout(r, 300))

  // Compute a suggested slot (next available Thursday 10 AM)
  const next = getNextThursday()

  res.json({
    success: true,
    event: {
      title:     `SharkLens Follow-up — ${weakestArea} Focus`,
      start:     next.toISOString(),
      end:       new Date(next.getTime() + 30*60*1000).toISOString(),
      attendees: [userEmail],
      notes:     `Focused practice on: ${weakestArea}. Shark persona: Mark Cuban. Difficulty: Realistic.`,
    },
  })
})

// ============================================================
// POST /api/mcp/drive
// Save session logs + deck to Google Drive
// ============================================================
router.post('/drive', async (req, res) => {
  const { userEmail, sessionId, transcript, scorecard } = req.body

  console.log(`[MCP/Drive] Saving session ${sessionId} for ${userEmail}`)

  // --- PRODUCTION: use Google Drive API here ---
  // const drive = google.drive({ version:'v3', auth })
  // await drive.files.create({ requestBody:{ name, parents }, media:{ body } })

  await new Promise(r => setTimeout(r, 500))

  res.json({
    success: true,
    files: [
      { name: `session_${sessionId}_transcript.txt`, path: `/SharkLens/Sessions/${sessionId}/` },
      { name: `session_${sessionId}_scorecard.json`, path: `/SharkLens/Sessions/${sessionId}/` },
    ],
    folder: '/SharkLens/Sessions/',
  })
})

// ============================================================
// POST /api/mcp/search
// Web search MCP — competitor lookup during session
// ============================================================
router.post('/search', async (req, res) => {
  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'query required' })

  console.log(`[MCP/Search] Querying: ${query}`)

  // --- PRODUCTION: call a real search API here ---
  // e.g. SerpAPI, Brave Search API, or Tavily
  // const r = await fetch(`https://api.tavily.com/search`, { ... })

  await new Promise(r => setTimeout(r, 600))

  // Mock results relevant to startup pitching
  const mockResults = getMockSearchResults(query)

  res.json({ success: true, query, results: mockResults })
})

// ============================================================
// HELPERS
// ============================================================

function buildEmailBody({ to, score, breakdown, shark, difficulty }) {
  const lines = [
    `SHARKLENS — POST-SESSION SCORECARD`,
    `========================================`,
    `Sent to: ${to}`,
    `Shark Persona: ${shark}`,
    `Difficulty: ${difficulty}`,
    ``,
    `OVERALL SCORE: ${score}/100`,
    ``,
    `BREAKDOWN:`,
    ...(breakdown||[]).map(b => `  ${b.label.padEnd(20)} ${b.pct}%`),
    ``,
    `ACTION: Focus your next session on your weakest area.`,
    `Book a follow-up at: https://sharklens.vercel.app`,
  ]
  return lines.join('\n')
}

function getNextThursday() {
  const d = new Date()
  const day = d.getDay()
  const daysUntilThursday = (4 - day + 7) % 7 || 7
  d.setDate(d.getDate() + daysUntilThursday)
  d.setHours(10, 0, 0, 0)
  return d
}

function getMockSearchResults(query) {
  const q = query.toLowerCase()
  if (q.includes('inventory') || q.includes('msme')) {
    return [
      { title:'Khatabook raises $100M Series D — TechCrunch', snippet:'Khatabook, the Indian SMB accounting platform, has 10M+ registered businesses...' },
      { title:'DukkanPe closes $4.5M seed round', snippet:'DukkanPe targets kirana stores with digital ledger and inventory tools...' },
      { title:'India MSME market to reach $1T by 2028 — NASSCOM', snippet:'The MSME sector contributes 30% of India\'s GDP with 63M enterprises...' },
    ]
  }
  return [
    { title:`Search results for: "${query}"`, snippet:'Live competitor intelligence via Web Search MCP.' },
  ]
}

export default router