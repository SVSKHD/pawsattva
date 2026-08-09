"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";

// Extend Window to include instgrm
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

interface InstagramEmbedProps {
  url: string;
  className?: string;
}

/**
 * Renders a single Instagram embed. Loads the Instagram embed.js script
 * once globally and processes the blockquote on mount / url change.
 */
export function InstagramEmbed({ url, className = "" }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset load state when the embed URL changes
    setError(false);

    // Ensure Instagram embed.js is loaded exactly once
    if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
      const script = document.createElement("script");
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = () => {
        window.instgrm?.Embeds.process();
      };
    } else {
      // Script already loaded — just re-process
      setTimeout(() => {
        window.instgrm?.Embeds.process();
      }, 100);
    }
  }, [url]);

  if (error) {
    return (
      <div className={`instagram-embed-error ${className}`}>
        <p className="text-sm text-muted-foreground italic">
          Could not load Instagram post.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-orange-500">
            View on Instagram →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`instagram-embed-container flex justify-center my-10 w-full ${className}`}>
      {/* Force round corners on the iframe Instagram injects at runtime */}
      <style>{`
        .ig-embed-card iframe {
          border-radius: 0 0 1.5rem 1.5rem !important;
          overflow: hidden !important;
          display: block !important;
        }
        .ig-embed-card .instagram-media {
          border-radius: 0 !important;
          box-shadow: none !important;
          border: none !important;
          background: transparent !important;
        }
      `}</style>

      <div
        className="ig-embed-card relative w-full max-w-[560px] rounded-[1.75rem] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.62)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.45)",
          boxShadow:
            "0 8px 40px -8px rgba(234,88,12,0.12), 0 2px 8px -2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{ background: "linear-gradient(90deg, #ea580c 0%, #fb923c 100%)" }}
        />

        {/* Header row */}
        <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-black/5">
          {/* Instagram gradient icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-4 h-4 flex-shrink-0"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="ig-grad-embed" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f09433" />
                <stop offset="25%" stopColor="#e6683c" />
                <stop offset="50%" stopColor="#dc2743" />
                <stop offset="75%" stopColor="#cc2366" />
                <stop offset="100%" stopColor="#bc1888" />
              </linearGradient>
            </defs>
            <path
              fill="url(#ig-grad-embed)"
              d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
            />
          </svg>
          <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground/60 select-none">
            Instagram
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
          >
            View post ↗
          </a>
        </div>

        {/* Embed body — overflow:hidden keeps the iframe clipped to our border-radius */}
        <div className="w-full overflow-hidden">
          <blockquote
            className="instagram-media w-full"
            data-instgrm-captioned
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            style={{
              background: "transparent",
              border: 0,
              borderRadius: "0",
              boxShadow: "none",
              margin: "0px",
              maxWidth: "100%",
              minWidth: "280px",
              padding: 0,
              width: "100%",
            }}
          >
            <div style={{ padding: "16px" }}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#c9c8cd",
                  fontFamily: "Arial, sans-serif",
                  fontSize: "14px",
                  fontStyle: "normal",
                  fontWeight: "normal",
                  lineHeight: "17px",
                  textDecoration: "none",
                }}
              >
                View this post on Instagram
              </a>
            </div>
          </blockquote>
        </div>
      </div>
    </div>
  );
}


/**
 * Scans HTML content for Instagram URLs embedded as `[instagram:URL]` markers
 * or raw Instagram links, and replaces them with rendered embeds.
 */
interface BlogContentWithEmbedsProps {
  htmlContent: string;
  className?: string;
}

export function BlogContentWithEmbeds({ htmlContent, className = "" }: BlogContentWithEmbedsProps) {
  // Split content by Instagram markers and product recommendation markers.
  const embedMarkerRegex = /\[(instagram):(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^\]]+)\]|\[(product):(\{[^\]]+\})\]/g;
  
  const parts: { type: "html" | "instagram" | "product"; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = embedMarkerRegex.exec(htmlContent)) !== null) {
    // Push preceding HTML
    if (match.index > lastIndex) {
      parts.push({ type: "html", content: htmlContent.slice(lastIndex, match.index) });
    }
    parts.push({ type: match[1] === "instagram" ? "instagram" : "product", content: match[2] || match[4] });
    lastIndex = match.index + match[0].length;
  }

  // Push remaining HTML
  if (lastIndex < htmlContent.length) {
    parts.push({ type: "html", content: htmlContent.slice(lastIndex) });
  }

  // If no markers found, render plain HTML
  if (parts.length === 0 || (parts.length === 1 && parts[0].type === "html")) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return (
    <div className={className}>
      {parts.map((part, idx) =>
        part.type === "instagram" ? (
          <InstagramEmbed key={`ig-${idx}`} url={part.content} />
        ) : part.type === "product" ? (
          <ProductEmbed key={`product-${idx}`} raw={part.content} />
        ) : (
          <div
            key={`html-${idx}`}
            dangerouslySetInnerHTML={{ __html: part.content }}
          />
        )
      )}
    </div>
  );
}

function ProductEmbed({ raw }: { raw: string }) {
  let product: { title?: string; url?: string; price?: string; note?: string } = {};
  try {
    product = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!product.title || !product.url) return null;

  return (
    <aside className="my-8 overflow-hidden rounded-[1.5rem] border border-emerald-900/10 bg-white/65 p-5 shadow-xl shadow-emerald-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
        <ShoppingBag className="h-3.5 w-3.5" />
        Recommended Product
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-foreground">{product.title}</h3>
          {product.note && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{product.note}</p>}
          {product.price && <p className="mt-2 text-lg font-black text-emerald-700 dark:text-emerald-300">{product.price}</p>}
        </div>
        <a href={product.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800">
          View Product
        </a>
      </div>
    </aside>
  );
}
