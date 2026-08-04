import type { QueryClient } from "@tanstack/react-query";
import type { Approval } from "../types";
import { issueKeys } from "../issues/queries";
import { approvalKeys } from "./queries";

export function onApprovalChanged(
  qc: QueryClient,
  workspaceId: string,
  approval: Approval,
) {
  qc.invalidateQueries({ queryKey: approvalKeys.all(workspaceId) });
  if (approval.issue_id) {
    qc.invalidateQueries({ queryKey: issueKeys.timeline(approval.issue_id) });
  }
}
