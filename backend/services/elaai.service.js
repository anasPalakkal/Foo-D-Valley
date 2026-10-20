const BASE = process.env.ELAAI_BASE_URL || 'https://elaai-api.onrender.com'
const TIMEOUT_MS = 75000
const WARM_COOLDOWN_MS = 5 * 60 * 1000

let lastWarm = 0

class ElaAiError extends Error {
  constructor(kind, detail) {
    super(detail || kind)
    this.kind = kind // 'CAPACITY' | 'UPSTREAM'
  }
}

// ElaAI sleeps after 15 min idle (~1 min cold start). Fire-and-forget, throttled.
function warmUp() {
  if (Date.now() - lastWarm < WARM_COOLDOWN_MS) return
  lastWarm = Date.now()
  fetch(`${BASE}/health`, { signal: AbortSignal.timeout(90000) }).catch(() => {})
}

function normalizeImage(image) {
  if (process.env.NODE_ENV !== 'production') console.log('[elaai image]', image)
  if (!image || typeof image !== 'object') return { imageUrl: null, imageCredit: null }

  const url = image.imageUrl || image.url
  const a = image.attribution
  const credit = typeof a === 'string' ? a : a?.text || a?.photographer || a?.name || null

  return {
    imageUrl: typeof url === 'string' && url.startsWith('https://') ? url : null,
    imageCredit: credit ? String(credit).slice(0, 300) : null,
  }
}

// Returns { type: 'recipe', recipe, imageUrl, imageCredit } | { type: 'text', text } | { type: 'refused' }
async function generate(prompt) {
  if (!process.env.ELAAI_API_KEY) throw new ElaAiError('UPSTREAM', 'ELAAI_API_KEY not configured')

  let res, body
  try {
    res = await fetch(`${BASE}/v1/recipes/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ELAAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    body = await res.json().catch(() => null)
  } catch (err) {
    throw new ElaAiError('UPSTREAM', err.message)
  }

  if (res.ok) {
    return { type: 'recipe', recipe: body.recipe, ...normalizeImage(body.image) }
  }

  const code = body?.error?.code

  if (res.status === 422) {
    const answer = body?.error?.details?.answer
    if (code === 'FOOD_INFO_NOT_RECIPE' && typeof answer === 'string') {
      return { type: 'text', text: answer }
    }
    return { type: 'refused' } // OUT_OF_SCOPE, UNSAFE_OR_UNCLEAR
  }

  if (res.status === 429 || code === 'AI_QUOTA_EXHAUSTED') {
    throw new ElaAiError('CAPACITY', code)
  }

  throw new ElaAiError('UPSTREAM', `${res.status} ${code || ''}`)
}

module.exports = { generate, warmUp, ElaAiError }