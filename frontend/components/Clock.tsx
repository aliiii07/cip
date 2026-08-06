"use client";

import { useEffect, useState } from "react";

export function UtcClock() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="mono hidden text-[12px] text-secondary sm:inline">{now}</span>;
}

