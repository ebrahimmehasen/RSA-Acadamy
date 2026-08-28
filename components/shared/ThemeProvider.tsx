"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wires the app's `.dark` Tailwind variant (see app/globals.css) to the
 * visitor's OS color-scheme preference. Without this, the full dark
 * palette already defined in globals.css is dead code — the `.dark`
 * class is never applied, so dark-mode users just get the light theme
 * with a dark browser chrome (from the theme-color meta), which reads
 * as broken rather than "no dark mode yet."
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
