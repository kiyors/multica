"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@multica/core/auth";
import { api } from "@multica/core/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@multica/ui/components/ui/card";
import { Button } from "@multica/ui/components/ui/button";
import { Loader2 } from "lucide-react";

function GitHubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Missing authorization code");
      return;
    }

    const state = searchParams.get("state") || "";

    api
      .connectGitHubUser(code, state)
      .then((updatedUser) => {
        setUser(updatedUser);
        // After connecting, redirect back to the home page or settings.
        router.push("/");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "GitHub connection failed");
      });
  }, [searchParams, router, setUser]);

  if (error) {
    return (
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>Connection Failed</CardTitle>
          <CardDescription>We couldn't connect your GitHub account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
          <Button onClick={() => router.push("/")} className="w-full">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader>
        <CardTitle>Connecting GitHub</CardTitle>
        <CardDescription>Please wait while we complete the connection...</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function GitHubCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <Suspense
        fallback={
          <Card className="w-full max-w-md shadow-sm">
            <CardHeader>
              <CardTitle>Connecting GitHub</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        }
      >
        <GitHubCallbackContent />
      </Suspense>
    </div>
  );
}
