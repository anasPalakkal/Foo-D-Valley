import React, { useState, useRef, useEffect } from 'react'
import { updateProfile, uploadAvatar, uploadBanner, removeAvatar, removeBanner } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import styles from './EditProfileModal.module.css'
import { IoClose, IoCamera, IoTrashOutline, IoImageOutline } from 'react-icons/io5'
import { normalizeUser } from '../../context/AuthContext'

const EditProfileModal = ({ profile, onClose, onSuccess }) => {
  const { updateUser } = useAuth()

  const [name, setName] = useState(profile.name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl || null)
  const [bannerPreview, setBannerPreview] = useState(profile.bannerUrl || null)
  // Tracks explicit "remove" action so save() knows to call the delete endpoint
  // instead of just leaving the field untouched
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [bannerRemoved, setBannerRemoved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Which image's menu is currently open — null, 'avatar', or 'banner'
  const [openMenu, setOpenMenu] = useState(null)

  const avatarRef = useRef()
  const bannerRef = useRef()
  const avatarMenuRef = useRef()
  const bannerMenuRef = useRef()

  // Lock background page scroll while the modal is open
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  // Close open menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        avatarMenuRef.current && !avatarMenuRef.current.contains(e.target) &&
        bannerMenuRef.current && !bannerMenuRef.current.contains(e.target)
      ) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarRemoved(false)
    setOpenMenu(null)
  }

  const handleBannerChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setBannerRemoved(false)
    setOpenMenu(null)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setAvatarRemoved(true)
    setOpenMenu(null)
  }

  const handleRemoveBanner = () => {
    setBannerFile(null)
    setBannerPreview(null)
    setBannerRemoved(true)
    setOpenMenu(null)
  }

  const handleSave = async () => {
    if (!name.trim()) return setError('Name cannot be empty.')
    setError('')
    setLoading(true)

    try {
      let updatedUser = {}

      const profileResult = await updateProfile({ name: name.trim(), bio })
      updatedUser = { ...profileResult }

      // Avatar: new upload takes priority over a pending removal
      if (avatarFile) {
        const fd = new FormData()
        fd.append('avatar', avatarFile)
        const avatarResult = await uploadAvatar(fd)
        updatedUser = { ...updatedUser, avatarUrl: avatarResult.avatarUrl }
      } else if (avatarRemoved) {
        const result = await removeAvatar()
        updatedUser = { ...updatedUser, avatarUrl: result.avatarUrl }
      }

      // Banner: same priority rule
      if (bannerFile) {
        const fd = new FormData()
        fd.append('banner', bannerFile)
        const bannerResult = await uploadBanner(fd)
        updatedUser = { ...updatedUser, bannerUrl: bannerResult.bannerUrl }
      } else if (bannerRemoved) {
        const result = await removeBanner()
        updatedUser = { ...updatedUser, bannerUrl: result.bannerUrl }
      }

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
          <div className={styles.bannerArea} ref={bannerMenuRef}>
            <div
              className={styles.bannerClickArea}
              onClick={() => setOpenMenu(openMenu === 'banner' ? null : 'banner')}
            >
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner" className={styles.bannerImg} />
              ) : (
                <div className={styles.bannerPlaceholder}>Click to add a cover photo</div>
              )}
              <div className={styles.bannerOverlay}>
                <IoCamera size={20} />
                <span>Change Cover</span>
              </div>
            </div>

            {openMenu === 'banner' && (
              <div className={styles.imageMenu}>
                <button
                  className={styles.imageMenuItem}
                  onClick={() => { bannerRef.current.click() }}
                >
                  <IoImageOutline size={16} /> Upload new photo
                </button>
                {/* Only shown when there's actually something to remove */}
                {bannerPreview && (
                  <button
                    className={`${styles.imageMenuItem} ${styles.imageMenuItemDanger}`}
                    onClick={handleRemoveBanner}
                  >
                    <IoTrashOutline size={16} /> Remove current photo
                  </button>
                )}
              </div>
            )}

            <input ref={bannerRef} type="file" accept="image/*" hidden onChange={handleBannerChange} />
          </div>

          {/* Avatar */}
          <div className={styles.avatarRow}>
            <div className={styles.avatarWrap} ref={avatarMenuRef}>
              <div
                className={styles.avatarClickArea}
                onClick={() => setOpenMenu(openMenu === 'avatar' ? null : 'avatar')}
              >
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
              </div>

              {openMenu === 'avatar' && (
                <div className={`${styles.imageMenu} ${styles.avatarMenu}`}>
                  <button
                    className={styles.imageMenuItem}
                    onClick={() => { avatarRef.current.click() }}
                  >
                    <IoImageOutline size={16} /> Upload new photo
                  </button>
                  {avatarPreview && (
                    <button
                      className={`${styles.imageMenuItem} ${styles.imageMenuItemDanger}`}
                      onClick={handleRemoveAvatar}
                    >
                      <IoTrashOutline size={16} /> Remove current photo
                    </button>
                  )}
                </div>
              )}

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