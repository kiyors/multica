import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";


export const projectMemberKeys = {
  all: (projectId: string) => ["projects", projectId, "members"] as const,
};

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
