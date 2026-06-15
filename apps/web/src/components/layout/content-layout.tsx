"use client";

import { ConfigDrawer } from "../config-drawer";
import { ProfileDropdown } from "../profile-dropdown";
import { ThemeSwitch } from "../theme-switch";
import { Header } from "./header";
import { Main } from "./main";

interface ContentLayoutProps {
  children?: React.ReactNode;
  tabs?: React.ReactNode;
}

export function ContentLayout({ children, tabs }: ContentLayoutProps) {
  return (
    <>
      <Header fixed>
        {tabs}
        <div className="ml-auto flex items-center gap-3">
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">{children}</Main>
    </>
  );
}
