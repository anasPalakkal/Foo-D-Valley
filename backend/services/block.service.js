const prisma = require('../lib/prismaClient')

async function isBlockedEitherDirection(userIdA, userIdB) {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
  })
  return !!block
}

module.exports = { isBlockedEitherDirection }