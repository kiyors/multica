// Side-effect import: pulls the i18next module augmentation into the
// compilation graph. Without this, apps that consume @multica/views won't
// see the resources types or the selector-API enablement, and their
// typecheck would reject `t($ => $.foo.bar)` calls inside views.
import "./resources-types";

import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import type { FlatNamespace } from "i18next";
import { useAuthStore } from "@multica/core/auth";

export function useT<
  Ns extends FlatNamespace | readonly [FlatNamespace, ...FlatNamespace[]]
>(ns?: Ns) {
  const { t, i18n } = useTranslation(ns);
  
  // Try i18n language first
  let useTasks = typeof i18n.language === "string" && ["en-marketing", "en-creative"].includes(i18n.language);

  // If not explicitly set via locale, check user role via auth store
  const user = useAuthStore((s) => s.user);
  if (!useTasks && user?.onboarding_questionnaire?.role) {
    const role = user.onboarding_questionnaire.role;
    if (typeof role === "string" && ["marketing", "marketing_team", "social_media", "creative", "graphic_designer", "video_editor", "videographer", "content_writer", "writer"].includes(role)) {
      useTasks = true;
    }
  }

  const customT = useCallback(
    (...args: any[]) => {
      let result = (t as any)(...args);
      if (typeof result === "string" && useTasks) {
        result = result.replace(/\bIssues\b/g, "Tasks");
        result = result.replace(/\bissues\b/g, "tasks");
        result = result.replace(/\bIssue\b/g, "Task");
        result = result.replace(/\bissue\b/g, "task");
      }
      return result;
    },
    [t, useTasks]
  );

  return { t: customT as typeof t, i18n };
}
