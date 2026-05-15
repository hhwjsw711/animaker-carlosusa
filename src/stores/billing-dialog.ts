import { create } from "zustand";

interface BillingDialogStore {
  insufficientCreditsOpen: boolean;
  insufficientCreditsData: {
    required?: number;
    available?: number;
  } | null;
  openInsufficientCredits: (
    data?: { required?: number; available?: number },
  ) => void;
  closeInsufficientCredits: () => void;
}

const useBillingDialogStore = create<BillingDialogStore>((set) => ({
  insufficientCreditsOpen: false,
  insufficientCreditsData: null,
  openInsufficientCredits: (data) =>
    set({ insufficientCreditsOpen: true, insufficientCreditsData: data ?? null }),
  closeInsufficientCredits: () =>
    set({ insufficientCreditsOpen: false, insufficientCreditsData: null }),
}));

export default useBillingDialogStore;
