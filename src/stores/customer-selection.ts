import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Id } from "../../convex/_generated/dataModel";

interface CustomerSelectionStore {
  selectedCustomerId: Id<"customers"> | null;
  setSelectedCustomerId: (customerId: Id<"customers"> | null) => void;
}

const useCustomerSelectionStore = create<CustomerSelectionStore>()(
  persist(
    (set) => ({
      selectedCustomerId: null,
      setSelectedCustomerId: (customerId) => set({ selectedCustomerId: customerId }),
    }),
    { name: "customer-selection" },
  ),
);

export default useCustomerSelectionStore;
