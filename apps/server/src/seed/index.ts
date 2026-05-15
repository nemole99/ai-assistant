import { env } from "@workspace/env/server";
import { auth } from "@workspace/auth";
import { db } from "@workspace/db";
import { user } from "@workspace/db/schema/auth";
import { eq } from "drizzle-orm";
import { seedEmployees } from "./seed-employees";
import { seedProjects } from "./seed-projects";
import { seedCategories } from "./seed-categories";
import { ensureBucketExists } from "@workspace/storage";

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

  console.log(`✅ Admin account created: ${env.ADMIN_EMAIL}\n`);
}

async function main() {
  try {
    console.log("🌱 Initialising MinIO storage bucket...");
    await ensureBucketExists();
    console.log("✅ Storage bucket is ready.\n");

    await seed();
    await seedEmployees();
    await seedCategories();
    await seedProjects();
    console.log("\n🎉 All seeds completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

main();
