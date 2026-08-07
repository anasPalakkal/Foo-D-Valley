import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { IoWarningOutline, IoCloseOutline } from 'react-icons/io5'
import styles from './Toast.module.css'

const ToastContext = createContext(null)
const AUTO_DISMISS_MS = 6000

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null)
  const timeoutRef = useRef(null)

  const showToast = useCallback((message, options = {}) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast({ message, ...options })
    timeoutRef.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS)
  }, [])

  const dismiss = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setToast(null)
  }

  // api.js dispatches this whenever a requireVerified route returns 403 —
  // same cross-module event pattern as 'auth:logout' in AuthContext.
  useEffect(() => {
    const handleUnverified = () => {
      showToast('Verify your email to use this feature.', {
        linkTo: '/verify-email',
        linkLabel: 'Verify email',
      })
    }
    window.addEventListener('auth:unverified', handleUnverified)
    return () => window.removeEventListener('auth:unverified', handleUnverified)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={styles.toast} role="alert">
          <IoWarningOutline className={styles.toastIcon} />
          <span className={styles.toastMessage}>{toast.message}</span>
          {toast.linkTo && (
            <Link to={toast.linkTo} className={styles.toastLink} onClick={dismiss}>
              {toast.linkLabel}
            </Link>
          )}
          <button className={styles.toastClose} onClick={dismiss} aria-label="Dismiss">
            <IoCloseOutline size={18} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}