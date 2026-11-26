/**
 * Demo/seed rows (is_demo = true) must never render in production (CLAUDE.md rule 1).
 * Production is detected via VERCEL_ENV, because NODE_ENV is "production" on preview
 * deploys too. The database enforces the same rule through RLS (see docs/SECURITY.md).
 */
export function shouldShowDemoData(
  env: { VERCEL_ENV?: string; SHOW_DEMO_DATA?: string } = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    SHOW_DEMO_DATA: process.env.SHOW_DEMO_DATA,
  },
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return env.SHOW_DEMO_DATA === "true";
}
