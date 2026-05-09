import { env } from "@workspace/env/server";
import { auth } from "@workspace/auth";
import { db } from "@workspace/db";
import { user } from "@workspace/db/schema/auth";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding admin account...");

  // Check if admin already exists
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, env.ADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log("✅ Admin account already exists, skipping.");
    return;
  }

  // Create admin user via better-auth so password is hashed correctly
  const result = await auth.api.signUpEmail({
    body: {
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      name: "Admin",
    },
  });

  if (!result?.user?.id) {
    throw new Error("Failed to create admin user");
  }

  // Set role to ADMIN
  await db
    .update(user)
    .set({ role: "ADMIN", mustChangePassword: false })
    .where(eq(user.id, result.user.id));

  console.log(`✅ Admin account created: ${env.ADMIN_EMAIL}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
