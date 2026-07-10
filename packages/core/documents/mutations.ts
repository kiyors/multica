import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { projectDocumentKeys } from "./queries";
import type { ProjectDocument } from "../types";

export function useCreateProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProjectDocument>) => api.createProjectDocument(projectId, data),
    onSuccess: (created) => {
      queryClient.setQueryData<ProjectDocument[]>(
        projectDocumentKeys.all(projectId),
        (current = []) => [...current.filter((document) => document.id !== created.id), created],
      );
      queryClient.setQueryData(projectDocumentKeys.detail(created.id), created);
    },
  });
}

export function useUpdateProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: string; data: Partial<ProjectDocument> }) =>
      api.updateProjectDocument(documentId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ProjectDocument[]>(
        projectDocumentKeys.all(projectId),
        (current = []) =>
          current.map((document) => document.id === updated.id ? updated : document),
      );
      queryClient.setQueryData(projectDocumentKeys.detail(updated.id), updated);
    },
    onError: (_, { documentId }) => {
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
      queryClient.setQueryData<ProjectDocument[]>(
        projectDocumentKeys.all(projectId),
        (current = []) => current
          .filter((document) => document.id !== documentId)
          .map((document) => document.parent_id === documentId ? { ...document, parent_id: null } : document),
      );
      queryClient.removeQueries({ queryKey: projectDocumentKeys.detail(documentId) });
    },
  });
}
