import {
  AudioWaveform,
  Bell,
  BotMessageSquare,
  Command,
  GalleryVerticalEnd,
  LayoutDashboard,
  Settings,
  UserCog,
  Wrench,
  Building2,
  Contact,
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
              title: "Account",
              url: "/settings/account",
              icon: Wrench,
            },
            {
              title: "Notifications",
              url: "/settings/notifications",
              icon: Bell,
            },
          ],
        },
      ],
    },
  ],
};
