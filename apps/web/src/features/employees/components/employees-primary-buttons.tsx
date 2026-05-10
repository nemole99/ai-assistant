import { UserPlus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useEmployees } from "./employees-provider";

export function EmployeesPrimaryButtons() {
  const { setOpen } = useEmployees();
  return (
    <div className="flex gap-2">
      <Button className="space-x-1" onClick={() => setOpen("add")}>
        <UserPlus size={18} />
        <span>Add Employee</span>
      </Button>
    </div>
  );
}
