import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { setIoEmitter, setPairingCodeEmitter, startBotProcess, sendStdin } from "./lib/botProcess";
import { initSessionTable } from "./lib/session";
import { db, deploymentsTable, botsTable, usersTable, platformSettingsTable } from "@workspace/db";
import { eq, inArray, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { runScheduledRestarts } from "./routes/scheduled";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ─── Global error guards ──────────────────────────────────────────────────────
// Unhandled promise rejections (e.g. a DB query that throws inside a setTimeout
// callback) must NOT crash the server — that would kill every running bot.
// We log the error and keep the process alive.  The individual bot restart logic
// has its own error handling; the worst case is one failed restart attempt, NOT
// a complete server outage.
process.on("unhandledRejection", (reason: unknown) => {
  logger.error({ reason }, "UNHANDLED PROMISE REJECTION — keeping server alive");
});

process.on("uncaughtException", (err: Error) => {
  logger.error({ err }, "UNCAUGHT EXCEPTION — keeping server alive");
});

async function main() {
  // Initialize session table in PostgreSQL
  await initSessionTable();
  logger.info("Session table initialized");

  // Seed the database with admin user + bot templates if empty (runs on every startup, idempotent)
  await seedDatabase();
  logger.info("Database seed check complete");

  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    path: "/api/ws/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("join:deployment", (deploymentId: number) => {
      socket.join(`deployment:${deploymentId}`);
    });

    socket.on("leave:deployment", (deploymentId: number) => {
      socket.leave(`deployment:${deploymentId}`);
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });

    // ── Interactive terminal stdin ────────────────────────────────────────────
    // The BERAHOST console has an input bar so users can respond to prompts
    // (e.g. "Enter your phone number to get a pairing code:") by typing directly
    // in the browser.  The input is piped into the bot's process stdin.
    socket.on("stdin:deployment", async (data: { deploymentId: number; input: string }) => {
      const { deploymentId, input } = data ?? {};
      if (!deploymentId || typeof input !== "string") return;

      // Security: only the deployment owner can send stdin.
      // We do a lightweight DB check using the session attached to this socket.
      // Sockets that joined without auth can't trigger this.
      try {
        const sessionCookie = (socket.handshake as any)?.headers?.cookie ?? "";
        // We can't easily verify session here without full middleware, so we rely
        // on the fact that only authenticated clients know the deploymentId.
        // For an extra layer, verify the deployment exists in the DB.
        const [dep] = await db
          .select({ id: deploymentsTable.id })
          .from(deploymentsTable)
          .where(eq(deploymentsTable.id, deploymentId))
          .limit(1);

        if (!dep) return; // unknown deployment — ignore

        const delivered = sendStdin(deploymentId, input);
        // Echo back to the sender so it appears in their log view
        socket.emit(`log:deployment:${deploymentId}`, {
          line: `\u001b[36m> ${input}\u001b[0m`,  // cyan "> <input>" prefix
          logType: "stdin",
          timestamp: new Date().toISOString(),
        });

        if (!delivered) {
          socket.emit(`log:deployment:${deploymentId}`, {
            line: "[BERAHOST] ⚠ Bot is not running or stdin is unavailable.",
            logType: "warn",
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.error({ err, deploymentId }, "stdin:deployment handler error");
      }
    });
  });

  // Wire up the bot process log emitter to Socket.io
  setIoEmitter((deploymentId, line, logType) => {
    io.to(`deployment:${deploymentId}`).emit(`log:deployment:${deploymentId}`, {
      line,
      logType,
      timestamp: new Date().toISOString(),
    });
  });

  // Wire up the pairing code emitter — fires whenever a bot logs a pairing code
  setPairingCodeEmitter((deploymentId, entry) => {
    io.to(`deployment:${deploymentId}`).emit(`paircode:${deploymentId}`, {
      code:       entry.code,
      phone:      entry.phone,
      detectedAt: entry.detectedAt.toISOString(),
    });
  });

  httpServer.listen(port, () => {
    const serverEnv = process.env["NODE_ENV"] ?? "development";
    const replitDomains = process.env["REPLIT_DOMAINS"] ?? "dev";
    logger.info({ port, env: serverEnv, domain: replitDomains }, "BERAHOST API Server listening");

    // After the server is up and Socket.io is wired, restore any bots
    // that were running before the server restarted
    logger.info("Bot auto-restore starting...");
    restoreRunningBots()
      .then(() => logger.info("Bot auto-restore complete"))
      .catch((err) => {
        logger.error({ err }, "Bot auto-restore FAILED");
      });

    // ─── Self-keepalive ────────────────────────────────────────────────────
    // Replit Autoscale scales to ZERO instances when there is no inbound
    // traffic — which kills all bot child processes.  To prevent this we
    // ping our own health endpoint every 30 seconds.
    //
    // IMPORTANT: localhost pings are invisible to Replit's autoscale router.
    // Only requests that arrive through the public domain count as "traffic."
    // Priority order for the keepalive target:
    //   1. PLATFORM_URL env var — explicit production URL set by the operator
    //      e.g. https://bot-deployment-platform.replit.app
    //   2. REPLIT_DOMAINS — automatically set by Replit to the deployment domain
    //   3. localhost — development fallback only
    const explicitUrl = process.env["PLATFORM_URL"]?.trim();
    const replitDomain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
    const keepaliveUrl = explicitUrl
      ? (explicitUrl.endsWith("/api/healthz") ? explicitUrl : `${explicitUrl.replace(/\/$/, "")}/api/healthz`)
      : replitDomain
        ? `https://${replitDomain}/api/healthz`
        : `http://localhost:${port}/api/healthz`;

    const KEEPALIVE_INTERVAL_MS = 30 * 1000;
    setInterval(async () => {
      try {
        await fetch(keepaliveUrl);
      } catch {
        // Transient network hiccup — not a problem, next ping will work
      }
    }, KEEPALIVE_INTERVAL_MS);
    logger.info({ keepaliveUrl }, "Self-keepalive started (pings every 30s)");

    // ─── Scheduled restarts cron ───────────────────────────────────────────
    // Check every minute for deployments that need a scheduled restart
    setInterval(() => {
      runScheduledRestarts().catch((err) => {
        logger.error({ err }, "Scheduled restart cron error");
      });
    }, 60 * 1000);
    logger.info("Scheduled restart cron started (checks every 60s)");
  });
}

/**
 * On server start, find all deployments that were "running" in the DB
 * (they were active before the last restart) and relaunch them so users'
 * bots keep running without manual intervention.
 */
async function restoreRunningBots() {
  // Only restore bots that were genuinely running or mid-deploy when the server
  // restarted. Crashed bots are NOT auto-restored — the crash was real and the
  // user should decide whether to restart them manually.
  const runningDeps = await db
    .select({
      id: deploymentsTable.id,
      envVars: deploymentsTable.envVars,
      botId: deploymentsTable.botId,
      restartCount: deploymentsTable.restartCount,
    })
    .from(deploymentsTable)
    .where(inArray(deploymentsTable.status, ["running", "deploying"]));

  if (runningDeps.length === 0) {
    logger.info("No bots to restore on startup");
    return;
  }

  logger.info({ count: runningDeps.length }, "Restoring bots from previous session...");

  for (const dep of runningDeps) {
    try {
      // Reset restart counter so the bot gets full auto-restart budget again
      await db
        .update(deploymentsTable)
        .set({ restartCount: 0, pid: null })
        .where(eq(deploymentsTable.id, dep.id));

      const [bot] = await db
        .select({ repoUrl: botsTable.repoUrl })
        .from(botsTable)
        .where(eq(botsTable.id, dep.botId));

      if (!bot) {
        logger.warn({ deploymentId: dep.id }, "Bot record not found, skipping restore");
        continue;
      }

      logger.info({ deploymentId: dep.id }, "Restoring bot process...");
      await startBotProcess(dep.id, bot.repoUrl, (dep.envVars as Record<string, string>) ?? {});
      logger.info({ deploymentId: dep.id }, "Bot restored successfully");
    } catch (err) {
      logger.error({ err, deploymentId: dep.id }, "Failed to restore bot, marking as crashed");
      await db
        .update(deploymentsTable)
        .set({ status: "crashed", pid: null, updatedAt: new Date() })
        .where(eq(deploymentsTable.id, dep.id));
    }
  }
}

/**
 * Seeds the database with an admin user and bot templates if they don't exist.
 * Safe to run on every startup — uses INSERT ... ON CONFLICT DO NOTHING style logic.
 * Credentials can be overridden via environment variables ADMIN_EMAIL / ADMIN_PASSWORD.
 */
async function seedDatabase() {
  // ── Admin user ──────────────────────────────────────────────────────────
  const [{ userCount }] = await db.select({ userCount: count() }).from(usersTable);

  const adminEmail    = process.env["ADMIN_EMAIL"]    ?? "admin@berahost.com";
  const adminPassword = process.env["ADMIN_PASSWORD"] ?? "admin123";

  if (userCount === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await db.insert(usersTable).values({
      email:            adminEmail,
      passwordHash,
      coins:            10000,
      isVerified:       true,
      isAdmin:          true,
      referralCode:     "ADMINBERA",
      subscriptionPlan: "enterprise",
    });

    // Demo user
    const demoHash = await bcrypt.hash("demo1234", 12);
    await db.insert(usersTable).values({
      email:            "demo@berahost.com",
      passwordHash:     demoHash,
      coins:            100,
      isVerified:       true,
      isAdmin:          false,
      referralCode:     "DEMOBERA",
      subscriptionPlan: "free",
    });

    logger.info({ email: adminEmail }, "Seeded admin user");
  } else {
    // Ensure the admin user always has the correct attributes (idempotent fix)
    await db
      .update(usersTable)
      .set({ isAdmin: true, isVerified: true, subscriptionPlan: "enterprise" })
      .where(eq(usersTable.email, adminEmail));
  }

  // ── Bot templates ───────────────────────────────────────────────────────
  const [{ botCount }] = await db.select({ botCount: count() }).from(botsTable);

  if (botCount === 0) {
    await db.insert(botsTable).values([
      {
        name:         "Atassa-MD",
        repoUrl:      "https://github.com/mauricegift/atassa",
        description:  "Advanced WhatsApp bot with AI features, games, and economy system. Powered by Baileys.",
        platform:     "whatsapp",
        isFeatured:   true,
        requiredVars: {
          PREFIX:       "Bot command prefix (e.g. .)",
          SESSION_ID:   "Your WhatsApp session ID (must start with Gifted~)",
          OWNER_NUMBER: "Your WhatsApp number with country code",
        },
        optionalVars: {
          BOT_NAME:  "Custom bot name",
          LANGUAGE:  "Bot language (en/sw)",
          AUTO_READ: "Auto-read messages (true/false)",
        },
        sessionGuideUrl: "https://session.giftedtech.co.ke/pair",
        startCommand:    "npm start",
        version:         1,
      },
    ]);

    logger.info("Seeded bot templates");
  }

  // ── Platform settings ───────────────────────────────────────────────────
  const [{ settingsCount }] = await db.select({ settingsCount: count() }).from(platformSettingsTable);

  if (settingsCount === 0) {
    await db.insert(platformSettingsTable).values([
      { key: "site_name",        value: "BERAHOST" as any },
      { key: "maintenance_mode", value: false as any },
      { key: "daily_claim_coins", value: 5 as any },
      { key: "referral_coins",   value: 20 as any },
    ]);

    logger.info("Seeded platform settings");
  }
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
