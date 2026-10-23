import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './ProtectedRoute.module.css'

const SLOW_LOAD_MS = 5000

const ProtectedRoute = ({ children }) => {
  const { user, loading, authError, retrySession } = useAuth()
  const [slow, setSlow] = useState(false)

  // Cold start on the free tier takes up to ~60s; say so instead of
  // showing a blank screen.
  useEffect(() => {
    if (!loading) {
      setSlow(false)
      return
    }
    const t = setTimeout(() => setSlow(true), SLOW_LOAD_MS)
    return () => clearTimeout(t)
  }, [loading])

  if (loading) {
    return (
      <div className={styles.state} role="status" aria-live="polite">
        <div className={styles.spinner} />
        {slow && (
          <p className={styles.message}>
            The server is waking up. This can take up to a minute.
          </p>
        )}
      </div>
    )
  }

  if (authError) {
    return (
      <div className={styles.state} role="alert">
        <p className={styles.message}>
          Could not verify your session. The server may be busy or unreachable.
        </p>
        <button type="button" className={styles.retry} onClick={retrySession}>
          Try again
        </button>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute