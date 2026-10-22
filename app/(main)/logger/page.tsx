import type { Metadata } from "next"

import { LoggerClient } from "./logger-client"

export const metadata: Metadata = {
  // The root layout's template adds " | Paw Sattva".
  title: "Pet Food Logger",
  description: "Private calendar-based food diary for your pets.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoggerPage() {
  return <LoggerClient />
}
