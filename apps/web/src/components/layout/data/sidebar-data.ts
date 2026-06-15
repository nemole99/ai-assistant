import {
  AudioWaveform,
  BotMessageSquare,
  BookOpen,
  Building2,
  ClipboardCheck,
  Command,
  Contact,
  Flag,
  FolderKanban,
  GalleryVerticalEnd,
  KeyRound,
  LibraryBig,
  ServerCog,
  Settings,
  UserCog,
  Wrench,
  LayoutDashboard,
} from "lucide-react";

import type { SidebarData } from "../types";

export const sidebarData: SidebarData = {
  navGroups: [
    {
      items: [
        {
          icon: BotMessageSquare,
          title: "Ask AI",
          url: "/ask-ai",
        },
        {
          icon: ClipboardCheck,
          title: "EVN Tools",
          url: "/evaluation",
        },
      ],
      title: "General",
    },
    {
      items: [
        {
          icon: BookOpen,
          title: "Documents",
          url: "/documents",
        },
        {
          icon: LibraryBig,
          title: "Wiki",
          url: "/wiki",
        },
      ],
      title: "Knowledge",
    },
    {
      items: [
        {
          icon: Building2,
          title: "Departments",
          url: "/departments",
        },
        {
          icon: Contact,
          title: "Employees",
          url: "/employees",
        },
        {
          icon: FolderKanban,
          title: "Projects",
          url: "/projects",
        },
      ],
      title: "Organization",
    },
    {
      items: [
        {
          icon: Settings,
          items: [
            {
              icon: UserCog,
              title: "Profile",
              url: "/settings",
            },
            {
              icon: Wrench,
              title: "AI Providers",
              url: "/settings/ai-providers",
            },
            {
              icon: KeyRound,
              title: "Password",
              url: "/settings/password",
            },
            {
              adminOnly: true,
              icon: ServerCog,
              title: "System AI",
              url: "/settings/system-ai",
            },
          ],
          title: "Settings",
        },
        {
          icon: Flag,
          title: "Issues",
          url: "/issues",
        },
      ],
      title: "Other",
    },
  ],
  teams: [
    {
      logo: Command,
      name: "Ewoosoft Internal",
      plan: "Vite + ShadcnUI",
    },
    {
      logo: GalleryVerticalEnd,
      name: "Acme Inc",
      plan: "Enterprise",
    },
    {
      logo: AudioWaveform,
      name: "Acme Corp.",
      plan: "Startup",
    },
  ],
};
