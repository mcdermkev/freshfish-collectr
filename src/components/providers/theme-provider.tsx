"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // Suppress next-themes script warning in development (Next.js 15/React 19 mismatch)
  React.useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
      originalError.apply(console, args);
    };
    return () => { console.error = originalError; };
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
