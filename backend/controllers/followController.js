const prisma = require('../lib/prismaClient')
const { createNotification, deleteNotification, emitNotification } = require('../services/notification.service')

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

    let follow, notification

    await prisma.$transaction(async (tx) => {
      follow = await tx.follow.create({
        data: {
          follower: { connect: { id: req.user.id } },
          followingUser: { connect: { id: targetId } },
        },
      })

      notification = await createNotification(tx, {
        recipientId: targetId,
        actorId: req.user.id,
        type: 'FOLLOW',
      })
    })

    emitNotification(notification)

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
    await prisma.$transaction(async (tx) => {
      await tx.follow.delete({
        where: {
          followerId_followingId: { followerId: req.user.id, followingId: targetId },
        },
      })

      await deleteNotification(tx, {
        recipientId: targetId,
        actorId: req.user.id,
        type: 'FOLLOW',
      })
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

// Tags each user in the list with whether the viewer (req.user) already follows them —
// needed so the frontend can render "Follow Back" vs "Following" per row
const attachIsFollowing = async (users, viewerId) => {
  if (!viewerId) return users.map((u) => ({ ...u, isFollowing: false }))

  const targetIds = users.map((u) => u.id)
  const relations = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: targetIds } },
    select: { followingId: true },
  })

  const followingSet = new Set(relations.map((r) => r.followingId))
  return users.map((u) => ({ ...u, isFollowing: followingSet.has(u.id) }))
}

const getFollowers = async (req, res) => {
  const { userId } = req.params

  try {
    const followers = await prisma.follow.findMany({
      where: { followingId: Number(userId) },
      include: {
        follower: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const users = followers.map((f) => f.follower)
    const result = await attachIsFollowing(users, req.user?.id)

    res.json(result)
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
        followingUser: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const users = following.map((f) => f.followingUser)
    const result = await attachIsFollowing(users, req.user?.id)

    res.json(result)
  } catch (error) {
    console.error('getFollowing error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { followUser, unfollowUser, getFollowers, getFollowing }