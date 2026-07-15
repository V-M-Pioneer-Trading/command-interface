import { createContext, useContext, useState } from "react";

const SelectionContext = createContext(null);

export function SelectionProvider({ children }) {
  const [selectedShipSymbol, setSelectedShipSymbol] = useState(null);
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
