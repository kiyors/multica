import { describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import type { Approval } from "../types";
import { approvalKeys } from "./queries";
import { onApprovalChanged } from "./ws-updaters";
import { issueKeys } from "../issues/queries";

describe("approval websocket updater", () => {
  it("invalidates approval scopes and the affected issue timeline", () => {
    const invalidateQueries = vi.fn();
    const qc = { invalidateQueries } as unknown as QueryClient;
    const approval = {
      id: "approval-1",
      workspace_id: "ws-1",
      issue_id: "issue-1",
      requester_type: "member",
      requester_id: "member-1",
      approver_type: "member",
      approver_id: "member-2",
      status: "pending",
      comment: null,
      decided_at: null,
      created_at: "2026-08-04T00:00:00Z",
    } satisfies Approval;

    onApprovalChanged(qc, "ws-1", approval);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: approvalKeys.all("ws-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: issueKeys.timeline("issue-1"),
    });
  });
});
