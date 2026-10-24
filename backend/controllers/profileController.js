const prisma = require('../lib/prismaClient')
const { cloudinary } = require('../lib/cloudinary')
const { userSelect } = require('./authController')
const { isDemoUser, demoForbidden } = require('../lib/demo')

const bcrypt = require('bcryptjs')
const DELETION_DAYS = 14

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
        isDeleted: true,
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

    // Treat pending-deletion accounts as not found — hides profile from other users
    if (!user || user.isDeleted) {
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

    const { isDeleted, ...safeUser } = user

    res.json({ ...safeUser, isFollowing })
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

    // avatarUpload's CloudinaryStorage instance already uploaded directly
    // to foodvalley/avatars with the face-crop transform applied — no
    // second manual cloudinary.uploader.upload() needed. req.file.path is
    // the final secure_url.
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: req.file.path },
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

    // Same as avatar — bannerUpload already uploaded directly to
    // foodvalley/banners with the correct transform, no re-upload needed.
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { bannerUrl: req.file.path },
      select: userSelect,
    })

    res.json(updated)
  } catch (error) {
    console.error('uploadBanner error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}


// PUT /api/profile/me/password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (isDemoUser(req.user.id)) return demoForbidden(res)
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    })

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    })

    res.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('changePassword error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/profile/me
const deleteAccount = async (req, res) => {
  const { password } = req.body

  if (isDemoUser(req.user.id)) return demoForbidden(res)
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true, isDeleted: true },
    })

    if (user.isDeleted) {
      return res.status(400).json({ message: 'Account is already scheduled for deletion' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' })
    }

    const scheduledDeletionAt = new Date(Date.now() + DELETION_DAYS * 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isDeleted: true, scheduledDeletionAt },
    })

    res.json({
      message: `Account scheduled for deletion in ${DELETION_DAYS} days. Log in anytime before then to cancel.`,
      scheduledDeletionAt,
    })
  } catch (error) {
    console.error('deleteAccount error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/profile/me/avatar — clears avatar, reverts to first-letter default
const removeAvatar = async (req, res) => {
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

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: null },
      select: userSelect,
    })

    res.json(updated)
  } catch (error) {
    console.error('removeAvatar error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/profile/me/banner — clears banner, reverts to default gradient
const removeBanner = async (req, res) => {
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

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { bannerUrl: null },
      select: userSelect,
    })

    res.json(updated)
  } catch (error) {
    console.error('removeBanner error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { getProfile, updateProfile, uploadAvatar, uploadBanner, removeAvatar, removeBanner, changePassword, deleteAccount }