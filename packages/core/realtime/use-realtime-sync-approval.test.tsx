/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WSClient } from "../api/ws-client";
import { approvalKeys } from "../approvals/queries";
import { issueKeys } from "../issues/queries";
import { useRealtimeSync, type RealtimeSyncStores } from "./use-realtime-sync";

vi.mock("../platform/workspace-storage", () => ({
  getCurrentWsId: () => "ws-1",
  getCurrentSlug: () => "test-ws",
  createWorkspaceAwareStorage: (adapter: unknown) => adapter,
  registerForWorkspaceRehydration: () => {},
}));

vi.mock("../paths", () => ({
  useHasOnboarded: () => true,
  resolvePostAuthDestination: () => "/",
}));

function createStores(): RealtimeSyncStores {
  return {
    authStore: Object.assign(() => ({}), {
      getState: () => ({ user: { id: "u1" } }),
      subscribe: () => () => {},
      setState: () => {},
      destroy: () => {},
    }),
  } as unknown as RealtimeSyncStores;
}

describe("approval websocket integration", () => {
  afterEach(() => vi.clearAllMocks());

  for (const event of ["approval:requested", "approval:approved", "approval:rejected"]) {
    it(`invalidates approval and timeline queries for ${event}`, () => {
      const handlers: Record<string, (payload: unknown) => void> = {};
      const ws = {
        on: vi.fn((name: string, handler: (payload: unknown) => void) => {
          handlers[name] = handler;
          return () => {};
        }),
        onAny: vi.fn(() => () => {}),
        onReconnect: vi.fn(() => () => {}),
      } as unknown as WSClient;
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      qc.setQueryData(approvalKeys.pending("ws-1"), []);
      qc.setQueryData(issueKeys.timeline("issue-1"), []);

      function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
      }

      renderHook(() => useRealtimeSync(ws, createStores()), { wrapper: Wrapper });
      handlers[event]?.({
        id: "approval-1",
        workspace_id: "ws-1",
        issue_id: "issue-1",
        status: event.split(":")[1],
      });

      expect(qc.getQueryState(approvalKeys.pending("ws-1"))?.isInvalidated).toBe(true);
      expect(qc.getQueryState(issueKeys.timeline("issue-1"))?.isInvalidated).toBe(true);
      qc.clear();
    });
  }
});
