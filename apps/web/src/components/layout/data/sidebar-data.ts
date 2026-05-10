import {
  AudioWaveform,
  BotMessageSquare,
  Building2,
  Command,
  Contact,
  GalleryVerticalEnd,
  LayoutDashboard,
  Settings,
  UserCog,
  Wrench,
} from "lucide-react";
import { type SidebarData } from "../types";

export const sidebarData: SidebarData = {
  teams: [
    {
      name: "My Well",
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
        {
          title: "Dashboard",
          url: "/",
          icon: LayoutDashboard,
        },
        {
          title: "Ask AI",
          url: "/ask-ai",
          icon: BotMessageSquare,
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
          ],
        },
      ],
    },
  ],
};
