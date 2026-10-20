import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IoChatbubbleEllipses, IoClose, IoSend, IoRefresh } from 'react-icons/io5'
import { useAuth } from '../../context/AuthContext'
import { warmAssistant, sendAssistantMessage, saveAssistantRecipe } from '../../api/api'
import styles from './AssistantWidget.module.css'

const HIDDEN_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
const SUGGESTIONS = ['Chicken biryani', 'Quick vegan dinner', 'High-protein breakfast']

const formatIngredient = ({ name, quantity, unit }) =>
  [quantity, unit, name].filter((v) => v !== null && v !== undefined && v !== '').join(' ')

const RecipeBlock = ({ recipe, savedId, saving, error, onSave }) => {
  const meta = [
    recipe.servings && `${recipe.servings} servings`,
    recipe.prepTimeMinutes != null && `${recipe.prepTimeMinutes} min prep`,
    recipe.cookTimeMinutes != null && `${recipe.cookTimeMinutes} min cook`,
  ].filter(Boolean)

  return (
    <div className={styles.recipe}>
      {recipe.imageUrl && (
        <>
          <img src={recipe.imageUrl} alt={recipe.title} className={styles.recipeImage} />
          <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className={styles.credit}>
            {recipe.imageCredit || 'Photo from Pexels'}
          </a>
        </>
      )}
      <h4 className={styles.recipeTitle}>{recipe.title}</h4>
      {meta.length > 0 && <p className={styles.recipeMeta}>{meta.join(' · ')}</p>}
      {recipe.description && <p className={styles.recipeDesc}>{recipe.description}</p>}

      <details className={styles.details}>
        <summary>Ingredients ({recipe.ingredients.length})</summary>
        <ul>
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>{formatIngredient(ing)}</li>
          ))}
        </ul>
      </details>
      <details className={styles.details}>
        <summary>Steps ({recipe.steps.length})</summary>
        <ol>
          {recipe.steps.map((s, i) => (
            <li key={i}>{s.content}</li>
          ))}
        </ol>
      </details>

      {savedId ? (
        <Link to={`/recipes/ai_${savedId}`} className={styles.savedLink}>
          Saved. View recipe
        </Link>
      ) : (
        <button className={styles.saveBtn} onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save recipe'}
        </button>
      )}
      {error && <p className={styles.inlineError}>{error}</p>}
    </div>
  )
}

const AssistantWidget = () => {
  const { user } = useAuth()
  const { pathname } = useLocation()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [remaining, setRemaining] = useState(null)
  const [savingIdx, setSavingIdx] = useState(null)
  const endRef = useRef(null)

  // Never carry one account's chat into another session.
  useEffect(() => {
    setMessages([])
    setRemaining(null)
    setInput('')
  }, [user?.id])

  useEffect(() => {
    if (open && user) warmAssistant()
  }, [open, user])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, sending, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const hidden = HIDDEN_PATHS.includes(pathname) || /^\/messages\/[^/]+/.test(pathname)
  if (hidden) return null

  const patchMessage = (idx, patch) =>
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)))

  const send = async (raw) => {
    const prompt = raw.trim()
    if (prompt.length < 3 || sending || remaining === 0) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: prompt }])
    setSending(true)

    try {
      const { reply, remaining: left } = await sendAssistantMessage(prompt)
      setRemaining(left)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: reply.text, recipe: reply.recipe, savedId: null },
      ])
    } catch (err) {
      const data = err.response?.data
      if (data?.code === 'DAILY_LIMIT') setRemaining(0)
      const text =
        data?.message ||
        (err.code === 'ECONNABORTED'
          ? 'The assistant took too long to respond. Please try again.'
          : 'Something went wrong. Please try again.')
      setMessages((prev) => [...prev, { role: 'assistant', text, isError: true }])
    } finally {
      setSending(false)
    }
  }

  const handleSave = async (idx) => {
    const msg = messages[idx]
    if (!msg?.recipe || savingIdx !== null) return
    setSavingIdx(idx)
    patchMessage(idx, { saveError: null })
    try {
      const { id } = await saveAssistantRecipe(msg.recipe)
      patchMessage(idx, { savedId: id })
    } catch (err) {
      const data = err.response?.data
      if (data?.code === 'ALREADY_SAVED') patchMessage(idx, { savedId: data.id })
      else patchMessage(idx, { saveError: data?.message || 'Could not save. Try again.' })
    } finally {
      setSavingIdx(null)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    send(input)
  }

  const limitReached = remaining === 0

  return (
    <>
      {!open && (
        <button className={styles.launcher} onClick={() => setOpen(true)} aria-label="Open recipe assistant">
          <IoChatbubbleEllipses size={26} />
        </button>
      )}

      {open && (
        <section className={styles.panel} role="dialog" aria-label="Recipe assistant">
          <header className={styles.header}>
            <div>
              <h3 className={styles.title}>Recipe Assistant</h3>
              {user && remaining !== null && (
                <span className={styles.counter}>{remaining} left today</span>
              )}
            </div>
            <div className={styles.headerActions}>
              {messages.length > 0 && (
                <button
                  className={styles.iconBtn}
                  onClick={() => setMessages([])}
                  disabled={sending}
                  aria-label="New chat"
                  title="New chat"
                >
                  <IoRefresh size={20} />
                </button>
              )}
              <button className={styles.iconBtn} onClick={() => setOpen(false)} aria-label="Close">
                <IoClose size={24} />
              </button>
            </div>
          </header>

          {!user ? (
            <div className={styles.gate}>
              <p>Log in to get AI-generated recipes.</p>
              <Link to="/login" className={styles.saveBtn} onClick={() => setOpen(false)}>
                Log in
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.body}>
                {messages.length === 0 && (
                  <div className={styles.empty}>
                    <p>Describe a dish or ingredients and get a full recipe. Each request is independent, so include everything you want in one message.</p>
                    <div className={styles.chips}>
                      {SUGGESTIONS.map((s) => (
                        <button key={s} className={styles.chip} onClick={() => send(s)} disabled={sending || limitReached}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`${styles.msg} ${m.role === 'user' ? styles.user : styles.bot} ${m.isError ? styles.errorMsg : ''}`}
                  >
                    <p className={styles.text}>{m.text}</p>
                    {m.recipe && (
                      <RecipeBlock
                        recipe={m.recipe}
                        savedId={m.savedId}
                        saving={savingIdx === i}
                        error={m.saveError}
                        onSave={() => handleSave(i)}
                      />
                    )}
                  </div>
                ))}

                {sending && (
                  <div className={`${styles.msg} ${styles.bot}`}>
                    <p className={styles.text}>Thinking... the first request after a quiet period can take up to a minute.</p>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <input
                  className={styles.input}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={limitReached ? 'Daily limit reached. Back tomorrow.' : 'e.g. creamy mushroom pasta'}
                  maxLength={500}
                  disabled={sending || limitReached}
                />
                <button
                  className={styles.sendBtn}
                  type="submit"
                  disabled={sending || limitReached || input.trim().length < 3}
                  aria-label="Send"
                >
                  <IoSend size={18} />
                </button>
              </form>
              <p className={styles.notice}>AI-generated. Do not share personal information. Nutrition and allergy details are not guaranteed.</p>
            </>
          )}
        </section>
      )}
    </>
  )
}

export default AssistantWidget