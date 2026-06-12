import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [config, setConfig]   = useState({
    shark:          'cuban',
    difficulty:     'Realistic',
    bilingual:      false,
    duration:       10,
    agentId:        import.meta.env.VITE_TRUGEN_AGENT_ID || '',
    fundingRound:   'seed',
    sessionMode:    'solo',
    boardroomSharks: ['cuban', 'angel'],
  })
  const [deckFile, setDeckFile]             = useState(null)
  const [deckText, setDeckText]             = useState('')
  const [deckIntelligence, setDeckIntelligence] = useState(null) // Claude-analyzed deck data
  const [sessionData, setSessionData]       = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [transcript, setTranscript]         = useState('')   // ← ADDED

  // ── Pitch Passport: persistent session history ──
  const [sessionHistory, setSessionHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('sharklens_passport')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  // Save passport to localStorage whenever it updates
  useEffect(() => {
    try {
      localStorage.setItem('sharklens_passport', JSON.stringify(sessionHistory.slice(-50)))
    } catch {}
  }, [sessionHistory])

  const addSessionToPassport = useCallback((session) => {
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      shark: session.shark,
      difficulty: session.difficulty,
      fundingRound: session.fundingRound || 'seed',
      overall: session.overall,
      breakdown: session.breakdown,
      durationSec: session.durationSec,
      startupName: session.startupName || 'Unknown',
    }
    setSessionHistory(prev => [...prev, entry])
  }, [])

  const updateConfig = useCallback((patch) =>
    setConfig(prev => ({ ...prev, ...patch })), [])

  const logout = useCallback(() => {
    setUser(null)
    setDeckFile(null)
    setDeckText('')
    setDeckIntelligence(null)
    setSessionData(null)
  }, [])

  // Compute passport stats
  const passportStats = sessionHistory.length > 0 ? {
    totalSessions: sessionHistory.length,
    avgScore: Math.round(sessionHistory.reduce((a, s) => a + s.overall, 0) / sessionHistory.length),
    bestScore: Math.max(...sessionHistory.map(s => s.overall)),
    mostPracticed: (() => {
      const counts = sessionHistory.reduce((acc, s) => { acc[s.shark] = (acc[s.shark] || 0) + 1; return acc }, {})
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'cuban'
    })(),
    trend: sessionHistory.length >= 2
      ? sessionHistory[sessionHistory.length - 1].overall - sessionHistory[sessionHistory.length - 2].overall
      : 0,
  } : null

  return (
    <Ctx.Provider value={{
      user, setUser, logout,
      config, updateConfig,
      deckFile, setDeckFile,
      deckText, setDeckText,
      deckIntelligence, setDeckIntelligence,
      sessionData, setSessionData,
      conversationId, setConversationId,
      sessionHistory, addSessionToPassport,
      passportStats,
      transcript, setTranscript,   // ← ADDED
    }}>
      {children}
    </Ctx.Provider>
  )
}