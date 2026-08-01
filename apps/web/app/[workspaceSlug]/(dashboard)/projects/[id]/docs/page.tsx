"use client";

import { use } from "react";
import { ProjectDocsTab } from "@multica/views/projects/components";

export default function ProjectDocsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="flex-1 min-h-0 m-0 border-none p-0 flex flex-col">
      <ProjectDocsTab projectId={id} />
    </div>
  );
}
