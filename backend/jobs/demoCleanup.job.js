const cron = require('node-cron')
const prisma = require('../lib/prismaClient')
const { cloudinary } = require('../lib/cloudinary')

// Extracts the full Cloudinary public_id (folder included) from a delivery URL:
// .../image/upload/v123/foodvalley/recipes/abc.jpg -> foodvalley/recipes/abc
const publicIdFromUrl = (url) => {
  const match = url && url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i)
  return match ? match[1] : null
}

/**
 * Returns the shared demo account to a clean state: removes everything it
 * created (recipes, comments, likes, saves, AI recipes, follows, messages,
 * notifications) and resets its profile. The account row itself, its
 * credentials and its verified flag are left untouched.
 *
 * Exported so it can be run manually for testing.
 */
const resetDemoAccount = async (demoId) => {
  const user = await prisma.user.findUnique({
    where: { id: demoId },
    select: { avatarUrl: true, bannerUrl: true },
  })
  if (!user) {
    console.warn(`[DemoCleanup] No user with id ${demoId}, skipping.`)
    return
  }

  const [recipes, chatImages] = await Promise.all([
    prisma.recipe.findMany({ where: { authorId: demoId }, select: { imageUrl: true } }),
    prisma.message.findMany({
      where: {
        imagePublicId: { not: null },
        conversation: { participants: { some: { userId: demoId } } },
      },
      select: { imagePublicId: true },
    }),
  ])

  // Images first, best effort: a Cloudinary failure must not block the DB reset.
  const publicIds = [
    ...recipes.map((r) => publicIdFromUrl(r.imageUrl)),
    ...chatImages.map((m) => m.imagePublicId),
    publicIdFromUrl(user.avatarUrl),
    publicIdFromUrl(user.bannerUrl),
  ].filter(Boolean)
  await Promise.allSettled(publicIds.map((id) => cloudinary.uploader.destroy(id)))

  await prisma.$transaction([
    prisma.conversation.deleteMany({ where: { participants: { some: { userId: demoId } } } }),
    prisma.recipe.deleteMany({ where: { authorId: demoId } }),
    prisma.recipeComment.deleteMany({ where: { userId: demoId } }),
    prisma.recipeLike.deleteMany({ where: { userId: demoId } }),
    prisma.favorite.deleteMany({ where: { userId: demoId } }),
    prisma.aiRecipe.deleteMany({ where: { userId: demoId } }),
    prisma.follow.deleteMany({ where: { followerId: demoId } }),
    prisma.block.deleteMany({ where: { blockerId: demoId } }),
    prisma.notification.deleteMany({
      where: { OR: [{ recipientId: demoId }, { actorId: demoId }] },
    }),
    prisma.user.update({
      where: { id: demoId },
      data: { name: 'Demo User', bio: null, avatarUrl: null, bannerUrl: null },
    }),
  ])

  console.log(
    `[DemoCleanup] Reset complete: ${recipes.length} recipes, ${publicIds.length} images removed.`
  )
}

const startDemoCleanupJob = () => {
  const demoId = Number(process.env.DEMO_USER_ID)
  if (!Number.isInteger(demoId) || demoId <= 0) {
    console.log('[DemoCleanup] DEMO_USER_ID not set, job disabled.')
    return
  }

  cron.schedule(
    '0 3 * * *',
    async () => {
      try {
        await resetDemoAccount(demoId)
      } catch (error) {
        console.error('[DemoCleanup] Error:', error.message)
      }
    },
    { timezone: 'Asia/Kolkata' }
  )

  console.log('[DemoCleanup] Scheduled, runs daily at 03:00 IST.')
}

module.exports = { startDemoCleanupJob, resetDemoAccount }