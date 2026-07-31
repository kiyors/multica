import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultStorage } from "../platform/storage";

export type SidebarPosition = "left" | "right";

interface SidebarPreferenceState {
  position: SidebarPosition;
  setPosition: (position: SidebarPosition) => void;
}

export const useSidebarPreferenceStore = create<SidebarPreferenceState>()(
  persist(
    (set) => ({
      position: "left",
      setPosition: (position) => set({ position }),
    }),
    {
      name: "multica:sidebar-preference",
      storage: createJSONStorage(() => defaultStorage),
    },
  ),
);
