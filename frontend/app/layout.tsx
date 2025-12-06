import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Absence Pro - Smart Employee Leave Management System",
  description:
    "Streamline your organization's leave management with our intuitive absence tracking and approval system. Handle time-off requests, monitor attendance, and manage employee absences efficiently.",
};
// Protect against non-standard localStorage provided by the dev server/runtime
// (some dev tooling may inject a plain object which lacks getItem/setItem)
// Ensure getItem is a function to avoid TypeError: localStorage.getItem is not a function.
try {
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as any).localStorage !== "undefined" &&
    typeof (globalThis as any).localStorage.getItem !== "function"
  ) {
    const existing = { ...(globalThis as any).localStorage };
    const storageMap = new Map<string, any>(Object.entries(existing));
    (globalThis as any).localStorage = {
      getItem: (k: string) => (storageMap.has(k) ? String(storageMap.get(k)) : null),
      setItem: (k: string, v: any) => storageMap.set(k, String(v)),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear(),
    } as Storage;
  }
} catch (e) {
  // swallow any error — this is best-effort to avoid runtime crashes during SSR
}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
