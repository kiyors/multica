import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { milestoneKeys } from "./queries";
import type { Milestone } from "../types";

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Milestone>) => api.createMilestone(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(projectId) });
    },
  });
}

export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, data }: { milestoneId: string; data: Partial<Milestone> }) =>
      api.updateMilestone(milestoneId, data),
    onSuccess: (_, { milestoneId }) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(projectId) });
      queryClient.invalidateQueries({ queryKey: milestoneKeys.detail(milestoneId) });
    },
  });
}

export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => api.deleteMilestone(milestoneId),
    onSuccess: (_, milestoneId) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(projectId) });
      queryClient.removeQueries({ queryKey: milestoneKeys.detail(milestoneId) });
    },
  });
}
