/**
 * Mobile-owned QueryClient.
 *
 * Bridges TanStack Query's two cross-cutting managers to native signals:
 *   - focusManager ← AppState ('active' = focused)
 *   - onlineManager ← NetInfo (isConnected)
 *
 * After this wiring is in place, queries with `refetchOnWindowFocus: true`
 * (the default) refetch on foreground, and queries are automatically paused
 * while offline + replayed when the network returns. The realtime
 * WebSocket layer (data/realtime/) reads the same signals to drive socket
 * connect/disconnect, so the two stay in sync.
 *
 * Web/desktop use a different QueryClient (packages/core/query-client.ts).
 * Mobile maintains its own to keep React Native deps out of shared code.
 */
import { focusManager, onlineManager, QueryClient, Mutation } from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@/data/api";
import type { UpdateIssueRequest, Label } from "@multica/core/types";

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (offline cache limit)
      retry: 1,
      refetchOnWindowFocus: true, // honored via focusManager bridge below
    },
    mutations: {
      retry: false,
    },
  },
});


queryClient.setMutationDefaults(["updateIssue"], {
  mutationFn: async function (this: Mutation<any, any, any, any>, patch: UpdateIssueRequest) {
    const issueId = this.options.mutationKey?.[1] as string;
    return api.updateIssue(issueId, patch);
  },
});

queryClient.setMutationDefaults(["attachLabel"], {
  mutationFn: async function (this: Mutation<any, any, any, any>, { label }: { label: Label }) {
    const issueId = this.options.mutationKey?.[1] as string;
    return api.attachLabel(issueId, label.id);
  },
});

queryClient.setMutationDefaults(["detachLabel"], {
  mutationFn: async function (this: Mutation<any, any, any, any>, { labelId }: { labelId: string }) {
    const issueId = this.options.mutationKey?.[1] as string;
    return api.detachLabel(issueId, labelId);
  },
});

queryClient.setMutationDefaults(["toggleIssueReaction"], {
  mutationFn: async function (
    this: Mutation<any, any, any, any>,
    { emoji, existing }: { emoji: string; existing?: any }
  ) {
    const issueId = this.options.mutationKey?.[1] as string;
    if (existing) {
      await api.removeIssueReaction(issueId, emoji);
      return null;
    }
    return api.addIssueReaction(issueId, emoji);
  },
});
// ── focusManager ← AppState ──────────────────────────────────────────
// Foregrounding the app counts as "focus" → triggers refetchOnWindowFocus
// for any stale queries the user is currently looking at.
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener("change", (status: AppStateStatus) => {
    handleFocus(status === "active");
  });
  return () => sub.remove();
});

// ── onlineManager ← NetInfo ──────────────────────────────────────────
// While offline, TanStack Query pauses queries; when isConnected flips
// back to true it replays paused fetches. RealtimeProvider also listens
// to NetInfo to force-reconnect the WS — both flows are driven by the
// same signal so client state and server state catch up together.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected === true);
  });
});
