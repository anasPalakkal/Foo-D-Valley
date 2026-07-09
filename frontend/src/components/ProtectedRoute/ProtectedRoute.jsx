import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) return null // or a spinner, matches app's existing loading pattern

  if (!user) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute