"use client"

import { usePathname } from "next/navigation"

/**
 * usePathname(), but the home page is always "/". On Netlify the prerendered home page is
 * rendered on the server as "/index" while the browser sees "/", so anything that depends on
 * the path (the active nav pill, page gates) would differ between server and client and break
 * hydration (React #418), which also wipes App Check's reCAPTCHA container.
 */
export function useAppPathname() {
  const pathname = usePathname() ?? "/"
  return pathname === "/index" || pathname.startsWith("/index?") ? "/" : pathname
}
