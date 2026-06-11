import { createFileRoute } from "@tanstack/react-router";

import { SettingsAIProviders } from "@/features/settings/ai-providers";

export const Route = createFileRoute("/_authenticated/settings/ai-providers")({
  component: SettingsAIProviders,
});
