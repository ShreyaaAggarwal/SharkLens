import { createContext, useContext, useState, useCallback } from 'react'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [user, setUser]       = useState(null)        // logged-in user
  const [config, setConfig]   = useState({
    shark:      'cuban',
    difficulty: 'Realistic',
    bilingual:  false,
    duration:   10,
    agentId:    import.meta.env.VITE_TRUGEN_AGENT_ID || '',
  })
  const [deckFile, setDeckFile]       = useState(null)
  const [deckText, setDeckText]       = useState('')
  const [sessionData, setSessionData] = useState(null)   // post-session ML results
  const [conversationId, setConversationId] = useState(null)

  const updateConfig = useCallback((patch) =>
    setConfig(prev => ({ ...prev, ...patch })), [])

  const logout = useCallback(() => setUser(null), [])

  return (
    <Ctx.Provider value={{
      user, setUser, logout,
      config, updateConfig,
      deckFile, setDeckFile,
      deckText, setDeckText,
      sessionData, setSessionData,
      conversationId, setConversationId,
    }}>
      {children}
    </Ctx.Provider>
  )
}
