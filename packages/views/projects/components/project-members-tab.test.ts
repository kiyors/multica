import { describe, expect, it } from "vitest";
import type { MemberWithUser, ProjectMember } from "@multica/core/types";
import { getUnaddedWorkspaceMembers } from "./project-members-tab";

const workspaceMember = {
  id: "member-1",
  workspace_id: "workspace-1",
  user_id: "user-1",
  role: "member",
  created_at: "",
  name: "Asha Rao",
  email: "asha@example.com",
  avatar_url: null,
  github_login: null,
} satisfies MemberWithUser;

describe("project member identity", () => {
  it("compares project membership using member.id rather than user_id", () => {
    const projectMembers = [{
      project_id: "project-1",
      member_id: "member-1",
      role: "viewer",
      invited_at: "",
      invited_by: null,
    }] satisfies ProjectMember[];

    expect(getUnaddedWorkspaceMembers([workspaceMember], projectMembers)).toEqual([]);
  });

  it("keeps the workspace member available when only a different member is assigned", () => {
    const projectMembers = [{
      project_id: "project-1",
      member_id: "member-2",
      role: "viewer",
      invited_at: "",
      invited_by: null,
    }] satisfies ProjectMember[];

    expect(getUnaddedWorkspaceMembers([workspaceMember], projectMembers)).toEqual([workspaceMember]);
  });
});
