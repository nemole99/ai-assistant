import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireAdmin = requireAuth.concat(async ({ context, next }) => {
  if (context.session.user.role !== "ADMIN") {
    throw new ORPCError("FORBIDDEN");
  }
  return next({ context });
});

const requireManager = requireAuth.concat(async ({ context, next }) => {
  const role = context.session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    throw new ORPCError("FORBIDDEN");
  }
  return next({ context });
});

export const adminProcedure = publicProcedure.use(requireAdmin);
export const managerProcedure = publicProcedure.use(requireManager);
