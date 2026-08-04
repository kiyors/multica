import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspaceId } from "@multica/core/hooks";
import { useAuthStore } from "@multica/core/auth";
import { listApprovalsByIssueOptions } from "@multica/core/approvals/queries";
import { useCreateApproval, useApproveApproval, useRejectApproval } from "@multica/core/approvals/mutations";
import { Button } from "@multica/ui/components/ui/button";
import { Textarea } from "@multica/ui/components/ui/textarea";
import { Check, X, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import type { Approval, IssueAssigneeType, UpdateIssueRequest } from "@multica/core/types";
import { AssigneePicker } from "./pickers";
import { useActorName } from "@multica/core/workspace/hooks";
import { ActorAvatar } from "../../common/actor-avatar";
import { useT } from "../../i18n";

export function ApprovalWidget({ issueId }: { issueId: string }) {
  const wsId = useWorkspaceId();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data = [] } = useQuery(listApprovalsByIssueOptions(wsId, issueId));
  const approvals = data as Approval[];
  const { getActorName } = useActorName();
  const { t } = useT("issues");
  const [requesting, setRequesting] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [selectedReviewer, setSelectedReviewer] = useState<{
    type: IssueAssigneeType;
    id: string;
  } | null>(null);

  const createApproval = useCreateApproval();
  const approveApproval = useApproveApproval();
  const rejectApproval = useRejectApproval();

  const handleUpdateReviewer = (updates: Partial<UpdateIssueRequest>) => {
    if (updates.assignee_type && updates.assignee_id) {
      setSelectedReviewer({
        type: updates.assignee_type,
        id: updates.assignee_id,
      });
      return;
    }
    setSelectedReviewer(null);
  };

  const submitRequest = async () => {
    if (!selectedReviewer) return;
    try {
      await createApproval.mutateAsync({
        workspaceId: wsId,
        issueId,
        approverType: selectedReviewer.type,
        approverId: selectedReviewer.id,
      });
      setRequesting(false);
      setSelectedReviewer(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t(($) => $.approval.create_failed),
      );
    }
  };

  const submitDecision = async (approval: Approval, decision: "approve" | "reject") => {
    try {
      const mutation = decision === "approve" ? approveApproval : rejectApproval;
      await mutation.mutateAsync({
        workspaceId: wsId,
        approvalId: approval.id,
        comment: comments[approval.id] ?? "",
      });
      setComments((current) => {
        const next = { ...current };
        delete next[approval.id];
        return next;
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t(($) => $.approval.decision_failed),
      );
    }
  };

  const pendingApprovals = approvals.filter((a: Approval) => a.status === "pending");
  const decidedApprovals = approvals.filter((a: Approval) => a.status !== "pending");

  return (
    <div className="space-y-3">
      {pendingApprovals.map((approval: Approval) => {
        const isApprover = approval.approver_id === currentUserId;
        const approverName = getActorName(approval.approver_type || "member", approval.approver_id);
        return (
          <div key={approval.id} className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-2 text-body font-semibold text-foreground">
              <ShieldAlert className="h-4 w-4 text-warning" />
              <span>{t(($) => $.approval.pending)}</span>
            </div>
            {isApprover ? (
              <div className="flex flex-col gap-3 mt-1">
                <Textarea
                  placeholder={t(($) => $.approval.comment_placeholder)}
                  value={comments[approval.id] ?? ""}
                  onChange={(e) =>
                    setComments((current) => ({
                      ...current,
                      [approval.id]: e.target.value,
                    }))
                  }
                  className="min-h-[72px] resize-none border-warning/30 bg-background/70 text-body shadow-inner focus-visible:ring-warning"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 shadow-sm transition-all active:scale-95" onClick={() => void submitDecision(approval, "approve")} disabled={approveApproval.isPending || rejectApproval.isPending}>
                    <Check className="mr-1.5 h-4 w-4" /> {t(($) => $.approval.approve)}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-destructive/30 text-destructive shadow-sm transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95" onClick={() => void submitDecision(approval, "reject")} disabled={approveApproval.isPending || rejectApproval.isPending}>
                    <X className="mr-1.5 h-4 w-4" /> {t(($) => $.approval.reject)}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 p-2 text-micro text-muted-foreground">
                <span className="flex-1">{t(($) => $.approval.waiting_for)}</span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <ActorAvatar actorType={approval.approver_type || "member"} actorId={approval.approver_id} size="sm" /> {approverName}
                </span>
              </p>
            )}
          </div>
        );
      })}
      
      {decidedApprovals.map((approval: Approval) => {
        const approverName = getActorName(approval.approver_type || "member", approval.approver_id);
        return (
          <div key={approval.id} className={`flex items-center gap-2 rounded-md border p-2 text-body ${approval.status === "approved" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
            {approval.status === "approved" ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
            <span className="font-medium">{approval.status === "approved" ? t(($) => $.approval.status_approved) : t(($) => $.approval.status_rejected)}</span>
            <span className="text-muted-foreground ml-auto flex items-center gap-1.5">
              {t(($) => $.approval.by)} <ActorAvatar actorType={approval.approver_type || "member"} actorId={approval.approver_id} size="xs" /> {approverName}
            </span>
          </div>
        );
      })}

      {!requesting && (
        <Button variant="outline" size="sm" className="w-full text-micro" onClick={() => setRequesting(true)}>
          {t(($) => $.approval.request)}
        </Button>
      )}

      {requesting && (
        <div className="p-3 border rounded-md space-y-2">
          <p className="text-micro font-medium">{t(($) => $.approval.select_reviewer)}</p>
          <AssigneePicker 
            assigneeType={selectedReviewer?.type ?? null}
            assigneeId={selectedReviewer?.id ?? null}
            onUpdate={handleUpdateReviewer}
            allowedTypes={["member", "agent"]}
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-micro" onClick={submitRequest} disabled={!selectedReviewer || createApproval.isPending}>
              {t(($) => $.approval.send_request)}
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-micro" onClick={() => { setRequesting(false); setSelectedReviewer(null); }}>
              {t(($) => $.approval.cancel)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
