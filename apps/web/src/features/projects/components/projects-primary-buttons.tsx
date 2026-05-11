import { Plus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useProjects } from "./projects-provider";

export function ProjectsPrimaryButtons() {
  const { setOpen } = useProjects();
  return (
    <div className="flex gap-2">
      <Button className="space-x-1" onClick={() => setOpen("add")}>
        <Plus size={18} />
        <span>Add Project</span>
      </Button>
    </div>
  );
}
