import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export const projectDocumentKeys = {
  all: (projectId: string) => ["projects", projectId, "documents"] as const,
  detail: (documentId: string) => ["documents", documentId] as const,
};

export function useProjectDocuments(projectId: string | null) {
  return useQuery({
    queryKey: projectDocumentKeys.all(projectId!),
    queryFn: () => api.listProjectDocuments(projectId!),
    enabled: !!projectId,
  });
}

export function useProjectDocument(documentId: string | null) {
  return useQuery({
    queryKey: projectDocumentKeys.detail(documentId!),
    queryFn: () => api.getProjectDocument(documentId!),
    enabled: !!documentId,
  });
}
