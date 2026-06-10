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
  const [theme, setTheme] = useState<Theme>("navy");

  useEffect(() => {
    const saved = localStorage.getItem("cerins-theme") as Theme | null;
    const initial = saved ?? "navy";
    setTheme(initial);
    if (initial === "red") {
      document.documentElement.setAttribute("data-theme", "red");
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === "navy" ? "red" : "navy";
    setTheme(next);
    localStorage.setItem("cerins-theme", next);
    if (next === "red") {
      document.documentElement.setAttribute("data-theme", "red");
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
