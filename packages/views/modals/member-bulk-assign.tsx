"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
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
import { useWorkspaceId } from "@multica/core/hooks";
import { projectListOptions } from "@multica/core/projects/queries";
import {
  memberAssignmentsOptions,
  useReconcileMemberAssignments,
} from "@multica/core/projects/members";
import { squadListOptions } from "@multica/core/workspace/queries";
import type { MemberWithUser } from "@multica/core/types";
import { ProjectIcon } from "../projects/components/project-icon";
import { ActorAvatar } from "../common/actor-avatar";
import { useT } from "../i18n";

export function MemberBulkAssignModal({
  onClose,
  data,
}: {
  onClose: () => void;
  data: Record<string, unknown> | null;
}) {
  const wsId = useWorkspaceId();
  const member = data?.member as MemberWithUser | undefined;
  const memberId = member?.id ?? "";
  const { t } = useT("modals");

  const { data: projects = [] } = useQuery(projectListOptions(wsId));
  const { data: squads = [] } = useQuery(squadListOptions(wsId));
  const assignmentsQuery = useQuery(memberAssignmentsOptions(wsId, memberId));
  const reconcileAssignments = useReconcileMemberAssignments(wsId, memberId);

  const [selectedProjects, setSelectedProjects] = useState<Set<string> | null>(null);
  const [selectedSquads, setSelectedSquads] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!assignmentsQuery.data || selectedProjects !== null || selectedSquads !== null) {
      return;
    }
    setSelectedProjects(new Set(assignmentsQuery.data.project_ids));
    setSelectedSquads(new Set(assignmentsQuery.data.squad_ids));
  }, [assignmentsQuery.data, selectedProjects, selectedSquads]);

  const toggleProject = (id: string) => {
    const next = new Set(selectedProjects ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedProjects(next);
  };

  const toggleSquad = (id: string) => {
    const next = new Set(selectedSquads ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSquads(next);
  };

  const saveAssignments = async () => {
    if (!member || !selectedProjects || !selectedSquads) return;
    try {
      await reconcileAssignments.mutateAsync({
        project_ids: [...selectedProjects],
        squad_ids: [...selectedSquads],
      });
      toast.success(t(($) => $.member_bulk_assign.success));
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(($) => $.member_bulk_assign.failed),
      );
    }
  };

  const ready = selectedProjects !== null && selectedSquads !== null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t(($) => $.member_bulk_assign.title, { name: member?.name ?? "" })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 py-4">
          <div>
            <Label className="text-body font-semibold mb-3 block">
              {t(($) => $.member_bulk_assign.projects)}
            </Label>
            {projects.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                {t(($) => $.member_bulk_assign.no_projects)}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer border border-transparent hover:border-border">
                    <Checkbox
                      checked={selectedProjects?.has(p.id) ?? false}
                      onCheckedChange={() => toggleProject(p.id)}
                      disabled={!ready || reconcileAssignments.isPending}
                    />
                    <ProjectIcon project={p} className="h-4 w-4" />
                    <span className="text-body">{p.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-body font-semibold mb-3 block">
              {t(($) => $.member_bulk_assign.squads)}
            </Label>
            {squads.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                {t(($) => $.member_bulk_assign.no_squads)}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {squads.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer border border-transparent hover:border-border">
                    <Checkbox
                      checked={selectedSquads?.has(s.id) ?? false}
                      onCheckedChange={() => toggleSquad(s.id)}
                      disabled={!ready || reconcileAssignments.isPending}
                    />
                    <ActorAvatar actorType="squad" actorId={s.id} size="sm" />
                    <span className="text-body">{s.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {assignmentsQuery.isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-caption text-destructive">
            <p>{t(($) => $.member_bulk_assign.load_failed)}</p>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-destructive"
              onClick={() => void assignmentsQuery.refetch()}
            >
              {t(($) => $.member_bulk_assign.retry)}
            </Button>
          </div>
        )}

        <DialogFooter className="pt-4 mt-auto">
          <Button variant="outline" onClick={onClose} disabled={reconcileAssignments.isPending}>
            {t(($) => $.member_bulk_assign.cancel)}
          </Button>
          <Button
            onClick={() => void saveAssignments()}
            disabled={!ready || assignmentsQuery.isError || reconcileAssignments.isPending}
          >
            {reconcileAssignments.isPending
              ? t(($) => $.member_bulk_assign.saving)
              : t(($) => $.member_bulk_assign.save)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
