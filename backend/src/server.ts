import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import cron from "node-cron";
import dotenv from "dotenv";

import spotsRouter from "./routes/spots";
import chatRouter from "./routes/chat";

dotenv.config();

export const prisma = new PrismaClient();

export const redis = new Redis(process.env.REDIS_URL!, {
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableOfflineQueue: false,
});

redis.on("error", (err) => console.error("Redis error", err));
redis.on("connect", () => console.log("Redis connected"));

const app = express();
const httpServer = createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

app.use("/api/", standardLimiter);
app.use("/api/chat", chatLimiter);

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "degraded", error: String(err) });
  }
});

app.use("/api/spots", spotsRouter);
app.use("/api/chat", chatRouter);

// Stub routes to prevent crashes
app.use("/api/occupancy", (req, res) => res.json({ status: "todo" }));
app.use("/api/bookings", (req, res) => res.json({ status: "todo" }));
app.use("/api/community", (req, res) => res.json({ status: "todo" }));
app.use("/api/analytics", (req, res) => res.json({ status: "todo" }));
app.use("/api/search", (req, res) => res.json({ status: "todo" }));

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  httpServer.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const PORT = parseInt(process.env.PORT || "4000");

httpServer.listen(PORT, () => {
  console.log(`StudySpotSG API running on port ${PORT}`);
});

export default app;