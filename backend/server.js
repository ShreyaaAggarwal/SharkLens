// ============================================================
// SharkLens Backend — Express Server
// Handles: TruGen API proxy, webhook callbacks, MCP sims, Claude proxy
// Claude proxy uses Google Gemini under the hood — same frontend interface
// ============================================================
import 'dotenv/config'
import express        from 'express'
import cors           from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'
import trugenRouter   from './routes/trugen.js'
import webhookRouter  from './routes/webhooks.js'
import mcpRouter      from './routes/mcp.js'

const app  = express()
const PORT = process.env.PORT || 3001

// ---- Gemini client ----
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ---- Middleware ----
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.vercel\.app$/,
  ],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ---- Request logger (dev) ----
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  }
  next()
})

// ---- Routes ----
app.use('/api/trugen',   trugenRouter)
app.use('/webhooks',     webhookRouter)
app.use('/api/mcp',      mcpRouter)

// ============================================================
// Claude Analyze Proxy  (powered by Gemini — same API surface)
// POST /api/claude/analyze
// Body: { prompt: string, maxTokens?: number }
// Returns: { text: string }
// ============================================================
app.post('/api/claude/analyze', async (req, res) => {
  try {
    const { prompt, maxTokens } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required and must be a string' })
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server' })
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',          // free tier, fast, large context
      generationConfig: {
        maxOutputTokens: maxTokens || 4000,
        temperature:     0.7,
      },
    })

    const result   = await model.generateContent(prompt)
    const response = await result.response
    const text     = response.text()

    return res.json({ text })

  } catch (err) {
    console.error('[Gemini Proxy Error]', err.message)
    return res.status(500).json({ error: err.message || 'Gemini request failed' })
  }
})

// ---- Health ----
app.get('/health', (_req, res) => {
  res.json({
    status:     'ok',
    service:    'sharklens-backend',
    timestamp:  new Date().toISOString(),
    trugenKey:  process.env.TRUGEN_API_KEY ? '✓ SET' : '✗ MISSING',
    geminiKey:  process.env.GEMINI_API_KEY ? '✓ SET' : '✗ MISSING',
  })
})

// ---- 404 ----
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ---- Error handler ----
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🦈  SharkLens Backend Running      ║
  ║   Port: ${PORT}                          ║
  ║   TruGen Key:  ${process.env.TRUGEN_API_KEY ? '✓ SET' : '✗ MISSING'}            ║
  ║   Gemini Key:  ${process.env.GEMINI_API_KEY ? '✓ SET' : '✗ MISSING'}            ║
  ╚══════════════════════════════════════╝
  `)
})

export default app
