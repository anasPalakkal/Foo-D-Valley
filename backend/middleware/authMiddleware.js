const jwt = require('jsonwebtoken')

// Full protection — blocks unauthenticated requests
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid token' })
  }
}

// Optional — attaches user if token exists, continues either way
// Used for public routes that behave differently for logged-in users
const optionalProtect = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
  } catch {
    // Invalid token — just continue without user, don't block
  }

  next()
}

module.exports = { protect, optionalProtect }