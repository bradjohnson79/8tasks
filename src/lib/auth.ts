import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { runtimeDb } from "@/db/client";
import * as schema from "@/db/schema";
import { serverEnv } from "./env";
import { resolveSiteUrls } from "./site-url";

/**
 * Better Auth: admin-only accounts in Phase 1–2 (no public user accounts yet).
 * - Public sign-up is disabled; the first admin is bootstrapped by a CLI script (see docs/DEVELOPMENT_ROADMAP.md).
 * - Admin access additionally requires TOTP two-factor (enforced in src/lib/admin.ts).
 */
function createAuth() {
  const env = serverEnv();
  const { baseURL, trustedOrigins } = resolveSiteUrls(env);
  return betterAuth({
    appName: "8Tasks",
    baseURL,
    trustedOrigins,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(runtimeDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
    },
    session: {
      expiresIn: 60 * 60 * 12, // 12h
      updateAge: 60 * 60,
    },
    rateLimit: { enabled: true },
    plugins: [
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
      twoFactor({ issuer: "8Tasks" }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { auth?: Auth };

export function getAuth(): Auth {
  globalForAuth.auth ??= createAuth();
  return globalForAuth.auth;
}
