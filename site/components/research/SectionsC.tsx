"use client";

import { money } from "@/lib/format";
import type { AuditView, BalanceSheetView, RiskView } from "@/lib/research-types";
import { Card, CheckIcon, LevelBadge, Missing, Num, SubHead, Tile, Val } from "./atoms";
import { GroupedBars, HBar, StackedBars } from "./charts";

/* ------------------------------------------------------- balance sheet */

export function BalanceSheetSection({ bs, currency, meaning, asOf }: { bs: BalanceSheetView | null; currency: string; meaning: string | null; asOf: string | null }) {
  if (!bs) {
    return (
      <Card id="balance-sheet" title="Balance sheet" meaning={meaning}>
        <Missing text="Not reported yet." />
      </Card>
    );
  }
  const maxMat = Math.max(1, ...bs.maturities.map((m) => m.value));
  const shares = bs.shareCount.filter((s) => s.shares != null);
  return (
    <Card id="balance-sheet" title="Balance sheet" meaning={meaning} asOf={asOf} source={bs.cashAndInvestments?.source ?? null}>
      <SubHead>What the company owns and owes</SubHead>
      <div className="mt-3">
        <StackedBars
          categories={bs.ownsOwes.map((r) => r.year)}
          items={[
            { name: "Liabilities", values: bs.ownsOwes.map((r) => r.liabilities) },
            { name: "Shareholders' equity", values: bs.ownsOwes.map((r) => r.equity) },
          ]}
          currency={currency}
          colors={["#71717A", "#1a1a1a"]}
        />
      </div>
      <p className="mt-1 text-[12px] text-[#71717A]">Each bar is total assets: what is owed to others, then what belongs to shareholders.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Cash and investments" value={<Num f={bs.cashAndInvestments} />} sub="Cash plus short and long term investments" />
        <Tile label="Total debt" value={<Num f={bs.totalDebt} />} sub="Short plus long term debt" />
        <Tile label="Goodwill and intangibles" value={<Num f={bs.goodwillIntangiblesPctAssets} />} sub="Share of total assets" />
        <Tile label="Working capital" value={<Num f={bs.workingCapital} />} sub="Current assets minus current liabilities" />
        <Tile label="Operating leases" value={<Num f={bs.leases} />} sub="Lease liabilities on the balance sheet" />
        <Tile label="Purchase obligations" value={<Num f={bs.purchaseObligations} />} sub="Off balance sheet commitments" />
      </div>

      {bs.maturities.length ? (
        <div className="mt-6">
          <SubHead>When the debt comes due</SubHead>
          <ul className="mt-3 space-y-2">
            {bs.maturities.map((m) => (
              <li key={m.label} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-[13px]">
                <span className="text-[#4a4a4a]">{m.label}</span>
                <HBar pct={(m.value / maxMat) * 100} />
                <Val className="text-right" title={`${m.source.form} FY${m.source.fy}, ${m.source.statement ?? "Debt note"}, filed ${m.source.filed}`}>
                  {money(m.value, currency)}
                </Val>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {shares.length ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SubHead>Shares outstanding</SubHead>
            {bs.shareCountChangePct ? (
              <span className="text-[12px] text-[#4a4a4a]">
                <Num f={bs.shareCountChangePct} /> over the period: {(bs.shareCountChangePct.value as number) < 0 ? "buybacks shrank the share count" : "the share count grew"}
              </span>
            ) : null}
          </div>
          <div className="mt-3">
            <GroupedBars
              categories={shares.map((s) => s.year)}
              series={[{ name: "Shares", color: "#1a1a1a", values: shares.map((s) => (s.shares as number) / 1e9) }]}
              currency={currency}
              height={170}
            />
          </div>
          <p className="mt-1 text-[12px] text-[#71717A]">Axis in billions of shares; the currency symbol on it is a labelling artefact of the shared chart.</p>
        </div>
      ) : null}
    </Card>
  );
}

/* ---------------------------------------------------------------- risk */

export function RiskSection({ risk, meaning }: { risk: RiskView | null; meaning: string | null }) {
  if (!risk) {
    return (
      <Card id="risk" title="Risk" meaning={meaning}>
        <Missing text="Not reported yet." />
      </Card>
    );
  }
  return (
    <Card id="risk" title="Risk" meaning={meaning} source={{ form: "Annual report", filed: "", url: risk.sourceUrl }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {risk.scorecard.map((s) => (
          <div key={s.key} className="rounded-[12px] border border-[#E4E4E7] px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#71717A]">{s.label}</div>
            <div className="mt-2">
              <LevelBadge level={s.level} rule={s.rule} />
            </div>
            <p className="mt-2 text-[12px] leading-snug text-[#4a4a4a]">{s.inputs}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <SubHead>Top risk factors from the latest annual report</SubHead>
        {risk.factors.length === 0 ? (
          <div className="mt-2">
            <Missing text="Risk factors could not be read from this filing." />
          </div>
        ) : (
          <ol className="mt-3 space-y-2.5">
            {risk.factors.map((f, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-snug">
                <span className="shrink-0 text-[12px] text-[#71717A]">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  {f.line.startsWith(f.title.replace(/\.\.\.$/, "")) ? (
                    <span className="font-medium">{f.line}</span>
                  ) : (
                    <>
                      <span className="font-semibold">{f.title}</span>
                      <span className="text-[#4a4a4a]"> {f.line}</span>
                    </>
                  )}{" "}
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#71717A] underline decoration-[#A1A1AA] underline-offset-2 hover:text-[#1a1a1a]">
                    Source
                  </a>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- audit */

export function AuditSection({ audit, meaning }: { audit: AuditView | null; meaning: string | null }) {
  if (!audit) {
    return (
      <Card id="audit" title="Audit" meaning={meaning}>
        <Missing text="The auditor's report could not be read from this filing." />
      </Card>
    );
  }
  const rows: { label: string; ok: boolean | null; text: React.ReactNode }[] = [
    { label: "Auditor", ok: audit.auditor ? true : null, text: audit.auditor ? `${audit.auditor}${audit.location ? `, ${audit.location}` : ""}` : "Not found in the report" },
    { label: "Years as auditor", ok: audit.since ? true : null, text: audit.since ? `Since ${audit.since}, ${audit.yearsAsAuditor} years` : "Not stated" },
    { label: "Opinion", ok: audit.opinion === "Unqualified" ? true : audit.opinion ? false : null, text: audit.opinion ?? "Not found" },
    { label: "Internal control over financial reporting", ok: audit.icfrEffective, text: audit.icfrEffective == null ? "Not stated" : audit.icfrEffective ? "Judged effective" : "Judged not effective" },
    { label: "Material weaknesses", ok: audit.materialWeakness == null ? null : !audit.materialWeakness, text: audit.materialWeakness == null ? "Not stated" : audit.materialWeakness ? "A material weakness is reported" : "None reported" },
    { label: "Auditor changes, last 5 years", ok: audit.auditorChanges.length === 0, text: audit.auditorChanges.length === 0 ? "None" : audit.auditorChanges.map((c) => c.date).join(", ") },
    { label: "Restatements, last 5 years", ok: audit.restatements.length === 0, text: audit.restatements.length === 0 ? "None" : audit.restatements.map((c) => c.date).join(", ") },
  ];
  return (
    <Card id="audit" title="Audit" meaning={meaning} source={{ form: "Annual report", filed: audit.reportDate ?? "", url: audit.sourceUrl, statement: "Report of Independent Registered Public Accounting Firm" }}>
      <ul className="divide-y divide-[#E4E4E7]">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-3 py-2.5 first:pt-0">
            <CheckIcon ok={r.ok} title={r.ok == null ? "Not stated" : r.ok ? "Clear" : "Warning"} />
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4">
              <span className="text-[14px] font-semibold">{r.label}</span>
              <span className="text-[13px] text-[#4a4a4a]">{r.text}</span>
            </div>
          </li>
        ))}
        <li className="flex items-start gap-3 py-2.5">
          <CheckIcon ok={true} title="Listed" />
          <div className="min-w-0 flex-1">
            <span className="text-[14px] font-semibold">Critical audit matters</span>
            {audit.cams.length === 0 ? (
              <p className="mt-0.5 text-[13px] text-[#4a4a4a]">None listed in the report</p>
            ) : (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-[#4a4a4a]">
                {audit.cams.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      </ul>
      {audit.auditorChanges.length || audit.restatements.length ? (
        <p className="mt-3 text-[12px] text-[#71717A]">
          {[...audit.auditorChanges.map((c) => ({ ...c, kind: "Auditor change" })), ...audit.restatements.map((c) => ({ ...c, kind: "Restatement" }))].map((c) => (
            <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="mr-3 underline decoration-[#A1A1AA] underline-offset-2">
              {c.kind}, 8-K {c.date}
            </a>
          ))}
        </p>
      ) : null}
    </Card>
  );
}
