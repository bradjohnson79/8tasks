import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ADMIN_DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  SHOW_DEMO_DATA: z.enum(["true", "false"]).optional(),
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Validated server-only environment. Throws on first use if misconfigured. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ");
      throw new Error(
        `Invalid or missing server environment variables: ${fields}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
