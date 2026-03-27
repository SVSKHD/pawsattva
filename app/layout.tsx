import type { Metadata, Viewport } from "next";
import { constructMetadata } from "@/lib/metadata";
import { Geist_Mono, Pacifico, Montserrat } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = constructMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ea580c", // matches primary orange
};

import { AuthProvider } from "@/components/auth-provider";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${pacifico.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TooltipProvider>
            {children}
            <SonnerToaster richColors position="top-center" />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

