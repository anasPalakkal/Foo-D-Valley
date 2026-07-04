const prisma = require('../lib/prismaClient')
const { cloudinary } = require('../lib/cloudinary')
const { userSelect } = require('./authController')

const getProfile = async (req, res) => {
  const { userId } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            recipes: true,
          },
        },
        recipes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            createdAt: true,
          },
        },
        favorites: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            isExternal: true,
            externalId: true,
            externalName: true,
            externalImage: true,
            recipe: {
              select: {
                id: true,
                title: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    let isFollowing = false
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.user.id,
            followingId: Number(userId),
          },
        },
      })
      isFollowing = !!follow
    }

    res.json({ ...user, isFollowing })
  } catch (error) {
    console.error('getProfile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const updateProfile = async (req, res) => {
  const { name, bio } = req.body

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
      },
      select: userSelect,
    })

    res.json(updated)
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' })
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true },
    })

    if (currentUser?.avatarUrl) {
      const publicId = currentUser.avatarUrl
        .split('/')
        .slice(-2)
        .join('/')
        .split('.')[0]
      await cloudinary.uploader.destroy(publicId)
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'foodvalley/avatars',
      transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
    })

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: result.secure_url },
      select: userSelect,
    })

    res.json(updated)
  } catch (error) {
    console.error('uploadAvatar error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const uploadBanner = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' })
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { bannerUrl: true },
    })

    if (currentUser?.bannerUrl) {
      const publicId = currentUser.bannerUrl
        .split('/')
        .slice(-2)
        .join('/')
        .split('.')[0]
      await cloudinary.uploader.destroy(publicId)
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'foodvalley/banners',
      transformation: [{ width: 1200, height: 400, crop: 'fill' }],
    })

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { bannerUrl: result.secure_url },
      select: userSelect,
    })

    res.json(updated)
  } catch (error) {
    console.error('uploadBanner error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { getProfile, updateProfile, uploadAvatar, uploadBanner }