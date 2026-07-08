import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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

// ─── Follow ───────────────────────────────────────────────────────────────────

export const followUser = async (userId) => {
  const { data } = await api.post(`/users/${userId}/follow`)
  return data
}

export const unfollowUser = async (userId) => {
  const { data } = await api.delete(`/users/${userId}/follow`)
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