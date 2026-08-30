import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaPaperPlane, FaImage } from 'react-icons/fa'
import styles from './Conversation.module.css'
import { getConversationById, getMessages, markConversationRead, uploadChatImage } from '../../api/api'
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
    const bottomRef = useRef(null)
    const fileInputRef = useRef(null)

    const otherParticipant = conversation?.participants?.find((p) => p.user.id !== user.id)?.user

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

    if (loading) {
        return (
            <div className={styles.page}>
                <p className={styles.stateText}>Loading...</p>
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
                {otherParticipant?.avatarUrl ? (
                    <img src={otherParticipant.avatarUrl} alt="" className={styles.headerAvatar} />
                ) : (
                    <div className={styles.headerAvatarFallback}>
                        {(otherParticipant?.isDeleted ? 'D' : otherParticipant?.name || '?').charAt(0).toUpperCase()}
                    </div>
                )}        <span className={styles.headerName}>
                    {otherParticipant?.isDeleted ? 'Deleted user' : otherParticipant?.name || 'Unknown'}
                </span>
            </div>

            <div className={styles.thread}>
                {hasMore && (
                    <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? 'Loading...' : 'Load earlier messages'}
                    </button>
                )}

                {messages.map((m) => {
                    const isMine = m.senderId === user.id
                    return (
                        <div key={m.id} className={`${styles.bubbleRow} ${isMine ? styles.bubbleRowMine : ''}`}>
                            <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : ''}`}>
                                {m.deletedAt ? (
                                    <span className={styles.deletedText}>This message was deleted</span>
                                ) : (
                                    <>
                                        {m.imageUrl && <img src={m.imageUrl} alt="" className={styles.bubbleImage} />}
                                        {m.content && <p className={styles.bubbleText}>{m.content}</p>}
                                    </>
                                )}
                                <span className={styles.bubbleTime}>
                                    {timeAgo(m.createdAt)}
                                    {m.editedAt && !m.deletedAt && ' · edited'}
                                </span>
                            </div>
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
        </div>
    )
}

export default Conversation