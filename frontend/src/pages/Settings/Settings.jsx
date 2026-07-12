import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword, deleteAccount } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import styles from './Settings.module.css'

const Settings = () => {
    const { logout } = useAuth()
    const navigate = useNavigate()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletePassword, setDeletePassword] = useState('')
    const [deleteError, setDeleteError] = useState('')
    const [deleteLoading, setDeleteLoading] = useState(false)

    const handleChangePassword = async (e) => {
        e.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')

        if (newPassword.length < 8) {
            return setPasswordError('New password must be at least 8 characters.')
        }
        if (newPassword !== confirmNewPassword) {
            return setPasswordError('New passwords do not match.')
        }
        if (newPassword === currentPassword) {
            return setPasswordError('New password must be different from current password.')
        }

        setPasswordLoading(true)
        try {
            await changePassword(currentPassword, newPassword)
            setPasswordSuccess('Password updated successfully.')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmNewPassword('')
        } catch (err) {
            setPasswordError(err?.response?.data?.message || 'Failed to update password.')
        } finally {
            setPasswordLoading(false)
        }
    }

    const handleDeleteAccount = async (e) => {
        e.preventDefault()
        setDeleteError('')

        if (!deletePassword) {
            return setDeleteError('Password is required.')
        }

        setDeleteLoading(true)
        try {
            await deleteAccount(deletePassword)
            logout()
            navigate('/')
        } catch (err) {
            setDeleteError(err?.response?.data?.message || 'Failed to delete account.')
            setDeleteLoading(false)
        }
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Settings</h1>

            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Change Password</h2>
                <form className={styles.form} onSubmit={handleChangePassword}>
                    {passwordError && <p className={styles.error}>{passwordError}</p>}
                    {passwordSuccess && <p className={styles.success}>{passwordSuccess}</p>}

                    <label className={styles.label}>Current Password</label>
                    <input
                        className={styles.input}
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                    />

                    <label className={styles.label}>New Password</label>
                    <input
                        className={styles.input}
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />

                    <label className={styles.label}>Confirm New Password</label>
                    <input
                        className={styles.input}
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                    />

                    <button className={styles.primaryBtn} type="submit" disabled={passwordLoading}>
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </section>

            <section className={`${styles.section} ${styles.dangerSection}`}>
                <h2 className={styles.sectionTitle}>Delete Account</h2>
                <p className={styles.dangerText}>
                    Deleting your account hides your profile, recipes, and comments immediately.
                    Your data is permanently erased after 14 days. Log back in any time before
                    then to cancel and restore your account.
                </p>

                {!showDeleteConfirm ? (
                    <button className={styles.dangerBtn} onClick={() => setShowDeleteConfirm(true)}>
                        Delete My Account
                    </button>
                ) : (
                    <form className={styles.form} onSubmit={handleDeleteAccount}>
                        {deleteError && <p className={styles.error}>{deleteError}</p>}

                        <label className={styles.label}>Confirm Password</label>
                        <input
                            className={styles.input}
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            required
                        />

                        <div className={styles.deleteActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setDeletePassword('')
                                    setDeleteError('')
                                }}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button className={styles.dangerBtn} type="submit" disabled={deleteLoading}>
                                {deleteLoading ? 'Deleting...' : 'Confirm Deletion'}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    )
}

export default Settings