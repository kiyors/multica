/* eslint-disable i18next/no-literal-string */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceId } from "@multica/core/hooks";
import { useAuthStore } from "@multica/core/auth";
import { listApprovalsByIssueOptions } from "@multica/core/approvals/queries";
import { useCreateApproval, useApproveApproval, useRejectApproval } from "@multica/core/approvals/mutations";
import { Button } from "@multica/ui/components/ui/button";
import { Textarea } from "@multica/ui/components/ui/textarea";
import { Check, X, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import type { Approval, IssueAssigneeType } from "@multica/core/types";
import { AssigneePicker } from "./pickers";
import { useActorName } from "@multica/core/workspace/hooks";
import { ActorAvatar } from "../../common/actor-avatar";

export function ApprovalWidget({ issueId }: { issueId: string }) {
  const wsId = useWorkspaceId();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data = [] } = useQuery(listApprovalsByIssueOptions(wsId, issueId));
  const approvals = data as Approval[];
  const { getActorName } = useActorName();
  const [requesting, setRequesting] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedReviewers, setSelectedReviewers] = useState<{ type: IssueAssigneeType; id: string }[]>([]);

  const createApproval = useCreateApproval();
  const approveApproval = useApproveApproval();
  const rejectApproval = useRejectApproval();

  const handleUpdateReviewers = (updates: any) => {
    if (updates.assignees) {
      setSelectedReviewers(updates.assignees.map((a: any) => ({ type: a.assignee_type, id: a.assignee_id })));
    } else if (updates.assignee_id) {
      setSelectedReviewers([{ type: updates.assignee_type || "member", id: updates.assignee_id }]);
    } else {
      setSelectedReviewers([]);
    }
  };

  const submitRequests = async () => {
    if (selectedReviewers.length === 0) return;
    await Promise.all(
      selectedReviewers.map((r) =>
        createApproval.mutateAsync({
          workspaceId: wsId,
          issueId: issueId,
          approverType: r.type,
          approverId: r.id,
        })
      )
    );
    setRequesting(false);
    setSelectedReviewers([]);
  };

  const pendingApprovals = approvals.filter((a: Approval) => a.status === "pending");
  const decidedApprovals = approvals.filter((a: Approval) => a.status !== "pending");

  return (
    <div className="space-y-3">
      {pendingApprovals.map((approval: Approval) => {
        const isApprover = approval.approver_id === currentUserId;
        const approverName = getActorName(approval.approver_type || "member", approval.approver_id);
        return (
          <div key={approval.id} className="flex flex-col gap-2 p-3 border rounded-md bg-yellow-50/50">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
              <ShieldAlert className="h-4 w-4" />
              <span>Pending Approval</span>
            </div>
            {isApprover ? (
              <div className="flex flex-col gap-2 mt-2">
                <Textarea
                  placeholder="Add a comment (optional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[60px] text-sm resize-none bg-background"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex-1" onClick={() => approveApproval.mutateAsync({ workspaceId: wsId, approvalId: approval.id, comment })}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 flex-1 border-red-200" onClick={() => rejectApproval.mutateAsync({ workspaceId: wsId, approvalId: approval.id, comment })}>
                    <X className="mr-1 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                Waiting for <ActorAvatar actorType={approval.approver_type || "member"} actorId={approval.approver_id} size={16} /> {approverName}
              </p>
            )}
          </div>
        );
      })}
      
      {decidedApprovals.map((approval: Approval) => {
        const approverName = getActorName(approval.approver_type || "member", approval.approver_id);
        return (
          <div key={approval.id} className={`flex items-center gap-2 p-2 border rounded-md text-sm ${approval.status === 'approved' ? 'bg-green-50/50 text-green-800 border-green-200' : 'bg-red-50/50 text-red-800 border-red-200'}`}>
            {approval.status === 'approved' ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
            <span className="font-medium capitalize">{approval.status}</span>
            <span className="text-muted-foreground ml-auto flex items-center gap-1.5">
              by <ActorAvatar actorType={approval.approver_type || "member"} actorId={approval.approver_id} size={16} /> {approverName}
            </span>
          </div>
        );
      })}

      {!requesting && (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setRequesting(true)}>
          Request Approval
        </Button>
      )}

      {requesting && (
        <div className="p-3 border rounded-md space-y-2">
          <p className="text-xs font-medium">Select Reviewers</p>
          <AssigneePicker assignees={selectedReviewers} onUpdate={handleUpdateReviewers} />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-xs" onClick={submitRequests} disabled={selectedReviewers.length === 0}>
              Send Requests
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => { setRequesting(false); setSelectedReviewers([]); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
