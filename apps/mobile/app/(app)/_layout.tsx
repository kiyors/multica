import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "@/data/auth-store";
import { usePushNotifications } from "@/lib/use-push-notifications";

// Isolated so the permission prompt + token registration only happen for an
// authenticated user. Mounting the hook before the auth gate fired the iOS
// permission alert on first app-open and POSTed the device token while
// logged out (guaranteed 401 → onUnauthorized logout path).
function PushNotificationRegistrar() {
  usePushNotifications();
  return null;
}

/**
 * Auth-required layout. Redirects to /login when no user is loaded.
 *
 * Workspace membership is enforced one level deeper at [workspace]/_layout —
 * not here — because select-workspace.tsx itself is auth-required but
 * workspace-less.
 */
export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Redirect href="/login" />;
  return (
    <>
      <PushNotificationRegistrar />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
