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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { CheckCircle, Loader2, Unlink } from "lucide-react";
import { useState } from "react";

import {
  useDeleteJiraConfig,
  useJiraConfig,
  useSaveJiraConfig,
} from "@/features/evaluation/hooks/use-tickets";

import { ContentSection } from "../components/content-section";

function JiraConfigCard() {
  const { data, isPending } = useJiraConfig();
  const saveConfig = useSaveJiraConfig();
  const deleteConfig = useDeleteJiraConfig();
  const [open, setOpen] = useState(false);
  const [pat, setPat] = useState("");

  const handleSave = async () => {
    if (!pat.trim()) {
      return;
    }
    await saveConfig.mutateAsync({ pat: pat.trim() });
    setPat("");
    setOpen(false);
  };

  const handleClose = () => {
    setPat("");
    setOpen(false);
  };

  if (isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-none mt-px">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-none bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                J
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Jira</p>
                  {data?.configured && (
                    <Badge
                      variant="secondary"
                      className="text-green-600 bg-green-50 dark:bg-green-950"
                    >
                      <CheckCircle className="size-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  vts.vatech.com ·{" "}
                  {data?.configured ? "PAT configured" : "No PAT configured"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {data?.configured ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(true)}
                  >
                    Update PAT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteConfig.mutateAsync(undefined!)}
                    disabled={deleteConfig.isPending}
                  >
                    {deleteConfig.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Unlink className="size-3.5" />
                    )}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setOpen(true)}>
                  Configure PAT
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Jira Personal Access Token</DialogTitle>
            <DialogDescription>
              Enter your Jira PAT to enable self-service ticket sync. The token
              is stored encrypted and never returned to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="jira-pat">Personal Access Token</Label>
            <Input
              id="jira-pat"
              type="password"
              placeholder="Paste your Jira PAT here"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              disabled={!pat.trim() || saveConfig.isPending}
              onClick={handleSave}
            >
              {saveConfig.isPending && (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SettingsJira() {
  return (
    <ContentSection
      title="Jira Integration"
      desc="Configure your Jira Personal Access Token to sync resolved tickets into the Evaluation module."
    >
      <JiraConfigCard />
    </ContentSection>
  );
}
