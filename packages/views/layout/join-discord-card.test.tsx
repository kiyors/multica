import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JoinDiscordCard } from "./join-discord-card";

// react-i18next isn't initialised in the views test env, so resolve the
// selector against the real en/layout.json to assert on actual copy.
vi.mock("../i18n", () => ({
  useT: () => ({
    t: (sel: (r: { sidebar: { discord_card: Record<string, string> } }) => string) =>
      sel({
        sidebar: {
          discord_card: {
            title: "Join our Discord",
            description: "Chat with the team and other builders.",
            dismiss: "Dismiss",
          },
        },
      }),
  }),
}));

describe("JoinDiscordCard", () => {
  it("links to the Discord invite", () => {
    render(<JoinDiscordCard />);
    const link = screen.getByRole("link", { name: /join our discord/i });
    expect(link).toHaveAttribute("href", "https://discord.gg/W8gYBn226t");
    expect(link).toHaveAttribute("target", "_blank");
  });
  it("has no dismiss affordance", () => {
    render(<JoinDiscordCard />);
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });
});
