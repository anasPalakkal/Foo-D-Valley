const { Server } = require("socket.io");
const { verifyAccessToken } = require("./jwt");
const prisma = require("./prismaClient");
const { registerHandlers } = require("../sockets");

let io;

async function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Not authorized, no token"));
  }

  try {
    const decoded = verifyAccessToken(token);
    const userId = Number(decoded.sub);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true },
    });

    if (!user) {
      return next(new Error("Not authorized, user not found"));
    }

    socket.data.user = { id: userId, isVerified: user.isVerified };
    next();
  } catch (error) {
    next(new Error("Not authorized, invalid token"));
  }
}

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "https://foo-d-valley.vercel.app",
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.user.id}`);

    registerHandlers(io, socket);

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