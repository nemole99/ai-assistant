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
  LayoutDashboard,
  Settings,
  UserCog,
  Wrench,
} from "lucide-react";
import { type SidebarData } from "../types";

export const sidebarData: SidebarData = {
  teams: [
    {
      name: "Ewoosoft Internal",
      logo: Command,
      plan: "Vite + ShadcnUI",
    },
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
  ],
  navGroups: [
    {
      title: "General",
      items: [
        // {
        //   title: "Dashboard",
        //   url: "/",
        //   icon: LayoutDashboard,
        // },
        {
          title: "Ask AI",
          url: "/ask-ai",
          icon: BotMessageSquare,
        },
      ],
    },
    {
      title: "Knowledge",
      items: [
        {
          title: "Documents",
          url: "/documents",
          icon: BookOpen,
        },
      ],
    },
    {
      title: "Organization",
      items: [
        {
          title: "Departments",
          url: "/departments",
          icon: Building2,
        },
        {
          title: "Employees",
          url: "/employees",
          icon: Contact,
        },
        {
          title: "Projects",
          url: "/projects",
          icon: FolderKanban,
        },
      ],
    },
    {
      title: "Other",
      items: [
        {
          title: "Settings",
          icon: Settings,
          items: [
            {
              title: "Profile",
              url: "/settings",
              icon: UserCog,
            },
            {
              title: "AI Providers",
              url: "/settings/ai-providers",
              icon: Wrench,
            },
            {
              title: "Password",
              url: "/settings/password",
              icon: KeyRound,
            },
          ],
        },
      ],
    },
  ],
};
