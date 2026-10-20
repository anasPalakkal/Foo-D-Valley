const { redis } = require('./redis')

const TTL_SECONDS = 60 * 60 * 25
const utcDate = () => new Date().toISOString().slice(0, 10)

// Atomic counter with the UTC date in the key, so it resets at 00:00 UTC.
async function consume(prefix, limit) {
  const key = `${prefix}:${utcDate()}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, TTL_SECONDS)
  if (count > limit) {
    await redis.decr(key)
    return { ok: false, key, used: limit }
  }
  return { ok: true, key, used: count }
}

async function refund(key) {
  try {
    await redis.decr(key)
  } catch (err) {
    console.error('Quota refund failed:', err.message)
  }
}

module.exports = { consume, refund }