const cron = require('node-cron')
const prisma = require('../lib/prismaClient')

const UNVERIFIED_INACTIVE_DAYS = 60

const startDeletionJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('[DeletionJob] Running scheduled account deletion...')

    try {
      // ── Pass 1: accounts the user explicitly requested to delete ──
      const usersToDelete = await prisma.user.findMany({
        where: {
          isDeleted: true,
          scheduledDeletionAt: { lte: new Date() },
        },
        select: { id: true, email: true },
      })

      for (const user of usersToDelete) {
        await prisma.user.delete({ where: { id: user.id } })
        console.log(`[DeletionJob] Deleted (requested) account: ${user.email}`)
      }

      // ── Pass 2: unverified accounts with no activity in UNVERIFIED_INACTIVE_DAYS ──
      // Two cases, both covered:
      //   - never returned after signup: lastLoginAt is null, use createdAt
      //   - returned once/twice then went quiet: lastLoginAt itself is stale
      // Accounts that keep logging in stay untouched indefinitely, even unverified.
      const cutoff = new Date(Date.now() - UNVERIFIED_INACTIVE_DAYS * 24 * 60 * 60 * 1000)

      const staleUnverified = await prisma.user.findMany({
        where: {
          isVerified: false,
          isDeleted: false, // don't double-process rows pass 1 already handles
          OR: [
            { lastLoginAt: null, createdAt: { lte: cutoff } },
            { lastLoginAt: { lte: cutoff } },
          ],
        },
        select: { id: true, email: true },
      })

      for (const user of staleUnverified) {
        await prisma.user.delete({ where: { id: user.id } })
        console.log(`[DeletionJob] Deleted (unverified/inactive) account: ${user.email}`)
      }

      if (usersToDelete.length === 0 && staleUnverified.length === 0) {
        console.log('[DeletionJob] Nothing to delete.')
      }

      console.log('[DeletionJob] Completed.')
    } catch (error) {
      console.error('[DeletionJob] Error:', error.message)
    }
  })

  console.log('[DeletionJob] Scheduled — runs daily at midnight.')
}

module.exports = { startDeletionJob }