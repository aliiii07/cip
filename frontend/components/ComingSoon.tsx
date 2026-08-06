import Link from "next/link";

export function ComingSoon({
  page,
  phase,
  description,
}: {
  page: string;
  phase: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="mb-3 text-xl font-medium tracking-tight">{page}</h1>
      <div className="card max-w-xl">
        <p className="mb-2 text-[13px]">{description}</p>
        <p className="mb-3 text-[12px] text-secondary">Ships in build phase {phase}.</p>
        <p className="text-[13px]">
          Meanwhile: search any symbol in the bar above for a full analysis, or{" "}
          <Link href="/build" className="font-medium text-accent">
            build a strategy from a plain-English idea
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
