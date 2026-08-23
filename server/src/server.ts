import { createServer } from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { initializeSockets } from "./sockets/index.js";

const PORT = Number(env.PORT) || 5000;

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

initializeSockets(io);

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    httpServer.listen(PORT, () => {
      console.log(`QuickConnect server running on port ${PORT} (${env.NODE_ENV})`);
      console.log(`Client: ${env.CLIENT_URL}`);
      console.log(`Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down...`);

  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after 10s");
    process.exit(1);
  }, 10_000);

  httpServer.close(async () => {
    io.close();
    await prisma.$disconnect();
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("uncaughtException", (err: Error) => {
  console.error("Uncaught Exception:", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

void startServer();
