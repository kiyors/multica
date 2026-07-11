import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const issueTypeKeys = {
  all: (wsId: string) => ["issue-types", wsId] as const,
  list: (wsId: string, projectId?: string) => [...issueTypeKeys.all(wsId), "list", projectId] as const,
  detail: (wsId: string, id: string) => [...issueTypeKeys.all(wsId), "detail", id] as const,
};

export function listIssueTypesOptions(workspaceId: string, projectId?: string) {
  return queryOptions({
    queryKey: issueTypeKeys.list(workspaceId, projectId),
    queryFn: async () => {
      return await api.listIssueTypes(workspaceId, projectId);
    },
    enabled: !!workspaceId,
  });
}

export function getIssueTypeOptions(workspaceId: string, issueTypeId: string) {
  return queryOptions({
    queryKey: issueTypeKeys.detail(workspaceId, issueTypeId),
    queryFn: async () => {
      return await api.getIssueType(workspaceId, issueTypeId);
    },
    enabled: !!workspaceId && !!issueTypeId,
  });
}
