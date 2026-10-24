import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getRecipes,
  getExternalMeals,
  getExternalMeta,
  getBatchLikeCounts,
  normalizeInternal,
} from '../../api/api.js'
import { useAuth } from '../../context/AuthContext'
import RecipeCard, { RecipeCardSkeleton } from '../../components/RecipeCard/RecipeCard'
import RecipeFilters from '../../components/RecipeFilters/RecipeFilters'
import styles from './Recipes.module.css'

const PAGE_SIZE = 12
const DEFAULT_FILTERS = { category: 'all', cuisine: 'all', source: 'all', sort: 'newest' }

// External meals are fetched once and cached in module scope for the lifetime
// of the browser session. The backend caches them in Redis for 1 hour —
// this client-side cache avoids re-fetching on every Recipes mount within
// the same session (navigation back, filter changes, etc.).
let externalMealsCache = null
let externalMealsPromise = null

const getExternalMealsCached = () => {
  if (externalMealsCache) return Promise.resolve(externalMealsCache)
  if (externalMealsPromise) return externalMealsPromise
  externalMealsPromise = getExternalMeals()
    .then((res) => {
      externalMealsCache = res.meals || []
      externalMealsPromise = null
      return externalMealsCache
    })
    .catch(() => {
      externalMealsPromise = null
      return []
    })
  return externalMealsPromise
}

// Same pattern for meta (categories + areas for filter dropdowns)
let metaCache = null
let metaPromise = null

const getExternalMetaCached = () => {
  if (metaCache) return Promise.resolve(metaCache)
  if (metaPromise) return metaPromise
  metaPromise = getExternalMeta()
    .then((res) => {
      metaCache = res
      metaPromise = null
      return metaCache
    })
    .catch(() => {
      metaPromise = null
      return { categories: [], areas: [] }
    })
  return metaPromise
}

const Recipes = ({ searchTerm }) => {
  // Internal (community) recipes — server paginated
  const [internalRecipes, setInternalRecipes] = useState([])
  const [internalTotal, setInternalTotal] = useState(0)
  const [internalTotalPages, setInternalTotalPages] = useState(0)
  const [internalLoading, setInternalLoading] = useState(true)

  // External (TheMealDB) meals — loaded once, filtered client-side
  const [externalMeals, setExternalMeals] = useState([])
  const [externalLoading, setExternalLoading] = useState(true)

  // Filter metadata for dropdowns
  const [categoryList, setCategoryList] = useState([])
  const [cuisineList, setCuisineList] = useState([])

  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  // Track the latest internal fetch to discard stale responses when filters
  // change faster than requests resolve.
  const fetchIdRef = useRef(0)

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

  // Load external meals + meta once on mount
  useEffect(() => {
    setExternalLoading(true)
    Promise.all([getExternalMealsCached(), getExternalMetaCached()])
      .then(([meals, meta]) => {
        setExternalMeals(meals)

        // Merge external areas with any internal cuisines already loaded.
        // Internal cuisines come from the paginated fetch below and are set
        // separately — the filter list union happens in the render phase.
        setCategoryList(meta.categories || [])
        setCuisineList(meta.areas || [])
      })
      .finally(() => setExternalLoading(false))
  }, [])

  // Fetch internal recipes whenever filters, page, or searchTerm change.
  // 'following' source is handled server-side — the backend reads the auth
  // token via optionalProtect and filters by followingIds.
  const fetchInternal = useCallback(async () => {
    const fetchId = ++fetchIdRef.current
    setInternalLoading(true)

    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        sort: filters.sort,
      }

      if (filters.category !== 'all') params.category = filters.category
      if (filters.cuisine !== 'all') params.cuisine = filters.cuisine
      if (searchTerm?.trim()) params.search = searchTerm.trim()
      if (filters.source === 'following') params.source = 'following'

      const data = await getRecipes(params)

      // Discard if a newer fetch has already fired
      if (fetchId !== fetchIdRef.current) return

      const normalized = (data.recipes || []).map(normalizeInternal)

      // Attach like counts in batch
      if (normalized.length > 0) {
        try {
          const recipeIds = normalized.map((r) => r.id)
          const { recipeCounts } = await getBatchLikeCounts(recipeIds, [])
          const withLikes = normalized.map((r) => ({
            ...r,
            likesCount: recipeCounts[r.id] || r.likesCount || 0,
          }))
          setInternalRecipes(withLikes)
        } catch {
          setInternalRecipes(normalized)
        }
      } else {
        setInternalRecipes([])
      }

      setInternalTotal(data.total || 0)
      setInternalTotalPages(data.totalPages || 0)
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return
      console.error('fetchInternal error:', err)
      setError('Failed to load recipes. Please try again.')
    } finally {
      if (fetchId === fetchIdRef.current) setInternalLoading(false)
    }
  }, [page, filters.sort, filters.category, filters.cuisine, filters.source, searchTerm])

  useEffect(() => {
    // 'community' source: only internal, no external needed. 'following' is also internal-only.
    // 'all' source: both internal + external shown together.
    // 'external' source: not a filter option we expose, so not handled here.
    fetchInternal()
  }, [fetchInternal])

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, filters.category, filters.cuisine, filters.source, filters.sort])

  // Apply client-side filtering to external meals based on active filters.
  // External meals are already loaded — we don't paginate them separately,
  // they are mixed into the current page view based on sort order.
  const filteredExternal = React.useMemo(() => {
    // 'community' and 'following' sources exclude external recipes entirely
    if (filters.source === 'community' || filters.source === 'following') return []

    let result = [...externalMeals]

    if (searchTerm?.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.area?.toLowerCase().includes(q)
      )
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

    return result
  }, [externalMeals, searchTerm, filters.category, filters.cuisine, filters.source])

  // Merge internal (current page) + filtered external, then sort and paginate.
  // Internal recipes are already paginated by the server; external results are
  // filtered client-side and interleaved. The combined list is sorted, then
  // we take PAGE_SIZE items for the current page.
  const { displayRecipes, totalPages } = React.useMemo(() => {
    const internal = internalRecipes
    const external = filteredExternal

    // If no external, total pages come from the server
    if (external.length === 0) {
      return { displayRecipes: internal, totalPages: internalTotalPages }
    }

    // Merge: interleave internal (page N) with a proportional slice of external
    // so both sources appear on every page rather than stacking all internal first.
    // External slice: same page window applied to sorted external list.
    const sortedExternal = [...external].sort((a, b) => {
      if (filters.sort === 'az') return a.name.localeCompare(b.name)
      if (filters.sort === 'za') return b.name.localeCompare(a.name)
      if (filters.sort === 'popular') return (b.likesCount || 0) - (a.likesCount || 0)
      // 'newest': internal recipes win (they have dates), external goes after
      return 0
    })

    const externalPage = sortedExternal.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const merged = [...internal, ...externalPage].sort((a, b) => {
      if (filters.sort === 'az') return a.name.localeCompare(b.name)
      if (filters.sort === 'za') return b.name.localeCompare(a.name)
      if (filters.sort === 'popular') return (b.likesCount || 0) - (a.likesCount || 0)
      // newest: internal (has createdAt) before external
      if (!a.isExternal && b.isExternal) return -1
      if (a.isExternal && !b.isExternal) return 1
      return 0
    })

    const combinedTotal = internalTotal + external.length
    const combinedTotalPages = Math.ceil(combinedTotal / PAGE_SIZE)

    return { displayRecipes: merged, totalPages: combinedTotalPages }
  }, [internalRecipes, filteredExternal, filters.sort, page, internalTotal, internalTotalPages])

  const isLoading = internalLoading || externalLoading

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
    setSearchParams(search ? { search, sort: 'az' } : { sort: 'az' })
  }

  const handleSelectRecipe = (recipe) => {
    navigate(recipe.isExternal ? `/recipes/ext_${recipe.externalId}` : `/recipes/${recipe.id}`)
  }

  const handlePageChange = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = () => {
    const delta = isMobile ? 1 : 2
    const cap = isMobile ? 5 : 7
    if (totalPages <= cap) {
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

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.cuisine !== 'all' ||
    filters.source !== 'all' ||
    filters.sort !== DEFAULT_FILTERS.sort

  const isEmpty = !isLoading && !error && displayRecipes.length === 0

  return (
    <>
      <div className={styles['recipes-container']}>
        <h2>All Recipes</h2>

        {/* Filters always visible — they work on cached external data and
            will update the internal query on the next keystroke/change */}
        <RecipeFilters
          categories={categoryList}
          cuisines={cuisineList}
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {error && <p className={styles.error}>{error}</p>}

        {/* Skeleton grid while loading */}
        {isLoading && !error && (
          <div className={styles['recipe-grid']}>
            <RecipeCardSkeleton count={PAGE_SIZE} />
          </div>
        )}

        {isEmpty && (
          <p className={styles['no-results']}>
            {filters.source === 'following'
              ? 'No recipes from people you follow yet.'
              : `No recipes found${searchTerm?.trim() ? ` for "${searchTerm}"` : ''}.`}
          </p>
        )}

        {!isLoading && !error && displayRecipes.length > 0 && (
          <>
            <div className={styles['recipe-grid']}>
              {displayRecipes.map((recipe) => (
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
    </>
  )
}

export default Recipes