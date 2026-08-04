import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { projectKeys } from "./queries";
import { workspaceKeys } from "../workspace/queries";
import type { ReconcileMemberAssignmentsRequest } from "../types";


export const projectMemberKeys = {
  all: (projectId: string) => ["projects", projectId, "members"] as const,
  assignments: (workspaceId: string, memberId: string) =>
    ["workspaces", workspaceId, "members", memberId, "assignments"] as const,
};

export function memberAssignmentsOptions(workspaceId: string, memberId: string) {
  return queryOptions({
    queryKey: projectMemberKeys.assignments(workspaceId, memberId),
    queryFn: () => api.getMemberAssignments(workspaceId, memberId),
    enabled: !!workspaceId && !!memberId,
  });
}

export function useReconcileMemberAssignments(workspaceId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ReconcileMemberAssignmentsRequest) =>
      api.reconcileMemberAssignments(workspaceId, memberId, request),
    onSuccess: (assignments) => {
      queryClient.setQueryData(
        projectMemberKeys.assignments(workspaceId, memberId),
        assignments,
      );
      queryClient.invalidateQueries({ queryKey: projectKeys.all(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.squads(workspaceId) });
    },
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: projectMemberKeys.all(projectId),
    queryFn: () => api.listProjectMembers(projectId),
    enabled: !!projectId,
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.addProjectMember(projectId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.all(projectId) });
    },
  });
}

export function useUpdateProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.updateProjectMember(projectId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.all(projectId) });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api.removeProjectMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectMemberKeys.all(projectId) });
    },
  });
}
