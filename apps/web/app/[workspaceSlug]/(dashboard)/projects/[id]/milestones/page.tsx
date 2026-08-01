"use client";

import { use } from "react";
import { ProjectMilestonesTab } from "@multica/views/projects/components";

export default function ProjectMilestonesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="flex-1 overflow-y-auto m-0 border-none p-0 flex flex-col">
      <ProjectMilestonesTab projectId={id} />
    </div>
  );
}
