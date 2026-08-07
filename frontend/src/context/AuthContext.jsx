import React, { createContext, useContext, useState, useEffect } from 'react'
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

  // On mount there is no access token in memory yet (page was just loaded/refreshed).
  // The only way to know if the user has a valid session is to ask the server —
  // the httpOnly refresh cookie, if present and valid, gets exchanged for a new
  // access token. If it fails (no cookie, expired, revoked), the user is logged out.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const accessToken = await doRefresh()
        setAccessToken(accessToken)
        const me = await getMe()
        setUser(normalizeUser(me))
      } catch {
        setAccessToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [])

  // api.js dispatches this when a refresh attempt fails mid-session (e.g. token
  // expired, revoked, or reuse detected). Treat it as a forced logout.
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
    // Revoke the refresh token server-side too — clearing local state alone
    // leaves the DB row (and the httpOnly cookie) still valid.
    logoutRequest().catch(() => {
      // Non-critical: client-side state is already cleared either way.
    })
  }

  const updateUser = (partialUser) => {
    setUser((prev) => ({ ...prev, ...partialUser }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}