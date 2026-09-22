type SupabaseRequestOptions = RequestInit & {
  authenticated?: boolean
}

const getConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    )
  }

  return { url, publishableKey }
}

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )

const getFirebaseIdToken = async () => {
  if (typeof window === "undefined") return null

  const { auth } = await import("@/firebase/firebase")
  return (await auth.currentUser?.getIdToken(false)) ?? null
}

const buildHeaders = async (
  initHeaders?: HeadersInit,
  authenticated = true
) => {
  const { publishableKey } = getConfig()
  const headers = new Headers(initHeaders)

  headers.set("apikey", publishableKey)
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json")

  if (authenticated) {
    const token = await getFirebaseIdToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  return headers
}

export const supabaseRest = async <T>(
  path: string,
  options: SupabaseRequestOptions = {}
): Promise<T> => {
  const { url } = getConfig()
  const { authenticated = true, ...init } = options
  const headers = await buildHeaders(init.headers, authenticated)

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Supabase request failed (${response.status}): ${body || response.statusText}`)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const uploadSupabaseObject = async (
  bucket: string,
  path: string,
  file: Blob,
  contentType: string
) => {
  const { url, publishableKey } = getConfig()
  const token = await getFirebaseIdToken()

  if (!token) throw new Error("Sign in before uploading files.")

  const response = await fetch(
    `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Supabase Storage upload failed (${response.status}): ${body || response.statusText}`)
  }

  return {
    path,
    publicUrl: `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
  }
}
