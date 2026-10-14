import { ChatHomeButton } from "./chat-home-button"

/** Full-screen chat pages: no site header, footer or bottom nav — just the chat and a way home. */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatHomeButton />
    </>
  )
}
