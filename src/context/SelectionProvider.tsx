import { useState, type ReactNode } from "react";
import { SelectionContext } from "./SelectionContext";

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedShipSymbol, setSelectedShipSymbol] = useState<string | null>(null);
  return (
    <SelectionContext.Provider value={{ selectedShipSymbol, setSelectedShipSymbol }}>
      {children}
    </SelectionContext.Provider>
  );
}
