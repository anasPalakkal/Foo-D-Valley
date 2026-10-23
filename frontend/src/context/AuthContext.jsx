import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe, login as apiLogin, register as apiRegister, logoutRequest, doRefresh, setAccessToken } from '../api/api'

const AuthContext = createContext(null)

export const normalizeUser = (user) => ({
  ...user,
  followersCount: user._count?.followers ?? 0,
  followingCount: user._count?.following ?? 0,
  recipesCount: user._count?.recipes ?? 0,
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // True when the session could not be verified (server asleep, rate limited,
  // network down). Distinct from "logged out": the cookie may still be valid.
  const [authError, setAuthError] = useState(false)

  const restoreSession = useCallback(async () => {
    setAuthError(false)
    setLoading(true)
    try {
      await doRefresh() // sets the access token internally
      const me = await getMe()
      setUser(normalizeUser(me))
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        // Server explicitly rejected the session: no cookie, expired, revoked.
        setAccessToken(null)
        setUser(null)
      } else {
        // 429, 5xx, timeout, network error: do not claim the user is logged out.
        setAuthError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  // Dispatched by api.js only when refresh is explicitly rejected (401/403).
  useEffect(() => {
    const handleForcedLogout = () => setUser(null)
    window.addEventListener('auth:logout', handleForcedLogout)
    return () => window.removeEventListener('auth:logout', handleForcedLogout)
  }, [])

  const login = async (email, password) => {
    const data = await apiLogin(email, password)
    setAccessToken(data.accessToken)
    setUser(normalizeUser(data.user))
  }

  const register = async (name, email, password) => {
    const data = await apiRegister(name, email, password)
    setAccessToken(data.accessToken)
    setUser(normalizeUser(data.user))
  }

  const logout = () => {
    setAccessToken(null)
    setUser(null)
    logoutRequest().catch(() => {})
  }

  const updateUser = (partialUser) => {
    setUser((prev) => ({ ...prev, ...partialUser }))
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, authError, retrySession: restoreSession, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}