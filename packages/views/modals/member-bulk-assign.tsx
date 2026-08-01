"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@multica/ui/components/ui/dialog";
import { Button } from "@multica/ui/components/ui/button";
import { Label } from "@multica/ui/components/ui/label";
import { Checkbox } from "@multica/ui/components/ui/checkbox";
import { api } from "@multica/core/api";
import { useWorkspaceId } from "@multica/core/hooks";
import { projectListOptions } from "@multica/core/projects/queries";
import { squadListOptions } from "@multica/core/workspace/queries";
import type { MemberWithUser } from "@multica/core/types";
import { ProjectIcon } from "../projects/components/project-icon";
import { ActorAvatar } from "../common/actor-avatar";

export function MemberBulkAssignModal({
  onClose,
  data,
}: {
  onClose: () => void;
  data: Record<string, unknown> | null;
}) {
  const wsId = useWorkspaceId();
  const member = data?.member as MemberWithUser | undefined;

  const { data: projects = [] } = useQuery(projectListOptions(wsId));
  const { data: squads = [] } = useQuery(squadListOptions(wsId));

  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [selectedSquads, setSelectedSquads] = useState<Set<string>>(new Set());

  const toggleProject = (id: string) => {
    const next = new Set(selectedProjects);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProjects(next);
  };

  const toggleSquad = (id: string) => {
    const next = new Set(selectedSquads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSquads(next);
  };

  const assignMut = useMutation({
    mutationFn: async () => {
      if (!member) return;
      const promises: Promise<unknown>[] = [];
      for (const pId of selectedProjects) {
        promises.push(api.addProjectMember(pId, member.user_id, "member"));
      }
      for (const sId of selectedSquads) {
        promises.push(
          api.addSquadMember(sId, {
            member_type: "member",
            member_id: member.user_id,
            role: "member",
          }),
        );
      }
      await Promise.allSettled(promises);
    },
    onSuccess: () => {
      toast.success("Bulk assignment complete");
      onClose();
    },
    onError: () => {
      toast.error("Some assignments failed");
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign {member?.name} to Projects/Squads</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 py-4">
          <div>
            <Label className="text-body font-semibold mb-3 block">Projects</Label>
            {projects.length === 0 ? (
              <p className="text-caption text-muted-foreground">No projects found.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer border border-transparent hover:border-border">
                    <Checkbox
                      checked={selectedProjects.has(p.id)}
                      onCheckedChange={() => toggleProject(p.id)}
                    />
                    <ProjectIcon project={p} className="h-4 w-4" />
                    <span className="text-body">{p.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-body font-semibold mb-3 block">Squads</Label>
            {squads.length === 0 ? (
              <p className="text-caption text-muted-foreground">No squads found.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {squads.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer border border-transparent hover:border-border">
                    <Checkbox
                      checked={selectedSquads.has(s.id)}
                      onCheckedChange={() => toggleSquad(s.id)}
                    />
                    <ActorAvatar actorType="squad" actorId={s.id} size="sm" />
                    <span className="text-body">{s.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 mt-auto">
          <Button variant="outline" onClick={onClose} disabled={assignMut.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => assignMut.mutate()}
            disabled={assignMut.isPending || (selectedProjects.size === 0 && selectedSquads.size === 0)}
          >
            {assignMut.isPending ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
