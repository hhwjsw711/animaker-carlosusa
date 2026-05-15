import { useState, useMemo, type ReactNode } from "react";
import { TopBarActionsContext } from "./top-bar-actions";

export { useTopBarActions } from "./top-bar-actions";

export function TopBarActionsProvider({ children }: { children: ReactNode }) {
  const [topBarActions, setTopBarActions] = useState<ReactNode>(null);
  const value = useMemo(() => ({ topBarActions, setTopBarActions }), [topBarActions]);
  return (
    <TopBarActionsContext.Provider value={value}>
      {children}
    </TopBarActionsContext.Provider>
  );
}
