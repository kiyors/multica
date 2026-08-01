"use client";

import { use } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { ProjectDetail } from "@multica/views/projects/components";

export default function ProjectDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = use(params);
  const segment = useSelectedLayoutSegment();
  return <ProjectDetail projectId={id} activeTab={segment || "board"}>{children}</ProjectDetail>;
}
