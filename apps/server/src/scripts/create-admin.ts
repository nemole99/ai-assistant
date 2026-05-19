import { auth } from "@workspace/auth";
import { db } from "@workspace/db";
import { account, user } from "@workspace/db/schema/auth";
import { eq } from "drizzle-orm";

const DEFAULT_EMAIL = "admin@ewoosoft.com";
const DEFAULT_PASSWORD = "Admin@123";

function usage(): never {
  console.log(`Usage: bun src/scripts/create-admin.ts [email] [password]

Defaults:
  email    ${DEFAULT_EMAIL}
  password ${DEFAULT_PASSWORD}

Examples:
  bun src/scripts/create-admin.ts
  bun src/scripts/create-admin.ts admin@ewoosoft.com Admin@123`);
  process.exit(1);
}

async function createAdmin(email: string, password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing.length > 0) {
    const userId = existing[0].id;
    await db.delete(user).where(eq(user.id, userId));
    console.log(`♻️  Removed existing user — recreating with new password: ${email}`);
  }

  const result = await auth.api.signUpEmail({
    body: {
      email,
      name: "Admin",
      password,
    },
  });

  if (!result?.user?.id) {
    throw new Error("Failed to create admin user");
  }

  await db
    .update(user)
    .set({ mustChangePassword: false, role: "ADMIN" })
    .where(eq(user.id, result.user.id));

  const credentialAccount = await db
    .select({ id: account.id })
    .from(account)
    .where(eq(account.userId, result.user.id))
    .limit(1);

  if (credentialAccount.length === 0) {
    throw new Error("Credential account was not created");
  }

  console.log(`✅ Admin account ready: ${email}`);
  console.log(`   Password: ${password}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    usage();
  }

  const email = args[0] ?? process.env.ADMIN_EMAIL ?? DEFAULT_EMAIL;
  const password = args[1] ?? process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD;

  try {
    await createAdmin(email, password);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to create admin:", error);
    process.exit(1);
  }
}

main();
