/* eslint-disable i18next/no-literal-string */
"use client";

import { useState } from "react";
import { PropertyPicker, PickerItem } from "./property-picker";
import { useMilestones } from "@multica/core/milestones/queries";
import type { Milestone } from "@multica/core/types";
import { Target } from "lucide-react";

export function MilestonePicker({
  milestoneId,
  onUpdate,
  trigger: customTrigger,
  triggerRender,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  align,
  projectId,
}: {
  milestoneId: string | null;
  onUpdate: (updates: { milestone_id: string | null }) => void;
  trigger?: React.ReactNode;
  triggerRender?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  align?: "start" | "center" | "end";
  projectId?: string | null;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const { data: milestones = [] } = useMilestones(projectId ?? null);
  const selectedMilestone = milestones.find((m: Milestone) => m.id === milestoneId);

  return (
    <PropertyPicker
      open={open}
      onOpenChange={setOpen}
      width="w-44"
      align={align}
      triggerRender={triggerRender}
      trigger={
        customTrigger ??
        (selectedMilestone ? (
          <>
            <Target className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{selectedMilestone.title}</span>
          </>
        ) : (
          <>
            <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-muted-foreground">Milestone</span>
          </>
        ))
      }
    >
      {milestones.map((m: Milestone) => {
        return (
          <PickerItem
            key={m.id}
            selected={m.id === milestoneId}
            onClick={() => {
              onUpdate({ milestone_id: m.id });
              setOpen(false);
            }}
          >
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{m.title}</span>
          </PickerItem>
        );
      })}
    </PropertyPicker>
  );
}
