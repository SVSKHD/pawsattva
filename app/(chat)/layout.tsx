/**
 * Full-screen chat pages: no site header, footer or bottom nav. Each chat page draws its own
 * top bar (Paw GPT puts its pet, New chat and the Home button there).
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
