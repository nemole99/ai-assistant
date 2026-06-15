import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { employee } from "@workspace/db/schema/auth";
import { evaluationAuditLog } from "@workspace/db/schema/evaluation";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

type AuditAction = InferSelectModel<typeof evaluationAuditLog>["action"];

/** Resolves the Employee id of the currently logged-in User, or null if the
 *  User has no Employee record (e.g. Admin without HR profile). */
export async function resolvePerformedBy(
  userId: string
): Promise<string | null> {
  const [emp] = await db
    .select({ id: employee.id })
    .from(employee)
    .where(eq(employee.userId, userId));
  return emp?.id ?? null;
}

/** Throws FORBIDDEN if the Employee is not ACTIVE. */
export async function assertEmployeeActive(employeeId: string): Promise<void> {
  const [emp] = await db
    .select({ id: employee.id, status: employee.status })
    .from(employee)
    .where(eq(employee.id, employeeId));
  if (!emp) {
    throw new ORPCError("NOT_FOUND", { message: "Employee not found" });
  }
  if (emp.status !== "ACTIVE") {
    throw new ORPCError("FORBIDDEN", {
      message: "Cannot write evaluation records for an INACTIVE Employee",
    });
  }
}

/** Writes a row to evaluation_audit_log. */
export async function writeAudit(opts: {
  action: AuditAction;
  details?: Record<string, unknown>;
  employeeId?: string | null;
  performedBy: string | null;
}): Promise<void> {
  await db.insert(evaluationAuditLog).values({
    action: opts.action,
    details: opts.details,
    employeeId: opts.employeeId ?? null,
    id: crypto.randomUUID(),
    performedBy: opts.performedBy,
  });
}
