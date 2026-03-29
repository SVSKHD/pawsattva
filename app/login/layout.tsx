import { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";

export const metadata: Metadata = constructMetadata({
  title: "Sign In",
  description: "Sign in to your Paw Sattva account to access premium pet care content and community features.",
  noIndex: true,
  pathname: "/login",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
