// Side-effect import: pulls the i18next module augmentation into the
// compilation graph. Without this, apps that consume @multica/views won't
// see the resources types or the selector-API enablement, and their
// typecheck would reject `t($ => $.foo.bar)` calls inside views.
import "./resources-types";

import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import { useAuthStore } from "@multica/core/auth";

export function useT(ns?: string) {
  const { t, i18n } = useTranslation(ns);
  const user = useAuthStore((s) => s.user);

  const roleRaw = user?.onboarding_questionnaire?.role;
  const firstRole = Array.isArray(roleRaw) ? roleRaw[0] : (typeof roleRaw === "string" ? roleRaw : undefined);

  // If first role is anything other than engineer/product (e.g. creative, marketing, operations)
  // we use "Tasks" terminology instead of "Issues"
  const useTasks = firstRole && !["engineer", "product"].includes(firstRole);

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
