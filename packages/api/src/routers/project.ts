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
import { ORPCError } from "@orpc/server";

import { adminProcedure, protectedProcedure } from "../index";

const projectWithStatsSchema = selectProjectSchema.extend({
  memberCount: z.number(),
  managerName: z.string().nullable(),
});

const projectMemberSchema = selectEmployeeSchema.extend({
  joinedProjectAt: z.string(),
});

export const projectRouter = {
  list: protectedProcedure.output(z.array(projectWithStatsSchema)).handler(async () => {
    const rows = await db
      .select({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        managerId: project.managerId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        memberCount: count(projectMember.employeeId),
        managerName: sql<string | null>`(
          SELECT full_name FROM employee WHERE id = ${project.managerId}
        )`,
      })
      .from(project)
      .leftJoin(projectMember, eq(projectMember.projectId, project.id))
      .groupBy(project.id);
    return rows;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(projectWithStatsSchema)
    .handler(async ({ input }) => {
      const [row] = await db
        .select({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          managerId: project.managerId,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          memberCount: count(projectMember.employeeId),
          managerName: sql<string | null>`(
            SELECT full_name FROM employee WHERE id = ${project.managerId}
          )`,
        })
        .from(project)
        .leftJoin(projectMember, eq(projectMember.projectId, project.id))
        .where(eq(project.id, input.id))
        .groupBy(project.id);
      if (!row) throw new ORPCError("NOT_FOUND");
      return row;
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
      if (!created) throw new Error("Failed to create project");

      // Auto-add manager as member
      if (created.managerId) {
        await db
          .insert(projectMember)
          .values({ projectId: created.id, employeeId: created.managerId })
          .onConflictDoNothing();
      }

      return created;
    }),

  update: adminProcedure
    .input(updateProjectSchema.extend({ id: z.string() }))
    .output(selectProjectSchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db.update(project).set(data).where(eq(project.id, id)).returning();
      if (!updated) throw new ORPCError("NOT_FOUND");

      // Auto-add new manager as member if managerId changed
      if (updated.managerId) {
        await db
          .insert(projectMember)
          .values({ projectId: updated.id, employeeId: updated.managerId })
          .onConflictDoNothing();
      }

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      await db.delete(project).where(eq(project.id, input.id));
      return { success: true };
    }),

  listMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .output(z.array(projectMemberSchema))
    .handler(async ({ input }) => {
      const rows = await db
        .select({
          id: employee.id,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          email: employee.email,
          phone: employee.phone,
          position: employee.position,
          departmentId: employee.departmentId,
          userId: employee.userId,
          joinDate: employee.joinDate,
          status: employee.status,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
          joinedProjectAt: sql<string>`${projectMember.createdAt}::text`,
        })
        .from(projectMember)
        .innerJoin(employee, eq(employee.id, projectMember.employeeId))
        .where(eq(projectMember.projectId, input.projectId));
      return rows;
    }),

  addMember: adminProcedure
    .input(z.object({ projectId: z.string(), employeeId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      const [emp] = await db
        .select({ id: employee.id })
        .from(employee)
        .where(and(eq(employee.id, input.employeeId), eq(employee.status, "ACTIVE")));
      if (!emp)
        throw new ORPCError("NOT_FOUND", {
          message: "Active employee not found",
        });

      await db
        .insert(projectMember)
        .values({ projectId: input.projectId, employeeId: input.employeeId })
        .onConflictDoNothing();
      return { success: true };
    }),

  removeMember: adminProcedure
    .input(z.object({ projectId: z.string(), employeeId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      await db
        .delete(projectMember)
        .where(
          and(
            eq(projectMember.projectId, input.projectId),
            eq(projectMember.employeeId, input.employeeId),
          ),
        );
      return { success: true };
    }),

  bulkRemoveMembers: adminProcedure
    .input(
      z.object({
        projectId: z.string(),
        employeeIds: z.array(z.string()).min(1),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      await db
        .delete(projectMember)
        .where(
          and(
            eq(projectMember.projectId, input.projectId),
            inArray(projectMember.employeeId, input.employeeIds),
          ),
        );
      return { success: true };
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

      if (!emp) return [];

      // Get all projectIds this employee belongs to
      const memberships = await db
        .select({ projectId: projectMember.projectId })
        .from(projectMember)
        .where(eq(projectMember.employeeId, emp.id));

      if (memberships.length === 0) return [];

      const projectIds = memberships.map((m) => m.projectId);

      const rows = await db
        .select({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          managerId: project.managerId,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          memberCount: sql<number>`(
            SELECT count(*)::int FROM project_member pm2 WHERE pm2.project_id = ${project.id}
          )`,
          managerName: sql<string | null>`(
            SELECT full_name FROM employee WHERE id = ${project.managerId}
          )`,
        })
        .from(project)
        .where(inArray(project.id, projectIds));

      return rows;
    }),
};
