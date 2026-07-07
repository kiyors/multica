import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "@/data/auth-store";
import { usePushNotifications } from "@/lib/use-push-notifications";

/**
 * Auth-required layout. Redirects to /login when no user is loaded.
 *
 * Workspace membership is enforced one level deeper at [workspace]/_layout —
 * not here — because select-workspace.tsx itself is auth-required but
 * workspace-less.
 */
export default function AppLayout() {
  usePushNotifications();
  const user = useAuthStore((s) => s.user);
  if (!user) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
