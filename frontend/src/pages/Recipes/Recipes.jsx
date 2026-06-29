import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories, getMealsByCategory, getRecipes } from '../../api/api.js'
import RecipeCard from '../../components/RecipeCard/RecipeCard'
import Footer from '../../components/Footer/Footer'
import styles from './Recipes.module.css'

const PAGE_SIZE = 12

const normalizeInternal = (recipe) => ({
  id: recipe.id,
  externalId: null,
  name: recipe.title,
  image: recipe.imageUrl || null,
  category: recipe.category || null,
  area: recipe.cuisine || null,
  description: recipe.description || null,
  ingredients: recipe.ingredients || [],
  instructions: recipe.instructions || [],
  isExternal: false,
  author: recipe.author || null,
})

const Recipes = ({ searchTerm }) => {
  const [allRecipes, setAllRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError('')
      try {
        const categories = await getCategories()
        const mealArrays = await Promise.all(
          categories.map((cat) => getMealsByCategory(cat.strCategory).catch(() => []))
        )

        const seen = new Set()
        const uniqueExternal = mealArrays.flat().filter((meal) => {
          if (seen.has(meal.externalId)) return false
          seen.add(meal.externalId)
          return true
        })

        const internalRaw = await getRecipes()
        const internalMeals = internalRaw.map(normalizeInternal)

        // Merge and sort A-Z by default — no internal-first bias
        const merged = [...internalMeals, ...uniqueExternal].sort((a, b) =>
          a.name.localeCompare(b.name)
        )

        setAllRecipes(merged)
      } catch (err) {
        console.error('Error fetching recipes:', err)
        setError('Failed to load recipes. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  const filtered = useMemo(() => {
    if (!searchTerm?.trim()) return allRecipes
    const q = searchTerm.toLowerCase()
    return allRecipes.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.area?.toLowerCase().includes(q)
    )
  }, [allRecipes, searchTerm])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSelectRecipe = (recipe) => {
    const path = recipe.isExternal
      ? `/recipes/ext_${recipe.externalId}`
      : `/recipes/${recipe.id}`
    navigate(path)
  }

  const handlePageChange = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = []
    const start = Math.max(2, page - 2)
    const end = Math.min(totalPages - 1, page + 2)
    pages.push(1)
    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <>
      <div className={styles['recipes-container']}>
        <h2>All Recipes</h2>

        {!loading && !error && (
          <p className={styles['results-count']}>
            {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
            {searchTerm?.trim() ? ` for "${searchTerm}"` : ''}
          </p>
        )}

        {loading && (
          <div className={styles['loading-wrap']}>
            <div className={styles.spinner} />
            <p>Loading all recipes...</p>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className={styles['no-results']}>
            No recipes found{searchTerm?.trim() ? ` for "${searchTerm}"` : ''}.
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className={styles['recipe-grid']}>
              {paginated.map((recipe) => (
                <RecipeCard
                  key={recipe.isExternal ? `ext_${recipe.externalId}` : recipe.id}
                  recipe={recipe}
                  onSelect={handleSelectRecipe}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles['page-btn']}
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  ← Prev
                </button>

                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className={styles['page-ellipsis']}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles['page-btn']} ${p === page ? styles['page-active'] : ''}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className={styles['page-btn']}
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  )
}

export default Recipes