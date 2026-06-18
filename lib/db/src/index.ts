import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// keepAlive: prevents the OS/cloud proxy from silently killing idle TCP connections.
// Without it, a Replit production DB drops connections idle for ~5 min, and the
// pool hands out a dead connection → "Authentication timed out" crash.
// idleTimeoutMillis(30s) < cloud idle-kill(~300s) so the pool retires connections
// before they're killed externally.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  max: 10,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
