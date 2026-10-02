import {
  initializeAnalytics,
  isSupported,
  logEvent as firebaseLogEvent,
  type Analytics,
} from "firebase/analytics";
import { app } from "./firebase";

let analytics: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;

/** Pages that are not visitor traffic — editing in the admin shouldn't inflate reports */
const UNTRACKED_PATHS = [/^\/admin(\/|$)/, /^\/login(\/|$)/];

export const isTrackedPath = (path: string) => !UNTRACKED_PATHS.some((re) => re.test(path));

/** Custom events sent to GA4. Keep names snake_case and ≤ 40 chars (GA4 limits). */
export type AnalyticsEvent =
  | "blog_view"
  | "blog_reaction"
  | "comment_posted"
  | "newsletter_signup"
  | "search"
  | "meal_logged"
  | "weight_logged"
  | "place_maps_click";

type EventParams = Record<string, string | number | boolean | undefined>;

export async function initAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;
  if (typeof window === "undefined") return null;
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is not set — Google Analytics is disabled.");
    }
    return null;
  }

  initPromise ??= isSupported()
    .then((supported) => {
      if (!supported) return null;
      // Page views are sent manually on every route change (see FirebaseAnalytics), so the
      // automatic one is off — otherwise the first page of each visit would count twice.
      analytics = initializeAnalytics(app, { config: { send_page_view: false } });
      return analytics;
    })
    .catch((error) => {
      console.error("[analytics] Unable to start Google Analytics:", error);
      return null;
    });

  return initPromise;
}

const clean = (params?: EventParams) =>
  params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== "")
          // GA4 truncates parameter values at 100 characters
          .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 100) : value])
      )
    : undefined;

/** Send a custom event. Never throws — analytics must not break the page. */
export async function trackEvent(name: AnalyticsEvent, params?: EventParams) {
  try {
    if (typeof window !== "undefined" && !isTrackedPath(window.location.pathname)) return;
    const a = await initAnalytics();
    if (a) firebaseLogEvent(a, name as string, clean(params));
  } catch {
    // Ignore — tracking is best effort
  }
}

/** @deprecated use trackEvent */
export const logEvent = (name: AnalyticsEvent, params?: EventParams) => trackEvent(name, params);

/** GA4-style page view: GA reads the page from page_location (page_path is the old UA field) */
export async function logPageView(title?: string) {
  try {
    if (!isTrackedPath(window.location.pathname)) return;
    const a = await initAnalytics();
    if (!a) return;
    firebaseLogEvent(a, "page_view", {
      page_location: window.location.href,
      page_path: window.location.pathname,
      page_title: title || document.title,
    });
  } catch {
    // Ignore — tracking is best effort
  }
}
