import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const PLANS = [
  {
    id: "free",
    name: "Free",
    priceKes: 0,
    coinsPerMonth: 10,
    maxBots: 1,
    features: ["1 active bot", "Basic logs", "Community support", "Daily bonus coins"],
  },
  {
    id: "starter",
    name: "Starter",
    priceKes: 50,
    coinsPerMonth: 60,
    maxBots: 3,
    features: ["3 active bots", "60 coins/month", "Priority support", "Session backup", "Log search"],
  },
  {
    id: "pro",
    name: "Pro",
    priceKes: 150,
    coinsPerMonth: 200,
    maxBots: 10,
    features: ["10 active bots", "200 coins/month", "GitHub auto-deploy", "Scheduled restarts", "Team accounts", "API access"],
  },
  {
    id: "business",
    name: "Business",
    priceKes: 350,
    coinsPerMonth: 500,
    maxBots: 25,
    features: ["25 active bots", "500 coins/month", "All Pro features", "Custom domains", "Webhooks", "Dedicated support"],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    priceKes: 700,
    coinsPerMonth: 1200,
    maxBots: null,
    features: ["Unlimited bots", "1200 coins/month", "Everything in Business", "SLA guarantee", "24/7 priority support"],
  },
];

router.get("/subscriptions/plans", async (_req, res): Promise<void> => {
  res.json(PLANS);
});

router.get("/subscriptions/status", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));

  const isActive =
    dbUser.subscriptionPlan !== "free" &&
    (!dbUser.subscriptionExpiresAt || dbUser.subscriptionExpiresAt > new Date());

  res.json({
    plan: dbUser.subscriptionPlan,
    expiresAt: dbUser.subscriptionExpiresAt?.toISOString() ?? null,
    isActive,
    coinsThisMonth: 0,
  });
});

router.post("/subscriptions/subscribe", requireAuth, async (req, res): Promise<void> => {
  const { plan } = req.body;
  const validPlans = ["basic", "pro", "ultimate"];

  if (!validPlans.includes(plan)) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }

  res.json({ message: "Subscription initiated. Payment integration coming soon." });
});

export default router;
