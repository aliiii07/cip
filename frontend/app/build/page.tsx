"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Run, type RunEvent, type Spec } from "@/lib/api";
import { conditionText, stopLossText } from "@/lib/strategy-text";
import { StubDataNotice } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";

const STEPS = [
  ["market_scout", "Market Scout", "Gathering market context…"],
  ["strategy_architect", "Strategy Architect", "Compiling your idea into a strategy spec…"],
  ["backtest_engine", "Backtest Engine", "Running backtest across historical data…"],
  ["risk_cop", "Risk Cop", "Stress-testing with Monte Carlo permutations…"],
] as const;

const REVEAL_MS = 550;

function BuildInner() {
  const params = useSearchParams();
  const prefillSymbol = params.get("symbol");
  const prefillSignal = params.get("signal");

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [tags, setTags] = useState<RunEvent[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [run, setRun] = useState<Run | null>(null);
  const [strategy, setStrategy] = useState<Spec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (prefillSymbol && !prompt) {
      const signalPart = prefillSignal ? `${prefillSignal.replace("_", " ")} setup on ` : "";
      setPrompt(`Build a strategy around the ${signalPart}${prefillSymbol}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillSymbol, prefillSignal]);

  useEffect(() => {
    if (revealed < tags.length) {
      const id = setTimeout(() => setRevealed((n) => n + 1), REVEAL_MS);
      return () => clearTimeout(id);
    }
  }, [revealed, tags.length]);

  useEffect(() => () => sourceRef.current?.close(), []);

  const finished = run !== null && revealed >= tags.length;

  const submit = async () => {
    if (!prompt.trim() || phase === "running") return;
    setPhase("running");
    setTags([]);
    setRevealed(0);
    setRun(null);
    setStrategy(null);
    setError(null);
    try {
      const { run_id } = await api.createStrategy(prompt.trim());
      const source = new EventSource(api.eventsUrl(run_id));
      sourceRef.current = source;
      source.addEventListener("agent_tag", (e) => {
        setTags((prev) => [...prev, JSON.parse((e as MessageEvent).data)]);
      });
      source.addEventListener("run_finished", async () => {
        source.close();
        const result = await api.run(run_id);
        setRun(result);
        if (result.strategy_id) {
          setStrategy((await api.strategy(result.strategy_id)).spec);
        }
        setPhase("done");
      });
      source.onerror = () => {
        source.close();
        setPhase("error");
        setError("Event stream failed — is the API running on port 8000?");
      };
    } catch {
      setPhase("error");
      setError("Could not start the run — is the API running on port 8000?");
    }
  };

  const revealedTags = tags.slice(0, revealed);
  const nodeReached = (node: string) => revealedTags.some((t) => t.node === node);
  const activeNode = revealedTags.at(-1)?.node;
  const corrections = revealedTags.filter((t) => t.tag?.startsWith("[Correction attempt")).length;
  const verdictTag = revealedTags.find(
    (t) => t.tag === "[Strategy approved]" || t.tag?.startsWith("[Strategy rejected")
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-medium tracking-tight">Strategy builder</h1>
      <p className="mb-4 text-[13px] text-secondary">
        Describe a trading idea in plain English. Four agents turn it into a typed, backtested,
        risk-gated strategy spec. We show you the distribution, not the best run.
      </p>

      <div className="card mb-5">
        <label htmlFor="prompt" className="stat-label mb-1.5 block">
          Your trading idea
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe your trading idea — e.g. 'Buy BTC after a pullback when volume picks up, with a tight stop below the recent low.'"
          className="mb-3 w-full rounded-lg border border-line bg-raised p-3 text-[13px] placeholder:text-muted focus:border-accent"
        />
        <button
          onClick={submit}
          disabled={phase === "running" || !prompt.trim()}
          className="btn-primary"
          type="button"
        >
          Run the four-agent pipeline
        </button>
      </div>

      {phase !== "idle" ? (
        <div className="card mb-5">
          <ol className="space-y-3">
            {STEPS.map(([node, agent, pending]) => {
              const reached = nodeReached(node);
              const active = node === activeNode && !finished;
              const stepTags = revealedTags.filter((t) => t.node === node);
              return (
                <li key={node} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      reached
                        ? "border-ok bg-ok-bg text-ok"
                        : active
                          ? "border-accent text-accent"
                          : "border-line text-muted"
                    }`}
                  >
                    {reached ? "✓" : "·"}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium">{agent}</div>
                    <div className="text-[12px] text-secondary">
                      {reached ? (
                        <span className="mono text-[12px]">{stepTags.map((t) => t.tag).join("  ")}</span>
                      ) : (
                        pending
                      )}
                    </div>
                    {node === "market_scout" && reached ? (
                      <div className="mt-1">
                        <StubDataNotice detail="Market Scout context is placeholder until the live news and order-flow feeds are wired." />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {corrections > 0 ? (
            <p className="mt-3 text-[12px] text-warn">
              Risk Cop sent the spec back to the Architect — correction attempt {corrections} of 3.
            </p>
          ) : null}
          {verdictTag ? (
            <p
              className={`mono mt-3 text-[13px] ${
                verdictTag.tag === "[Strategy approved]" ? "text-ok" : "text-fail"
              }`}
            >
              {verdictTag.tag}
            </p>
          ) : !finished ? (
            <p className="mt-3 animate-pulse text-[12px] text-secondary">Working…</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mb-4 text-[13px] text-fail">{error}</p> : null}

      {finished && run?.risk_report?.correction_notes?.length ? (
        <div className="card mb-5 border-fail">
          <h2 className="mb-1 text-[13px] font-medium text-fail">Gate breaches</h2>
          <ul className="list-inside list-disc text-[12px] text-secondary">
            {run.correction_history.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {finished && strategy ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="stat-label mb-2">Strategy spec — plain English</div>
            <h2 className="mb-0.5 text-lg font-medium">{strategy.name}</h2>
            <p className="mb-3 text-[12px] text-secondary">
              {strategy.archetype} · {strategy.asset_class} · {strategy.timeframe} ·{" "}
              <span className="mono">{(strategy.universe ?? []).join(", ")}</span>
            </p>
            <div className="stat-label">Enter when</div>
            <ul className="mb-2 list-inside list-disc text-[13px]">
              {(strategy.entry_rules ?? []).map((c: any, i: number) => (
                <li key={i}>{conditionText(c)}</li>
              ))}
            </ul>
            <div className="stat-label">Exit when</div>
            <ul className="mb-2 list-inside list-disc text-[13px]">
              {(strategy.exit_rules ?? []).map((c: any, i: number) => (
                <li key={i}>{conditionText(c)}</li>
              ))}
            </ul>
            <p className="text-[13px]">{stopLossText(strategy)}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-[12px] text-secondary">
                View raw spec — validates against strategy schema 1.0.0
              </summary>
              <pre className="mono mt-2 max-h-80 overflow-auto rounded-lg border border-line bg-raised p-3 text-[11px]">
                {JSON.stringify(strategy, null, 2)}
              </pre>
            </details>
            {run?.strategy_id ? (
              <Link
                href={`/strategy/${run.strategy_id}`}
                className="mt-3 inline-block text-[13px] font-medium text-accent"
              >
                View full report →
              </Link>
            ) : null}
          </div>

          {run?.backtest_results ? (
            <div className="grid h-fit grid-cols-2 gap-3">
              <div className="col-span-2">
                <StatCard
                  hero
                  label="Expectancy / trade"
                  value={run.backtest_results.expectancy.toFixed(4)}
                />
              </div>
              <StatCard
                label="Profit factor"
                value={run.backtest_results.profit_factor.toFixed(2)}
              />
              <StatCard label="Sharpe" value={run.backtest_results.sharpe.toFixed(2)} />
              <StatCard
                label="Max drawdown"
                value={`${run.backtest_results.max_drawdown_pct.toFixed(1)}%`}
                sub={`of the 25% platform limit`}
              />
              <StatCard
                label="Win rate"
                value={`${run.backtest_results.win_rate_pct.toFixed(1)}%`}
                sub={`exp ${run.backtest_results.expectancy.toFixed(4)} — low WR with asymmetric payoff is healthy`}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function Build() {
  return (
    <Suspense>
      <BuildInner />
    </Suspense>
  );
}

