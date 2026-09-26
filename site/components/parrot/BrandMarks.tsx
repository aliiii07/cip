/**
 * Third-party marks rendered as typographic wordmarks in each brand's color.
 * No logo artwork is copied; these are text set in the brand's palette so the
 * template reads correctly until it is rebranded.
 */

export function FundMark({ name, size = 22 }: { name: string; size?: number }) {
  const base = { fontFamily: "var(--font-figtree), sans-serif", fontSize: size };
  switch (name) {
    case "State Street":
      return (
        <span className="inline-flex items-center gap-1.5" style={{ ...base, color: "#0057B8" }}>
          <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
            <path d="M3 4h14l-3 3H0z M2 8.5h14l-3 3H-1z M3 13h14l-3 3H0z" fill="#0057B8" />
          </svg>
          <span className="font-extrabold italic leading-[0.9] tracking-tight">
            STATE
            <br />
            STREET
          </span>
        </span>
      );
    case "Fidelity":
      return (
        <span className="inline-flex items-center gap-1" style={{ ...base, color: "#4C9A2A" }}>
          <svg viewBox="0 0 24 24" width={size * 1.3} height={size * 1.3} aria-hidden>
            <circle cx="12" cy="12" r="4" fill="#4C9A2A" />
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={i}
                x1="12"
                y1="1.5"
                x2="12"
                y2="6"
                stroke="#4C9A2A"
                strokeWidth="1.6"
                transform={`rotate(${i * 30} 12 12)`}
              />
            ))}
          </svg>
          <span className="font-bold italic">Fidelity</span>
        </span>
      );
    case "Vanguard":
      return (
        <span className="font-bold" style={{ ...base, color: "#96151D", fontSize: size * 1.15 }}>
          Vanguard
        </span>
      );
    case "BlackRock":
      return (
        <span className="font-extrabold tracking-tight" style={{ ...base, color: "#111111" }}>
          BlackRock
        </span>
      );
    case "Bitwise":
      return (
        <span style={{ ...base, color: "#111111", fontFamily: "Georgia, serif", fontSize: size * 1.1 }}>
          Bitwise
        </span>
      );
    case "VanEck":
      return (
        <span className="font-extrabold" style={{ ...base, color: "#1F3A6E", fontSize: size * 1.1 }}>
          VanEck
        </span>
      );
    default:
      return <span style={{ ...base, color: "#111" }}>{name}</span>;
  }
}

export function BrokerBadge({ name, size = 56 }: { name: string; size?: number }) {
  const s = { width: size, height: size };
  if (name === "Webull") {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-[#1E66F5]" style={s} aria-hidden>
        <svg viewBox="0 0 40 40" width={size * 0.6} height={size * 0.6}>
          <path d="M6 14c8 9 20 9 28 0-6 14-22 14-28 0z" fill="#fff" />
        </svg>
      </span>
    );
  }
  if (name === "Alpaca") {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-[#FFD400]" style={s} aria-hidden>
        <svg viewBox="0 0 40 40" width={size * 0.6} height={size * 0.6}>
          <path
            d="M14 32V20c0-4 2-7 6-8 1-4 4-6 6-6l-1 5c2 1 3 3 3 6v15h-4v-8h-6v8z"
            fill="#fff"
          />
        </svg>
      </span>
    );
  }
  if (name === "Public") {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-white" style={s} aria-hidden>
        <svg viewBox="0 0 40 40" width={size * 0.7} height={size * 0.7}>
          <circle cx="18" cy="14" r="9" fill="#1B3F9E" />
          <circle cx="20" cy="30" r="5" fill="#1B3F9E" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-parrot-lime" style={s} aria-hidden>
      <span className="font-display text-[12px] font-bold text-black">{name.slice(0, 1)}</span>
    </span>
  );
}
