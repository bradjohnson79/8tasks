/**
 * Creates (or promotes) an 8Tasks admin account. Run once per environment.
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is read from the ADMIN_PASSWORD env var if set, otherwise prompted
 * for (hidden). After first sign-in at /admin/login you'll be required to set up
 * an authenticator app (TOTP) before the admin panel opens.
 *
 * Runs as the schema owner (MIGRATION_DATABASE_URL). The password is hashed with
 * Better Auth's own hasher, so normal sign-in works.
 */
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function promptHidden(question: string): Promise<string> {
  let muted = false;
  const out = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stdout.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output: out, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || "Admin";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: npm run admin:create -- --email you@example.com --name "Your Name"');
  }
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL is not set");

  const password =
    process.env.ADMIN_PASSWORD ?? (await promptHidden("Password (min 12 characters): "));
  if (password.length < 12) throw new Error("Password must be at least 12 characters");

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query<{ id: string }>(`select id from "user" where email = $1`, [
      email,
    ]);
    let userId: string;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      await client.query(`update "user" set role = 'admin', updated_at = now() where id = $1`, [
        userId,
      ]);
      console.log(`Promoted existing user ${email} to admin.`);
    } else {
      userId = randomUUID();
      await client.query(
        `insert into "user" (id, name, email, email_verified, role) values ($1, $2, $3, true, 'admin')`,
        [userId, name, email],
      );
      await client.query(
        `insert into account (id, account_id, provider_id, user_id, password) values ($1, $2, 'credential', $2, $3)`,
        [randomUUID(), userId, await hashPassword(password)],
      );
      console.log(`Created admin ${email}.`);
    }
    await client.query(
      `insert into admin_audit_log (actor_user_id, action, entity_type, entity_id, after)
       values (null, 'admin.bootstrap', 'user', $1, $2)`,
      [userId, JSON.stringify({ email, role: "admin" })],
    );
    await client.query("commit");
    console.log("Next: sign in at /admin/login and set up your authenticator app.");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
