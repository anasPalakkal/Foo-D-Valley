const prisma = require('../lib/prismaClient')

const followUser = async (req, res) => {
  const { userId } = req.params
  const targetId = Number(userId)

  if (req.user.id === targetId) {
    return res.status(400).json({ message: 'You cannot follow yourself' })
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) {
      return res.status(404).json({ message: 'User not found' })
    }

    const follow = await prisma.follow.create({
      data: {
        follower: { connect: { id: req.user.id } },
        followingUser: { connect: { id: targetId } },
      },
    })

    res.status(201).json(follow)
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Already following this user' })
    }
    console.error('followUser error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const unfollowUser = async (req, res) => {
  const { userId } = req.params
  const targetId = Number(userId)

  try {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: targetId,
        },
      },
    })

    res.json({ message: 'Unfollowed successfully' })
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'You are not following this user' })
    }
    console.error('unfollowUser error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getFollowers = async (req, res) => {
  const { userId } = req.params

  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: Number(userId) },
      include: {
        follower: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(followers.map((f) => f.follower))
  } catch (error) {
    console.error('getFollowers error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const getFollowing = async (req, res) => {
  const { userId } = req.params

  try {
    const following = await prisma.follow.findMany({
      where: { followerId: Number(userId) },
      include: {
        followingUser: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(following.map((f) => f.followingUser))
  } catch (error) {
    console.error('getFollowing error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { followUser, unfollowUser, getFollowers, getFollowing }