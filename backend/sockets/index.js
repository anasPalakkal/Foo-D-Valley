const { registerConversationHandlers } = require('./conversationHandlers')
const { registerMessageHandlers } = require('./messageHandlers')
const { socketRateLimit } = require('../middleware/socketRateLimiter')

const conversationJoinLimit = socketRateLimit({ windowMs: 10_000, max: 20 })
const messageSendLimit = socketRateLimit({ windowMs: 10_000, max: 30 })

function registerHandlers(io, socket) {
  registerConversationHandlers(io, socket, conversationJoinLimit)
  registerMessageHandlers(io, socket, messageSendLimit)
}

module.exports = { registerHandlers }