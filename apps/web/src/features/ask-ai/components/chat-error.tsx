import { buttonVariants } from "@workspace/ui/components/button";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Link } from "@tanstack/react-router";

function getErrorText(error: Error): string {
  const msg = error.message ?? "";
  if (msg.includes("403") || msg.includes("COPILOT_NOT_CONNECTED")) {
    return "Your GitHub Copilot connection is no longer active.";
  }
  return msg || "Something went wrong. Please try again.";
}

function isCopilotError(error: Error): boolean {
  const msg = error.message ?? "";
  return msg.includes("403") || msg.includes("COPILOT_NOT_CONNECTED");
}

interface ChatErrorProps {
  error: Error;
  onRetry: () => void;
}

export function ChatError({ error, onRetry }: ChatErrorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <p>{getErrorText(error)}</p>
      <div className="flex gap-2">
        <Button onClick={onRetry} size="sm" variant="outline">
          Retry
        </Button>
        {isCopilotError(error) && (
          <Link
            to="/settings/ai-providers"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Reconnect Copilot
          </Link>
        )}
      </div>
    </div>
  );
}
