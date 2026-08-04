import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ProjectBoardTab,
  ProjectDetail,
  ProjectDocsTab,
  ProjectMilestonesTab,
  ProjectSettingsTab,
} from "@multica/views/projects/components";
import { useWorkspaceId } from "@multica/core/hooks";
import { projectDetailOptions } from "@multica/core/projects/queries";
import { useDocumentTitle } from "@/hooks/use-document-title";

type ProjectTab = "board" | "docs" | "milestones" | "settings";

export function ProjectDetailPage({ activeTab = "board" }: { activeTab?: ProjectTab }) {
  const { id } = useParams<{ id: string }>();
  const wsId = useWorkspaceId();
  const { data: project } = useQuery(projectDetailOptions(wsId, id!));

  // Plain text only — the project's icon is shown by the tab's leading visual,
  // not concatenated into the title (MUL-4370).
  useDocumentTitle(project ? project.title : "Project");

  if (!id) return null;
  const content = {
    board: <ProjectBoardTab projectId={id} />,
    docs: <ProjectDocsTab projectId={id} />,
    milestones: <ProjectMilestonesTab projectId={id} />,
    settings: <ProjectSettingsTab projectId={id} />,
  }[activeTab];

  return (
    <ProjectDetail projectId={id} activeTab={activeTab}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {content}
      </div>
    </ProjectDetail>
  );
}
