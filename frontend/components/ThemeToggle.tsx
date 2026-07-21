"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<string>("blueprint");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme ?? "blueprint");
  }, []);

  const toggle = () => {
    const next = theme === "blueprint" ? "terminal" : "blueprint";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("cip-theme", next);
    setTheme(next);
  };

  return (
    <button onClick={toggle} className="badge cursor-pointer hover:text-accent" type="button">
      Theme: {theme}
    </button>
  );
}
