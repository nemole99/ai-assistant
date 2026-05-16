import { env } from "@workspace/env/web";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        mustChangePassword: {
          defaultValue: false,
          input: false,
          required: true,
          type: "boolean",
        },
        role: {
          defaultValue: "EMPLOYEE",
          input: false,
          required: true,
          type: "string",
        },
      },
    }),
  ],
});
