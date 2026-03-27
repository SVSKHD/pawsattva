import { PetFeedForm } from "@/components/pet-feed-form"
import { Badge } from "@/components/ui/badge"

export default function PetFeedPage() {
  return (
    <div className="min-h-screen bg-background pb-20 pt-32">
      {/* Animated Background Spheres */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/30 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16 space-y-6">
          <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100 border-none px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase">
            Personalization
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Tailored Care for your <span className="text-primary italic">Best Friend</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Fill out the details below to help us understand your pet's needs and provide you with personalized feeding schedules and reminders.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <PetFeedForm />
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          {[
            { icon: "📅", title: "Custom Schedules", desc: "Get feeding plans tailored to your pet's breed and age." },
            { icon: "🔔", title: "Smart Reminders", desc: "Never miss a meal with our automated notification system." },
            { icon: "💡", title: "Expert Tips", desc: "Receive nutrition advice from certified pet care specialists." }
          ].map((feature, idx) => (
            <div key={idx} className="p-8 rounded-[2rem] bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/5 text-center transition-all hover:scale-[1.02] hover:shadow-xl">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
