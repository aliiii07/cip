// The schema-pinned disclaimer (schemas/strategy.json: metadata.disclaimer).
// This exact string, everywhere. Changing it is a schema + validator change.
export const DISCLAIMER =
  "For educational and simulation purposes only. Past performance does not guarantee future results.";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const VERSION = "0.1.0";

