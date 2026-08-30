import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaPaperPlane, FaImage, FaEllipsisV, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import styles from './Conversation.module.css'
import { getConversationById, getMessages, markConversationRead, uploadChatImage, editMessage, deleteMessage } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { timeAgo } from '../../utils/timeAgo'

const PAGE_SIZE = 30

const makeClientId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const Conversation = () => {
  const { id } = useParams()
  const conversationId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket } = useSocket()

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [composerError, setComposerError] = useState('')
  const [blockedFromSending, setBlockedFromSending] = useState(false) // EMAIL_NOT_VERIFIED
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  const otherParticipant = conversation?.participants?.find((p) => p.user.id !== user.id)?.user
  const imageMessages = messages.filter((m) => m.imageUrl && !m.deletedAt)

  const fetchThread = useCallback(async () => {
    try {
      setLoading(true)
      const [convo, msgData] = await Promise.all([
        getConversationById(conversationId),
        getMessages(conversationId, undefined, PAGE_SIZE),
      ])
      setConversation(convo)
      setMessages(msgData.messages || [])
      setHasMore(!!msgData.hasMore)
      setError('')
    } catch (err) {
      console.error('fetchThread error:', err)
      setError('Failed to load conversation.')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    fetchThread()
  }, [fetchThread])

  useEffect(() => {
    if (loading || messages.length === 0) return
    const lastMessage = messages[messages.length - 1]
    markConversationRead(conversationId, lastMessage.id).catch((err) =>
      console.error('markConversationRead error:', err)
    )
  }, [loading, messages, conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  // Close the message options menu on outside click
  useEffect(() => {
    if (!openMenuId) return
    const handler = (e) => {
      if (!e.target.closest(`.${styles.bubbleMenuWrap}`)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuId])

  // Avoids double-adding a message that arrives via both the message:send
  // ack (sender's own copy) and the message:new room broadcast (echo).
  const addMessageIfNew = useCallback((message) => {
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))
  }, [])

  useEffect(() => {
    if (!socket) return
    let cancelled = false

    // conversation:join requires an ack callback — the handler returns
    // early and silently does nothing without one.
    socket.emit('conversation:join', { conversationId }, (response) => {
      if (cancelled) return
      if (response?.code === 'EMAIL_NOT_VERIFIED') {
        setBlockedFromSending(true)
        setComposerError(response.message)
      } else if (response?.error) {
        setComposerError(response.error)
      }
    })

    const handleNewMessage = (message) => {
      if (message.conversationId !== conversationId) return
      addMessageIfNew(message)
    }
    const handleEdited = (message) => {
      if (message.conversationId !== conversationId) return
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)))
    }
    const handleDeleted = ({ messageId, conversationId: cid }) => {
      if (cid !== conversationId) return
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    }

    socket.on('message:new', handleNewMessage)
    socket.on('message:edited', handleEdited)
    socket.on('message:deleted', handleDeleted)

    return () => {
      cancelled = true
      socket.emit('conversation:leave', { conversationId })
      socket.off('message:new', handleNewMessage)
      socket.off('message:edited', handleEdited)
      socket.off('message:deleted', handleDeleted)
    }
  }, [socket, conversationId, addMessageIfNew])

  const loadMore = async () => {
    if (messages.length === 0) return
    try {
      setLoadingMore(true)
      const oldestId = messages[0].id
      const data = await getMessages(conversationId, oldestId, PAGE_SIZE)
      setMessages((prev) => [...(data.messages || []), ...prev])
      setHasMore(!!data.hasMore)
    } catch (err) {
      console.error('loadMore messages error:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const emitWithAck = (event, payload) =>
    new Promise((resolve) => socket.emit(event, payload, resolve))

  const handleSendText = async () => {
    const content = draft.trim()
    if (!content || !socket || sending) return

    setSending(true)
    setComposerError('')
    try {
      const response = await emitWithAck('message:send', {
        conversationId,
        clientId: makeClientId(),
        type: 'TEXT',
        content,
      })

      if (response?.code === 'EMAIL_NOT_VERIFIED') {
        setBlockedFromSending(true)
        setComposerError(response.message)
        return
      }
      if (response?.error) {
        setComposerError(response.error)
        return
      }

      addMessageIfNew(response.message)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  const handleImagePick = () => fileInputRef.current?.click()

  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again later
    if (!file || !socket) return

    setUploadingImage(true)
    setComposerError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { imageUrl, imagePublicId } = await uploadChatImage(formData)

      const response = await emitWithAck('message:send', {
        conversationId,
        clientId: makeClientId(),
        type: 'IMAGE',
        imageUrl,
        imagePublicId,
      })

      if (response?.code === 'EMAIL_NOT_VERIFIED') {
        setBlockedFromSending(true)
        setComposerError(response.message)
        return
      }
      if (response?.error) {
        setComposerError(response.error)
        return
      }

      addMessageIfNew(response.message)
    } catch (err) {
      console.error('image send error:', err)
      setComposerError('Failed to send image.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendText()
    }
  }

  const openViewerFor = (messageId) => {
    const idx = imageMessages.findIndex((m) => m.id === messageId)
    if (idx !== -1) setViewerIndex(idx)
  }

  const handleEditStart = (m) => {
    setOpenMenuId(null)
    setEditingId(m.id)
    setEditDraft(m.content || '')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditDraft('')
  }

  const handleEditSave = async () => {
    const content = editDraft.trim()
    if (!content || editSaving) return
    setEditSaving(true)
    try {
      await editMessage(editingId, content)
      // message:edited broadcasts to the room this socket already joined — no manual state update needed
      setEditingId(null)
      setEditDraft('')
    } catch (err) {
      console.error('editMessage error:', err)
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (m, scope) => {
    setOpenMenuId(null)
    try {
      await deleteMessage(m.id, scope)
      if (scope === 'me') {
        // "delete for me" is a filter row, not a broadcast event — remove locally
        setMessages((prev) => prev.filter((msg) => msg.id !== m.id))
      }
      // scope === 'everyone' is handled by the message:deleted room broadcast
    } catch (err) {
      console.error('deleteMessage error:', err)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/messages')} aria-label="Back">
            <FaArrowLeft />
          </button>
          <div className={`${styles.skeletonHeaderAvatar} ${styles.skeletonFill}`} />
          <div className={`${styles.skeletonHeaderName} ${styles.skeletonFill}`} />
        </div>
        <div className={styles.thread}>
          {[true, false, true, true, false].map((isMine, i) => (
            <div key={i} className={`${styles.bubbleRow} ${isMine ? styles.bubbleRowMine : ''}`} aria-hidden="true">
              <div
                className={`${styles.skeletonBubble} ${styles.skeletonFill} ${isMine ? styles.skeletonBubbleMine : ''}`}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.stateText}>{error}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/messages')} aria-label="Back">
          <FaArrowLeft />
        </button>
        <div
          className={styles.headerUser}
          onClick={() => !otherParticipant?.isDeleted && navigate(`/profile/${otherParticipant.id}`)}
        >
          {otherParticipant?.avatarUrl ? (
            <img src={otherParticipant.avatarUrl} alt="" className={styles.headerAvatar} />
          ) : (
            <div className={styles.headerAvatarFallback}>
              {(otherParticipant?.isDeleted ? 'D' : otherParticipant?.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <span className={styles.headerName}>
            {otherParticipant?.isDeleted ? 'Deleted user' : otherParticipant?.name || 'Unknown'}
          </span>
        </div>
      </div>

      <div className={styles.thread}>
        {hasMore && (
          <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load earlier messages'}
          </button>
        )}

        {messages.map((m) => {
          const isMine = m.senderId === user.id
          const isEditing = editingId === m.id
          return (
            <div key={m.id} className={`${styles.bubbleRow} ${isMine ? styles.bubbleRowMine : ''}`}>
              <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : ''}`}>
                {m.deletedAt ? (
                  <span className={styles.deletedText}>This message was deleted</span>
                ) : isEditing ? (
                  <div className={styles.editBox}>
                    <input
                      className={styles.editInput}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave()
                        if (e.key === 'Escape') handleEditCancel()
                      }}
                      autoFocus
                    />
                    <div className={styles.editActions}>
                      <button onClick={handleEditSave} disabled={editSaving || !editDraft.trim()}>Save</button>
                      <button onClick={handleEditCancel}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt="" className={styles.bubbleImage} onClick={() => openViewerFor(m.id)} />
                    )}
                    {m.content && <p className={styles.bubbleText}>{m.content}</p>}
                  </>
                )}
                <span className={styles.bubbleTime}>
                  {timeAgo(m.createdAt)}
                  {m.editedAt && !m.deletedAt && ' · edited'}
                </span>
              </div>

              {!m.deletedAt && !isEditing && (
                <div className={styles.bubbleMenuWrap}>
                  <button
                    className={styles.bubbleMenuBtn}
                    onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                    aria-label="Message options"
                  >
                    <FaEllipsisV />
                  </button>
                  {openMenuId === m.id && (
                    <div className={styles.bubbleMenu}>
                      {isMine && m.type === 'TEXT' && <button onClick={() => handleEditStart(m)}>Edit</button>}
                      {isMine && (
                        <button className={styles.bubbleMenuDanger} onClick={() => handleDelete(m, 'everyone')}>
                          Delete for everyone
                        </button>
                      )}
                      <button onClick={() => handleDelete(m, 'me')}>Delete for me</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {composerError && <p className={styles.composerError}>{composerError}</p>}

      <div className={styles.composer}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenFileInput}
          onChange={handleImageSelected}
        />
        <button
          className={styles.imageBtn}
          onClick={handleImagePick}
          disabled={blockedFromSending || uploadingImage}
          aria-label="Send image"
        >
          <FaImage />
        </button>
        <input
          className={styles.composerInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder={blockedFromSending ? 'Verify your email to send messages' : 'Type a message'}
          disabled={blockedFromSending || sending}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSendText}
          disabled={blockedFromSending || sending || !draft.trim()}
          aria-label="Send"
        >
          <FaPaperPlane />
        </button>
      </div>

      {viewerIndex !== null && imageMessages[viewerIndex] && (
        <div className={styles.viewerBackdrop} onClick={() => setViewerIndex(null)}>
          <button className={styles.viewerClose} onClick={() => setViewerIndex(null)} aria-label="Close">
            <FaTimes />
          </button>
          {viewerIndex > 0 && (
            <button
              className={`${styles.viewerNav} ${styles.viewerNavLeft}`}
              onClick={(e) => { e.stopPropagation(); setViewerIndex((i) => i - 1) }}
              aria-label="Previous image"
            >
              <FaChevronLeft />
            </button>
          )}
          <img
            src={imageMessages[viewerIndex].imageUrl}
            alt=""
            className={styles.viewerImage}
            onClick={(e) => e.stopPropagation()}
          />
          {viewerIndex < imageMessages.length - 1 && (
            <button
              className={`${styles.viewerNav} ${styles.viewerNavRight}`}
              onClick={(e) => { e.stopPropagation(); setViewerIndex((i) => i + 1) }}
              aria-label="Next image"
            >
              <FaChevronRight />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Conversation