import { Router } from "express";
import { db, usersTable, coinTransactionsTable, auditLogsTable, platformSettingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { hashPassword, comparePassword, generateReferralCode, serializeUser } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { addCoins } from "../lib/coins";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, phone, referralCode } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const myReferralCode = generateReferralCode();

  let referredById: number | null = null;
  if (referralCode) {
    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode));
    if (referrer) {
      referredById = referrer.id;
    }
  }

  // Read signup coins from platform settings (admin-configurable), default 10
  const [signupSetting] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, "signup_coins"));
  const signupCoins = signupSetting ? Number(signupSetting.value) || 10 : 10;

  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      passwordHash,
      phone: phone ?? null,
      coins: signupCoins,
      referralCode: myReferralCode,
      referredBy: referredById,
    })
    .returning();

  // Welcome bonus
  await db.insert(coinTransactionsTable).values({
    userId: user.id,
    amount: signupCoins,
    type: "gift",
    reference: "Welcome bonus",
  });

  // Referral reward
  if (referredById) {
    await addCoins(referredById, 30, "referral", `Referred ${email}`);
  }

  req.session.userId = user.id;

  res.status(201).json({ user: serializeUser(user), message: "Account created successfully" });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.isBanned) {
    res.status(401).json({ error: "Account banned. Contact support." });
    return;
  }

  req.session.userId = user.id;

  res.json({ user: serializeUser(user), message: "Login successful" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  res.json(serializeUser(user));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.json({ message: "Logged out" });
});

export default router;
