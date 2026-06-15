import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { project, projectMember, employee } from "@workspace/db/schema/auth";
import {
  insertProjectSchema,
  updateProjectSchema,
  selectProjectSchema,
  selectEmployeeSchema,
} from "@workspace/db/schema/validation";
import { eq, count, sql, inArray, and } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "../index";

const projectWithStatsSchema = selectProjectSchema.extend({
  managerName: z.string().nullable(),
  memberCount: z.number(),
});

const projectMemberSchema = selectEmployeeSchema.extend({
  joinedProjectAt: z.string(),
});

export const projectRouter = {
  addMember: adminProcedure
    .input(z.object({ employeeId: z.string(), projectId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      const [emp] = await db
        .select({ id: employee.id })
        .from(employee)
        .where(
          and(eq(employee.id, input.employeeId), eq(employee.status, "ACTIVE"))
        );
      if (!emp) {
        throw new ORPCError("NOT_FOUND", {
          message: "Active employee not found",
        });
      }

      await db
        .insert(projectMember)
        .values({ employeeId: input.employeeId, projectId: input.projectId })
        .onConflictDoNothing();
      return { success: true };
    }),

  bulkRemoveMembers: adminProcedure
    .input(
      z.object({
        employeeIds: z.array(z.string()).min(1),
        projectId: z.string(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      await db
        .delete(projectMember)
        .where(
          and(
            eq(projectMember.projectId, input.projectId),
            inArray(projectMember.employeeId, input.employeeIds)
          )
        );
      return { success: true };
    }),

  create: adminProcedure
    .input(insertProjectSchema)
    .output(selectProjectSchema)
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(project)
        .values({ id, ...input })
        .returning();
      if (!created) {
        throw new Error("Failed to create project");
      }

      // Auto-add manager as member
      if (created.managerId) {
        await db
          .insert(projectMember)
          .values({ employeeId: created.managerId, projectId: created.id })
          .onConflictDoNothing();
      }

      return created;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      await db.delete(project).where(eq(project.id, input.id));
      return { success: true };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(projectWithStatsSchema)
    .handler(async ({ input }) => {
      const [row] = await db
        .select({
          createdAt: project.createdAt,
          description: project.description,
          id: project.id,
          managerId: project.managerId,
          managerName: sql<string | null>`(
            SELECT full_name FROM employee WHERE id = ${project.managerId}
          )`,
          memberCount: count(projectMember.employeeId),
          name: project.name,
          status: project.status,
          updatedAt: project.updatedAt,
        })
        .from(project)
        .leftJoin(projectMember, eq(projectMember.projectId, project.id))
        .where(eq(project.id, input.id))
        .groupBy(project.id);
      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }
      return row;
    }),

  getSelfProjects: protectedProcedure
    .output(z.array(projectWithStatsSchema))
    .handler(async ({ context }) => {
      const userId = context.session.user.id;

      // Find employee linked to this user
      const [emp] = await db
        .select({ id: employee.id })
        .from(employee)
        .where(eq(employee.userId, userId));

      if (!emp) {
        return [];
      }

      // Get all projectIds this employee belongs to
      const memberships = await db
        .select({ projectId: projectMember.projectId })
        .from(projectMember)
        .where(eq(projectMember.employeeId, emp.id));

      if (memberships.length === 0) {
        return [];
      }

      const projectIds = memberships.map((m) => m.projectId);

      const rows = await db
        .select({
          createdAt: project.createdAt,
          description: project.description,
          id: project.id,
          managerId: project.managerId,
          managerName: sql<string | null>`(
            SELECT full_name FROM employee WHERE id = ${project.managerId}
          )`,
          memberCount: sql<number>`(
            SELECT count(*)::int FROM project_member pm2 WHERE pm2.project_id = ${project.id}
          )`,
          name: project.name,
          status: project.status,
          updatedAt: project.updatedAt,
        })
        .from(project)
        .where(inArray(project.id, projectIds));

      return rows;
    }),

  list: protectedProcedure
    .output(z.array(projectWithStatsSchema))
    .handler(async () => {
      const rows = await db
        .select({
          createdAt: project.createdAt,
          description: project.description,
          id: project.id,
          managerId: project.managerId,
          managerName: sql<string | null>`(
          SELECT full_name FROM employee WHERE id = ${project.managerId}
        )`,
          memberCount: count(projectMember.employeeId),
          name: project.name,
          status: project.status,
          updatedAt: project.updatedAt,
        })
        .from(project)
        .leftJoin(projectMember, eq(projectMember.projectId, project.id))
        .groupBy(project.id);
      return rows;
    }),

  listMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .output(z.array(projectMemberSchema))
    .handler(async ({ input }) => {
      const rows = await db
        .select({
          createdAt: employee.createdAt,
          departmentId: employee.departmentId,
          email: employee.email,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          id: employee.id,
          joinDate: employee.joinDate,
          joinedProjectAt: sql<string>`${projectMember.createdAt}::text`,
          level: employee.level,
          phone: employee.phone,
          position: employee.position,
          status: employee.status,
          updatedAt: employee.updatedAt,
          userId: employee.userId,
        })
        .from(projectMember)
        .innerJoin(employee, eq(employee.id, projectMember.employeeId))
        .where(eq(projectMember.projectId, input.projectId));
      return rows;
    }),

  removeMember: adminProcedure
    .input(z.object({ employeeId: z.string(), projectId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      await db
        .delete(projectMember)
        .where(
          and(
            eq(projectMember.projectId, input.projectId),
            eq(projectMember.employeeId, input.employeeId)
          )
        );
      return { success: true };
    }),

  update: adminProcedure
    .input(updateProjectSchema.extend({ id: z.string() }))
    .output(selectProjectSchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(project)
        .set(data)
        .where(eq(project.id, id))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND");
      }

      // Auto-add new manager as member if managerId changed
      if (updated.managerId) {
        await db
          .insert(projectMember)
          .values({ employeeId: updated.managerId, projectId: updated.id })
          .onConflictDoNothing();
      }

      return updated;
    }),
};
