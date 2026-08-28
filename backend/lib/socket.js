const { Server } = require("socket.io");
const { verifyAccessToken } = require("./jwt");

let io;

/**
 * JWT auth for the socket handshake. Mirrors middleware/authMiddleware.js
 * `protect` — signature/expiry check only, no DB hit, same `sub` -> id
 * normalization so socket.data.user.id behaves exactly like req.user.id.
 *
 * Client must send auth as a FUNCTION (not a static object), e.g.:
 *   io(url, { auth: (cb) => cb({ token: getAccessToken() }) })
 * That's what lets socket.io-client re-read the current in-memory token
 * on every reconnect, keeping a long-lived tab authenticated across the
 * 15-minute access-token expiry with no custom refresh event.
 */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Not authorized, no token"));
  }

  try {
    const decoded = verifyAccessToken(token);
    // decoded.sub is whatever type jsonwebtoken preserves from signing —
    // normalize to Int here since every model in schema.prisma uses
    // Int autoincrement ids, same reasoning as authMiddleware.js.
    socket.data.user = { id: Number(decoded.sub) };
    next();
  } catch (error) {
    next(new Error("Not authorized, invalid token"));
  }
}

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    // user:{id} room joined here, once, at connect — used for cross-
    // conversation events (new conversation, unread badge, notifications).
    socket.join(`user:${socket.data.user.id}`);

    // Phase C wires conversation/message event handlers here.
    // Deliberately empty for Phase A — this milestone is auth + connection only.

    socket.on("disconnect", () => {
      // Phase D: presence debounce logic goes here.
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized — call initializeSocket first");
  }
  return io;
}

module.exports = { initializeSocket, getIO };