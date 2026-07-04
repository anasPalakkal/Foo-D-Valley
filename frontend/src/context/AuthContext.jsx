import React, { createContext, useContext, useState, useEffect } from 'react'
import { getMe, login as apiLogin, register as apiRegister } from '../api/api'

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
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    getMe()
      .then((data) => setUser(normalizeUser(data)))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const data = await apiLogin(email, password)
    localStorage.setItem('token', data.token)
    setUser(normalizeUser(data.user))  // normalize here
  }

  const register = async (name, email, password) => {
    const data = await apiRegister(name, email, password)
    localStorage.setItem('token', data.token)
    setUser(normalizeUser(data.user))  // and here
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
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