import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { IoCheckmarkCircleOutline, IoAlertCircleOutline, IoMailOutline } from 'react-icons/io5'
import { verifyEmail, resendVerification } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import styles from './Login.module.css'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const [status, setStatus] = useState(token ? 'verifying' : 'idle')
  const [error, setError] = useState('')
  const [resendState, setResendState] = useState('idle')

  // Guards against StrictMode's dev-mode double effect invocation. Without
  // this, the same token gets sent to the backend twice: the first call
  // succeeds and marks the token used, the second gets "invalid/expired"
  // back and overwrites the success state that already landed.
  const verifiedTokenRef = useRef(null)

  useEffect(() => {
    if (!token) return
    if (verifiedTokenRef.current === token) return
    verifiedTokenRef.current = token

    verifyEmail(token)
      .then(() => {
        setStatus('success')
        if (user) updateUser({ isVerified: true })
      })
      .catch((err) => {
        setStatus('error')
        setError(err.response?.data?.message || 'This verification link is invalid or has expired.')
      })
  }, [token])

  const handleResend = async () => {
    setResendState('sending')
    try {
      await resendVerification()
      setResendState('sent')
    } catch {
      setResendState('idle')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.imagePanel} />

        <div className={styles.formPanel}>
          <div className={styles.brandMark}>Foo <span>D</span> Valley</div>

          {status === 'verifying' && (
            <div className={styles.messageState}>
              <div className={styles.spinner} />
              <p className={styles.messageText}>Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className={styles.messageState}>
              <IoCheckmarkCircleOutline className={styles.successIcon} />
              <h2 className={styles.title}>Email verified</h2>
              <button className={styles['submit-btn']} onClick={() => navigate('/')}>
                Go to Home
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className={styles.messageState}>
              <IoAlertCircleOutline className={styles.errorIcon} />
              <h2 className={styles.title}>Link expired or invalid</h2>
              <p className={styles.messageText}>{error}</p>
              {user && !user.isVerified && (
                <button
                  className={styles['submit-btn']}
                  onClick={handleResend}
                  disabled={resendState === 'sending'}
                >
                  {resendState === 'sending' ? 'Sending...' : resendState === 'sent' ? 'Email sent' : 'Send a new link'}
                </button>
              )}
            </div>
          )}

          {status === 'idle' && (
            <div className={styles.messageState}>
              <IoMailOutline className={styles.mailIcon} />
              {user ? (
                user.isVerified ? (
                  <>
                    <h2 className={styles.title}>Already verified</h2>
                    <Link to="/" className={styles['submit-btn']}>Go to Home</Link>
                  </>
                ) : (
                  <>
                    <h2 className={styles.title}>Confirm your email</h2>
                    <p className={styles.messageText}>Sent to <strong>{user.email}</strong></p>
                    <button
                      className={styles['submit-btn']}
                      onClick={handleResend}
                      disabled={resendState === 'sending'}
                    >
                      {resendState === 'sending' ? 'Sending...' : resendState === 'sent' ? 'Email sent' : 'Resend verification email'}
                    </button>
                  </>
                )
              ) : (
                <>
                  <h2 className={styles.title}>Check your email</h2>
                  <Link to="/login" className={styles['submit-btn']}>Go to Login</Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail