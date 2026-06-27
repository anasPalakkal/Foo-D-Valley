import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FaHeart } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { getRecipeById, getMealById, getFavorites, addFavorite, removeFavorite } from '../../api/api'
import styles from './Recipes.module.css'

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
          // Normalize internal recipe to a common shape
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

  if (loading) return <p style={{ padding: '40px', textAlign: 'center' }}>Loading...</p>
  if (error || !recipe) return <p style={{ padding: '40px', textAlign: 'center' }}>{error}</p>

  return (
    <>
      <div className={styles['recipe-details']}>
        <div className={styles['top-bar']}>
          <button onClick={() => navigate(-1)} className={styles['back-button']}>
            ← Back
          </button>
          <button
            className={styles['heart-button']}
            onClick={handleToggleSave}
            disabled={saving}
          >
            <FaHeart style={{ color: isSaved ? 'crimson' : 'gray', fontSize: '24px' }} />
          </button>
        </div>

        <h2>{recipe.name}</h2>

        {recipe.image && (
          <img src={recipe.image} alt={recipe.name} className={styles['recipe-image']} />
        )}

        {recipe.author && (
          <p>
            <strong>By:</strong>{' '}
            <Link to={`/profile/${recipe.author.id}`} style={{ color: '#b0413e' }}>
              {recipe.author.name}
            </Link>
          </p>
        )}

        {recipe.category && <p><strong>Category:</strong> {recipe.category}</p>}
        {recipe.area && <p><strong>Cuisine:</strong> {recipe.area}</p>}
        {recipe.description && <p>{recipe.description}</p>}

        <h3>Ingredients</h3>
        <ul>
          {recipe.ingredients.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h3>Instructions</h3>
        <ol>
          {recipe.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <footer className={styles['site-footer']}>
        <div className={styles['footer-content']}>
          <div className={styles['footer-logo']}>
            <Link to="/" className={styles['footer-logo-link']}>
              Foo <span className={styles['logo-d']}>D</span> Valley
            </Link>
          </div>
          <p>© 2025 Foo D Valley. All rights reserved.</p>
          <button
            className={styles['back-to-top']}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Back to Top
          </button>
        </div>
      </footer>
    </>
  )
}

export default RecipeDetails