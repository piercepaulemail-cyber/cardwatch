"use client";

import { useEffect, useState, use, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo";

interface CardDetail {
  id: string;
  ebayItemId: string;
  title: string;
  currentPrice: number;
  listingType: string;
  bidCount: number;
  sellerName: string;
  sellerFeedback: number;
  itemUrl: string;
  imageUrl: string | null;
  listingStartTime: string;
  matchedPlayer: string;
  matchedDesc: string;
  conditionDescriptor: string | null;
  rawMin: number | null;
  rawMax: number | null;
  psa10Min: number | null;
  psa10Max: number | null;
  scanTimestamp: string;
  images: string[];
}

function hdImage(url: string | null): string {
  if (!url) return "";
  return url.replace(/s-l\d+\./, "s-l1600.");
}

function cleanTitleForSearch(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA9F}\u{200D}\u{20E3}]/gu, "")
    .replace(/[-!()[\]|*~_]/g, " ")
    .replace(/\b(NM|EX|VG|MT|MINT|GEM|NEAR MINT|PACK FRESH|CLEAN|HOT|FIRE|LOOK|WOW|RARE|L@@K)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ").slice(0, 12).join(" ");
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/results/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/dashboard");
          return;
        }
        setCard(data);
        setLoading(false);
      });
  }, [session, id, router]);

  async function handleDismiss() {
    await fetch("/api/results", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.push("/dashboard");
  }

  if (loading || !card) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-navy px-6 py-3 flex justify-between items-center">
        <Link
          href="/dashboard"
          className="text-lg font-bold text-white tracking-tight flex items-center gap-2"
        >
          <Logo size={22} />
          CardWatch
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-navy transition mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to results
        </button>

        {/* Image gallery */}
        {card.images && card.images.length > 0 && (
          <div className="mb-6">
            {/* Main image */}
            <div
              className="relative rounded-xl overflow-hidden border border-border bg-secondary"
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null || card.images.length <= 1) return;
                const delta = e.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(delta) < 50) return;
                if (delta < 0) {
                  setImgIndex((prev) => (prev === card.images.length - 1 ? 0 : prev + 1));
                } else {
                  setImgIndex((prev) => (prev === 0 ? card.images.length - 1 : prev - 1));
                }
              }}
            >
              <img
                src={card.images[imgIndex]}
                alt=""
                className="w-full max-h-[500px] object-contain transition-opacity duration-200"
              />
              {/* Navigation arrows */}
              {card.images.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIndex((prev) => (prev === 0 ? card.images.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition"
                  >
                    <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={() => setImgIndex((prev) => (prev === card.images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition"
                  >
                    <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {card.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className={`w-2 h-2 rounded-full transition ${i === imgIndex ? "bg-navy" : "bg-white/60"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Thumbnail strip */}
            {card.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {card.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${i === imgIndex ? "border-gold" : "border-border"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl font-bold text-navy leading-snug mb-4">
          {card.title}
        </h1>

        {/* Price + Type + Condition */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
              Price
            </p>
            <p className="text-3xl font-extrabold text-navy">
              ${card.currentPrice.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
              Type
            </p>
            <span
              className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold ${
                card.listingType === "Auction"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green/10 text-green"
              }`}
            >
              {card.listingType === "Auction" ? "Auction" : "Buy Now"}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
              Condition
            </p>
            <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-gold/10 text-gold">
              {card.conditionDescriptor || "Ungraded"}
            </span>
          </div>
        </div>

        {/* Market Values */}
        <div className="bg-navy/[0.03] rounded-xl p-4 mb-5 border border-border">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3 font-semibold">
            Market Value
          </p>
          {(card.rawMin || card.psa10Min) ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {card.rawMin != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Raw</p>
                    <p className="text-lg font-extrabold text-navy">
                      ${card.rawMin.toFixed(2)}
                    </p>
                  </div>
                )}
                {card.psa10Min != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">PSA 10</p>
                    <p className="text-lg font-extrabold text-navy">
                      ${card.psa10Min.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              {card.rawMin != null && card.currentPrice > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  {(() => {
                    const pct = Math.round((card.currentPrice / card.rawMin) * 100);
                    return (
                      <p className="text-xs text-muted-foreground">
                        Listed at{" "}
                        <span
                          className={`font-bold ${
                            pct <= 75 ? "text-green" : pct <= 100 ? "text-gold" : "text-red-500"
                          }`}
                        >
                          {pct}% of market value
                        </span>
                      </p>
                    );
                  })()}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No market data available</p>
          )}
          <p className="text-[9px] text-muted-foreground/50 mt-2">
            Data via SportsCardsPro
          </p>
        </div>

        {/* Seller + Bids + Listed */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
              Seller
            </p>
            <p className="text-sm font-semibold text-navy">{card.sellerName}</p>
            <p className="text-xs text-muted-foreground">
              ({card.sellerFeedback})
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
              Bids
            </p>
            <p className="text-sm font-semibold text-navy">{card.bidCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
              Listed
            </p>
            <p className="text-sm font-semibold text-navy">
              {timeAgo(card.listingStartTime)}
            </p>
          </div>
        </div>

        {/* Matched */}
        <div className="mb-6">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
            Matched
          </p>
          <p className="text-sm font-semibold text-navy">
            {card.matchedPlayer} — {card.matchedDesc}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <a
            href={card.itemUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green text-white font-bold px-6 py-3 rounded-xl hover:bg-green-light transition text-sm flex-1 text-center"
          >
            View on eBay &rarr;
          </a>
          <a
            href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cleanTitleForSearch(card.title))}&LH_Complete=1&LH_Sold=1&_sop=12&rt=nc`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-navy font-bold px-6 py-3 rounded-xl border-2 border-gold hover:bg-gold/10 transition text-sm flex-1 text-center"
          >
            Recent Comps &rarr;
          </a>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full text-sm text-muted-foreground hover:text-destructive transition py-2"
        >
          Dismiss this listing
        </button>
      </div>
    </div>
  );
}
