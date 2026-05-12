"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserMinus, UserPlus } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { orpc } from "@/lib/orpc";
import { authClient } from "@/lib/auth-client";
import { type ProjectMember } from "../data/schema";
import { ProjectAddMemberDialog } from "./project-add-member-dialog";

type ProjectMembersTabProps = {
  projectId: string;
  managerId: string | null;
  members: ProjectMember[];
};

export function ProjectMembersTab({ projectId, managerId, members }: ProjectMembersTabProps) {
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const removeMutation = useMutation(
    orpc.project.removeMember.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.project.listMembers.queryOptions({ input: { projectId } }),
        );
        queryClient.invalidateQueries(orpc.project.list.queryOptions());
        toast.success("Member removed.");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <UserPlus className="size-4" />
            Add Member
          </Button>
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No members yet. Add employees to this project.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              {isAdmin && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{member.fullName}</p>
                    <p className="text-muted-foreground text-xs">{member.email}</p>
                  </div>
                </TableCell>
                <TableCell>{member.position}</TableCell>
                <TableCell>
                  <Badge variant={member.status === "ACTIVE" ? "default" : "secondary"}>
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {member.id === managerId && <Badge variant="outline">Manager</Badge>}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={removeMutation.isPending}
                      onClick={() =>
                        removeMutation.mutate({
                          projectId,
                          employeeId: member.id,
                        })
                      }
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isAdmin && (
        <ProjectAddMemberDialog
          projectId={projectId}
          existingMembers={members}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      )}
    </div>
  );
}
