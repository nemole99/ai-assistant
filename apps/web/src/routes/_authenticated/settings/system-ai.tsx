import { createFileRoute } from "@tanstack/react-router";
import { SettingsSystemAI } from "@/features/settings/system-ai";

export const Route = createFileRoute("/_authenticated/settings/system-ai")({
  component: SettingsSystemAI,
});
