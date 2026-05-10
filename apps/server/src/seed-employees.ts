import { db } from "@workspace/db";
import { department, employee, user } from "@workspace/db/schema/auth";
import { eq, sql } from "drizzle-orm";
import { auth } from "@workspace/auth";
import { env } from "@workspace/env/server";

const DEPARTMENT_NAME = "Dev";
const POSITION = "Software Engineer";

const EMPLOYEES = [
  { email: "chris.hoang@ewoosoft.com", fullName: "Chris Hoang" },
  { email: "daryl.pham@ewoosoft.com", fullName: "Daryl Pham" },
  { email: "nemo.le@ewoosoft.com", fullName: "Nemo Le" },
  { email: "joe.vu@ewoosoft.com", fullName: "Joe Vu" },
  { email: "alan.dao@ewoosoft.com", fullName: "Alan Dao" },
  { email: "ceuli.khuat@ewoosoft.com", fullName: "Ceuli Khuat" },
  { email: "lotus.duong@ewoosoft.com", fullName: "Lotus Duong" },
  { email: "helen.dao@ewoosoft.com", fullName: "Helen Dao" },
  { email: "john.pham@ewoosoft.com", fullName: "John Pham" },
  { email: "peter.nguyen@ewoosoft.com", fullName: "Peter Nguyen" },
  { email: "brian.dinh@ewoosoft.com", fullName: "Brian Dinh" },
  { email: "lucas.nguyen@ewoosoft.com", fullName: "Lucas Nguyen" },
  { email: "hayden.hoang@ewoosoft.com", fullName: "Hayden Hoang" },
  { email: "janis.nguyen@ewoosoft.com", fullName: "Janis Nguyen" },
  { email: "buddy.nguyen@ewoosoft.com", fullName: "Buddy Nguyen" },
  { email: "mike.bui@ewoosoft.com", fullName: "Mike Bui" },
  { email: "ethan.dang@ewoosoft.com", fullName: "Ethan Dang" },
  { email: "dan.tran@ewoosoft.com", fullName: "Dan Tran" },
  { email: "carpenter.luu@ewoosoft.com", fullName: "Carpenter Luu" },
  { email: "billy.bui@ewoosoft.com", fullName: "Billy Bui" },
  { email: "dante.nguyen@ewoosoft.com", fullName: "Dante Nguyen" },
];

async function seedEmployees() {
  console.log(`🌱 Seeding employees into "${DEPARTMENT_NAME}" department...`);

  // Find or create the Dev department
  let [dev] = await db
    .select({ id: department.id })
    .from(department)
    .where(eq(department.name, DEPARTMENT_NAME))
    .limit(1);

  if (!dev) {
    console.log(`  Creating "${DEPARTMENT_NAME}" department...`);
    const [created] = await db
      .insert(department)
      .values({ id: crypto.randomUUID(), name: DEPARTMENT_NAME })
      .returning({ id: department.id });
    if (!created) throw new Error("Failed to create department");
    dev = created;
  } else {
    console.log(`  Found existing "${DEPARTMENT_NAME}" department.`);
  }

  // Determine starting employee code number
  const [last] = await db
    .select({ code: employee.employeeCode })
    .from(employee)
    .orderBy(sql`employee_code DESC`)
    .limit(1);

  let nextNum = last ? parseInt(last.code.replace(/\D/g, ""), 10) + 1 : 1;

  const joinDate = new Date().toISOString().split("T")[0]!;

  let inserted = 0;

  for (const emp of EMPLOYEES) {
    // Create user account first, then employee
    const result = await auth.api.signUpEmail({
      body: {
        email: emp.email,
        password: env.DEFAULT_USER_PASSWORD,
        name: emp.fullName,
      },
    });

    if (!result?.user?.id) {
      console.error(`  ❌ Failed to create user account for ${emp.email}`);
      continue;
    }

    await db
      .update(user)
      .set({ role: "EMPLOYEE", mustChangePassword: true })
      .where(eq(user.id, result.user.id));

    const employeeCode = `EMP-${String(nextNum).padStart(4, "0")}`;
    await db.insert(employee).values({
      id: crypto.randomUUID(),
      employeeCode,
      fullName: emp.fullName,
      email: emp.email,
      position: POSITION,
      departmentId: dev.id,
      joinDate,
      status: "ACTIVE",
      userId: result.user.id,
    });

    console.log(`  ✅ ${employeeCode} — ${emp.fullName} (${emp.email})`);
    nextNum++;
    inserted++;
  }

  console.log(`\n✅ Done. Inserted: ${inserted}`);
}

seedEmployees()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
