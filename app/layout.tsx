import type { Metadata } from "next";
import { Geist, Geist_Mono, Pacifico } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paw Sattva",
  description: "Paw Sattva",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} h-full antialiased`}
    >
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <main className="flex-1 flex flex-col">
            <Header />
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}

