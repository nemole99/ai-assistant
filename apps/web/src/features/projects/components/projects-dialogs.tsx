import { ProjectsActionDialog } from "./projects-action-dialog";
import { ProjectsDeleteDialog } from "./projects-delete-dialog";
import { useProjects } from "./projects-provider";

export function ProjectsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useProjects();
  return (
    <>
      <ProjectsActionDialog
        key="project-add"
        open={open === "add"}
        onOpenChange={() => setOpen("add")}
      />

      {currentRow && (
        <>
          <ProjectsActionDialog
            key={`project-edit-${currentRow.id}`}
            open={open === "edit"}
            onOpenChange={() => {
              setOpen("edit");
              setTimeout(() => {
                setCurrentRow(null);
              }, 500);
            }}
            currentRow={currentRow}
          />

          <ProjectsDeleteDialog
            key={`project-delete-${currentRow.id}`}
            open={open === "delete"}
            onOpenChange={() => {
              setOpen("delete");
              setTimeout(() => {
                setCurrentRow(null);
              }, 500);
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  );
}
