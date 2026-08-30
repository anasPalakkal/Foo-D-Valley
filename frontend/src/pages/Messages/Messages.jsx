import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import styles from './Messages.module.css'
import { getConversations } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { timeAgo } from '../../utils/timeAgo'

const PAGE_SIZE = 20

const Messages = () => {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const { socket } = useSocket()

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getConversations(undefined, PAGE_SIZE)
      setConversations(data.conversations || [])
      setHasMore(!!data.hasMore)
      setError('')
    } catch (err) {
      console.error('getConversations error:', err)
      setError('Failed to load messages.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  // conversation:updated is broadcast to each participant's personal
  // user:${userId} room (always joined, from initializeSocket) — unlike
  // message:new, which only reaches sockets that joined that specific
  // conversation:${id} room. The inbox isn't viewing any single conversation,
  // so message:new would never have fired here; conversation:updated is the
  // correct event, confirmed against messageHandlers.js.
  useEffect(() => {
    if (!socket || !user) return

    const handleConversationUpdated = (update) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === update.conversationId)
        if (idx === -1) return prev // not in the currently loaded page

        const updated = {
          ...prev[idx],
          lastMessageAt: update.lastMessageAt,
          lastMessagePreview: update.lastMessagePreview,
          lastMessageSenderId: update.lastMessageSenderId,
          unreadCount:
            update.lastMessageSenderId === user.id
              ? prev[idx].unreadCount
              : prev[idx].unreadCount + 1,
        }

        const rest = prev.filter((c) => c.id !== update.conversationId)
        return [updated, ...rest]
      })
    }

    socket.on('conversation:updated', handleConversationUpdated)
    return () => socket.off('conversation:updated', handleConversationUpdated)
  }, [socket, user])

  const loadMore = async () => {
    if (conversations.length === 0) return
    try {
      setLoadingMore(true)
      const lastId = conversations[conversations.length - 1].id
      const data = await getConversations(lastId, PAGE_SIZE)
      setConversations((prev) => [...prev, ...(data.conversations || [])])
      setHasMore(!!data.hasMore)
    } catch (err) {
      console.error('loadMore conversations error:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Messages</h1>

      {loading && <p className={styles.stateText}>Loading...</p>}
      {!loading && error && <p className={styles.stateText}>{error}</p>}
      {!loading && !error && conversations.length === 0 && (
        <p className={styles.stateText}>No conversations yet.</p>
      )}

      <div className={styles.list}>
        {conversations.map((c) => {
          const other = c.otherParticipant
          return (
            <Link key={c.id} to={`/messages/${c.id}`} className={styles.item}>
              <img src={other?.avatarUrl || '/D.png'} alt="" className={styles.avatar} />
              <div className={styles.itemBody}>
                <div className={styles.itemTop}>
                  <span className={styles.itemName}>
                    {other?.isDeleted ? 'Deleted user' : other?.name || 'Unknown'}
                  </span>
                  {c.lastMessageAt && (
                    <span className={styles.itemTime}>{timeAgo(c.lastMessageAt)}</span>
                  )}
                </div>
                <p className={styles.itemPreview}>
                  {c.lastMessagePreview || 'Start the conversation'}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className={styles.unreadBadge}>
                  {c.unreadCount > 9 ? '9+' : c.unreadCount}
                </span>
              )}
            </Link>
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

export default Messages