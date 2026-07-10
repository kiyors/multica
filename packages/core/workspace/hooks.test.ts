import { describe, expect, it } from "vitest";
import type { MemberWithUser } from "../types";
import { findMemberByActorId } from "./hooks";

const member = {
  id: "member-1",
  workspace_id: "workspace-1",
  user_id: "user-1",
  role: "member",
  created_at: "2026-01-01T00:00:00Z",
  name: "Asha Rao",
  email: "asha@example.com",
  avatar_url: null,
  github_login: null,
} satisfies MemberWithUser;

describe("findMemberByActorId", () => {
  it("resolves the normal user ID actor identity", () => {
    expect(findMemberByActorId([member], "user-1")?.name).toBe("Asha Rao");
  });

  it("resolves review comments that store a workspace member ID", () => {
    expect(findMemberByActorId([member], "member-1")?.name).toBe("Asha Rao");
  });
});
