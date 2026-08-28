const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()
const http = require('http')

const authRoutes = require('./routes/authRoutes')
const recipeRoutes = require('./routes/recipeRoutes')
const favoriteRoutes = require('./routes/favoriteRoutes')
const profileRoutes = require('./routes/profileRoutes')
const followRoutes = require('./routes/followRoutes')
const { startDeletionJob } = require('./jobs/deletion.job')
const cookieParser = require('cookie-parser')
const { lightRateLimit } = require('./middleware/rateLimiters')
const externalRoutes = require('./routes/externalRoutes')
const { initializeSocket } = require('./lib/socket')
const conversationRoutes = require('./routes/conversationRoutes')
const messageRoutes = require('./routes/messageRoutes')
const userRoutes = require('./routes/userRoutes')

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
app.use('/api/conversations', conversationRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/users', userRoutes)
app.use('/api/users', followRoutes)
app.use('/api/external', externalRoutes)


app.get('/', (req, res) => {
  res.json({ message: 'Foo D Valley API is running' })
})

// Socket.IO needs the raw http.Server, not the Express app — Express alone
// has no upgrade-request handling for WebSockets.
const httpServer = http.createServer(app)
initializeSocket(httpServer)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startDeletionJob()
})