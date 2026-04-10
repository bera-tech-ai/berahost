import { Router } from "express";
import crypto from "crypto";
import { db, paymentTransactionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAny } from "../middlewares/requireAuth";
import { addCoins, COIN_PACKAGES } from "../lib/coins";
import { logger } from "../lib/logger";
import { sql } from "drizzle-orm";

/**
 * HMAC signature for a specific transaction.
 * Embeds txnId into the callback URL so:
 *  1. Only our server can generate valid signatures (SESSION_SECRET is private)
 *  2. Each signature is unique per transaction — replaying one txn's sig on another fails
 *  3. Forged callbacks with a fake "SUCCESS" are rejected before any coins move
 */
function callbackSig(txnId: number): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "berahost-fallback-secret")
    .update(`BERA-PAYMENT-${txnId}`)
    .digest("hex")
    .slice(0, 40);
}

const router = Router();

// --- PLANS / COIN PACKAGES ---
router.get("/payments/plans", async (_req, res): Promise<void> => {
  const plans = Object.entries(COIN_PACKAGES).map(([key, pkg]) => ({
    id:          key,
    name:        key.charAt(0).toUpperCase() + key.slice(1),
    kes:         pkg.kes,
    coins:       pkg.coins,
    bonus:       pkg.bonus,
    totalCoins:  pkg.coins + pkg.bonus,
    popular:     key === "popular",
    best:        key === "business",
  }));

  // Subscription plans (for reference)
  const subscriptionPlans = [
    { id: "free",       name: "Free",       botLimit: 1,    priceKes: 0,    features: ["1 active bot", "30 coins/deployment", "Basic logs"] },
    { id: "starter",    name: "Starter",    botLimit: 3,    priceKes: 199,  features: ["3 active bots", "Priority support", "Log export"] },
    { id: "pro",        name: "Pro",        botLimit: 10,   priceKes: 499,  features: ["10 active bots", "Bot cloning", "Webhooks", "Metrics"] },
    { id: "business",   name: "Business",   botLimit: 25,   priceKes: 999,  features: ["25 active bots", "All Pro features", "Custom domains", "API access"] },
    { id: "enterprise", name: "Enterprise", botLimit: 9999, priceKes: 2999, features: ["Unlimited bots", "Dedicated support", "SLA", "Everything"] },
  ];

  res.json({ coinPackages: plans, subscriptionPlans });
});

/** Normalize any Kenyan phone format → 2547XXXXXXXX or 2541XXXXXXXX */
function normalizePhone(raw: string): string | null {
  const p = raw.replace(/[\s\-\(\)\+]/g, "");
  if (/^07\d{8}$/.test(p)) return "254" + p.slice(1);
  if (/^01\d{8}$/.test(p)) return "254" + p.slice(1);
  if (/^2547\d{8}$/.test(p)) return p;
  if (/^2541\d{8}$/.test(p)) return p;
  return null;
}

router.post("/payments/initiate", requireAny("payments"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { phone: rawPhone, package: pkg } = req.body;

  if (!rawPhone || !pkg) {
    res.status(400).json({ error: "Phone and package are required" });
    return;
  }

  const phone = normalizePhone(String(rawPhone));
  if (!phone) {
    res.status(400).json({ error: "Invalid phone number. Use format: 07XXXXXXXX, 01XXXXXXXX, or 254XXXXXXXXX" });
    return;
  }

  const packageInfo = COIN_PACKAGES[pkg];
  if (!packageInfo) {
    res.status(400).json({ error: "Invalid package. Choose: starter, popular, pro, business, enterprise" });
    return;
  }

  const authToken = process.env.PAYHERO_AUTH_TOKEN;
  const channelId = process.env.PAYHERO_CHANNEL_ID;

  if (!authToken || !channelId) {
    res.status(500).json({ error: "Payment system not configured" });
    return;
  }

  // Create pending transaction
  const [txn] = await db
    .insert(paymentTransactionsTable)
    .values({
      userId: user.id,
      phone,
      amountKes: packageInfo.kes,
      coinsAwarded: packageInfo.coins + packageInfo.bonus,
      package: pkg,
      status: "pending",
    })
    .returning();

  // Call PayHero STK push
  try {
    // Build SIGNED callback URL — includes HMAC so only PayHero (who received it) can trigger it
    const replitDomain = process.env.REPLIT_DEV_DOMAIN || "";
    const baseUrl = process.env.FRONTEND_URL || (replitDomain ? `https://${replitDomain}` : "");
    const sig = callbackSig(txn.id);
    const callbackUrl = `${baseUrl}/api/payments/callback?sig=${sig}`;

    // Normalize auth token — strip "Basic " prefix if already present
    const cleanToken = authToken.replace(/^Basic\s+/i, "");
    const authHeader = `Basic ${cleanToken}`;

    logger.info({ channelId, callbackUrl, phone }, "Initiating PayHero STK push");

    const response = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: packageInfo.kes,
        phone_number: phone,
        channel_id: parseInt(channelId, 10),
        provider: "m-pesa",
        external_reference: `BERA-${txn.id}`,
        callback_url: callbackUrl,
      }),
    });

    const data = (await response.json()) as any;
    logger.info({ status: response.status, data }, "PayHero STK push response");

    if (!response.ok) {
      logger.error({ data }, "PayHero STK push failed");
      await db
        .update(paymentTransactionsTable)
        .set({ status: "failed", callbackResponse: data })
        .where(eq(paymentTransactionsTable.id, txn.id));
    } else {
      await db
        .update(paymentTransactionsTable)
        .set({ payheroTxnId: data?.reference || data?.id || String(txn.id), callbackResponse: data })
        .where(eq(paymentTransactionsTable.id, txn.id));
    }

  } catch (err) {
    logger.error({ err }, "PayHero API call failed");
  }

  res.json({
    message: "Payment initiated. Check your phone for the M-Pesa prompt.",
    transactionId: txn.id,
    package: pkg,
    amountKes: packageInfo.kes,
    coinsToAward: packageInfo.coins + packageInfo.bonus,
  });
});

router.post("/payments/callback", async (req, res): Promise<void> => {
  const body = req.body;

  // ── 1. Parse external reference ────────────────────────────────────────────
  const externalRef = body?.external_reference || body?.ExternalReference || "";
  const txnId = parseInt(externalRef.replace("BERA-", ""), 10);

  if (!txnId || isNaN(txnId)) {
    logger.warn({ externalRef }, "Callback with no valid transaction ID — ignored");
    res.json({ message: "OK" });
    return;
  }

  // ── 2. Verify HMAC signature ────────────────────────────────────────────────
  // The signature was embedded in the callback URL when the STK push was initiated.
  // No signature = forged / direct POST → reject silently.
  const receivedSig = (req.query.sig as string) || "";
  const expectedSig = callbackSig(txnId);

  if (!receivedSig || receivedSig !== expectedSig) {
    logger.warn({ txnId, receivedSig }, "Callback signature mismatch — possible forgery attempt, ignoring");
    res.json({ message: "OK" }); // Don't reveal the reason to the caller
    return;
  }

  try {
    // ── 3. Load transaction ───────────────────────────────────────────────────
    const [txn] = await db
      .select()
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.id, txnId));

    if (!txn) {
      logger.warn({ txnId }, "Callback for unknown transaction");
      res.json({ message: "OK" });
      return;
    }

    // ── 4. Double-spend guard ─────────────────────────────────────────────────
    // If already processed (success or failed), do nothing — prevents duplicate callbacks
    if (txn.status !== "pending") {
      logger.info({ txnId, status: txn.status }, "Callback for already-processed transaction — skipping");
      res.json({ message: "OK" });
      return;
    }

    // ── 5. Determine success ──────────────────────────────────────────────────
    const isSuccess =
      body?.status === "SUCCESS" ||
      body?.ResultCode === "0" ||
      body?.Status === "Success";

    // ── 6. Amount verification ────────────────────────────────────────────────
    // If PayHero reports an amount, verify it matches what we recorded.
    // This prevents someone from paying KES 1 and getting a KES 1000 package.
    const reportedAmount = body?.amount || body?.Amount || body?.TransAmount;
    if (isSuccess && reportedAmount !== undefined) {
      const reported = Math.round(Number(reportedAmount));
      const expected = txn.amountKes;
      if (reported < expected) {
        logger.error({ txnId, reported, expected }, "Callback amount is less than expected — fraud attempt, rejecting");
        await db
          .update(paymentTransactionsTable)
          .set({ status: "failed", callbackResponse: { ...body, _fraud: "amount_mismatch", reported, expected } })
          .where(eq(paymentTransactionsTable.id, txnId));
        res.json({ message: "OK" });
        return;
      }
    }

    if (isSuccess) {
      // ── 7a. Mark success & award ────────────────────────────────────────────
      await db
        .update(paymentTransactionsTable)
        .set({ status: "success", callbackResponse: body })
        .where(eq(paymentTransactionsTable.id, txnId));

      const pkg = txn.package || "";

      if (pkg.startsWith("sub:")) {
        const newPlan = pkg.replace("sub:", "");
        await db
          .update(usersTable)
          .set({ subscriptionPlan: newPlan as any })
          .where(eq(usersTable.id, txn.userId));
        logger.info({ txnId, userId: txn.userId, newPlan }, "Subscription upgraded via PayHero callback");
      } else {
        const coins = txn.coinsAwarded || 0;
        await addCoins(txn.userId, coins, "purchase", `M-Pesa payment confirmed — ${pkg} package`);
        logger.info({ txnId, userId: txn.userId, coins }, "Coins awarded after verified PayHero callback");
      }
    } else {
      // ── 7b. Mark failed ─────────────────────────────────────────────────────
      await db
        .update(paymentTransactionsTable)
        .set({ status: "failed", callbackResponse: body })
        .where(eq(paymentTransactionsTable.id, txnId));
      logger.info({ txnId, userId: txn.userId, body }, "Payment failed per PayHero callback");
    }
  } catch (err) {
    logger.error({ err, txnId }, "Payment callback processing error");
  }

  res.json({ message: "OK" });
});

/** M-Pesa subscription purchase — upgrades the user's plan on callback success */
router.post("/payments/subscribe", requireAny("payments"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { phone: rawPhone, plan } = req.body;

  if (!rawPhone || !plan) {
    res.status(400).json({ error: "Phone and plan are required" });
    return;
  }

  const phone = normalizePhone(String(rawPhone));
  if (!phone) {
    res.status(400).json({ error: "Invalid phone number. Use format: 07XXXXXXXX, 01XXXXXXXX, or 254XXXXXXXXX" });
    return;
  }

  const SUBSCRIPTION_PLANS: Record<string, { kes: number; coins: number; name: string }> = {
    starter:    { kes: 199,  coins: 0,    name: "Starter" },
    pro:        { kes: 499,  coins: 0,    name: "Pro" },
    business:   { kes: 999,  coins: 0,    name: "Business" },
    enterprise: { kes: 2999, coins: 0,    name: "Enterprise" },
  };

  const planInfo = SUBSCRIPTION_PLANS[plan];
  if (!planInfo) {
    res.status(400).json({ error: "Invalid plan. Choose: starter, pro, business, enterprise" });
    return;
  }

  if (plan === user.subscriptionPlan) {
    res.status(400).json({ error: "You are already on this plan" });
    return;
  }

  const authToken = process.env.PAYHERO_AUTH_TOKEN;
  const channelId = process.env.PAYHERO_CHANNEL_ID;

  if (!authToken || !channelId) {
    res.status(500).json({ error: "Payment system not configured" });
    return;
  }

  // Create pending transaction tagged as subscription
  const [txn] = await db
    .insert(paymentTransactionsTable)
    .values({
      userId: user.id,
      phone,
      amountKes: planInfo.kes,
      coinsAwarded: 0,
      package: `sub:${plan}`,
      status: "pending",
    })
    .returning();

  try {
    const replitDomain = process.env.REPLIT_DEV_DOMAIN || "";
    const baseUrl = process.env.FRONTEND_URL || (replitDomain ? `https://${replitDomain}` : "");
    const sig = callbackSig(txn.id);
    const callbackUrl = `${baseUrl}/api/payments/callback?sig=${sig}`;
    const cleanToken = authToken.replace(/^Basic\s+/i, "");

    logger.info({ channelId, callbackUrl, phone, plan }, "Initiating PayHero subscription STK push");

    const response = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${cleanToken}`,
      },
      body: JSON.stringify({
        amount: planInfo.kes,
        phone_number: phone,
        channel_id: parseInt(channelId, 10),
        provider: "m-pesa",
        external_reference: `BERA-${txn.id}`,
        callback_url: callbackUrl,
      }),
    });

    const data = (await response.json()) as any;
    logger.info({ status: response.status, data }, "PayHero subscription STK push response");

    if (!response.ok) {
      logger.error({ data }, "PayHero subscription STK push failed");
      await db
        .update(paymentTransactionsTable)
        .set({ status: "failed", callbackResponse: data })
        .where(eq(paymentTransactionsTable.id, txn.id));
    } else {
      await db
        .update(paymentTransactionsTable)
        .set({ payheroTxnId: data?.reference || data?.id || String(txn.id), callbackResponse: data })
        .where(eq(paymentTransactionsTable.id, txn.id));
    }
  } catch (err) {
    logger.error({ err }, "PayHero subscription API call failed");
  }

  res.json({
    message: `Payment initiated for ${planInfo.name} plan. Check your phone for the M-Pesa prompt.`,
    transactionId: txn.id,
    plan,
    amountKes: planInfo.kes,
  });
});

/** Poll a single transaction status — used by frontend for real-time confirmation */
router.get("/payments/status/:id", requireAny("read"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const txnId = parseInt(req.params.id, 10);
  if (!txnId) { res.status(400).json({ error: "Invalid transaction ID" }); return; }

  const [txn] = await db
    .select()
    .from(paymentTransactionsTable)
    .where(eq(paymentTransactionsTable.id, txnId));

  if (!txn || txn.userId !== user.id) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({ id: txn.id, status: txn.status, package: txn.package, amountKes: txn.amountKes, coinsAwarded: txn.coinsAwarded });
});

router.get("/payments/history", requireAny("read"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const txns = await db
    .select()
    .from(paymentTransactionsTable)
    .where(eq(paymentTransactionsTable.userId, user.id))
    .orderBy(desc(paymentTransactionsTable.createdAt))
    .limit(50);

  res.json(
    txns.map((t) => ({
      id: t.id,
      userId: t.userId,
      payheroTxnId: t.payheroTxnId,
      phone: t.phone,
      amountKes: t.amountKes,
      coinsAwarded: t.coinsAwarded,
      package: t.package,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }))
  );
});

export default router;
