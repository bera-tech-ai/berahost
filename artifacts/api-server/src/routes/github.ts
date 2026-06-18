import { Router } from "express";
import { db, githubWebhooksTable, deploymentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAny } from "../middlewares/requireAuth";
import { stopBotProcess, startBotProcess } from "../lib/botProcess";
import { logger } from "../lib/logger";
import crypto from "crypto";

const router = Router();

function generateWebhookSecret(): string {
  return crypto.randomBytes(20).toString("hex");
}

router.get("/github/webhooks", requireAny("read"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const hooks = await db.select().from(githubWebhooksTable).where(eq(githubWebhooksTable.userId, user.id));

  res.json(
    hooks.map((h) => ({
      id: h.id,
      deploymentId: h.deploymentId,
      repoUrl: h.repoUrl,
      branch: h.branch,
      isEnabled: h.isEnabled,
      lastTriggeredAt: h.lastTriggeredAt?.toISOString() ?? null,
      lastCommitMsg: h.lastCommitMsg,
      webhookUrl: `${process.env.FRONTEND_URL || ""}/api/github/webhook/${h.id}`,
      webhookSecret: h.webhookSecret,
      createdAt: h.createdAt.toISOString(),
    }))
  );
});

router.post("/github/webhooks", requireAny("write"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { deploymentId, repoUrl, branch } = req.body;

  if (!deploymentId || !repoUrl) {
    res.status(400).json({ error: "deploymentId and repoUrl are required" });
    return;
  }

  const [dep] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, deploymentId));
  if (!dep || dep.userId !== user.id) {
    res.status(404).json({ error: "Deployment not found" });
    return;
  }

  const webhookSecret = generateWebhookSecret();
  const [hook] = await db
    .insert(githubWebhooksTable)
    .values({
      deploymentId,
      userId: user.id,
      repoUrl,
      branch: branch || "main",
      webhookSecret,
      isEnabled: true,
    })
    .returning();

  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "";
  const webhookUrl = `https://${replitDomain}/api/github/webhook/${hook.id}`;

  res.status(201).json({
    id: hook.id,
    webhookUrl,
    webhookSecret: hook.webhookSecret,
    message: "GitHub webhook configured. Add this URL to your GitHub repo → Settings → Webhooks.",
  });
});

router.delete("/github/webhooks/:id", requireAny("write"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const hookId = parseInt(req.params.id);

  await db.delete(githubWebhooksTable).where(and(eq(githubWebhooksTable.id, hookId), eq(githubWebhooksTable.userId, user.id)));
  res.json({ message: "Webhook removed" });
});

router.post("/github/webhook/:hookId", async (req, res): Promise<void> => {
  const hookId = parseInt(req.params.hookId);

  const [hook] = await db.select().from(githubWebhooksTable).where(eq(githubWebhooksTable.id, hookId));
  if (!hook || !hook.isEnabled) {
    res.status(404).json({ error: "Webhook not found or disabled" });
    return;
  }

  const signature = req.headers["x-hub-signature-256"] as string;
  if (signature) {
    const expected = "sha256=" + crypto.createHmac("sha256", hook.webhookSecret).update(JSON.stringify(req.body)).digest("hex");
    if (signature !== expected) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  const event = req.headers["x-github-event"] as string;
  const payload = req.body as any;
  const branch = payload?.ref?.replace("refs/heads/", "");

  if (event !== "push" || branch !== hook.branch) {
    res.json({ message: "Ignored (not a push to configured branch)" });
    return;
  }

  const commitSha = payload?.head_commit?.id?.slice(0, 7) ?? "";
  const commitMsg = payload?.head_commit?.message ?? "";

  await db.update(githubWebhooksTable).set({
    lastTriggeredAt: new Date(),
    lastCommitSha: commitSha,
    lastCommitMsg: commitMsg,
  }).where(eq(githubWebhooksTable.id, hookId));

  const [dep] = await db.select().from(deploymentsTable).where(eq(deploymentsTable.id, hook.deploymentId));
  if (dep && dep.status === "running") {
    logger.info({ deploymentId: dep.id, commitSha, commitMsg }, "GitHub push — redeploying bot");
    try {
      await stopBotProcess(dep.id);
      await new Promise((r) => setTimeout(r, 2000));
      await startBotProcess(dep.id);
    } catch (err: any) {
      logger.error({ err: err.message, deploymentId: dep.id }, "GitHub auto-deploy failed");
    }
  }

  res.json({ message: "Redeployment triggered", commitSha, commitMsg });
});

export default router;
