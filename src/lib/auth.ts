import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, magicLink, twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { runtimeDb } from "@/db/client";
import * as schema from "@/db/schema";
import { serverEnv } from "./env";
import { resolveSiteUrls } from "./site-url";
import { ADMIN_SESSION_PATHS, sendMagicLinkEmail } from "./auth-email";

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
    rateLimit: {
      enabled: true,
      // Stricter limits on anything that sends email or creates accounts.
      customRules: {
        "/sign-in/magic-link": { window: 600, max: 5 },
        "/sign-in/social": { window: 60, max: 10 },
        "/sign-in/email": { window: 60, max: 10 },
      },
    },
    // Optional free accounts: Google (only when its keys are configured) and email magic links.
    // No passwords for ordinary users; public email/password sign-up stays disabled.
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              prompt: "select_account",
            },
          }
        : undefined,
    databaseHooks: {
      session: {
        create: {
          // Admin accounts may only get a session through password + TOTP. A magic link or
          // Google sign-in for an admin address would otherwise skip the second factor.
          before: async (session, ctx) => {
            const [u] = await runtimeDb()
              .select({ role: schema.user.role })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId));
            if (u?.role === "admin" && !ADMIN_SESSION_PATHS.includes(ctx?.path ?? "")) return false;
            return { data: session };
          },
        },
      },
    },
    plugins: [
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
      twoFactor({ issuer: "8Tasks" }),
      magicLink({
        expiresIn: 60 * 15,
        sendMagicLink: async ({ email, url }) => sendMagicLinkEmail(email, url),
      }),
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
