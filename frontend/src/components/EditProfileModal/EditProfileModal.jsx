import React, { useState, useRef } from 'react'
import { updateProfile, uploadAvatar, uploadBanner } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import styles from './EditProfileModal.module.css'
import { IoClose, IoCamera } from 'react-icons/io5'
import { normalizeUser } from '../../context/AuthContext'

const EditProfileModal = ({ profile, onClose, onSuccess }) => {
  const { updateUser } = useAuth()

  const [name, setName] = useState(profile.name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl || null)
  const [bannerPreview, setBannerPreview] = useState(profile.bannerUrl || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const avatarRef = useRef()
  const bannerRef = useRef()

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleBannerChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!name.trim()) return setError('Name cannot be empty.')
    setError('')
    setLoading(true)

    try {
      let updatedUser = {}

      // Update name/bio
      const profileResult = await updateProfile({ name: name.trim(), bio })
      updatedUser = { ...profileResult }

      // Upload avatar if changed
      if (avatarFile) {
        const fd = new FormData()
        fd.append('avatar', avatarFile)
        const avatarResult = await uploadAvatar(fd)
        updatedUser = { ...updatedUser, avatarUrl: avatarResult.avatarUrl }
      }

      // Upload banner if changed
      if (bannerFile) {
        const fd = new FormData()
        fd.append('banner', bannerFile)
        const bannerResult = await uploadBanner(fd)
        updatedUser = { ...updatedUser, bannerUrl: bannerResult.bannerUrl }
      }

      // Sync AuthContext so navbar reflects changes immediately
      updateUser(normalizeUser(updatedUser))
      onSuccess(updatedUser)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save changes.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Edit Profile</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IoClose size={22} />
          </button>
        </div>

        <div className={styles.body}>
          {error && <p className={styles.error}>{error}</p>}

          {/* Banner */}
          <div className={styles.bannerArea} onClick={() => bannerRef.current.click()}>
            {bannerPreview ? (
              <img src={bannerPreview} alt="Banner" className={styles.bannerImg} />
            ) : (
              <div className={styles.bannerPlaceholder}>Click to add a cover photo</div>
            )}
            <div className={styles.bannerOverlay}>
              <IoCamera size={20} />
              <span>Change Cover</span>
            </div>
            <input ref={bannerRef} type="file" accept="image/*" hidden onChange={handleBannerChange} />
          </div>

          {/* Avatar */}
          <div className={styles.avatarRow}>
            <div className={styles.avatarWrap} onClick={() => avatarRef.current.click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className={styles.avatar} />
              ) : (
                <div className={styles.avatarFallback}>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.avatarOverlay}>
                <IoCamera size={16} />
              </div>
              <input ref={avatarRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </div>
          </div>

          {/* Fields */}
          <label className={styles.label}>Name *</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />

          <label className={styles.label}>Bio</label>
          <textarea
            className={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people a little about yourself..."
            rows={3}
          />
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditProfileModal