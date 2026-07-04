import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { projectDocumentKeys } from "./queries";
import type { ProjectDocument } from "../types";

export function useCreateProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProjectDocument>) => api.createProjectDocument(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDocumentKeys.all(projectId) });
    },
  });
}

export function useUpdateProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: Partial<ProjectDocument> }) =>
      api.updateProjectDocument(documentId, data),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: projectDocumentKeys.all(projectId) });
      queryClient.invalidateQueries({ queryKey: projectDocumentKeys.detail(documentId) });
    },
  });
}

export function useDeleteProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.deleteProjectDocument(documentId),
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: projectDocumentKeys.all(projectId) });
      queryClient.removeQueries({ queryKey: projectDocumentKeys.detail(documentId) });
    },
  });
}
