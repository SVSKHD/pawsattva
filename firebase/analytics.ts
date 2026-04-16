import { getAnalytics, isSupported, logEvent as firebaseLogEvent, Analytics } from "firebase/analytics";
import { app } from "./firebase";

let analytics: Analytics | null = null;

export async function initAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;
  if (typeof window === "undefined") return null;

  const supported = await isSupported();
  if (!supported) return null;

  analytics = getAnalytics(app);
  return analytics;
}

export async function logEvent(eventName: string, params?: Record<string, string | number>) {
  const a = await initAnalytics();
  if (a) firebaseLogEvent(a, eventName, params);
}

export async function logPageView(path: string, title?: string) {
  const a = await initAnalytics();
  if (a) firebaseLogEvent(a, "page_view", { page_path: path, page_title: title });
}
