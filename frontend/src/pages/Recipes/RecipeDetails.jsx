import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FaHeart, FaArrowLeft, FaExternalLinkAlt } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { getRecipeById, getMealById, getFavorites, addFavorite, removeFavorite } from '../../api/api'
import styles from './RecipeDetails.module.css'
import Footer from '../../components/Footer/Footer'

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
        // Non-critical
      }
    }
    check()
  }, [user, recipe])

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
      // Non-critical
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles['loading-wrap']}>
        <div className={styles.spinner} />
        <p>Loading recipe...</p>
      </div>
    )
  }

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
      </div>
      <Footer />
    </>
  )
}

export default RecipeDetails