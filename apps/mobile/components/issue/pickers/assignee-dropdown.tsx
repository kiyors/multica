import * as React from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { Issue, IssueAssigneeType } from "@multica/core/types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { memberListOptions } from "@/data/queries/members";
import { agentListOptions } from "@/data/queries/agents";
import { squadListOptions } from "@/data/queries/squads";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useUpdateIssue } from "@/data/mutations/issues";
import { Text } from "@/components/ui/text";

interface Props {
  issue: Issue;
  children: React.ReactNode;
}

export function AssigneeDropdownMenu({ issue, children }: Props) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const { data: squads = [] } = useQuery(squadListOptions(wsId));
  const updateIssue = useUpdateIssue(issue.id);

  const handleSelect = (type: IssueAssigneeType | null, id: string | null) => {
    updateIssue.mutate({
      assignee_type: type,
      assignee_id: id,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuItem onPress={() => handleSelect(null, null)}>
          <View className="flex-row items-center gap-2 flex-1">
            <View className="size-6 rounded-full border border-dashed border-muted-foreground/40 items-center justify-center">
              <Text className="text-[10px] text-muted-foreground">∅</Text>
            </View>
            <Text className="text-sm">Unassigned</Text>
          </View>
        </DropdownMenuItem>

        {members.length > 0 && <DropdownMenuSeparator />}
        {members.length > 0 && <DropdownMenuLabel>Members</DropdownMenuLabel>}
        {members.map((m) => (
          <DropdownMenuItem
            key={m.user_id}
            onPress={() => handleSelect("member", m.user_id)}
          >
            <View className="flex-row items-center gap-2 flex-1">
              <ActorAvatar type="member" id={m.user_id} size={24} />
              <Text className="text-sm">{m.name}</Text>
            </View>
          </DropdownMenuItem>
        ))}

        {agents.length > 0 && <DropdownMenuSeparator />}
        {agents.length > 0 && <DropdownMenuLabel>Agents</DropdownMenuLabel>}
        {agents.map((a) => (
          <DropdownMenuItem
            key={a.id}
            onPress={() => handleSelect("agent", a.id)}
          >
            <View className="flex-row items-center gap-2 flex-1">
              <ActorAvatar type="agent" id={a.id} size={24} />
              <Text className="text-sm">{a.name}</Text>
            </View>
          </DropdownMenuItem>
        ))}

        {squads.length > 0 && <DropdownMenuSeparator />}
        {squads.length > 0 && <DropdownMenuLabel>Squads</DropdownMenuLabel>}
        {squads.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onPress={() => handleSelect("squad", s.id)}
          >
            <View className="flex-row items-center gap-2 flex-1">
              <ActorAvatar type="squad" id={s.id} size={24} />
              <Text className="text-sm">{s.name}</Text>
            </View>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
