// ============================================================
// SharkLens Backend — Express Server
// Handles: TruGen API proxy, webhook callbacks, MCP sims
// ============================================================
import 'dotenv/config'
import express   from 'express'
import cors      from 'cors'
import trugenRouter   from './routes/trugen.js'
import webhookRouter  from './routes/webhooks.js'
import mcpRouter      from './routes/mcp.js'

const app  = express()
const PORT = process.env.PORT || 3001

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

// ---- Health ----
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sharklens-backend',
    timestamp: new Date().toISOString(),
    trugenKey: process.env.TRUGEN_API_KEY ? '✓ SET' : '✗ MISSING',
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
  ║   TruGen Key: ${process.env.TRUGEN_API_KEY ? '✓ SET' : '✗ MISSING'}              ║
  ╚══════════════════════════════════════╝
  `)
})

export default app