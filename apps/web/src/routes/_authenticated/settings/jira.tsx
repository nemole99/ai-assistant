import { createFileRoute } from "@tanstack/react-router";

import { SettingsJira } from "@/features/settings/jira";

export const Route = createFileRoute("/_authenticated/settings/jira")({
  component: SettingsJira,
});
