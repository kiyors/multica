"use client";

import { useMemo } from "react";
import { IssueSurface } from "../../issues/surface/issue-surface";

export function ProjectBoardTab({ projectId }: { projectId: string }) {
  const issueScope = useMemo(
    () => ({ type: "project" as const, projectId }),
    [projectId],
  );

  return (
    <IssueSurface
      scope={issueScope}
      modes={["board", "list", "table", "swimlane", "gantt", "calendar"]}
    />
  );
}
