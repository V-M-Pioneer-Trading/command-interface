import { createContext, useContext } from "react";

export interface SelectionContextValue {
  selectedShipSymbol: string | null;
  setSelectedShipSymbol: (symbol: string | null) => void;
}

// The context and its hook live here, the provider component in
// SelectionProvider.tsx: react-refresh needs a file that exports components to
// export nothing else.
export const SelectionContext = createContext<SelectionContextValue | null>(null);

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
