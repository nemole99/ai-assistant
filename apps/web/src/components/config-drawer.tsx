import { Root as Radio, Item } from "@radix-ui/react-radio-group";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { useSidebar } from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import { CircleCheck, RotateCcw, Settings } from "lucide-react";
import type { SVGProps } from "react";

import { IconDir } from "@/assets/custom/icon-dir";
import { IconLayoutCompact } from "@/assets/custom/icon-layout-compact";
import { IconLayoutDefault } from "@/assets/custom/icon-layout-default";
import { IconLayoutFull } from "@/assets/custom/icon-layout-full";
import { IconSidebarFloating } from "@/assets/custom/icon-sidebar-floating";
import { IconSidebarInset } from "@/assets/custom/icon-sidebar-inset";
import { IconSidebarSidebar } from "@/assets/custom/icon-sidebar-sidebar";
import { IconThemeDark } from "@/assets/custom/icon-theme-dark";
import { IconThemeLight } from "@/assets/custom/icon-theme-light";
import { IconThemeSystem } from "@/assets/custom/icon-theme-system";
import { useDirection } from "@/context/direction-provider";
import { useLayout } from "@/context/layout-provider";
import type { Collapsible } from "@/context/layout-provider";
import { useTheme } from "@/context/theme-provider";

export function ConfigDrawer() {
  const { setOpen } = useSidebar();
  const { resetDir } = useDirection();
  const { resetTheme } = useTheme();
  const { resetLayout } = useLayout();

  const handleReset = () => {
    setOpen(true);
    resetDir();
    resetTheme();
    resetLayout();
  };

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            size="icon"
            variant="ghost"
            aria-label="Open theme settings"
          />
        }
      >
        <Settings aria-hidden="true" />
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader className="pb-0 text-start">
          <SheetTitle>Theme Settings</SheetTitle>
          <SheetDescription>
            Adjust the appearance and layout to suit your preferences.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 overflow-y-auto px-4">
          <ThemeConfig />
          <SidebarConfig />
          <LayoutConfig />
          <DirConfig />
        </div>
        <SheetFooter className="gap-2">
          <Button
            variant="destructive"
            onClick={handleReset}
            aria-label="Reset all settings to default values"
          >
            Reset
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({
  title,
  showReset = false,
  onReset,
  resetAriaLabel,
  className,
}: {
  title: string;
  showReset?: boolean;
  onReset?: () => void;
  /** Shown on the small per-section reset (RotateCcw) for accessibility and tests. */
  resetAriaLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground",
        className
      )}
    >
      {title}
      {showReset && onReset && (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-4 rounded-full"
          onClick={onReset}
          aria-label={resetAriaLabel}
        >
          <RotateCcw className="size-3" />
        </Button>
      )}
    </div>
  );
}

function RadioGroupItem({
  item,
  isTheme = false,
}: {
  item: {
    value: string;
    label: string;
    icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  };
  isTheme?: boolean;
}) {
  return (
    <Item
      value={item.value}
      className={cn("group outline-none", "transition duration-200 ease-in")}
      aria-label={`Select ${item.label.toLowerCase()}`}
      aria-describedby={`${item.value}-description`}
    >
      <div
        className={cn(
          "relative rounded-[6px] ring-[1px] ring-border",
          "group-data-[state=checked]:shadow-2xl group-data-[state=checked]:ring-primary",
          "group-focus-visible:ring-2"
        )}
        role="img"
        aria-hidden="false"
        aria-label={`${item.label} option preview`}
      >
        <CircleCheck
          className={cn(
            "size-6 fill-primary stroke-white",
            "group-data-[state=unchecked]:hidden",
            "absolute top-0 right-0 translate-x-1/2 -translate-y-1/2"
          )}
          aria-hidden="true"
        />
        <item.icon
          className={cn(
            !isTheme &&
              "fill-primary stroke-primary group-data-[state=unchecked]:fill-muted-foreground group-data-[state=unchecked]:stroke-muted-foreground"
          )}
          aria-hidden="true"
        />
      </div>
      <div
        className="mt-1 text-xs"
        id={`${item.value}-description`}
        aria-live="polite"
      >
        {item.label}
      </div>
    </Item>
  );
}

function ThemeConfig() {
  const { defaultTheme, theme, setTheme } = useTheme();
  return (
    <div>
      <SectionTitle
        title="Theme"
        showReset={theme !== defaultTheme}
        onReset={() => setTheme(defaultTheme)}
        resetAriaLabel="Reset theme preference to default"
      />
      <Radio
        value={theme}
        onValueChange={setTheme}
        className="grid w-full max-w-md grid-cols-3 gap-4"
        aria-label="Select theme preference"
        aria-describedby="theme-description"
      >
        {[
          {
            icon: IconThemeSystem,
            label: "System",
            value: "system",
          },
          {
            icon: IconThemeLight,
            label: "Light",
            value: "light",
          },
          {
            icon: IconThemeDark,
            label: "Dark",
            value: "dark",
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} isTheme />
        ))}
      </Radio>
      <div id="theme-description" className="sr-only">
        Choose between system preference, light mode, or dark mode
      </div>
    </div>
  );
}

function SidebarConfig() {
  const { defaultVariant, variant, setVariant } = useLayout();
  return (
    <div className="max-md:hidden">
      <SectionTitle
        title="Sidebar"
        showReset={defaultVariant !== variant}
        onReset={() => setVariant(defaultVariant)}
        resetAriaLabel="Reset sidebar style to default"
      />
      <Radio
        value={variant}
        onValueChange={setVariant}
        className="grid w-full max-w-md grid-cols-3 gap-4"
        aria-label="Select sidebar style"
        aria-describedby="sidebar-description"
      >
        {[
          {
            icon: IconSidebarInset,
            label: "Inset",
            value: "inset",
          },
          {
            icon: IconSidebarFloating,
            label: "Floating",
            value: "floating",
          },
          {
            icon: IconSidebarSidebar,
            label: "Sidebar",
            value: "sidebar",
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id="sidebar-description" className="sr-only">
        Choose between inset, floating, or standard sidebar layout
      </div>
    </div>
  );
}

function LayoutConfig() {
  const { open, setOpen } = useSidebar();
  const { defaultCollapsible, collapsible, setCollapsible } = useLayout();

  const radioState = open ? "default" : collapsible;

  return (
    <div className="max-md:hidden">
      <SectionTitle
        title="Layout"
        showReset={radioState !== "default"}
        onReset={() => {
          setOpen(true);
          setCollapsible(defaultCollapsible);
        }}
        resetAriaLabel="Reset layout options to default"
      />
      <Radio
        value={radioState}
        onValueChange={(v) => {
          if (v === "default") {
            setOpen(true);
            return;
          }
          setOpen(false);
          setCollapsible(v as Collapsible);
        }}
        className="grid w-full max-w-md grid-cols-3 gap-4"
        aria-label="Select layout style"
        aria-describedby="layout-description"
      >
        {[
          {
            icon: IconLayoutDefault,
            label: "Default",
            value: "default",
          },
          {
            icon: IconLayoutCompact,
            label: "Compact",
            value: "icon",
          },
          {
            icon: IconLayoutFull,
            label: "Full layout",
            value: "offcanvas",
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id="layout-description" className="sr-only">
        Choose between default expanded, compact icon-only, or full layout mode
      </div>
    </div>
  );
}

function DirConfig() {
  const { defaultDir, dir, setDir } = useDirection();
  return (
    <div>
      <SectionTitle
        title="Direction"
        showReset={defaultDir !== dir}
        onReset={() => setDir(defaultDir)}
        resetAriaLabel="Reset text direction to default"
      />
      <Radio
        value={dir}
        onValueChange={setDir}
        className="grid w-full max-w-md grid-cols-3 gap-4"
        aria-label="Select site direction"
        aria-describedby="direction-description"
      >
        {[
          {
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir="ltr" {...props} />
            ),
            label: "Left to Right",
            value: "ltr",
          },
          {
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir="rtl" {...props} />
            ),
            label: "Right to Left",
            value: "rtl",
          },
        ].map((item) => (
          <RadioGroupItem key={item.value} item={item} />
        ))}
      </Radio>
      <div id="direction-description" className="sr-only">
        Choose between left-to-right or right-to-left site direction
      </div>
    </div>
  );
}
