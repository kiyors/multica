"use client";

import { use } from "react";
import { ProjectSettingsTab } from "@multica/views/projects/components";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="flex-1 overflow-y-auto m-0 border-none p-0 flex flex-col">
      <ProjectSettingsTab projectId={id} />
    </div>
  );
}
