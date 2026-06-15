/* oxlint-disable */
import { db } from "@workspace/db";
import { employee, project, projectMember } from "@workspace/db/schema/auth";
import { eq, inArray } from "drizzle-orm";

// Projects to seed with their members (referenced by email)
const PROJECTS: {
  name: string;
  description: string;
  status: "ACTIVE" | "COMPLETED";
  managerEmail: string | null;
  memberEmails: string[];
}[] = [
  {
    description: "WeClever platform project.",
    managerEmail: "alan.dao@ewoosoft.com",
    memberEmails: [
      "nemo.le@ewoosoft.com",
      "alan.dao@ewoosoft.com",
      "ceuli.khuat@ewoosoft.com",
      "janis.nguyen@ewoosoft.com",
      "mark.phan@ewoosoft.com",
      "joy.luu@ewoosoft.com",
    ],
    name: "WeClever",
    status: "ACTIVE",
  },
  {
    description: "CleverDent platform project",
    managerEmail: "chris.hoang@ewoosoft.com",
    memberEmails: [
      "joe.vu@ewoosoft.com",
      "mike.bui@ewoosoft.com",
      "billy.bui@ewoosoft.com",
      "lotus.duong@ewoosoft.com",
      "helen.dao@ewoosoft.com",
      "hayden.hoang@ewoosoft.com",
    ],
    name: "CleverDent",
    status: "ACTIVE",
  },
  {
    description: "GPP internal project.",
    managerEmail: "nemo.le@ewoosoft.com",
    memberEmails: [
      "nemo.le@ewoosoft.com",
      "lotus.duong@ewoosoft.com",
      "helen.dao@ewoosoft.com",
    ],
    name: "GPP",
    status: "COMPLETED",
  },
  // Projects referenced by Evaluation data (no manager/members assigned yet)
  ...[
    "EzSeries",
    "EzOrtho",
    "CleverRC",
    "Clever One",
    "Bontech V1",
    "IDP",
    "LMP",
    "RY",
    "XmaruC",
    "XmaruPACS",
    "XmaruPro",
    "XmaruW",
  ].map((name) => ({
    description: `${name} project.`,
    managerEmail: null,
    memberEmails: [],
    name,
    status: "ACTIVE" as const,
  })),
  {
    description:
      "Temporary catch-all bucket for evaluation work outside a real project.",
    managerEmail: null,
    memberEmails: [],
    name: "Other",
    status: "ACTIVE",
  },
];

export async function seedProjects() {
  console.log("🌱 Seeding projects...");

  // Load all employees indexed by email for fast lookup
  const allEmails = [
    ...new Set(
      PROJECTS.flatMap((p) =>
        [p.managerEmail, ...p.memberEmails].filter((e): e is string => !!e)
      )
    ),
  ];

  const employees = await db
    .select({ email: employee.email, id: employee.id })
    .from(employee)
    .where(inArray(employee.email, allEmails));

  const employeeByEmail = new Map(employees.map((e) => [e.email, e.id]));

  for (const proj of PROJECTS) {
    // Skip if project already exists
    const [existing] = await db
      .select({ id: project.id })
      .from(project)
      .where(eq(project.name, proj.name))
      .limit(1);

    if (existing) {
      console.log(`  ⏭ Project "${proj.name}" already exists, skipping.`);
      continue;
    }

    const managerId = proj.managerEmail
      ? employeeByEmail.get(proj.managerEmail)
      : null;
    if (proj.managerEmail && !managerId) {
      console.warn(
        `  ⚠ Manager employee not found for email "${proj.managerEmail}", skipping project "${proj.name}".`
      );
      continue;
    }

    const projectId = crypto.randomUUID();
    await db.insert(project).values({
      description: proj.description,
      id: projectId,
      managerId,
      name: proj.name,
      status: proj.status,
    });

    // Add members
    const memberRows: { projectId: string; employeeId: string }[] = [];
    for (const email of proj.memberEmails) {
      const empId = employeeByEmail.get(email);
      if (!empId) {
        console.warn(
          `  ⚠ Member employee not found for email "${email}", skipping.`
        );
        continue;
      }
      memberRows.push({ employeeId: empId, projectId });
    }

    if (memberRows.length > 0) {
      await db.insert(projectMember).values(memberRows);
    }

    console.log(
      `  ✅ [${proj.status}] "${proj.name}" — manager: ${proj.managerEmail ?? "none"} — ${memberRows.length} member(s)`
    );
  }

  console.log("\n✅ Projects seeded.");
}
