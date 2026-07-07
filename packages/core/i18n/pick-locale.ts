import { match } from "@formatjs/intl-localematcher";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type LocaleAdapter,
  type SupportedLocale,
} from "./types";

// Filter out custom dialects that break BCP-47 validation in intl-localematcher
const BCP47_LOCALES = SUPPORTED_LOCALES.filter(
  (l) => l !== "en-marketing" && l !== "en-creative",
);

export function matchLocale(candidates: string[]): SupportedLocale {
  if (candidates.length === 0) return DEFAULT_LOCALE;
  try {
    // Check if the user explicitly requested a custom dialect
    const firstCandidate = candidates[0];
    if (
      firstCandidate === "en-marketing" ||
      firstCandidate === "en-creative"
    ) {
      return firstCandidate;
    }

    return match(
      candidates.filter(c => c !== "en-marketing" && c !== "en-creative"),
      BCP47_LOCALES,
      DEFAULT_LOCALE,
    ) as SupportedLocale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function pickLocale(adapter: LocaleAdapter): SupportedLocale {
  const choice = adapter.getUserChoice();
  if (choice) return matchLocale([choice]);
  return matchLocale(adapter.getSystemPreferences());
}
