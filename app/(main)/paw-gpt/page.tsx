import type { Metadata } from "next"

import { PawGptClient } from "./paw-gpt-client"

export const metadata: Metadata = {
  title: "Paw GPT | PawSattva",
  description: "Ask questions and get reports about your pet, built from their profile, food diary and weight history.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function PawGptPage() {
  return <PawGptClient />
}
