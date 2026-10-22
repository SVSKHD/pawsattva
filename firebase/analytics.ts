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
  | "paw_gpt_question"
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
    // Every event carries the page type too, so events can be broken down by section.
    if (a) firebaseLogEvent(a, name as string, clean({ ...pageGroup(window.location.pathname), ...params }));
  } catch {
    // Ignore — tracking is best effort
  }
}

/** @deprecated use trackEvent */
export const logEvent = (name: AnalyticsEvent, params?: EventParams) => trackEvent(name, params);

/**
 * Which kind of page a path is, sent as GA4's built-in `content_group` (Reports → Engagement →
 * Pages and screens → "Content group") so each section can be compared, plus the article or
 * category slug when there is one. Keep in step with the routes in app/.
 */
export function pageGroup(path: string): { content_group: string; content_id?: string } {
  const [first = "", second] = path.replace(/^\/+|\/+$/g, "").split("/");
  switch (first) {
    case "":
    case "index":
      return { content_group: "home" };
    case "blog":
      return second ? { content_group: "blog_article", content_id: decodeURIComponent(second) } : { content_group: "blog_list" };
    case "category":
      return { content_group: "blog_category", content_id: second && decodeURIComponent(second) };
    case "paw-gpt":
      return { content_group: "paw_gpt" };
    case "pet-feed":
      return { content_group: "pet_feed" };
    case "logger":
      return { content_group: "food_logger" };
    case "walks":
      return { content_group: "walks" };
    case "consultation":
      return { content_group: "consultation" };
    case "dashboard":
      return { content_group: "dashboard" };
    case "goal":
      return { content_group: "goal" };
    default:
      return { content_group: "other" };
  }
}

/** Query parameters that are campaign tracking, kept on page_location so GA attributes the visit. */
const CAMPAIGN_PARAMS = /^(utm_[a-z]+|gclid|gbraid|wbraid|fbclid|msclkid)$/i;

/**
 * GA4 page view for the current page. GA reads the page from page_location; it is the clean URL
 * (path + campaign parameters only) so one page is one row in reports, not one per search or
 * share link. The home page is "/" even when the host renders it as "/index".
 */
export async function logPageView(title?: string) {
  try {
    const path = window.location.pathname === "/index" ? "/" : window.location.pathname;
    if (!isTrackedPath(path)) return;
    const a = await initAnalytics();
    if (!a) return;
    const campaign = new URLSearchParams(
      [...new URLSearchParams(window.location.search)].filter(([key]) => CAMPAIGN_PARAMS.test(key))
    ).toString();
    firebaseLogEvent(a, "page_view", {
      page_location: `${window.location.origin}${path}${campaign ? `?${campaign}` : ""}`,
      page_path: path,
      page_title: (title || document.title).slice(0, 100),
      ...pageGroup(path),
    });
  } catch {
    // Ignore — tracking is best effort
  }
}
