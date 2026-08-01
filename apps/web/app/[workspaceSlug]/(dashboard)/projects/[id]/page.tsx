import { redirect } from "next/navigation";

export default async function ProjectRedirectPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string }>;
}) {
  const { workspaceSlug, id } = await params;
  redirect(`/${workspaceSlug}/projects/${id}/board`);
}
