/* eslint-disable i18next/no-literal-string */
import { useQuery } from "@tanstack/react-query";
import { projectDetailOptions } from "@multica/core/projects/queries";
import { useUpdateProject } from "@multica/core/projects/mutations";
import { useWorkspaceId } from "@multica/core/hooks";

export function ProjectGeneralSettings({ projectId }: { projectId: string }) {
  const wsId = useWorkspaceId();
  const { data: project } = useQuery(projectDetailOptions(wsId, projectId));
  const updateProject = useUpdateProject();

  if (!project) return null;

  return (
    <div className="p-6 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">General Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">Manage project details and identifiers.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Prefix</label>
            <input 
              type="text" 
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="e.g. PRJ"
              value={project.prefix || ""}
              onChange={(e) => updateProject.mutate({ id: project.id, prefix: e.target.value.toUpperCase() })}
            />
            <p className="text-xs text-muted-foreground">
              Prefixes are used to generate short IDs for issues in this project (e.g. PRJ-123).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
