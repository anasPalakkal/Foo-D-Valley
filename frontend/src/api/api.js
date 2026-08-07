import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // required to send/receive the httpOnly refresh cookie
})

// Access token lives in memory only — never localStorage. It's short-lived (15m)
// by design; persisting it defeats the point of splitting access/refresh tokens.
// AuthContext calls setAccessToken() whenever it changes.
let accessToken = null

export const setAccessToken = (token) => {
  accessToken = token
}

export const getAccessToken = () => accessToken

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// Single-flight refresh: if multiple requests 401 at once, only fire one
// /auth/refresh call and let the rest wait on it instead of racing.
let refreshPromise = null

export const doRefresh = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        return data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (
      error.response?.status !== 401 ||
      original._retried ||
      original.url === '/auth/refresh'
    ) {
      // Unverified-account block — fired by requireVerified on the backend.
      if (
        error.response?.status === 403 &&
        error.response?.data?.code === 'EMAIL_NOT_VERIFIED'   // <-- replace the old message-string check with this line
      ) {
        window.dispatchEvent(new Event('auth:unverified'))
      }
      return Promise.reject(error)
    }

    original._retried = true

    try {
      const newToken = await doRefresh()
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (refreshError) {
      setAccessToken(null)
      window.dispatchEvent(new Event('auth:logout'))
      return Promise.reject(refreshError)
    }
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const register = async (name, email, password) => {
  const { data } = await api.post('/auth/register', { name, email, password })
  return data
}

export const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export const getMe = async () => {
  const { data } = await api.get('/auth/me')
  return data
}

export const refreshSession = async () => {
  const { data } = await api.post('/auth/refresh')
  return data
}

export const logoutRequest = async () => {
  const { data } = await api.post('/auth/logout')
  return data
}

export const logoutAllRequest = async () => {
  const { data } = await api.post('/auth/logout-all')
  return data
}

export const verifyEmail = async (token) => {
  const { data } = await api.get('/auth/verify-email', { params: { token } })
  return data
}

export const resendVerification = async () => {
  const { data } = await api.post('/auth/resend-verification')
  return data
}

export const forgotPassword = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export const resetPassword = async (token, password) => {
  const { data } = await api.post('/auth/reset-password', { token, password })
  return data
}

// ─── Recipes ──────────────────────────────────────────────────────────────────

export const normalizeInternal = (recipe) => ({
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
  likesCount: recipe._count?.likes ?? 0,
  commentsCount: recipe._count?.comments ?? 0,
  isLiked: recipe.isLiked ?? false,
})

export const getRecipes = async (params = {}) => {
  const { data } = await api.get('/recipes', { params })
  return data
}

export const getRecipeById = async (id) => {
  const { data } = await api.get(`/recipes/${id}`)
  return data
}

export const uploadRecipe = async (formData) => {
  const { data } = await api.post('/recipes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const updateRecipe = async (id, formData) => {
  const { data } = await api.put(`/recipes/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const deleteRecipe = async (id) => {
  const { data } = await api.delete(`/recipes/${id}`)
  return data
}

export const getPopularRecipes = async (limit = 5) => {
  const { data } = await api.get('/recipes/popular', { params: { limit } })
  return data
}

export const getFeed = async (limit = 4) => {
  const { data } = await api.get('/recipes/feed', { params: { limit } })
  return data
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export const getLikeStatus = async (id, isExternal) => {
  const params = isExternal ? { type: 'external' } : {}
  const { data } = await api.get(`/recipes/${id}/likes`, { params })
  return data
}

export const likeRecipe = async (id, isExternal) => {
  const params = isExternal ? { type: 'external' } : {}
  const { data } = await api.post(`/recipes/${id}/like`, null, { params })
  return data
}

export const unlikeRecipe = async (id, isExternal) => {
  const params = isExternal ? { type: 'external' } : {}
  const { data } = await api.delete(`/recipes/${id}/like`, { params })
  return data
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export const getComments = async (id, isExternal) => {
  const params = isExternal ? { type: 'external' } : {}
  const { data } = await api.get(`/recipes/${id}/comments`, { params })
  return data
}

export const postComment = async (id, isExternal, content) => {
  const params = isExternal ? { type: 'external' } : {}
  const { data } = await api.post(`/recipes/${id}/comments`, { content }, { params })
  return data
}

export const getBatchLikeCounts = async (recipeIds, externalIds) => {
  const { data } = await api.post('/recipes/likes/batch', { recipeIds, externalIds })
  return data
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export const getFavorites = async () => {
  const { data } = await api.get('/favorites')
  return data
}

export const addFavorite = async (recipe) => {
  if (recipe.isExternal) {
    const { data } = await api.post('/favorites', {
      isExternal: true,
      externalId: recipe.externalId,
      externalName: recipe.name,
      externalImage: recipe.image,
    })
    return data
  }
  const { data } = await api.post('/favorites', { recipeId: recipe.id })
  return data
}

export const removeFavorite = async (recipe) => {
  const idToRemove = recipe.isExternal ? recipe.externalId : recipe.recipeId
  const type = recipe.isExternal ? 'external' : 'internal'
  const { data } = await api.delete(`/favorites/${idToRemove}?type=${type}`)
  return data
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = async (userId) => {
  const { data } = await api.get(`/profile/${userId}`)
  return data
}

export const updateProfile = async (fields) => {
  const { data } = await api.put('/profile/me', fields)
  return data
}

export const uploadAvatar = async (formData) => {
  const { data } = await api.post('/profile/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const uploadBanner = async (formData) => {
  const { data } = await api.post('/profile/me/banner', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const removeAvatar = async () => {
  const { data } = await api.delete('/profile/me/avatar')
  return data
}

export const removeBanner = async () => {
  const { data } = await api.delete('/profile/me/banner')
  return data
}

// ─── Follow ───────────────────────────────────────────────────────────────────

export const followUser = async (userId) => {
  const { data } = await api.post(`/users/${userId}/follow`)
  return data
}

export const unfollowUser = async (userId) => {
  const { data } = await api.delete(`/users/${userId}/follow`)
  return data
}

export const getFollowing = async (userId) => {
  const { data } = await api.get(`/users/${userId}/following`)
  return data
}

export const getFollowers = async (userId) => {
  const { data } = await api.get(`/users/${userId}/followers`)
  return data
}

// ─── TheMealDB (External) ─────────────────────────────────────────────────────

const MEAL_DB_BASE = 'https://www.themealdb.com/api/json/v1/1'

export const normalizeMeal = (meal) => {
  const ingredients = []
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`]
    const measure = meal[`strMeasure${i}`]
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure ? measure.trim() : ''} ${ingredient.trim()}`.trim())
    }
  }

  return {
    id: `ext_${meal.idMeal}`,
    externalId: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb,
    category: meal.strCategory,
    area: meal.strArea,
    instructions: meal.strInstructions
      ? meal.strInstructions.split('\n').filter((s) => s.trim())
      : [],
    ingredients,
    description: null,
    isExternal: true,
  }
}

// ─── Account ──────────────────────────────────────────────────────────────────

export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await api.put('/profile/me/password', { currentPassword, newPassword })
  return data
}

export const deleteAccount = async (password) => {
  const { data } = await api.delete('/profile/me', { data: { password } })
  return data
}

export const searchMeals = async (query = '') => {
  const res = await fetch(`${MEAL_DB_BASE}/search.php?s=${query}`)
  const data = await res.json()
  return data.meals ? data.meals.map(normalizeMeal) : []
}

export const getMealById = async (externalId) => {
  const res = await fetch(`${MEAL_DB_BASE}/lookup.php?i=${externalId}`)
  const data = await res.json()
  return data.meals ? normalizeMeal(data.meals[0]) : null
}

export const getMealsByCategory = async (category) => {
  const res = await fetch(`${MEAL_DB_BASE}/filter.php?c=${category}`)
  const data = await res.json()
  return data.meals ? data.meals.map(normalizeMeal) : []
}

export const getCategories = async () => {
  const res = await fetch(`${MEAL_DB_BASE}/categories.php`)
  const data = await res.json()
  return data.categories || []
}

export const getCuisines = async () => {
  const res = await fetch(`${MEAL_DB_BASE}/list.php?a=list`)
  const data = await res.json()
  return data.meals || []
}

export default api