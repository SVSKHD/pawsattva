import type { Metadata } from "next"

import { PawGptClient } from "./paw-gpt-client"

export const metadata: Metadata = {
  // The root layout's template adds " | Paw Sattva".
  title: "Paw GPT",
  description: "Ask questions and get reports about your pet, built from their profile, food diary and weight history.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function PawGptPage({ searchParams }: PageProps<"/paw-gpt">) {
  // A question typed elsewhere (e.g. the home page) arrives as ?q=
  const { q } = await searchParams
  const initialQuestion = (Array.isArray(q) ? q[0] : q)?.trim() || undefined
  return <PawGptClient initialQuestion={initialQuestion} />
}
