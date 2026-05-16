import {
  AudioWaveform,
  BotMessageSquare,
  BookOpen,
  Building2,
  Command,
  Contact,
  FolderKanban,
  GalleryVerticalEnd,
  KeyRound,
  LibraryBig,
  ServerCog,
  Settings,
  UserCog,
  Wrench,
} from "lucide-react";

import type { SidebarData } from "../types";

export const sidebarData: SidebarData = {
  navGroups: [
    {
      items: [
        // {
        //   title: "Dashboard",
        //   url: "/",
        //   icon: LayoutDashboard,
        // },
        {
          icon: BotMessageSquare,
          title: "Ask AI",
          url: "/ask-ai",
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
