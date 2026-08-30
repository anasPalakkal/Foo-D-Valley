import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaHeart, FaComment, FaUserPlus, FaExclamationCircle, FaCheckDouble, FaArrowLeft } from 'react-icons/fa'
import styles from './Notifications.module.css'
import { getCommentContext, listNotifications, markNotificationRead, markAllNotificationsRead, resendVerification } from '../../api/api'
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
  const navigate = useNavigate()
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

  const markAsRead = (notification) => {
    if (notification.isRead) return
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
    markNotificationRead(notification.id).catch((err) => {
      console.error('markNotificationRead error:', err)
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, isRead: false } : n)))
    })
  }

  const handleRowClick = async (notification) => {
    markAsRead(notification)

    if (notification.type === 'LIKE' && notification.entityType === 'recipe') {
      navigate(`/recipes/${notification.entityId}`)
      return
    }
    if (notification.type === 'FOLLOW' && notification.actor) {
      navigate(`/profile/${notification.actor.id}`, { state: { tab: 'followers' } })
      return
    }
    if (notification.type === 'COMMENT') {
      try {
        const ctx = await getCommentContext(notification.entityId)
        navigate(ctx.isExternal ? `/recipes/${ctx.externalId}?type=external` : `/recipes/${ctx.recipeId}`)
      } catch (err) {
        console.error('getCommentContext error:', err)
      }
      return
    }
    // VERIFY_REMINDER: no navigation target, row click just marks read
  }

  const handleAvatarClick = (e, actorId) => {
    e.stopPropagation()
    navigate(`/profile/${actorId}`)
  }

  const hasUnread = notifications.some((n) => !n.isRead)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="Back">
            <FaArrowLeft />
          </button>
          <h1>Notifications</h1>
        </div>
        {hasUnread && (
          <button className={styles.markAllBtn} onClick={handleMarkAll}>
            <FaCheckDouble /> Mark all as read
          </button>
        )}
      </div>

      {!loading && error && <p className={styles.stateText}>{error}</p>}
      {!loading && !error && notifications.length === 0 && (
        <p className={styles.stateText}>No notifications yet.</p>
      )}

      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.skeletonItem} aria-hidden="true">
              <div className={`${styles.skeletonAvatar} ${styles.skeletonFill}`} />
              <div className={styles.skeletonBody}>
                <div className={`${styles.skeletonTextLine} ${styles.skeletonFill}`} />
                <div className={`${styles.skeletonTimeLine} ${styles.skeletonFill}`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map((notification) => {
            const config = TYPE_CONFIG[notification.type]
            if (!config) return null
            const Icon = config.icon
            const rowClass = `${styles.item} ${!notification.isRead ? styles.itemUnread : ''}`

            return (
              <div key={notification.id} className={rowClass} onClick={() => handleRowClick(notification)}>
                {notification.actor ? (
                  <span className={styles.avatarWrap} onClick={(e) => handleAvatarClick(e, notification.actor.id)}>
                    {notification.actor.avatarUrl ? (
                      <img src={notification.actor.avatarUrl} alt="" className={styles.actorAvatar} />
                    ) : (
                      <div className={styles.actorAvatarFallback}>
                        {notification.actor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={styles.iconBadge}>
                      <Icon />
                    </span>
                  </span>
                ) : (
                  <span className={styles.iconWrap}>
                    <Icon />
                  </span>
                )}

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
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  )
}

export default Notifications