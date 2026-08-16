import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FaHeart, FaArrowLeft, FaExternalLinkAlt, FaRegCommentDots, FaLink } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import {
  getRecipeById,
  getMealById,
  getFavorites,
  addFavorite,
  removeFavorite,
  getLikeStatus,
  likeRecipe,
  unlikeRecipe,
  getComments,
  postComment,
} from '../../api/api'
import { addRecentlyViewed } from '../../utils/recentlyViewed'
import styles from './RecipeDetails.module.css'
import Footer from '../../components/Footer/Footer'

// Skeleton for the two-column recipe detail layout.
// Mirrors the real layout structure so there's no layout shift on load.
const RecipeDetailSkeleton = () => (
  <div className={styles.page}>
    <div className={`${styles['back-button']} ${styles.skeletonBtn}`} />

    <div className={styles.layout}>
      {/* Left column */}
      <div className={styles.left}>
        <div className={`${styles.imageWrap} ${styles.skeletonBlock}`} style={{ height: '360px' }} />
        <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
        <div className={styles.metaRow}>
          <div className={styles.skeletonBadge} />
          <div className={styles.skeletonBadge} />
        </div>
        <div className={`${styles.skeletonLine} ${styles.skeletonDesc}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonDesc} ${styles.skeletonDescShort}`} />
        <div className={styles.actionRow}>
          <div className={styles.skeletonAction} />
          <div className={styles.skeletonAction} />
          <div className={styles.skeletonAction} />
        </div>
      </div>

      {/* Right column */}
      <div className={styles.right}>
        <div className={styles.section}>
          <div className={`${styles.skeletonLine} ${styles.skeletonSectionTitle}`} />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`${styles.skeletonLine} ${styles.skeletonIngredient}`} style={{ width: `${60 + (i % 3) * 15}%` }} />
          ))}
        </div>
        <div className={styles.section}>
          <div className={`${styles.skeletonLine} ${styles.skeletonSectionTitle}`} />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`${styles.skeletonLine} ${styles.skeletonStep}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
)

const RecipeDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isExternal = id.startsWith('ext_')
  const actualId = isExternal ? id.replace('ext_', '') : id

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [likeBusy, setLikeBusy] = useState(false)

  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentError, setCommentError] = useState('')

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      setError('')
      try {
        let data
        if (isExternal) {
          data = await getMealById(actualId)
        } else {
          const raw = await getRecipeById(actualId)
          data = {
            id: raw.id,
            name: raw.title,
            image: raw.imageUrl,
            category: raw.category || null,
            area: raw.cuisine || null,
            description: raw.description || null,
            ingredients: raw.ingredients || [],
            instructions: raw.instructions || [],
            isExternal: false,
            externalId: null,
            author: raw.author || null,
          }
        }
        if (!data) throw new Error('Not found')
        setRecipe(data)
        addRecentlyViewed(data)
      } catch {
        setError('Recipe not found.')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  useEffect(() => {
    if (!user || !recipe) return
    const check = async () => {
      try {
        const favorites = await getFavorites()
        const exists = favorites.some((fav) =>
          recipe.isExternal
            ? fav.isExternal && fav.externalId === recipe.externalId
            : !fav.isExternal && fav.recipeId === recipe.id
        )
        setIsSaved(exists)
      } catch {
        // non-critical
      }
    }
    check()
  }, [user, recipe])

  useEffect(() => {
    if (!recipe) return
    const loadLikes = async () => {
      try {
        const result = await getLikeStatus(actualId, isExternal)
        setIsLiked(result.isLiked)
        setLikesCount(result.likesCount)
      } catch {
        // non-critical
      }
    }
    loadLikes()
  }, [recipe, actualId, isExternal])

  useEffect(() => {
    if (!recipe) return
    const loadComments = async () => {
      try {
        const result = await getComments(actualId, isExternal)
        setComments(result)
      } catch {
        // non-critical
      }
    }
    loadComments()
  }, [recipe, actualId, isExternal])

  const handleToggleSave = async () => {
    if (!user) return navigate('/login')
    setSaving(true)
    try {
      if (isSaved) {
        await removeFavorite(
          recipe.isExternal
            ? { isExternal: true, externalId: recipe.externalId }
            : { isExternal: false, recipeId: recipe.id }
        )
        setIsSaved(false)
      } else {
        await addFavorite(recipe)
        setIsSaved(true)
      }
    } catch {
      // non-critical
    } finally {
      setSaving(false)
    }
  }

  const handleToggleLike = async () => {
    if (!user) return navigate('/login')
    if (likeBusy) return
    setLikeBusy(true)

    const prevLiked = isLiked
    const prevCount = likesCount
    setIsLiked(!prevLiked)
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1)

    try {
      const result = prevLiked
        ? await unlikeRecipe(actualId, isExternal)
        : await likeRecipe(actualId, isExternal)
      setIsLiked(result.liked)
      setLikesCount(result.likesCount)
    } catch {
      setIsLiked(prevLiked)
      setLikesCount(prevCount)
    } finally {
      setLikeBusy(false)
    }
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/login')
    if (!commentText.trim()) return

    setPostingComment(true)
    setCommentError('')
    try {
      const newComment = await postComment(actualId, isExternal, commentText.trim())
      setComments((prev) => [newComment, ...prev])
      setCommentText('')
    } catch {
      setCommentError('Could not post comment. Try again.')
    } finally {
      setPostingComment(false)
    }
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/recipes/${id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — silently fail
    }
  }

  if (loading) return <RecipeDetailSkeleton />

  if (error || !recipe) {
    return <p className={styles.error}>{error}</p>
  }

  return (
    <>
      <div className={styles.page}>
        <button onClick={() => navigate(-1)} className={styles['back-button']}>
          <FaArrowLeft /> Back
        </button>

        <div className={styles.layout}>
          {/* ── Left column ── */}
          <div className={styles.left}>
            <div className={styles.imageWrap}>
              {recipe.image && (
                <img src={recipe.image} alt={recipe.name} className={styles.image} />
              )}
              <button
                className={styles['heart-button']}
                onClick={handleToggleSave}
                disabled={saving}
                aria-label="Save recipe"
              >
                <FaHeart className={isSaved ? styles.heartActive : styles.heartInactive} />
              </button>
            </div>

            <h1 className={styles.title}>{recipe.name}</h1>

            <div className={styles.metaRow}>
              {recipe.category && <span className={styles.badge}>{recipe.category}</span>}
              {recipe.area && <span className={styles.badge}>{recipe.area}</span>}
            </div>

            {recipe.description && (
              <p className={styles.description}>{recipe.description}</p>
            )}

            <div className={styles.actionRow}>
              <button
                className={`${styles.actionButton} ${isLiked ? styles.actionButtonActive : ''}`}
                onClick={handleToggleLike}
                disabled={likeBusy}
              >
                <FaHeart /> {likesCount}
              </button>

              <a href="#comments" className={styles.actionButton}>
                <FaRegCommentDots /> {comments.length}
              </a>

              <button className={styles.actionButton} onClick={handleCopyLink}>
                <FaLink /> {copied ? 'Copied' : 'Share'}
              </button>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className={styles.right}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Ingredients</h2>
              <ul className={styles.ingredientList}>
                {recipe.ingredients.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Instructions</h2>
              <ol className={styles.instructionList}>
                {recipe.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>
          </div>
        </div>

        {/* ── Author / source strip ── */}
        <div className={styles.attributionStrip}>
          {!recipe.isExternal && recipe.author ? (
            <Link to={`/profile/${recipe.author.id}`} className={styles.authorLink}>
              {recipe.author.avatarUrl ? (
                <img src={recipe.author.avatarUrl} alt={recipe.author.name} className={styles.authorAvatar} />
              ) : (
                <div className={styles.authorFallback}>
                  {recipe.author.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span>Posted by <strong>{recipe.author.name}</strong></span>
            </Link>
          ) : (
            <a
              href={`https://www.themealdb.com/meal/${recipe.externalId}`}
              target="_blank"
              rel="noreferrer"
              className={styles.sourceLink}
            >
              <span>Recipe from <strong>TheMealDB</strong></span>
              <FaExternalLinkAlt className={styles.externalIcon} />
            </a>
          )}
        </div>

        {/* ── Comments section ── */}
        <div id="comments" className={styles.commentsSection}>
          <h2 className={styles.sectionTitle}>Comments ({comments.length})</h2>

          {user ? (
            <form onSubmit={handlePostComment} className={styles.commentForm}>
              <textarea
                className={styles.commentInput}
                placeholder="Share your thoughts..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
              {commentError && <p className={styles.commentError}>{commentError}</p>}
              <button
                type="submit"
                className={styles.commentSubmit}
                disabled={postingComment || !commentText.trim()}
              >
                {postingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          ) : (
            <p className={styles.commentLoginPrompt}>
              <Link to="/login">Log in</Link> to leave a comment.
            </p>
          )}

          <div className={styles.commentList}>
            {comments.length === 0 && (
              <p className={styles.noComments}>No comments yet. Be the first to share your thoughts.</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className={styles.commentItem}>
                {c.user?.avatarUrl ? (
                  <img src={c.user.avatarUrl} alt={c.user.name} className={styles.commentAvatar} />
                ) : (
                  <div className={styles.commentAvatarFallback}>
                    {c.user?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className={styles.commentBody}>
                  <div className={styles.commentMeta}>
                    <strong>{c.user?.name || 'Unknown'}</strong>
                    <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p>{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default RecipeDetails