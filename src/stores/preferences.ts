import { create } from "zustand";

interface PreferencesStore {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isSidebarOpen: boolean) => void;
}

const usePreferencesStore = create<PreferencesStore>((set) => ({
  isSidebarOpen: false,
  setIsSidebarOpen: (isSidebarOpen: boolean) => set({ isSidebarOpen }),
}));

export default usePreferencesStore;
