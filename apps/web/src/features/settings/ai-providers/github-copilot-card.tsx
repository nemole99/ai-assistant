import { useMutation } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { CheckCircle, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";

interface ConnectedProvider {
  username: string | null;
  avatarUrl: string | null;
  connectedAt: string;
}

interface GitHubCopilotCardProps {
  connected: ConnectedProvider | undefined;
  isPending: boolean;
  onDisconnect: () => void;
  isDisconnecting: boolean;
  onConnectSuccess: () => void;
}

type DialogState =
  | { step: "idle" }
  | {
      step: "waiting";
      userCode: string;
      verificationUri: string;
      deviceCode: string;
      interval: number;
      expiresAt: number;
    }
  | { step: "success"; username: string; avatarUrl: string }
  | { step: "timeout" };

export function GitHubCopilotCard({
  connected,
  isPending,
  onDisconnect,
  isDisconnecting,
  onConnectSuccess,
}: GitHubCopilotCardProps) {
  const [dialogState, setDialogState] = useState<DialogState>({ step: "idle" });
  const [open, setOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startFlow = useMutation(
    orpc.aiProvider.startDeviceFlow.mutationOptions()
  );
  const pollFlow = useMutation(
    orpc.aiProvider.pollDeviceFlow.mutationOptions()
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (deviceCode: string, intervalMs: number, expiresAt: number) => {
      const poll = async () => {
        if (Date.now() >= expiresAt) {
          setDialogState({ step: "timeout" });
          return;
        }
        const result = await pollFlow.mutateAsync({ deviceCode });
        if (result.status === "success") {
          setDialogState({
            avatarUrl: result.avatarUrl,
            step: "success",
            username: result.username,
          });
          onConnectSuccess();
          return;
        }
        if (result.status === "error") {
          toast.error(result.message);
          setDialogState({ step: "idle" });
          return;
        }
        // pending — keep polling
        pollRef.current = setTimeout(poll, intervalMs);
      };
      pollRef.current = setTimeout(poll, intervalMs);
    },
    [pollFlow, onConnectSuccess]
  );

  const handleConnect = async () => {
    setOpen(true);
    setDialogState({ step: "idle" });
    try {
      const result = await startFlow.mutateAsync(undefined!);
      const expiresAt = Date.now() + result.expiresIn * 1000;
      setDialogState({
        deviceCode: result.deviceCode,
        expiresAt,
        interval: result.interval,
        step: "waiting",
        userCode: result.userCode,
        verificationUri: result.verificationUri,
      });
      startPolling(result.deviceCode, result.interval * 1000, expiresAt);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to start GitHub connection";
      toast.error(message);
      setOpen(false);
    }
  };

  const handleClose = () => {
    stopPolling();
    setOpen(false);
    setDialogState({ step: "idle" });
  };

  useEffect(() => stopPolling, [stopPolling]);

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {connected ? (
              <Avatar className="size-8">
                <AvatarImage
                  src={connected.avatarUrl ?? undefined}
                  alt={connected.username ?? "GitHub"}
                />
                <AvatarFallback>
                  {connected.username?.[0]?.toUpperCase() ?? "G"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                GH
              </div>
            )}
            <div>
              <p className="text-sm font-medium">GitHub Copilot</p>
              {connected ? (
                <p className="text-xs text-muted-foreground">
                  @{connected.username}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <Badge
                variant="secondary"
                className="text-green-600 bg-green-50 dark:bg-green-950"
              >
                <CheckCircle className="size-3 mr-1" />
                Connected
              </Badge>
            )}
            {connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting && (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                )}
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={startFlow.isPending}
              >
                {startFlow.isPending && (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                )}
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            handleClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {dialogState.step === "idle" && (
            <>
              <DialogHeader>
                <DialogTitle>Connect GitHub Copilot</DialogTitle>
                <DialogDescription>
                  Starting authorization flow…
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center py-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            </>
          )}

          {dialogState.step === "waiting" && (
            <>
              <DialogHeader>
                <DialogTitle>Connect GitHub Copilot</DialogTitle>
                <DialogDescription>
                  Open GitHub and enter the code below to authorize.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border bg-muted px-4 py-3 font-mono text-2xl font-bold tracking-widest text-center">
                    {dialogState.userCode}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyCode(dialogState.userCode)}
                    title="Copy code"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin shrink-0" />
                  <span>Waiting for authorization…</span>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <a
                  href={dialogState.verificationUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-none border border-transparent bg-primary text-primary-foreground hover:bg-primary/80 px-3 py-1.5 text-xs font-semibold tracking-widest uppercase transition-all"
                >
                  <ExternalLink className="size-3.5 mr-1.5" />
                  Open GitHub
                </a>
              </DialogFooter>
            </>
          )}

          {dialogState.step === "success" && (
            <>
              <DialogHeader>
                <DialogTitle>Connected!</DialogTitle>
                <DialogDescription>
                  Your GitHub account has been linked successfully.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-4">
                <Avatar className="size-16">
                  <AvatarImage
                    src={dialogState.avatarUrl}
                    alt={dialogState.username}
                  />
                  <AvatarFallback>
                    {dialogState.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-medium">@{dialogState.username}</p>
                  <p className="text-sm text-muted-foreground">
                    GitHub Copilot access granted
                  </p>
                </div>
                <CheckCircle className="size-8 text-green-500" />
              </div>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </>
          )}

          {dialogState.step === "timeout" && (
            <>
              <DialogHeader>
                <DialogTitle>Authorization Expired</DialogTitle>
                <DialogDescription>
                  The authorization window has closed. Please try connecting
                  again.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleClose();
                    setTimeout(handleConnect, 100);
                  }}
                >
                  Try again
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code);
  toast.success("Code copied to clipboard");
}
