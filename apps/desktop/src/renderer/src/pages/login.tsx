import { useState } from "react";
import { LoginPage } from "@multica/views/auth";
import { DragStrip } from "@multica/views/platform";
import { MulticaIcon } from "@multica/ui/components/common/multica-icon";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";

function requireRuntimeAppUrl(): string {
  const runtimeConfig = window.desktopAPI.runtimeConfig;
  if (!runtimeConfig.ok) {
    throw new Error(
      "Invariant violated: DesktopLoginPage rendered before App accepted runtime config",
    );
  }
  return runtimeConfig.config.appUrl;
}

function HostSetup() {
  const [url, setUrl] = useState("https://api.multica.ai");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await window.desktopAPI.setRuntimeConfig(url);
      if (res.ok) {
        localStorage.setItem("desktop_host_setup_done", "true");
        window.location.reload();
      } else {
        setError(res.error.message || "Failed to configure server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <DragStrip />
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center space-y-2 text-center">
            <MulticaIcon bordered size="lg" />
            <h1 className="text-2xl font-semibold tracking-tight">Connect to Server</h1>
            <p className="text-sm text-muted-foreground">
              Enter the API URL of your Multica instance to get started.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">Server API URL</Label>
              <Input
                id="apiUrl"
                placeholder="https://api.multica.ai"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading || !url.trim()}>
              {loading ? "Connecting..." : "Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DesktopLoginPage() {
  const [setupDone, setSetupDone] = useState(
    () => localStorage.getItem("desktop_host_setup_done") === "true"
  );

  if (!setupDone) {
    return <HostSetup />;
  }

  const webUrl = requireRuntimeAppUrl();
  const handleGoogleLogin = () => {
    // Open web login page in the default browser with platform=desktop flag.
    // The web callback will redirect back via multica:// deep link with the token.
    window.desktopAPI.openExternal(
      `${webUrl}/login?platform=desktop`,
    );
  };

  return (
    <div className="flex h-screen flex-col relative">
      <DragStrip />
      <div className="absolute right-6 top-6 z-50">
        <Button variant="ghost" size="sm" onClick={() => setSetupDone(false)}>
          Change Server
        </Button>
      </div>
      <LoginPage
        logo={<MulticaIcon bordered size="lg" />}
        onSuccess={() => {
          // Auth store update triggers AppContent re-render → shows DesktopShell.
          // Initial workspace navigation happens in routes.tsx via IndexRedirect.
        }}
        onGoogleLogin={handleGoogleLogin}
      />
    </div>
  );
}
