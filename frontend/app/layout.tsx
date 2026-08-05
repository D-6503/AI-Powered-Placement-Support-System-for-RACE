import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
// Offline fallback font variables to prevent build download timeouts
const inter = { variable: "font-sans" };
const outfit = { variable: "font-sans" };

export const metadata: Metadata = {
  title: "REVA University - Placement Intelligence System",
  description: "Demand-Aware Resume-Job Matching, Skill-Gap Analysis & Outreach Support for postgraduate students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} h-full`}
    >
      <head>
        <title>REVA - AI-Powered Placement Intelligence System</title>
      </head>
      <body className="min-h-full bg-background-cream text-dark-text font-sans antialiased flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
