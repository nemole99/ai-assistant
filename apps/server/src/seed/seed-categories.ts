import { db } from "@workspace/db";
import { documentCategory } from "@workspace/db/schema/auth";
import { eq } from "drizzle-orm";

const CATEGORIES = [
  {
    name: "HR & Policies",
    color: "#3b82f6", // blue-500
    description: "Company policies, employee handbook, and HR guidelines",
  },
  {
    name: "Engineering",
    color: "#10b981", // blue-500 -> no, emerald-500
    description: "Technical specifications, architecture docs, and coding standards",
  },
  {
    name: "Product",
    color: "#8b5cf6", // purple-500
    description: "PRDs, product roadmaps, and requirements",
  },
  {
    name: "Design",
    color: "#ec4899", // pink-500
    description: "Design systems, wireframes, and UI/UX assets",
  },
];

export async function seedCategories() {
  console.log("🌱 Seeding document categories...");

  let inserted = 0;

  for (const cat of CATEGORIES) {
    const [existing] = await db
      .select({ id: documentCategory.id })
      .from(documentCategory)
      .where(eq(documentCategory.name, cat.name))
      .limit(1);

    if (existing) {
      console.log(`  ⏭ Category "${cat.name}" already exists, skipping.`);
      continue;
    }

    await db.insert(documentCategory).values({
      id: crypto.randomUUID(),
      name: cat.name,
      color: cat.color,
      description: cat.description,
    });

    console.log(`  ✅ Inserted category: ${cat.name}`);
    inserted++;
  }

  console.log(`\n✅ Document categories seeded. Inserted: ${inserted}`);
}
