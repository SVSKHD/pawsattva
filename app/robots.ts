import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/metadata";

// Private or account-only areas: nothing there for search engines or AI crawlers.
// (/paw-gpt stays crawlable so search engines can read its noindex.)
const PRIVATE = ["/admin", "/login", "/api/", "/dashboard", "/logger", "/goal/"];

/**
 * AI crawlers named explicitly, so their access is a clear choice rather than a default:
 * articles may be read and cited by assistants (ChatGPT, Claude, Perplexity, Gemini, …).
 * /llms.txt and /llms-full.txt give them the whole library in one request.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "Amazonbot",
  "DuckAssistBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
