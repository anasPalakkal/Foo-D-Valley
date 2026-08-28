const prisma = require('../lib/prismaClient')

// GET /api/users/search?q=
const searchUsers = async (req, res) => {
  const q = (req.query.q || '').trim()
  if (q.length < 2) {
    return res.json([])
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, avatarUrl: true, isDeleted: true },
      take: 20,
    })

    res.json(users)
  } catch (error) {
    console.error('searchUsers error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// POST /api/users/:id/block
const blockUser = async (req, res) => {
  const blockedId = Number(req.params.id)
  if (blockedId === req.user.id) {
    return res.status(400).json({ message: 'Cannot block yourself' })
  }

  try {
    const block = await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.user.id, blockedId } },
      update: {},
      create: { blocker: { connect: { id: req.user.id } }, blocked: { connect: { id: blockedId } } },
    })

    res.status(201).json(block)
  } catch (error) {
    console.error('blockUser error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/users/:id/block
const unblockUser = async (req, res) => {
  const blockedId = Number(req.params.id)

  try {
    await prisma.block.deleteMany({ where: { blockerId: req.user.id, blockedId } })
    res.json({ message: 'Unblocked' })
  } catch (error) {
    console.error('unblockUser error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { searchUsers, blockUser, unblockUser }