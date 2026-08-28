import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "رياض الصالحين | RSA Academy",
  description: "منصة رياض الصالحين التعليمية لمتابعة الطلاب والمعلمين وأولياء الأمور",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(0.99 0.003 240)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.17 0.025 254)" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-cairo)]">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
