"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/nasdaq50";

const REFRESH_MS = 60_000;
const RETRY_MIN_MS = 4_000;
const RETRY_MAX_MS = 30_000;

export interface QuotesState {
  quotes: Quote[] | null;
  /** Symbols the feed returned nothing for. Shown on the page by name. */
  missing: string[];
  /** The newest quote time in the set, unix seconds. */
  asOf: number | null;
  /** True when nothing has ever loaded and the last attempt failed. */
  error: boolean;
  /** True when quotes are on screen but the latest refresh did not land. */
  refreshFailed: boolean;
}

/**
 * Polls the quote route once a minute while the tab is visible, backing off
 * on failure and retrying at once when the tab comes back. A failed refresh
 * keeps the quotes already on screen, which are real and carry their own
 * timestamp; only a page that has never loaded shows the unavailable state.
 */
export function useQuotes(): QuotesState {
  const [state, setState] = useState<QuotesState>({
    quotes: null,
    missing: [],
    asOf: null,
    error: false,
    refreshFailed: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let failures = 0;

    const schedule = (ms: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, ms);
    };

    const tick = () => {
      if (document.hidden) {
        schedule(5_000);
        return;
      }
      void load();
    };

    const load = async () => {
      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (!res.ok) throw new Error(`quotes ${res.status}`);
        const body = (await res.json()) as { quotes?: Quote[]; missing?: string[]; stale?: boolean };
        if (cancelled) return;
        if (!Array.isArray(body.quotes) || body.quotes.length === 0) throw new Error("quotes: empty");
        failures = 0;
        const asOf = body.quotes.reduce((m, q) => Math.max(m, q.time), 0);
        setState({
          quotes: body.quotes,
          missing: Array.isArray(body.missing) ? body.missing : [],
          asOf,
          error: false,
          refreshFailed: Boolean(body.stale),
        });
        schedule(body.stale ? RETRY_MIN_MS : REFRESH_MS);
      } catch {
        if (cancelled) return;
        failures += 1;
        setState((s) => ({ ...s, error: s.quotes === null, refreshFailed: s.quotes !== null }));
        schedule(Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** (failures - 1)));
      }
    };

    const onVisible = () => {
      if (document.hidden) return;
      window.clearTimeout(timer);
      void load();
    };

    document.addEventListener("visibilitychange", onVisible);
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return state;
}
