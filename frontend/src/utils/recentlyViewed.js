const STORAGE_KEY = 'recentlyViewed'
const MAX_ENTRIES = 10

// Stores a lightweight snapshot of each viewed recipe so Home can render
// cards without re-fetching (matters for external TheMealDB recipes, which
// would otherwise mean a fetch per card just to show a thumbnail).
export const addRecentlyViewed = (recipe) => {
  if (!recipe?.name || !recipe?.image) return

  try {
    const key = recipe.isExternal ? `ext_${recipe.externalId}` : `int_${recipe.id}`

    const entry = {
      key,
      id: recipe.id,
      externalId: recipe.externalId ?? null,
      isExternal: !!recipe.isExternal,
      name: recipe.name,
      image: recipe.image,
      category: recipe.category || null,
      area: recipe.area || null,
      viewedAt: Date.now(),
    }

    const existing = getRecentlyViewed().filter((r) => r.key !== key)
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage blocked (private browsing, quota, etc) - not worth failing the page over
  }
}

export const getRecentlyViewed = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}