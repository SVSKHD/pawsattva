import { Metadata } from "next";
import { constructMetadata } from "@/lib/metadata";
import AdminPanel from "./admin-panel";

export const metadata: Metadata = constructMetadata({
  title: "Admin Dashboard",
  description: "Secure content management for Paw Sattva.",
  noIndex: true,
  pathname: "/admin",
});

export default function AdminPage() {
  return <AdminPanel />;
}
