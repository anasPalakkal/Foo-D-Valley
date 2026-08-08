const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()

const authRoutes = require('./routes/authRoutes')
const recipeRoutes = require('./routes/recipeRoutes')
const favoriteRoutes = require('./routes/favoriteRoutes')
const profileRoutes = require('./routes/profileRoutes')
const followRoutes = require('./routes/followRoutes')
const { startDeletionJob } = require('./jobs/deletion.job')
const cookieParser = require('cookie-parser')
const { lightRateLimit } = require('./middleware/rateLimiters')

const app = express()
app.set('trust proxy', 1)
app.use(helmet())

app.use(cors({
  origin: process.env.CLIENT_URL, // must be an exact origin, not "*", when credentials:true
  credentials: true,              // required so the browser sends/receives the refresh cookie
}))
app.use(express.json({ limit: '200kb' }))
app.use(cookieParser())

// Global backstop rate limiter — generous ceiling, just to stop abuse/DoS
// on routes that don't have their own stricter limiter. authRoutes applies
// its own tighter limits per-endpoint on top of this.
app.use('/api', lightRateLimit)

app.use('/api/auth', authRoutes)
app.use('/api/recipes', recipeRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/users', followRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Foo D Valley API is running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startDeletionJob()
})