// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { useSidebarPreferenceStore } from "./sidebar-preference-store";

const STORAGE_KEY = "multica:sidebar-preference";

beforeAll(() => {
  if (typeof globalThis.localStorage?.clear !== "function") {
    const values = new Map<string, string>();
    const storage: Storage = {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => Array.from(values.keys())[index] ?? null,
      removeItem: (key) => { values.delete(key); },
      setItem: (key, value) => { values.set(key, value); },
    };
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  }
});

describe("sidebar preference store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSidebarPreferenceStore.setState({ position: "left" });
  });

  it("persists the selected sidebar position", () => {
    useSidebarPreferenceStore.getState().setPosition("right");

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"))
      .toMatchObject({ state: { position: "right" } });
  });

  it("restores a persisted sidebar position during hydration", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { position: "right" }, version: 0 }),
    );

    await useSidebarPreferenceStore.persist.rehydrate();

    expect(useSidebarPreferenceStore.getState().position).toBe("right");
  });
});
