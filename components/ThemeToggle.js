"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "sn_theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    document.documentElement.classList.toggle("dark", nextDark);
    document.documentElement.style.colorScheme = nextDark ? "dark" : "light";

    try {
      window.localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
    } catch {
      // Theme still works for this visit when storage is unavailable.
    }

    setDark(nextDark);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="w-9 h-9 shrink-0 rounded-full border border-borderc bg-white/60 text-ledger hover:border-saffron-dark hover:text-saffron-dark transition-all flex items-center justify-center"
    >
      <span aria-hidden="true" className="text-[17px] leading-none">
        {dark ? "☀" : "☾"}
      </span>
    </button>
  );
}
