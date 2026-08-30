import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { getAccessToken } from '../api/api'

const SocketContext = createContext(null)

// Backend mounts Socket.IO on the httpServer root, not under /api — strip the
// /api suffix from the same env var api.js uses, so there's one source of truth
// for the server origin instead of a second env var to keep in sync.
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  /\/api\/?$/,
  ''
)

export const SocketProvider = ({ children }) => {
  const { user, loading } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Auth state not resolved yet (initial refresh/getMe in flight) — wait.
    if (loading) return

    if (!user) {
      setSocket((prev) => {
        prev?.disconnect()
        return null
      })
      setConnected(false)
      return
    }

    const newSocket = io(SOCKET_URL, {
      // Function form, not a static object — access tokens are short-lived and
      // rotate via refresh. If the socket reconnects after a drop, this re-reads
      // whatever token is current at that moment instead of replaying a stale one.
      auth: (cb) => cb({ token: getAccessToken() }),
      withCredentials: true,
      autoConnect: true,
    })

    newSocket.on('connect', () => setConnected(true))
    newSocket.on('disconnect', () => setConnected(false))

    // Auth failures (expired/invalid token) surface here, not as 'connect_error'
    // being silently swallowed — log for now, no retry-with-refresh loop yet.
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })

    // Set immediately (not just on 'connect') so consumers can register
    // listeners — 'notification:new', 'message:new', etc. — right away instead
    // of racing the handshake.
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  return (
    <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider')
  return ctx
}