import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

let accessToken = null

export const setAccessToken = (token) => {
  accessToken = token
}

export const getAccessToken = () => accessToken

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

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
      if (
        error.response?.status === 403 &&
        error.response?.data?.code === 'EMAIL_NOT_VERIFIED'
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

// Returns { recipes, total, page, totalPages, hasMore }
// params: { page, limit, sort, category, cuisine, search, source }
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

export const getRecommendations = async (limit = 8) => {
  const { data } = await api.get('/recipes/recommendations', { params: { limit } })
  return data
}

// ─── External meals (cached on backend) ──────────────────────────────────────

// Returns { meals: NormalizedExternalMeal[], cachedAt, fromCache }
// meals shape: { externalId, name, image, category, area, isExternal: true }
export const getExternalMeals = async () => {
  const { data } = await api.get('/external/meals')
  return data
}

// Returns { categories: string[], areas: string[], cachedAt, fromCache }
export const getExternalMeta = async () => {
  const { data } = await api.get('/external/meta')
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

export const getBatchLikeCounts = async (recipeIds, externalIds) => {
  const { data } = await api.post('/recipes/likes/batch', { recipeIds, externalIds })
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

export const getCommentContext = (commentId) =>
  api.get(`/recipes/comments/${commentId}/context`).then((res) => res.data)

export const editComment = async (commentId, content) => {
  const { data } = await api.patch(`/recipes/comments/${commentId}`, { content })
  return data
}

export const deleteComment = async (commentId) => {
  const { data } = await api.delete(`/recipes/comments/${commentId}`)
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
  const isAi = recipe.aiRecipeId != null
  const type = isAi ? 'ai' : recipe.isExternal ? 'external' : 'internal'
  const idToRemove = isAi ? recipe.aiRecipeId : recipe.isExternal ? recipe.externalId : recipe.recipeId
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

// ─── TheMealDB (direct — used only for single recipe lookup) ──────────────────
// Category listing and bulk meal fetching now go through the cached backend
// endpoints above. Keep getMealById here because RecipeDetails needs a single
// full-detail lookup (instructions, ingredients) which the cache doesn't store.

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

export const getMealById = async (externalId) => {
  const res = await fetch(`${MEAL_DB_BASE}/lookup.php?i=${externalId}`)
  const data = await res.json()
  return data.meals ? normalizeMeal(data.meals[0]) : null
}

// Keep searchMeals for any existing search usage
export const searchMeals = async (query = '') => {
  const res = await fetch(`${MEAL_DB_BASE}/search.php?s=${query}`)
  const data = await res.json()
  return data.meals ? data.meals.map(normalizeMeal) : []
}

// These three are still used by Navbar (category dropdown) and PostRecipeModal
// (category/cuisine selects). They call TheMealDB directly because they need
// the full metadata objects, not the cached meal-list format from /api/external.
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

export const getMealsByCategory = async (category) => {
  const res = await fetch(`${MEAL_DB_BASE}/filter.php?c=${encodeURIComponent(category)}`)
  const data = await res.json()
  return data.meals ? data.meals.map(normalizeMeal) : []
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

// ─── Notifications ────────────────────────────────────────────────────────────

export const getUnreadNotificationCount = async () => {
  const { data } = await api.get('/notifications/unread-count')
  return data
}

// Returns { notifications, hasMore } — shape inferred from listConversations'
// identical cursor pattern (before/limit -> { items, hasMore }), same author,
// same session. High-confidence pattern match, not confirmed against
// notificationController.js directly.
export const listNotifications = async (before, limit = 20) => {
  const { data } = await api.get('/notifications', { params: { before, limit } })
  return data
}

export const markNotificationRead = async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`)
  return data
}

export const markAllNotificationsRead = async () => {
  const { data } = await api.patch('/notifications/read-all')
  return data
}

// ─── Conversations ────────────────────────────────────────────────────────────

// Returns { conversations, hasMore }
export const getConversations = async (before, limit = 20) => {
  const { data } = await api.get('/conversations', { params: { before, limit } })
  return data
}

export const createConversation = async (recipientUserId) => {
  const { data } = await api.post('/conversations', { recipientUserId })
  return data
}

export const getConversationById = async (id) => {
  const { data } = await api.get(`/conversations/${id}`)
  return data
}

// Returns { messages, hasMore } — messages already oldest-first server-side.
export const getMessages = async (conversationId, before, limit = 30) => {
  const { data } = await api.get(`/conversations/${conversationId}/messages`, {
    params: { before, limit },
  })
  return data
}

export const markConversationRead = async (conversationId, messageId) => {
  const { data } = await api.patch(`/conversations/${conversationId}/read`, { messageId })
  return data
}

export const toggleConversationMute = async (conversationId, isMuted) => {
  const { data } = await api.patch(`/conversations/${conversationId}/mute`, { isMuted })
  return data
}

// ─── Messages ─────────────────────────────────────────────────────────────────
// Sending itself is socket-driven (Phase A-D), not REST — no "createMessage"
// function here on purpose. These three are the REST-only side confirmed by
// messageController.js.

export const uploadChatImage = async (formData) => {
  const { data } = await api.post('/messages/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const editMessage = async (id, content) => {
  const { data } = await api.patch(`/messages/${id}`, { content })
  return data
}

export const deleteMessage = async (id, scope = 'me') => {
  const { data } = await api.delete(`/messages/${id}`, { params: { scope } })
  return data
}

// ─── Assistant ────────────────────────────────────────────────────────────────

// Fire-and-forget: wakes the sleeping ElaAI service while the user is typing.
export const warmAssistant = () => api.post('/assistant/warm').catch(() => {})

// Returns { reply: { kind, text, recipe }, remaining }. Long timeout: ElaAI cold start can take ~60s.
export const sendAssistantMessage = async (prompt) => {
  const { data } = await api.post('/assistant/chat', { prompt }, { timeout: 80000 })
  return data
}

// Returns { id }. A 409 ALREADY_SAVED response also carries the existing id.
export const saveAssistantRecipe = async (recipe) => {
  const { data } = await api.post('/assistant/save-recipe', recipe)
  return data
}

export const getAiRecipe = async (id) => {
  const { data } = await api.get(`/assistant/recipes/${id}`)
  return data
}

export default api