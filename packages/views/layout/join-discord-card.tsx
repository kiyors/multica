"use client";

import { DISCORD_URL, DiscordIcon } from "./discord";
import { useT } from "../i18n";

/** "Join our Discord" promo pinned above the sidebar help launcher. */
export function JoinDiscordCard() {
  const { t } = useT("layout");

  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 rounded-md border border-sidebar-border bg-sidebar-accent/50 p-2.5 transition-colors hover:bg-sidebar-accent"
    >
      {/* Discord blurple (#5865F2) is the brand mark color — an intentional
          exception to the semantic-token rule, like the landing social icons. */}
      <DiscordIcon className="mt-px size-4 shrink-0 text-[#5865F2]" />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-sidebar-foreground">
          {t(($) => $.sidebar.discord_card.title)}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
          {t(($) => $.sidebar.discord_card.description)}
        </span>
      </span>
    </a>
  );
}
