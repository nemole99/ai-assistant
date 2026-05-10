import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { BotIcon } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <BotIcon className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Connect GitHub Copilot to start chatting</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ask AI uses GitHub Copilot to answer questions about the company. Connect your GitHub
          account in Settings to get started.
        </p>
      </div>
      <Link to="/settings/ai-providers" className={cn(buttonVariants({ variant: "default" }))}>
        Go to AI Provider Settings
      </Link>
    </div>
  );
}
