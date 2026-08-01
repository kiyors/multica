"use client";

import { use } from "react";
import { ProjectBoardTab } from "@multica/views/projects/components";

export default function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProjectBoardTab projectId={id} />;
}
