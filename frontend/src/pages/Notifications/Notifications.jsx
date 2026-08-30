import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FaHeart, FaComment, FaUserPlus, FaExclamationCircle, FaCheckDouble } from 'react-icons/fa'
import styles from './Notifications.module.css'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  resendVerification,
} from '../../api/api'
import { useSocket } from '../../context/SocketContext'
import { timeAgo } from '../../utils/timeAgo'

const PAGE_SIZE = 20

const TYPE_CONFIG = {
  LIKE: { icon: FaHeart, text: (n) => `${n.actor?.name || 'Someone'} liked your recipe` },
  COMMENT: { icon: FaComment, text: (n) => `${n.actor?.name || 'Someone'} commented on your recipe` },
  FOLLOW: { icon: FaUserPlus, text: (n) => `${n.actor?.name || 'Someone'} started following you` },
  VERIFY_REMINDER: {
    icon: FaExclamationCircle,
    text: () => 'Please verify your email to keep your account active',
  },
}

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [resendState, setResendState] = useState('idle') // idle | sending | sent
  const { socket } = useSocket()

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listNotifications(undefined, PAGE_SIZE)
      setNotifications(data.notifications || [])
      setHasMore(!!data.hasMore)
      setError('')
    } catch (err) {
      console.error('listNotifications error:', err)
      setError('Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  useEffect(() => {
    if (!socket) return
    const handleNew = (notification) => setNotifications((prev) => [notification, ...prev])
    socket.on('notification:new', handleNew)
    return () => socket.off('notification:new', handleNew)
  }, [socket])

  const loadMore = async () => {
    if (notifications.length === 0) return
    try {
      setLoadingMore(true)
      const lastId = notifications[notifications.length - 1].id
      const data = await listNotifications(lastId, PAGE_SIZE)
      setNotifications((prev) => [...prev, ...(data.notifications || [])])
      setHasMore(!!data.hasMore)
    } catch (err) {
      console.error('loadMore notifications error:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleItemClick = (notification) => {
    if (notification.isRead) return
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    )
    markNotificationRead(notification.id).catch((err) => {
      console.error('markNotificationRead error:', err)
      // Revert on failure — the UI shouldn't claim a read state the server rejected.
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: false } : n))
      )
    })
  }

  const handleMarkAll = async () => {
    const prevState = notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await markAllNotificationsRead()
    } catch (err) {
      console.error('markAllNotificationsRead error:', err)
      setNotifications(prevState)
    }
  }

  const handleResend = async () => {
    try {
      setResendState('sending')
      await resendVerification()
      setResendState('sent')
    } catch (err) {
      console.error('resendVerification error:', err)
      setResendState('idle')
    }
  }

  // COMMENT's entityId is the comment id, not the recipe id (per the Phase F
  // bug fix) — there's no recipe id in the payload to build a working link
  // from. Returns null until the backend enriches this; null means the row
  // still marks read on click, it just doesn't navigate anywhere.
  const renderTarget = (notification) => {
    if (notification.type === 'LIKE' && notification.entityType === 'recipe') {
      return `/recipes/${notification.entityId}`
    }
    if (notification.type === 'FOLLOW' && notification.actor) {
      return `/profile/${notification.actor.id}`
    }
    return null
  }

  const hasUnread = notifications.some((n) => !n.isRead)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Notifications</h1>
        {hasUnread && (
          <button className={styles.markAllBtn} onClick={handleMarkAll}>
            <FaCheckDouble /> Mark all as read
          </button>
        )}
      </div>

      {loading && <p className={styles.stateText}>Loading...</p>}
      {!loading && error && <p className={styles.stateText}>{error}</p>}
      {!loading && !error && notifications.length === 0 && (
        <p className={styles.stateText}>No notifications yet.</p>
      )}

      <div className={styles.list}>
        {notifications.map((notification) => {
          const config = TYPE_CONFIG[notification.type]
          if (!config) return null
          const Icon = config.icon
          const target = renderTarget(notification)
          const rowClass = `${styles.item} ${!notification.isRead ? styles.itemUnread : ''}`

          const content = (
            <>
              <span className={styles.iconWrap}>
                <Icon />
              </span>
              <div className={styles.itemBody}>
                <p className={styles.itemText}>{config.text(notification)}</p>
                <span className={styles.itemTime}>{timeAgo(notification.createdAt)}</span>
                {notification.type === 'VERIFY_REMINDER' && (
                  <button
                    className={styles.resendBtn}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleResend()
                    }}
                    disabled={resendState !== 'idle'}
                  >
                    {resendState === 'sent'
                      ? 'Email sent'
                      : resendState === 'sending'
                        ? 'Sending...'
                        : 'Resend email'}
                  </button>
                )}
              </div>
              {!notification.isRead && <span className={styles.unreadDot} />}
            </>
          )

          return target ? (
            <Link
              key={notification.id}
              to={target}
              className={rowClass}
              onClick={() => handleItemClick(notification)}
            >
              {content}
            </Link>
          ) : (
            <div
              key={notification.id}
              className={rowClass}
              onClick={() => handleItemClick(notification)}
            >
              {content}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}

export default Notifications