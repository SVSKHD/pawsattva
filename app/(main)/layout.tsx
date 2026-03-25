import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </main>
  );
}