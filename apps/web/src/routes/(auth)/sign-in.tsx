import { z } from "zod";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { SignIn } from "@/features/auth/sign-in";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/(auth)/sign-in")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const { data: session } = await authClient.getSession();
    if (session) {
      throw redirect({ to: search.redirect || "/" });
    }
  },
  component: SignIn,
});
