import { createContext, useContext, type ReactNode } from "react";

type TopBarActionsContextValue = {
  topBarActions: ReactNode;
  setTopBarActions: (node: ReactNode) => void;
};

export const TopBarActionsContext = createContext<TopBarActionsContextValue | null>(null);

export function useTopBarActions() {
  const ctx = useContext(TopBarActionsContext);
  if (!ctx) return null;
  return ctx;
}
