"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isNavy = theme === "navy";

  return (
    <button
      onClick={toggle}
      aria-label="Toggle color theme"
      className="flex items-center gap-2.5 group"
    >
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 group-hover:text-gray-300 transition-colors">
        {isNavy ? "Navy" : "Red"}
      </span>
      <div
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
          isNavy ? "bg-[#0a1f44]" : "bg-[#B4123A]"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
            isNavy ? "left-1" : "left-6"
          }`}
        />
      </div>
    </button>
  );
}
