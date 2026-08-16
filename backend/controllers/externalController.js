const { redis } = require('../lib/redis')

const CACHE_KEY = 'external:meals:all'
const CACHE_TTL = 60 * 60 // 1 hour in seconds

const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1'

// Normalize a TheMealDB meal object into the shape the frontend expects.
// Kept here (not in a shared util) because this is the only server-side
// consumer — the frontend's normalizeMeal() handles its own direct calls.
const normalizeMeal = (meal) => {
  const ingredients = []
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`]
    const meas = meal[`strMeasure${i}`]
    if (ing && ing.trim()) {
      ingredients.push(`${meas ? meas.trim() : ''} ${ing.trim()}`.trim())
    }
  }
  return {
    externalId: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb,
    category: meal.strCategory || null,
    area: meal.strArea || null,
    isExternal: true,
    ingredients,
    // instructions and full detail are not included here — the list view
    // only needs name/image/category/area. Full detail comes from getMealById.
  }
}

// GET /api/external/meals
// Returns the full TheMealDB catalog merged across all categories.
// Response shape: { meals: NormalizedMeal[], cachedAt: ISO string, fromCache: boolean }
//
// Cache strategy: write-through with a 1-hour TTL.
// TheMealDB content changes rarely (new meals added infrequently, categories
// almost never change). Stale data for 1 hour is an acceptable trade-off vs.
// 14+ parallel API calls on every Recipes page load.
const getAllExternalMeals = async (req, res) => {
  try {
    // Check Redis cache first
    const cached = await redis.get(CACHE_KEY)
    if (cached) {
      return res.json({ ...cached, fromCache: true })
    }

    // Cache miss — fetch categories then meals per category in parallel
    const catRes = await fetch(`${MEALDB_BASE}/categories.php`)
    const catData = await catRes.json()
    const categories = catData.categories || []

    const mealArrays = await Promise.allSettled(
      categories.map((cat) =>
        fetch(`${MEALDB_BASE}/filter.php?c=${encodeURIComponent(cat.strCategory)}`)
          .then((r) => r.json())
          .then((d) =>
            (d.meals || []).map((m) => ({
              ...m,
              // filter.php doesn't return strCategory or strArea on the meal
              // objects — only the lookup endpoint does. Attach the category
              // we used to fetch this batch so the frontend can filter on it.
              strCategory: cat.strCategory,
            }))
          )
      )
    )

    // Deduplicate by meal ID (a meal can appear in multiple category results)
    const seen = new Set()
    const meals = []
    for (const result of mealArrays) {
      if (result.status !== 'fulfilled') continue
      for (const meal of result.value) {
        if (seen.has(meal.idMeal)) continue
        seen.add(meal.idMeal)
        meals.push(normalizeMeal(meal))
      }
    }

    // Extract unique area values from the areas list endpoint separately —
    // filter.php meals don't carry strArea so we just return categories from
    // the meal data. Areas are fetched by the frontend separately for the
    // filter dropdowns via /api/external/meta.
    const payload = {
      meals,
      cachedAt: new Date().toISOString(),
      fromCache: false,
    }

    // Store in Redis. Upstash's set() with ex sets TTL in seconds.
    await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL })

    return res.json(payload)
  } catch (error) {
    console.error('getAllExternalMeals error:', error)
    res.status(500).json({ message: 'Failed to fetch external meals' })
  }
}

// GET /api/external/meta
// Returns categories + areas for the filter dropdowns. Cached separately
// because it's tiny and changes even less frequently than the meal list.
const META_KEY = 'external:meta'
const META_TTL = 6 * 60 * 60 // 6 hours

const getExternalMeta = async (req, res) => {
  try {
    const cached = await redis.get(META_KEY)
    if (cached) return res.json({ ...cached, fromCache: true })

    const [catRes, areaRes] = await Promise.all([
      fetch(`${MEALDB_BASE}/categories.php`).then((r) => r.json()),
      fetch(`${MEALDB_BASE}/list.php?a=list`).then((r) => r.json()),
    ])

    const payload = {
      categories: (catRes.categories || []).map((c) => c.strCategory),
      areas: (areaRes.meals || []).map((a) => a.strArea),
      cachedAt: new Date().toISOString(),
      fromCache: false,
    }

    await redis.set(META_KEY, payload, { ex: META_TTL })
    return res.json(payload)
  } catch (error) {
    console.error('getExternalMeta error:', error)
    res.status(500).json({ message: 'Failed to fetch external metadata' })
  }
}

// POST /api/external/meals/invalidate
// Admin/manual cache bust. Protect this with the protect middleware at the
// route level — don't expose it publicly.
const invalidateCache = async (req, res) => {
  try {
    await Promise.all([redis.del(CACHE_KEY), redis.del(META_KEY)])
    res.json({ message: 'External meal cache invalidated' })
  } catch (error) {
    console.error('invalidateCache error:', error)
    res.status(500).json({ message: 'Failed to invalidate cache' })
  }
}

module.exports = { getAllExternalMeals, getExternalMeta, invalidateCache }