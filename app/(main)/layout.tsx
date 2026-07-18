import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <Header />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </main>
  );
}
