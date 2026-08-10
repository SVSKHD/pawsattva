import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ClipboardCheck, HeartPulse, History, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getManagedPageMetadata } from "@/lib/page-seo"

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  return getManagedPageMetadata("consultation", {
    title: "Pet Diet Consultation",
    description:
      "Request a Paw Sattva pet diet consultation using your saved pet feed report, food history, weight status, allergies, and feeding routine.",
    keywords: ["pet diet consultation", "dog weight loss diet", "cat weight gain diet", "pet nutrition consultation"],
    pathname: "/consultation",
  })
}

const dietTracks = [
  {
    title: "Weight-loss diet",
    description: "For overweight and obese pets where portions, treats, activity and safe progress tracking matter.",
  },
  {
    title: "Weight-gain diet",
    description: "For underweight pets where appetite, health history, calories and protein need careful review.",
  },
  {
    title: "Maintenance diet",
    description: "For pets in ideal condition who need a steady routine and food logs to stay balanced.",
  },
]

const reusePoints = [
  { icon: ClipboardCheck, title: "Report summary", copy: "BCS, weight status, breed, age, activity and current feeding details come from the pet feed report." },
  { icon: History, title: "Less repeated history", copy: "Once details are saved, the consultation can resume from the pet profile instead of asking everything again." },
  { icon: ShieldCheck, title: "Clear next step", copy: "Initial diet guidance can be offered free for early users, with paid subscriptions added later." },
]

export default function ConsultationPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_45%,#f6f8f3_100%)] pb-20 pt-32">
      <section className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Badge className="rounded-full border-none bg-orange-100 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-orange-700 hover:bg-orange-100">
                Pet Diet Consultation
              </Badge>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-emerald-950 sm:text-6xl">
                Diet guidance that starts from the report, not from zero.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-700">
                After a pet feed report, Paw Sattva can suggest the right diet direction: weight loss for obese or overweight pets, weight gain for underweight pets, and maintenance for pets already in ideal condition.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 rounded-xl bg-[#173f2c] px-6">
                  <Link href="/pet-feed">
                    Start with pet feed report <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 rounded-xl bg-white/70 px-6">
                  <a href="https://instagram.com/pawsattva" target="_blank" rel="noreferrer">
                    Ask Paw Sattva
                  </a>
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-white/75 shadow-2xl backdrop-blur-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                    <HeartPulse className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">How it works</p>
                    <h2 className="text-2xl font-black text-emerald-950">Saved details speed up care</h2>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {reusePoints.map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.title} className="rounded-2xl border border-orange-100 bg-white/80 p-4">
                        <div className="flex gap-3">
                          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                          <div>
                            <h3 className="font-black text-emerald-950">{item.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-stone-600">{item.copy}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {dietTracks.map((track) => (
              <Card key={track.title} className="rounded-[1.5rem] border-orange-100 bg-white/80 shadow-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-black text-emerald-950">{track.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">{track.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 rounded-[2rem] border border-emerald-900/10 bg-emerald-950 p-6 text-white shadow-xl sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-200">Subscription path</p>
            <h2 className="mt-2 text-2xl font-black">Free first guidance now, paid diet plans later.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/75">
              The consultation page positions early pet diets as an initial free support offer. As Paw Sattva grows, detailed diet plans, reminders, follow-ups and progress reviews can move into monthly subscription plans.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
