"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * State shared across the app's pages: which company the reader has picked.
 * Page 1 (the company field) sets it and hands off to the heatmap; the
 * heatmap outlines it and can change it. Nothing here is persisted.
 */
interface MvpState {
  selected: string | null;
  setSelected: (symbol: string | null) => void;
}

const MvpContext = createContext<MvpState | null>(null);

export function MvpProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  const value = useMemo(() => ({ selected, setSelected }), [selected]);
  return <MvpContext.Provider value={value}>{children}</MvpContext.Provider>;
}

export function useMvp(): MvpState {
  const value = useContext(MvpContext);
  if (!value) throw new Error("useMvp must be used inside MvpProvider");
  return value;
}
