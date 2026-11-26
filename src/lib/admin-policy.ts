export class AdminAuthError extends Error {
  constructor(
    public readonly reason: "unauthenticated" | "not_admin" | "mfa_required",
  ) {
    super(`Admin access denied: ${reason}`);
  }
}

/** Pure policy check, unit-tested in admin.test.ts. */
export function checkAdmin(
  user:
    | {
        role?: string | null;
        twoFactorEnabled?: boolean | null;
        banned?: boolean | null;
      }
    | null
    | undefined,
): AdminAuthError["reason"] | null {
  if (!user) return "unauthenticated";
  if (user.role !== "admin" || user.banned) return "not_admin";
  if (!user.twoFactorEnabled) return "mfa_required";
  return null;
}
