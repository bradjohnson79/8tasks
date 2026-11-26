/**
 * Works out the site's own URL(s).
 * - BETTER_AUTH_URL, when set, is the canonical base (local dev, production custom domain).
 * - On Vercel previews it is left unset: every deployment gets its own hostname, so we use
 *   Vercel's system variables (branch URL first, then the deployment URL).
 * All of them are trusted origins for auth requests and referer checks.
 */
export type SiteEnv = {
  BETTER_AUTH_URL?: string;
  VERCEL_URL?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_ENV?: string;
};

const https = (host?: string) => (host ? `https://${host.replace(/^https?:\/\//, "")}` : undefined);

export function resolveSiteUrls(env: SiteEnv): { baseURL: string; trustedOrigins: string[] } {
  const candidates = [
    env.BETTER_AUTH_URL,
    env.VERCEL_ENV === "production" ? https(env.VERCEL_PROJECT_PRODUCTION_URL) : undefined,
    https(env.VERCEL_BRANCH_URL),
    https(env.VERCEL_URL),
  ].filter((v): v is string => Boolean(v));
  if (candidates.length === 0) {
    throw new Error("Set BETTER_AUTH_URL (or deploy on Vercel, which provides VERCEL_URL)");
  }
  const origins = [...new Set(candidates.map((u) => new URL(u).origin))];
  return { baseURL: origins[0], trustedOrigins: origins };
}
