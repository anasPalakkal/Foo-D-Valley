import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories, getMealsByCategory, getRecipes, getCuisines } from '../../api/api.js'
import RecipeCard from '../../components/RecipeCard/RecipeCard'
import RecipeFilters from '../../components/RecipeFilters/RecipeFilters'
import Footer from '../../components/Footer/Footer'
import styles from './Recipes.module.css'

const PAGE_SIZE = 12
const DEFAULT_FILTERS = { category: 'all', cuisine: 'all', source: 'all', sort: 'az' }

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
  createdAt: recipe.createdAt || null,
})

const Recipes = ({ searchTerm }) => {
  const [allRecipes, setAllRecipes] = useState([])
  const [categoryList, setCategoryList] = useState([])
  const [cuisineList, setCuisineList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const navigate = useNavigate()

  // Track mobile breakpoint for pagination window size
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError('')
      try {
        const [categories, cuisinesRaw, internalRaw] = await Promise.all([
          getCategories(),
          getCuisines(),
          getRecipes(),
        ])

        setCategoryList(categories.map((c) => c.strCategory))
        setCuisineList(cuisinesRaw.map((c) => c.strArea))

        // Tag each external meal with its category at fetch time
        // filter.php only returns idMeal/strMeal/strMealThumb — no category on the object
        const mealArrays = await Promise.all(
          categories.map((cat) =>
            getMealsByCategory(cat.strCategory)
              .then((meals) => meals.map((m) => ({ ...m, category: cat.strCategory })))
              .catch(() => [])
          )
        )

        const seen = new Set()
        const uniqueExternal = mealArrays.flat().filter((meal) => {
          if (seen.has(meal.externalId)) return false
          seen.add(meal.externalId)
          return true
        })

        const internalMeals = internalRaw.map(normalizeInternal)

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

  useEffect(() => { setPage(1) }, [searchTerm, filters])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => setFilters(DEFAULT_FILTERS)

  const filtered = useMemo(() => {
    let result = [...allRecipes]

    if (searchTerm?.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.area?.toLowerCase().includes(q)
      )
    }

    if (filters.source === 'community') result = result.filter((r) => !r.isExternal)
    if (filters.source === 'external') result = result.filter((r) => r.isExternal)

    if (filters.category !== 'all') {
      result = result.filter(
        (r) => r.category?.toLowerCase() === filters.category.toLowerCase()
      )
    }

    // Cuisine only reliable on community recipes
    if (filters.cuisine !== 'all') {
      result = result.filter(
        (r) => !r.isExternal && r.area?.toLowerCase() === filters.cuisine.toLowerCase()
      )
    }

    if (filters.sort === 'az') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (filters.sort === 'za') {
      result.sort((a, b) => b.name.localeCompare(a.name))
    } else if (filters.sort === 'newest') {
      const community = result
        .filter((r) => !r.isExternal && r.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const communityNoDate = result.filter((r) => !r.isExternal && !r.createdAt)
      const external = result
        .filter((r) => r.isExternal)
        .sort((a, b) => a.name.localeCompare(b.name))
      result = [...community, ...communityNoDate, ...external]
    }

    return result
  }, [allRecipes, searchTerm, filters])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSelectRecipe = (recipe) => {
    navigate(recipe.isExternal ? `/recipes/ext_${recipe.externalId}` : `/recipes/${recipe.id}`)
  }

  const handlePageChange = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Mobile shows max 3 neighbors, desktop shows max 5
  const getPageNumbers = () => {
    const delta = isMobile ? 1 : 2 // pages shown each side of current
    if (totalPages <= (isMobile ? 5 : 7)) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = []
    const start = Math.max(2, page - delta)
    const end = Math.min(totalPages - 1, page + delta)
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
          <RecipeFilters
            categories={categoryList}
            cuisines={cuisineList}
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />
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
                    <span key={`ellipsis-${i}`} className={styles['page-ellipsis']}>...</span>
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