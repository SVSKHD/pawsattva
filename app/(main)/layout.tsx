import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SocialPetGuide } from "@/components/social-pet-guide";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen flex flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <Header />
      {/* Phones have no top header, so keep content clear of the iOS status bar / Dynamic Island */}
      <div className="flex-1 pt-[env(safe-area-inset-top)] md:pt-0">
        {children}
      </div>
      <Footer />
      <SocialPetGuide />
    </main>
  );
}
