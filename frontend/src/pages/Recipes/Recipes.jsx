import React, { useEffect, useState, useMemo } from 'react'
import RecipeList from '../../components/RecipeList/RecipeList'
import { useNavigate, Link } from 'react-router-dom'
import { getCategories, getMealsByCategory, getRecipes, normalizeMeal } from '../../api/api.js'
import styles from './Recipes.module.css'

const PAGE_SIZE = 12

// Normalize internal DB recipe to the same shape RecipeList expects
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
        // Fetch all categories then all meals per category in parallel
        const categories = await getCategories()
        const mealArrays = await Promise.all(
          categories.map((cat) => getMealsByCategory(cat.strCategory).catch(() => []))
        )

        // Deduplicate — meals can appear in multiple category results
        const seen = new Set()
        const uniqueExternal = mealArrays.flat().filter((meal) => {
          if (seen.has(meal.externalId)) return false
          seen.add(meal.externalId)
          return true
        })

        // Fetch internal user-uploaded recipes
        const internalRaw = await getRecipes()
        const internalMeals = internalRaw.map(normalizeInternal)

        // Internal recipes first, then TheMealDB
        setAllRecipes([...internalMeals, ...uniqueExternal])
      } catch (err) {
        console.error('Error fetching recipes:', err)
        setError('Failed to load recipes. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  // Reset to page 1 on search change
  useEffect(() => {
    setPage(1)
  }, [searchTerm])

  // Filter client-side — no API calls on search
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

  // Show max 7 page buttons with ellipsis for large page counts
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
            <RecipeList recipes={paginated} onSelect={handleSelectRecipe} />

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

export default Recipes