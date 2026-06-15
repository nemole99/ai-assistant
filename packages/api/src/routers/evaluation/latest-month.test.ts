import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { Context } from "../../context";
import { evaluationRouter } from "./index";

const YEAR_MONTH = /^\d{4}-\d{2}$/;

const context = {
  auth: null,
  session: {
    user: { id: "test-user", role: "ADMIN" },
  },
} as unknown as Context;

describe("evaluation.ticket.latestMonth", () => {
  it("is registered on the router", () => {
    expect(evaluationRouter.ticket.latestMonth).toBeDefined();
  });

  it("returns the latest ticket month as YYYY-MM (or null when empty)", async () => {
    const res = await call(evaluationRouter.ticket.latestMonth, undefined, {
      context,
    });
    expect(res.month === null || YEAR_MONTH.test(res.month)).toBeTruthy();
  });
});

describe("evaluation.timesheet.latestMonth", () => {
  it("is registered on the router", () => {
    expect(evaluationRouter.timesheet.latestMonth).toBeDefined();
  });

  it("returns the latest timesheet month as YYYY-MM (or null when empty)", async () => {
    const res = await call(evaluationRouter.timesheet.latestMonth, undefined, {
      context,
    });
    expect(res.month === null || YEAR_MONTH.test(res.month)).toBeTruthy();
  });
});

describe("auth guard", () => {
  it("rejects unauthenticated calls", async () => {
    const anonymous = { auth: null, session: null } as unknown as Context;
    await expect(
      call(evaluationRouter.ticket.latestMonth, undefined, {
        context: anonymous,
      })
    ).rejects.toThrow("Unauthorized");
  });
});
