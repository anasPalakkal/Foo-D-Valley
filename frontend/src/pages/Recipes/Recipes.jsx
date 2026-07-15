import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCategories, getMealsByCategory, getRecipes, getCuisines, getFollowing, normalizeInternal, getBatchLikeCounts } from '../../api/api.js'
import { useAuth } from '../../context/AuthContext'
import RecipeCard from '../../components/RecipeCard/RecipeCard'
import RecipeFilters from '../../components/RecipeFilters/RecipeFilters'
import Footer from '../../components/Footer/Footer'
import styles from './Recipes.module.css'

const PAGE_SIZE = 12
const DEFAULT_FILTERS = { category: 'all', cuisine: 'all', source: 'all', sort: 'az' }

const Recipes = ({ searchTerm }) => {
  const [allRecipes, setAllRecipes] = useState([])
  const [categoryList, setCategoryList] = useState([])
  const [cuisineList, setCuisineList] = useState([])
  const [followingIds, setFollowingIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const filters = {
    category: searchParams.get('category') || DEFAULT_FILTERS.category,
    cuisine: searchParams.get('cuisine') || DEFAULT_FILTERS.cuisine,
    source: searchParams.get('source') || DEFAULT_FILTERS.source,
    sort: searchParams.get('sort') || DEFAULT_FILTERS.sort,
  }

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // followingIds is user-specific and can change independently of the recipe fetch
  useEffect(() => {
    if (!user) {
      setFollowingIds([])
      return
    }
    getFollowing(user.id)
      .then((list) => setFollowingIds(list.map((u) => u.id)))
      .catch(() => setFollowingIds([]))
  }, [user])

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

        const internalMeals = internalRaw.map(normalizeInternal)

        const allCuisineValues = [
          ...cuisinesRaw.map((c) => c.strArea),
          ...internalMeals.map((r) => r.area).filter(Boolean),
        ]
        const uniqueCuisines = Array.from(new Set(allCuisineValues)).sort()
        setCuisineList(uniqueCuisines)

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

        let merged = [...internalMeals, ...uniqueExternal].sort((a, b) =>
          a.name.localeCompare(b.name)
        )

        try {
          const recipeIds = internalMeals.map((r) => r.id)
          const externalIds = uniqueExternal.map((r) => r.externalId)
          const { recipeCounts, externalCounts } = await getBatchLikeCounts(recipeIds, externalIds)

          merged = merged.map((r) => ({
            ...r,
            likesCount: r.isExternal
              ? externalCounts[r.externalId] || 0
              : recipeCounts[r.id] || 0,
          }))
        } catch {
          merged = merged.map((r) => ({ ...r, likesCount: 0 }))
        }

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

  useEffect(() => { setPage(1) }, [searchTerm, searchParams.toString()])

  const handleFilterChange = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === DEFAULT_FILTERS[key]) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      return next
    })
  }

  const handleReset = () => {
    const search = searchParams.get('search')
    setSearchParams(search ? { search } : {})
  }

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
    if (filters.source === 'following') {
      result = result.filter((r) => !r.isExternal && followingIds.includes(r.author?.id))
    }

    if (filters.category !== 'all') {
      result = result.filter(
        (r) => r.category?.toLowerCase() === filters.category.toLowerCase()
      )
    }

    if (filters.cuisine !== 'all') {
      result = result.filter(
        (r) => r.area?.toLowerCase() === filters.cuisine.toLowerCase()
      )
    }

    if (filters.sort === 'az') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (filters.sort === 'za') {
      result.sort((a, b) => b.name.localeCompare(a.name))
    } else if (filters.sort === 'popular') {
      result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
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
  }, [allRecipes, searchTerm, filters, followingIds])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSelectRecipe = (recipe) => {
    navigate(recipe.isExternal ? `/recipes/ext_${recipe.externalId}` : `/recipes/${recipe.id}`)
  }

  const handlePageChange = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = () => {
    const delta = isMobile ? 1 : 2
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
            {filters.source === 'following'
              ? "No recipes from people you follow yet."
              : `No recipes found${searchTerm?.trim() ? ` for "${searchTerm}"` : ''}.`}
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