import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaHeart } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { getFavorites, removeFavorite } from '../../api/api'
import styles from './SavedRecipes.module.css'

const SavedRecipes = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    const fetchFavorites = async () => {
      try {
        const data = await getFavorites()
        setFavorites(data)
      } catch (err) {
        console.error('Failed to fetch favorites:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFavorites()
  }, [user, authLoading, navigate])

  const handleRemove = async (e, fav) => {
    e.stopPropagation() // prevent card click when clicking heart
    if (fav.aiRecipeId && !window.confirm('Delete this saved recipe permanently?')) return
    try {
      await removeFavorite(fav)
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id))
    } catch (err) {
      console.error('Failed to remove favorite:', err)
    }
  }

  const handleCardClick = (fav) => {
    if (fav.aiRecipeId) {
      navigate(`/recipes/ai_${fav.aiRecipeId}`)
    } else if (fav.isExternal) {
      navigate(`/recipes/ext_${fav.externalId}`)
    } else {
      navigate(`/recipes/${fav.recipe?.id}`)
    }
  }

  const SKELETON_COUNT = 8

  // ...

  if (loading) {
    return (
      <div className={styles['saved-container']}>
        <h2>Saved Recipes</h2>
        <div className={styles['saved-grid']}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div key={i} className={styles['skeleton-card']} aria-hidden="true">
              <div className={styles['skeleton-image']} />
              <div className={styles['skeleton-title']} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles['saved-container']}>
      <h2>Saved Recipes</h2>

      {favorites.length === 0 ? (
        <div className={styles['empty-state']}>
          <div className={styles['empty-icon-wrap']}>
            <FaHeart className={styles['empty-icon']} />
          </div>
          <h3>No saved recipes yet</h3>
          <p>Recipes you save will show up here. Start exploring and save your first one.</p>
          <button
            className={styles['browse-btn']}
            onClick={() => navigate('/recipes')}
          >
            Browse Recipes
          </button>
        </div>
      ) : (
        <div className={styles['saved-grid']}>
          {favorites.map((fav) => {
            const name = fav.aiRecipe ? fav.aiRecipe.title : fav.isExternal ? fav.externalName : fav.recipe?.title
            const image = fav.aiRecipe ? fav.aiRecipe.imageUrl : fav.isExternal ? fav.externalImage : fav.recipe?.imageUrl

            return (
              <div
                key={fav.id}
                className={styles['saved-card']}
                onClick={() => handleCardClick(fav)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles['image-wrapper']}>
                  {image ? (
                    <img src={image} alt={name} />
                  ) : (
                    <div className={styles['image-placeholder']} />
                  )}
                  <FaHeart
                    className={styles['heart-icon']}
                    onClick={(e) => handleRemove(e, fav)}
                  />
                </div>
                <h3>{name}</h3>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SavedRecipes