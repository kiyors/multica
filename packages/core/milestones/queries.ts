import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export const milestoneKeys = {
  all: (projectId: string) => ["projects", projectId, "milestones"] as const,
  detail: (milestoneId: string) => ["milestones", milestoneId] as const,
};

export function useMilestones(projectId: string | null) {
  return useQuery({
    queryKey: milestoneKeys.all(projectId!),
    queryFn: () => api.listMilestones(projectId!),
    enabled: !!projectId,
  });
}

export function useMilestone(milestoneId: string | null) {
  return useQuery({
    queryKey: milestoneKeys.detail(milestoneId!),
    queryFn: () => api.getMilestone(milestoneId!),
    enabled: !!milestoneId,
  });
}
