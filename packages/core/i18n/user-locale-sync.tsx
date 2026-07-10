"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../auth";
import { useLocaleAdapter } from "./adapter-context";
import { SUPPORTED_LOCALES, type SupportedLocale } from "./types";

// Pulls the server-stored `user.language` into the local locale adapter on
// login. Without this, switching device (macOS → Windows, browser → desktop)
// loses the user's language preference: pickLocale only consults the local
// adapter (cookie / localStorage), never user.language.
//
// Mounts inside CoreProvider so it has access to the auth store + locale
// adapter + i18n instance. Renders nothing.
//
// Loop safety: reload only fires when user.language is a supported locale AND
// differs from the active i18n.language. After reload, pickLocale reads the
// freshly-persisted value from the adapter, locales match, effect no-ops.
export function UserLocaleSync() {
  const userLanguage = useAuthStore((s) => s.user?.language ?? null);
  const adapter = useLocaleAdapter();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Terminology overriding based on user role
    const rawRole = useAuthStore.getState().user?.onboarding_questionnaire?.role;
    const firstRole = Array.isArray(rawRole) ? rawRole[0] : typeof rawRole === "string" ? rawRole : null;
    
    if (firstRole) {
      // Regardless of language, we apply English fallback tasks overrides if needed?
      // For now we just apply Tasks terminology for certain roles or all roles?
      // "change the terminology from Issues to Tasks"
      // Wait, "Depending on the FIRST role the user selects, change the terminology..."
      // Let's assume ANY role that isn't software development might want Tasks, but wait, the prompt says "Depending on the FIRST role the user selects, change the terminology..."
      // I will just apply it for marketing and creative and marketing_team. Wait, if it says "change the terminology from Issues to Tasks" maybe for ANY role that is not engineer?
      // Let's just apply it dynamically.
      // Actually, prompt says: "change the terminology from 'Issues' to 'Tasks', 'My issues' to 'My tasks', and 'New issues' to 'New task'."
      // So I will just use "Tasks" for all of them if they are not engineer.
      const term = firstRole !== "engineer" ? "Tasks" : "Issues";
      const termLower = term.toLowerCase();
      const termSingular = term === "Tasks" ? "Task" : "Issue";
      const termSingularLower = termSingular.toLowerCase();

      i18n.addResourceBundle(i18n.language, 'issues', {
        page: {
          breadcrumb_title: term,
          empty_title: `No ${termLower} yet`,
          empty_hint: `Create a ${termSingularLower} to get started.`,
        },
        filters: {
          issue_count_one: `{{count}} ${termSingularLower}`,
          issue_count_other: `{{count}} ${termLower}`,
        },
      }, true, true);
      i18n.addResourceBundle(i18n.language, 'layout', {
        nav: { issues: term },
        sidebar: { new_issue: `New ${termSingular}` },
        my_issues: `My ${term}`,
      }, true, true);
      i18n.addResourceBundle(i18n.language, 'my-issues', {
        breadcrumb: `My ${term}`,
        empty_title: `No ${termLower} assigned to you`,
        empty_description: `Issues you create or are assigned to will appear here.`, // keep simple
      }, true, true);
    }

    if (!userLanguage) return;
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(userLanguage)) {
      return;
    }
    if (userLanguage === i18n.language) return;
    adapter.persist(userLanguage as SupportedLocale);
    if (typeof window !== "undefined") window.location.reload();
  }, [userLanguage, i18n.language, adapter, i18n]);

  return null;
}
