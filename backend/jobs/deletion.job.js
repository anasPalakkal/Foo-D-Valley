const cron = require('node-cron')
const prisma = require('../lib/prismaClient')

const startDeletionJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('[DeletionJob] Running scheduled account deletion...')

    try {
      const usersToDelete = await prisma.user.findMany({
        where: {
          isDeleted: true,
          scheduledDeletionAt: { lte: new Date() },
        },
        select: { id: true, email: true },
      })

      if (usersToDelete.length === 0) {
        console.log('[DeletionJob] No accounts to delete.')
        return
      }

      console.log(`[DeletionJob] Deleting ${usersToDelete.length} account(s)...`)

      for (const user of usersToDelete) {
        // Cascade in schema handles recipes, likes, comments, favorites, follows
        await prisma.user.delete({ where: { id: user.id } })
        console.log(`[DeletionJob] Deleted account: ${user.email}`)
      }

      console.log('[DeletionJob] Completed.')
    } catch (error) {
      console.error('[DeletionJob] Error:', error.message)
    }
  })

  console.log('[DeletionJob] Scheduled — runs daily at midnight.')
}

module.exports = { startDeletionJob }