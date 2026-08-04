// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "../test/i18n";

const mocks = vi.hoisted(() => ({
  reconcile: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: string[] }) => {
    if (options.queryKey[0] === "projects") {
      return {
        data: [
          { id: "project-old", title: "Old project" },
          { id: "project-new", title: "New project" },
        ],
      };
    }
    if (options.queryKey[0] === "squads") {
      return {
        data: [
          { id: "squad-old", name: "Old squad" },
          { id: "squad-new", name: "New squad" },
        ],
      };
    }
    return {
      data: { project_ids: ["project-old"], squad_ids: ["squad-old"] },
      isError: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "workspace-1",
}));

vi.mock("@multica/core/projects/queries", () => ({
  projectListOptions: () => ({ queryKey: ["projects"] }),
}));

vi.mock("@multica/core/workspace/queries", () => ({
  squadListOptions: () => ({ queryKey: ["squads"] }),
}));

vi.mock("@multica/core/projects/members", () => ({
  memberAssignmentsOptions: () => ({ queryKey: ["assignments"] }),
  useReconcileMemberAssignments: (workspaceId: string, memberId: string) => ({
    mutateAsync: (request: unknown) => mocks.reconcile(workspaceId, memberId, request),
    isPending: false,
  }),
}));

vi.mock("@multica/ui/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@multica/ui/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: () => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => onCheckedChange?.()}
    />
  ),
}));

vi.mock("../projects/components/project-icon", () => ({
  ProjectIcon: () => null,
}));

vi.mock("../common/actor-avatar", () => ({
  ActorAvatar: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

import { MemberBulkAssignModal } from "./member-bulk-assign";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reconcile.mockResolvedValue({
    project_ids: ["project-new"],
    squad_ids: ["squad-new"],
  });
});

describe("MemberBulkAssignModal", () => {
  it("loads existing assignments and submits one full replacement", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithI18n(
      <MemberBulkAssignModal
        onClose={onClose}
        data={{
          member: {
            id: "member-row-1",
            user_id: "user-1",
            workspace_id: "workspace-1",
            role: "member",
            name: "Ada",
            email: "ada@example.test",
            avatar_url: null,
            created_at: "2026-08-04T00:00:00Z",
          },
        }}
      />,
    );

    const oldProject = screen.getByText("Old project").closest("label")
      ?.querySelector("input");
    const newProject = screen.getByText("New project").closest("label")
      ?.querySelector("input");
    const oldSquad = screen.getByText("Old squad").closest("label")
      ?.querySelector("input");
    const newSquad = screen.getByText("New squad").closest("label")
      ?.querySelector("input");

    await waitFor(() => {
      expect(oldProject).toBeChecked();
      expect(oldSquad).toBeChecked();
    });
    await user.click(oldProject!);
    await user.click(newProject!);
    await user.click(oldSquad!);
    await user.click(newSquad!);
    await user.click(screen.getByRole("button", { name: "Save assignments" }));

    await waitFor(() =>
      expect(mocks.reconcile).toHaveBeenCalledWith(
        "workspace-1",
        "member-row-1",
        {
          project_ids: ["project-new"],
          squad_ids: ["squad-new"],
        },
      ),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Assignments updated");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
