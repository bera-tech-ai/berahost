import { Router } from "express";
import { db, botsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function serializeBot(bot: typeof botsTable.$inferSelect) {
  return {
    id: bot.id,
    name: bot.name,
    repoUrl: bot.repoUrl,
    description: bot.description,
    platform: bot.platform,
    isFeatured: bot.isFeatured,
    requiredVars: bot.requiredVars,
    optionalVars: bot.optionalVars,
    sessionGuideUrl: bot.sessionGuideUrl,
    sessionPrefix: bot.sessionPrefix,
    sqliteSettingsPaths: bot.sqliteSettingsPaths,
    systemDeps: bot.systemDeps,
    startCommand: bot.startCommand,
    version: bot.version,
    createdAt: bot.createdAt.toISOString(),
  };
}

router.get("/bots", async (_req, res): Promise<void> => {
  const bots = await db.select().from(botsTable).orderBy(botsTable.createdAt);
  res.json(bots.map(serializeBot));
});

router.get("/bots/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, id));
  if (!bot) {
    res.status(404).json({ error: "Bot not found" });
    return;
  }
  res.json(serializeBot(bot));
});

export { serializeBot };
export default router;
