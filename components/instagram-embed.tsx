"use client";

import React, { useEffect, useRef, useState } from "react";

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

  // Normalise the URL to the /embed/ variant
  const embedUrl = url.replace(/\/$/, "").replace(/\/embed\/?$/, "") + "/embed/";

  useEffect(() => {
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
          Could not load Instagram post. <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-orange-500">View on Instagram →</a>
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`instagram-embed-container ${className}`}>
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: "12px",
          boxShadow: "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)",
          margin: "1rem auto",
          maxWidth: "540px",
          minWidth: "326px",
          padding: 0,
          width: "calc(100% - 2px)",
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
  // Split content by Instagram markers [instagram:URL]
  const instagramMarkerRegex = /\[instagram:(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^\]]+)\]/g;
  
  const parts: { type: "html" | "instagram"; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = instagramMarkerRegex.exec(htmlContent)) !== null) {
    // Push preceding HTML
    if (match.index > lastIndex) {
      parts.push({ type: "html", content: htmlContent.slice(lastIndex, match.index) });
    }
    // Push Instagram embed
    parts.push({ type: "instagram", content: match[1] });
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
