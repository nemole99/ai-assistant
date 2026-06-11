import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Building2, Lock, Pencil, Trash2, Users } from "lucide-react";

import type { Department } from "../data/schema";
import { useDepartments } from "./departments-provider";

interface DepartmentCardProps {
  department: Department;
}

export function DepartmentCard({ department }: DepartmentCardProps) {
  const { setOpen, setCurrentRow } = useDepartments();

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-lg">{department.name}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <Users className="size-3.5" />
            {department.employeeCount} employee
            {department.employeeCount !== 1 ? "s" : ""}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {department.description && (
          <p className="text-muted-foreground text-sm">
            {department.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Lock className="size-3.5" />
          Access
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setCurrentRow(department);
            setOpen("edit");
          }}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => {
            setCurrentRow(department);
            setOpen("delete");
          }}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
