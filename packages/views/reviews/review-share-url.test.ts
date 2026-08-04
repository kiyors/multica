import { describe, expect, it } from "vitest";
import { reviewShareURL } from "./review-share-url";

describe("reviewShareURL", () => {
  it("uses the navigation adapter's public app origin", () => {
    expect(
      reviewShareURL((path) => `https://app.multica.example${path}`, "guest/token"),
    ).toBe("https://app.multica.example/guest/review/guest%2Ftoken");
  });

  it("never derives a URL from the Electron renderer origin", () => {
    const rendererOrigin = "http://localhost:5173";
    const url = reviewShareURL((path) => `https://multica.example${path}`, "token");

    expect(url).toBe("https://multica.example/guest/review/token");
    expect(url.startsWith(rendererOrigin)).toBe(false);
  });
});
