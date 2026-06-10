"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "navy" | "red";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "navy",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("red");

  useEffect(() => {
    const saved = localStorage.getItem("cerins-theme") as Theme | null;
    const initial = saved ?? "red";
    setTheme(initial);
    if (initial === "navy") {
      document.documentElement.setAttribute("data-theme", "navy");
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === "navy" ? "red" : "navy";
    setTheme(next);
    localStorage.setItem("cerins-theme", next);
    if (next === "navy") {
      document.documentElement.setAttribute("data-theme", "navy");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
