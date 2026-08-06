import { PaperBadge } from "./Badge";
import { UtcClock } from "./Clock";
import { GlobalSearch } from "./GlobalSearch";

export function TopBar() {
  return (
    <header className="flex h-[52px] items-center gap-4 border-b border-line bg-surface px-4">
      <GlobalSearch />
      <span className="flex-1" />
      <PaperBadge />
      <UtcClock />
    </header>
  );
}

