import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { IoMailOutline, IoCheckmarkCircleOutline } from 'react-icons/io5'
import { forgotPassword } from '../../api/api'
import styles from './Login.module.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(email)
    } finally {
      // Backend deliberately returns an identical response whether the email
      // exists or not — matching that here rather than branching on outcome.
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.imagePanel} />

        <div className={styles.formPanel}>
          <div className={styles.brandMark}>Foo <span>D</span> Valley</div>

          {sent ? (
            <div className={styles.messageState}>
              <IoCheckmarkCircleOutline className={styles.successIcon} />
              <h2 className={styles.title}>Check your inbox</h2>
              <p className={styles.messageText}>
                If an account exists for <strong>{email}</strong>, a reset link is on its way.
              </p>
              <Link to="/login" className={styles.switch}>Back to Login</Link>
            </div>
          ) : (
            <>
              <h2 className={styles.title}>Forgot password?</h2>
              <p className={styles.subtitle}>Enter your email and we'll send you a reset link</p>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles['form-group']}>
                  <label>Email</label>
                  <div className={styles.inputWithIcon}>
                    <IoMailOutline className={styles.inputIcon} />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className={styles['submit-btn']} disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <p className={styles.switch}>
                Remembered it? <Link to="/login">Back to Login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword