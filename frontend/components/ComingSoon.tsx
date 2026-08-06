import Link from "next/link";
import { MetaHeader } from "./MetaHeader";

export function ComingSoon({
  page,
  index,
  phase,
  description,
}: {
  page: string;
  index: number;
  phase: string;
  description: string;
}) {
  return (
    <div>
      <MetaHeader page={page} index={index} total={7} />
      <h1 className="mb-4 font-display text-3xl uppercase glow">{page}</h1>
      <div className="card max-w-xl">
        <p className="mb-3 text-sm">{description}</p>
        <p className="label mb-3 text-dim">Ships in build phase {phase}.</p>
        <Link href="/build" className="label text-accent underline">
          Meanwhile: build a strategy from a natural-language idea →
        </Link>
      </div>
    </div>
  );
}
