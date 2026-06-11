import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(({ context, next }) => {
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

// oxlint-disable-next-line unicorn/prefer-spread
const requireAdmin = requireAuth.concat(({ context, next }) => {
  if (context.session.user.role !== "ADMIN") {
    throw new ORPCError("FORBIDDEN");
  }
  return next({ context });
});

// oxlint-disable-next-line unicorn/prefer-spread
const requireManager = requireAuth.concat(({ context, next }) => {
  const { role } = context.session.user;
  if (role !== "ADMIN" && role !== "MANAGER") {
    throw new ORPCError("FORBIDDEN");
  }
  return next({ context });
});

export const adminProcedure = publicProcedure.use(requireAdmin);
export const managerProcedure = publicProcedure.use(requireManager);
