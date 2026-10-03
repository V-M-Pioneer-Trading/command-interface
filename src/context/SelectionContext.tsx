import { createContext, useContext, useState, type ReactNode } from "react";

interface SelectionContextValue {
  selectedShipSymbol: string | null;
  setSelectedShipSymbol: (symbol: string | null) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedShipSymbol, setSelectedShipSymbol] = useState<string | null>(null);
  return (
    <SelectionContext.Provider value={{ selectedShipSymbol, setSelectedShipSymbol }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
