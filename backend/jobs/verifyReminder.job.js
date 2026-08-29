const cron = require('node-cron')
const prisma = require('../lib/prismaClient')
const { getIO } = require('../lib/socket')

const REMINDER_INTERVAL_DAYS = 10
const MIN_ACCOUNT_AGE_DAYS = 10 // don't nag someone who signed up hours ago

const startVerifyReminderJob = () => {
  cron.schedule('0 1 * * *', async () => {
    console.log('[VerifyReminderJob] Running scheduled verification reminders...')

    try {
      const now = new Date()
      const cutoff = new Date(now.getTime() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000)
      const minAgeCutoff = new Date(now.getTime() - MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000)

      const staleUnverified = await prisma.user.findMany({
        where: {
          isVerified: false,
          isDeleted: false,
          createdAt: { lte: minAgeCutoff },
          OR: [
            { lastVerifyReminderAt: null },
            { lastVerifyReminderAt: { lte: cutoff } },
          ],
        },
        select: { id: true, email: true },
      })

      for (const user of staleUnverified) {
        await prisma.$transaction(async (tx) => {
          await tx.notification.create({
            data: {
              recipientId: user.id,
              actorId: null,
              type: 'VERIFY_REMINDER',
            },
          })

          await tx.user.update({
            where: { id: user.id },
            data: { lastVerifyReminderAt: now },
          })
        })

        try {
          getIO().to(`user:${user.id}`).emit('notification:new', {
            recipientId: user.id,
            actorId: null,
            type: 'VERIFY_REMINDER',
          })
        } catch (socketError) {
          // getIO() throws if socket.io isn't initialized yet — job can still
          // run and persist the notification even if sockets aren't up.
          console.error('[VerifyReminderJob] Socket emit skipped:', socketError.message)
        }

        console.log(`[VerifyReminderJob] Reminded: ${user.email}`)
      }

      if (staleUnverified.length === 0) {
        console.log('[VerifyReminderJob] Nothing to remind.')
      }

      console.log('[VerifyReminderJob] Completed.')
    } catch (error) {
      console.error('[VerifyReminderJob] Error:', error.message)
    }
  })

  console.log('[VerifyReminderJob] Scheduled — runs daily at 1am.')
}

module.exports = { startVerifyReminderJob }