import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultStorage } from "../platform/storage";

export type DesktopTabPosition = "top" | "bottom" | "left" | "right";

interface DesktopTabPreferenceState {
  position: DesktopTabPosition;
  setPosition: (position: DesktopTabPosition) => void;
}

export const useDesktopTabPreferenceStore = create<DesktopTabPreferenceState>()(
  persist(
    (set) => ({
      position: "top",
      setPosition: (position) => set({ position }),
    }),
    {
      name: "multica:desktop-tab-preference",
      storage: createJSONStorage(() => defaultStorage),
    },
  ),
);
