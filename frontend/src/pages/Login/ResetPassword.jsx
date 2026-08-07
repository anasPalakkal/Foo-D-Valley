import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { IoLockClosedOutline, IoCheckmarkCircleOutline, IoAlertCircleOutline } from 'react-icons/io5'
import { resetPassword } from '../../api/api'
import styles from './Login.module.css'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'This link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.imagePanel} />
          <div className={styles.formPanel}>
            <div className={styles.brandMark}>Foo <span>D</span> Valley</div>
            <div className={styles.messageState}>
              <IoAlertCircleOutline className={styles.errorIcon} />
              <h2 className={styles.title}>Missing reset token</h2>
              <Link to="/forgot-password" className={styles['submit-btn']}>Request a new link</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.imagePanel} />

        <div className={styles.formPanel}>
          <div className={styles.brandMark}>Foo <span>D</span> Valley</div>

          {done ? (
            <div className={styles.messageState}>
              <IoCheckmarkCircleOutline className={styles.successIcon} />
              <h2 className={styles.title}>Password updated</h2>
              <button className={styles['submit-btn']} onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <h2 className={styles.title}>New password</h2>

              {error && <p className={styles.error}>{error}</p>}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles['form-group']}>
                  <label>New Password</label>
                  <div className={styles.inputWithIcon}>
                    <IoLockClosedOutline className={styles.inputIcon} />
                    <input
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles['form-group']}>
                  <label>Confirm Password</label>
                  <div className={styles.inputWithIcon}>
                    <IoLockClosedOutline className={styles.inputIcon} />
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className={styles['submit-btn']} disabled={loading}>
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword