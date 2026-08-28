// In-memory sliding window limiter for socket events.
// Not distributed — fine for a single Node instance. If you scale to multiple
// instances behind a load balancer, this needs to move to Redis (you already
// have lib/redis.js, reuse it then — don't build a second in-memory one per pod).

const buckets = new Map() // key: `${userId}:${eventName}` -> number[] (timestamps)

function socketRateLimit({ windowMs, max }) {
  return function check(userId, eventName) {
    const key = `${userId}:${eventName}`
    const now = Date.now()
    const timestamps = buckets.get(key) || []
    const fresh = timestamps.filter((t) => now - t < windowMs)

    if (fresh.length >= max) {
      buckets.set(key, fresh)
      return false
    }

    fresh.push(now)
    buckets.set(key, fresh)
    return true
  }
}

// Periodic cleanup so the map doesn't grow unbounded for disconnected users.
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of buckets.entries()) {
    const fresh = timestamps.filter((t) => now - t < 60_000)
    if (fresh.length === 0) buckets.delete(key)
    else buckets.set(key, fresh)
  }
}, 60_000).unref()

module.exports = { socketRateLimit }