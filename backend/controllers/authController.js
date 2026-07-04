const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prismaClient')

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// Fields returned in every auth/profile response — keep in sync across authController and profileController
const userSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  bannerUrl: true,
  bio: true,
  _count: {
    select: {
      followers: true,
      following: true,
      recipes: true,
    },
  },
}

const register = async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: userSelect,
    })

    const token = generateToken(user.id)

    res.status(201).json({ token, user })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const login = async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, password: true },
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = generateToken(user.id)

    // Strip password before sending
    const { password: _pw, ...safeUser } = user

    res.json({ token, user: safeUser })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: userSelect,
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    console.error('getMe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { register, login, getMe, userSelect }