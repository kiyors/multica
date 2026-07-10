"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useCreateMilestone,
  useDeleteMilestone,
  useMilestones,
  useUpdateMilestone,
} from "@multica/core/milestones";
import { memberListOptions } from "@multica/core/workspace/queries";
import { useWorkspaceId } from "@multica/core/hooks";
import type { Milestone, MilestoneStatus } from "@multica/core/types";
import { Button } from "@multica/ui/components/ui/button";
import { Checkbox } from "@multica/ui/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@multica/ui/components/ui/dialog";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@multica/ui/components/ui/select";
import { Textarea } from "@multica/ui/components/ui/textarea";
import { CalendarRange, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useT } from "../../i18n";

interface MilestoneDraft {
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  status: MilestoneStatus;
  memberIds: string[];
}

const EMPTY_DRAFT: MilestoneDraft = {
  title: "",
  description: "",
  startDate: "",
  dueDate: "",
  status: "active",
  memberIds: [],
};

function draftFromMilestone(milestone: Milestone): MilestoneDraft {
  return {
    title: milestone.title,
    description: milestone.description ?? "",
    startDate: milestone.start_date ?? "",
    dueDate: milestone.due_date ?? "",
    status: milestone.status,
    memberIds: milestone.member_ids ?? [],
  };
}

function displayDate(value: string | null, noDate: string): string {
  if (!value) return noDate;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function ProjectMilestonesTab({ projectId }: { projectId: string }) {
  const { t } = useT("projects");
  const { data: milestones = [] } = useMilestones(projectId);
  const workspaceId = useWorkspaceId();
  const { data: workspaceMembers = [] } = useQuery(memberListOptions(workspaceId));
  const createMutation = useCreateMilestone(projectId);
  const updateMutation = useUpdateMilestone(projectId);
  const deleteMutation = useDeleteMilestone(projectId);
  const [editing, setEditing] = useState<Milestone | "new" | null>(null);
  const [draft, setDraft] = useState<MilestoneDraft>(EMPTY_DRAFT);

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setEditing("new");
  };

  const openEdit = (milestone: Milestone) => {
    setDraft(draftFromMilestone(milestone));
    setEditing(milestone);
  };

  const save = () => {
    if (!draft.title.trim()) return;
    const data = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      start_date: draft.startDate,
      due_date: draft.dueDate,
      status: draft.status,
      member_ids: draft.memberIds,
    };
    if (editing === "new") {
      createMutation.mutate(data, { onSuccess: () => setEditing(null) });
    } else if (editing) {
      updateMutation.mutate(
        { milestoneId: editing.id, data },
        { onSuccess: () => setEditing(null) },
      );
    }
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-medium">{t(($) => $.milestones.title)}</h3>
          <p className="text-sm text-muted-foreground">
            {t(($) => $.milestones.description)}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t(($) => $.milestones.new)}
        </Button>
      </div>

      {milestones.length > 0 ? <MilestoneTimeline milestones={milestones} noDate={t(($) => $.milestones.no_date)} /> : null}

      <div className="grid gap-3">
        {milestones.map((milestone) => {
          const assignedMembers = workspaceMembers.filter((member) =>
            (milestone.member_ids ?? []).includes(member.id),
          );
          return (
            <article key={milestone.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium">{milestone.title}</h4>
                    <span className="rounded-full border bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {t(($) => $.milestones.status[milestone.status])}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {milestone.description || t(($) => $.milestones.no_description)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5" />
                      {displayDate(milestone.start_date, t(($) => $.milestones.no_date))} – {displayDate(milestone.due_date, t(($) => $.milestones.no_date))}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {assignedMembers.length > 0
                        ? assignedMembers.map((member) => member.name).join(", ")
                        : t(($) => $.milestones.unassigned)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(milestone)} title="Edit milestone">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(milestone.id)}
                    title="Delete milestone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}

        {milestones.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <CalendarRange className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">{t(($) => $.milestones.empty)}</p>
            <Button variant="outline" onClick={openCreate}>{t(($) => $.milestones.create_first)}</Button>
          </div>
        ) : null}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t(($) => $.milestones.create_title) : t(($) => $.milestones.edit_title)}</DialogTitle>
            <DialogDescription>{t(($) => $.milestones.dialog_description)}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="milestone-title">{t(($) => $.milestones.title_label)}</Label>
              <Input
                id="milestone-title"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Creative review"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="milestone-description">{t(($) => $.milestones.description_label)}</Label>
              <Textarea
                id="milestone-description"
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="What must be completed in this phase?"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="milestone-start">{t(($) => $.milestones.start_date)}</Label>
                <Input
                  id="milestone-start"
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="milestone-due">{t(($) => $.milestones.end_date)}</Label>
                <Input
                  id="milestone-due"
                  type="date"
                  min={draft.startDate || undefined}
                  value={draft.dueDate}
                  onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t(($) => $.milestones.status_label)}</Label>
              <Select
                value={draft.status}
                onValueChange={(value) => value && setDraft((current) => ({ ...current, status: value as MilestoneStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t(($) => $.milestones.status.active)}</SelectItem>
                  <SelectItem value="completed">{t(($) => $.milestones.status.completed)}</SelectItem>
                  <SelectItem value="cancelled">{t(($) => $.milestones.status.cancelled)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t(($) => $.milestones.assigned_members)}</legend>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
                {workspaceMembers.map((member) => {
                  const checked = draft.memberIds.includes(member.id);
                  return (
                    <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setDraft((current) => ({
                            ...current,
                            memberIds: checked
                              ? current.memberIds.filter((id) => id !== member.id)
                              : [...current.memberIds, member.id],
                          }))
                        }
                      />
                      <span className="text-sm">{member.name}</span>
                      <span className="ml-auto truncate text-xs text-muted-foreground">{member.email}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t(($) => $.milestones.cancel)}</Button>
            <Button onClick={save} disabled={busy || !draft.title.trim() || (!!draft.startDate && !!draft.dueDate && draft.dueDate < draft.startDate)}>
              {busy ? t(($) => $.milestones.saving) : t(($) => $.milestones.save)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MilestoneTimeline({ milestones, noDate }: { milestones: Milestone[]; noDate: string }) {
  const dated = useMemo(
    () => milestones.filter((milestone) => milestone.start_date || milestone.due_date),
    [milestones],
  );
  if (dated.length === 0) return null;

  const points = dated.flatMap((milestone) => [milestone.start_date, milestone.due_date]).filter(Boolean) as string[];
  const min = Math.min(...points.map((value) => Date.parse(`${value}T00:00:00Z`)));
  const max = Math.max(...points.map((value) => Date.parse(`${value}T00:00:00Z`)));
  const span = Math.max(max - min, 86_400_000);

  return (
    <section className="rounded-lg border bg-muted/20 p-4" aria-label="Milestone timeline">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{displayDate(new Date(min).toISOString().slice(0, 10), noDate)}</span>
        <span>{displayDate(new Date(max).toISOString().slice(0, 10), noDate)}</span>
      </div>
      <div className="space-y-2">
        {dated.map((milestone) => {
          const start = Date.parse(`${milestone.start_date ?? milestone.due_date}T00:00:00Z`);
          const end = Date.parse(`${milestone.due_date ?? milestone.start_date}T00:00:00Z`);
          const left = ((start - min) / span) * 100;
          const width = Math.max(((end - start) / span) * 100, 1.5);
          return (
            <div key={milestone.id} className="grid grid-cols-[minmax(120px,180px)_1fr] items-center gap-3">
              <span className="truncate text-xs font-medium">{milestone.title}</span>
              <div className="relative h-5 rounded bg-muted">
                <div
                  className={`absolute top-1 h-3 rounded ${milestone.status === "completed" ? "bg-green-500" : milestone.status === "cancelled" ? "bg-muted-foreground/40" : "bg-primary"}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
