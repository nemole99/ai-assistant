import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";

import { useDepartments } from "./departments-provider";

export function DepartmentsPrimaryButtons() {
  const { setOpen } = useDepartments();
  return (
    <div className="flex gap-2">
      <Button className="space-x-1" onClick={() => setOpen("add")}>
        <Plus size={18} />
        <span>Add Department</span>
      </Button>
    </div>
  );
}
