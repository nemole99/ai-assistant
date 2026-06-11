import { createDb } from "@workspace/db";
import * as schema from "@workspace/db/schema/auth";
import { env } from "@workspace/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",

      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.CORS_ORIGIN],
    user: {
      additionalFields: {
        mustChangePassword: {
          defaultValue: false,
          input: false,
          required: true,
          type: "boolean",
        },
        role: {
          defaultValue: "EMPLOYEE",
          input: false, // not settable by user during sign-up
          required: true,
          type: "string",
        },
      },
    },
  });
}

export const auth = createAuth();
