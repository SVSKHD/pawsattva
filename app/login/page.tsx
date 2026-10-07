import { LoginClient } from "./login-client"

// Fully static: no data fetching, so the page is served straight from the CDN.
export default function LoginPage() {
  return <LoginClient />
}
