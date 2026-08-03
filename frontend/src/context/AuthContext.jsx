import React, { createContext, useContext, useState, useEffect } from 'react'
import { getMe, login as apiLogin, register as apiRegister, logoutRequest } from '../api/api'

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

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setLoading(false)
      return
    }

    getMe()
      .then((data) => setUser(normalizeUser(data)))
      .catch(() => localStorage.removeItem('accessToken'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const data = await apiLogin(email, password)
    localStorage.setItem('accessToken', data.accessToken)
    setUser(normalizeUser(data.user))
  }

  const register = async (name, email, password) => {
    const data = await apiRegister(name, email, password)
    localStorage.setItem('accessToken', data.accessToken)
    setUser(normalizeUser(data.user))
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    setUser(null)
    // Revoke the refresh token server-side too — clearing localStorage alone
    // leaves the DB row (and the httpOnly cookie, if not cleared) still valid.
    logoutRequest().catch(() => {
      // Non-critical: client-side state is already cleared either way.
    })
  }

  // Patch user in context after profile edits — avoids full re-login
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