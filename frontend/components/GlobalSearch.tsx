"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type SymbolHit } from "@/lib/api";

const CLASS_LABEL: Record<string, string> = { equity: "Equities", crypto: "Crypto", fx: "FX" };

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SymbolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const results = await api.searchSymbols(query.trim());
        setHits(results);
        setHighlight(0);
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 150);
    return () => clearTimeout(id);
  }, [query]);

  const go = (ticker: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/asset/${ticker}`);
  };

  const grouped = hits.reduce<Record<string, SymbolHit[]>>((acc, hit) => {
    (acc[hit.asset_class] ??= []).push(hit);
    return acc;
  }, {});

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            const target = hits[highlight] ?? hits[0];
            if (target) go(target.ticker);
            else if (query.trim()) go(query.trim().toUpperCase());
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search any stock, coin, or FX pair…  (⌘K)"
        aria-label="Search symbols"
        className="h-9 w-full rounded-lg border border-line bg-raised px-3 text-[13px] placeholder:text-muted focus:border-accent"
      />
      {open && hits.length > 0 ? (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-96 overflow-auto rounded-lg border border-line bg-raised py-1 shadow-lg">
          {Object.entries(grouped).map(([cls, rows]) => (
            <div key={cls}>
              <div className="px-3 pb-0.5 pt-2 text-[10px] uppercase tracking-wide text-muted">
                {CLASS_LABEL[cls] ?? cls}
              </div>
              {rows.map((hit) => {
                const idx = hits.indexOf(hit);
                return (
                  <button
                    key={hit.ticker}
                    type="button"
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => go(hit.ticker)}
                    className={`flex w-full items-baseline justify-between px-3 py-1.5 text-left ${
                      idx === highlight ? "bg-accent-bg" : ""
                    }`}
                  >
                    <span className="mono text-[13px]">{hit.ticker}</span>
                    <span className="ml-3 truncate text-[12px] text-secondary">{hit.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
      {open && query.trim() && hits.length === 0 ? (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-lg border border-line bg-raised p-3 text-[12px] text-secondary shadow-lg">
          No matches — check the ticker spelling, or try a company or coin name.
        </div>
      ) : null}
    </div>
  );
}

