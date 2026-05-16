import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { SignIn } from "@/features/auth/sign-in";
import { authClient } from "@/lib/auth-client";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/(auth)/sign-in")({
  beforeLoad: async ({ search }) => {
    const { data: session } = await authClient.getSession();
    if (session) {
      throw redirect({ to: search.redirect || "/" });
    }
  },
  component: SignIn,
  validateSearch: searchSchema,
});
