"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface WatchlistEntry {
  id: string;
  playerName: string;
  cardDescription: string;
  maxPrice: number | null;
  minPrice: number | null;
  listingType: string | null;
  condition: string | null;
}

interface ScanResult {
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
  scanTimestamp: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("scanTimestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  const [playerName, setPlayerName] = useState("");
  const [cardDesc, setCardDesc] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [listingType, setListingType] = useState("all");
  const [condition, setCondition] = useState("ungraded");

  const loadResults = useCallback(async () => {
    const res = await fetch(
      `/api/results?sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page}`
    );
    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
      setTotalResults(data.total);
      setTotalPages(data.totalPages);
    }
  }, [sortBy, sortOrder, page]);

  const loadWatchlist = useCallback(async () => {
    const res = await fetch("/api/watchlist");
    if (res.ok) setWatchlist(await res.json());
  }, []);

  const [subChecked, setSubChecked] = useState(false);
  const [userTier, setUserTier] = useState("");
  const [currentInterval, setCurrentInterval] = useState(0);
  const [showIntervalConfirm, setShowIntervalConfirm] = useState(false);
  const [pendingInterval, setPendingInterval] = useState(0);
  const [pendingIntervalLabel, setPendingIntervalLabel] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Check subscription — redirect to pricing if none
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/subscription")
      .then((res) => res.json())
      .then((data) => {
        if (!data.active) {
          router.push("/pricing");
        } else {
          setSubChecked(true);
          setUserTier(data.tier);
          setCurrentInterval(data.scanIntervalMinutes);
        }
      });
  }, [session, router]);

  useEffect(() => {
    if (session?.user && subChecked) {
      loadWatchlist();
      loadResults();
    }
  }, [session, subChecked, loadWatchlist, loadResults]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!playerName.trim() || !cardDesc.trim()) return;
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName,
        cardDescription: cardDesc,
        maxPrice: maxPrice || null,
        minPrice: minPrice || null,
        listingType,
        condition,
      }),
    });
    setPlayerName("");
    setCardDesc("");
    setMaxPrice("");
    setMinPrice("");
    setListingType("all");
    setCondition("ungraded");
    loadWatchlist();
  }

  async function deleteEntry(id: string) {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadWatchlist();
  }

  async function dismissResult(id: string) {
    await fetch("/api/results", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setResults((prev) => prev.filter((r) => r.id !== id));
    setTotalResults((prev) => prev - 1);
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await fetch("/api/results", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setResults((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setTotalResults((prev) => prev - selectedIds.size);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)));
    }
  }

  async function triggerScan() {
    setScanning(true);
    setScanMessage("");
    const res = await fetch("/api/scan", { method: "POST" });
    const data = await res.json();
    setScanning(false);
    if (res.ok) {
      setScanMessage(
        `Found ${data.found} new listing${data.found !== 1 ? "s" : ""}`
      );
      loadResults();
    } else {
      setScanMessage(data.error || "Scan failed");
    }
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  }

  function SortIndicator({ column }: { column: string }) {
    if (sortBy !== column)
      return <span className="text-muted-foreground/30 ml-1">{"\u21C5"}</span>;
    return (
      <span className="text-navy ml-1">
        {sortOrder === "asc" ? "\u25B2" : "\u25BC"}
      </span>
    );
  }

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Nav */}
      <nav className="bg-navy px-6 py-3 flex justify-between items-center">
        <Link href="/" className="text-lg font-bold text-white tracking-tight">
          CardWatch
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/60 hidden sm:block">
            {session?.user?.email}
          </span>
          <button
            onClick={() => signOut()}
            className="text-white/60 hover:text-white text-sm transition"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-52px)]">
        {/* Left: Watchlist */}
        <aside className="w-full lg:w-80 bg-white border-r border-border flex-shrink-0">
          {/* Add form */}
          <div className="p-5 border-b border-border">
            <h2 className="text-sm font-bold text-navy uppercase tracking-wide mb-3">
              Add to Watchlist
            </h2>
            <form onSubmit={addEntry} className="space-y-3">
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Player name"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:border-navy focus:outline-none transition"
              />
              <input
                value={cardDesc}
                onChange={(e) => setCardDesc(e.target.value)}
                placeholder="Card description"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:border-navy focus:outline-none transition"
              />
              <input
                type="number"
                step="0.01"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max price (optional)"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:border-navy focus:outline-none transition"
              />
              <input
                type="number"
                step="0.01"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min price (optional)"
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm focus:border-navy focus:outline-none transition"
              />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Listing Type</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={listingType === "all" || listingType === "buyItNow"}
                    onChange={(e) => {
                      const auctionOn = listingType === "all" || listingType === "auction";
                      if (e.target.checked) {
                        setListingType(auctionOn ? "all" : "buyItNow");
                      } else {
                        setListingType(auctionOn ? "auction" : "all");
                      }
                    }}
                    className="w-4 h-4 rounded border-border accent-navy"
                  />
                  <span className="text-sm">Buy It Now</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={listingType === "all" || listingType === "auction"}
                    onChange={(e) => {
                      const binOn = listingType === "all" || listingType === "buyItNow";
                      if (e.target.checked) {
                        setListingType(binOn ? "all" : "auction");
                      } else {
                        setListingType(binOn ? "buyItNow" : "all");
                      }
                    }}
                    className="w-4 h-4 rounded border-border accent-navy"
                  />
                  <span className="text-sm">Auction</span>
                </label>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Condition</p>
                {[
                  { value: "ungraded", label: "Ungraded (Raw)" },
                  { value: "nearMint", label: "Near Mint or Better" },
                  { value: "excellent", label: "Excellent" },
                  { value: "graded", label: "Graded (PSA, BGS, SGC)" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="condition"
                      value={opt.value}
                      checked={condition === opt.value}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-4 h-4 accent-navy"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="w-full bg-navy text-white font-semibold py-2.5 rounded-lg hover:bg-navy-light transition text-sm"
              >
                + Add
              </button>
            </form>
          </div>

          {/* Entries */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-navy uppercase tracking-wide">
                Watchlist
              </h2>
              <span className="bg-navy text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {watchlist.length}
              </span>
            </div>
            {watchlist.length === 0 && (
              <p className="text-sm text-muted-foreground">No entries yet</p>
            )}
            <div className="space-y-2">
              {watchlist.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between bg-secondary rounded-lg p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy truncate">
                      {entry.playerName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.cardDescription}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {entry.minPrice && (
                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-medium">
                          Min: ${entry.minPrice}
                        </span>
                      )}
                      {entry.maxPrice && (
                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-medium">
                          Max: ${entry.maxPrice}
                        </span>
                      )}
                      {entry.listingType && entry.listingType !== "all" && (
                        <span className="text-[10px] bg-navy/10 px-1.5 py-0.5 rounded font-medium">
                          {entry.listingType === "buyItNow" ? "BIN Only" : "Auction Only"}
                        </span>
                      )}
                      {entry.condition && entry.condition !== "ungraded" && (
                        <span className="text-[10px] bg-navy/10 px-1.5 py-0.5 rounded font-medium">
                          {entry.condition === "nearMint" ? "Near Mint+" : entry.condition === "excellent" ? "Excellent" : "Graded"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-destructive ml-2 shrink-0 transition"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right: Results */}
        <main className="flex-1 p-5 overflow-auto">
          {/* Scan interval selector */}
          {userTier && (
            <div className="bg-white rounded-xl border border-border p-4 mb-5 shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Scan Frequency
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "15 min", minutes: 15, minTier: "elite" },
                  { label: "30 min", minutes: 30, minTier: "pro" },
                  { label: "45 min", minutes: 45, minTier: "pro" },
                  { label: "1 hour", minutes: 60, minTier: "pro" },
                  { label: "2 hours", minutes: 120, minTier: "scout" },
                  { label: "6 hours", minutes: 360, minTier: "scout" },
                  { label: "12 hours", minutes: 720, minTier: "scout" },
                  { label: "Daily", minutes: 1440, minTier: "scout" },
                ].map((opt) => {
                  const tierRank: Record<string, number> = { scout: 1, pro: 2, elite: 3 };
                  const locked = (tierRank[userTier] || 0) < (tierRank[opt.minTier] || 0);
                  const active = currentInterval === opt.minutes;
                  return (
                    <button
                      key={opt.minutes}
                      disabled={locked}
                      onClick={() => {
                        if (locked || active) return;
                        setPendingInterval(opt.minutes);
                        setPendingIntervalLabel(opt.label);
                        setShowIntervalConfirm(true);
                      }}
                      className={`relative px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                        active
                          ? "bg-navy text-white"
                          : locked
                            ? "bg-secondary text-muted-foreground/40 cursor-not-allowed"
                            : "bg-secondary text-navy hover:bg-navy hover:text-white"
                      }`}
                    >
                      {opt.label}
                      {locked && (
                        <span className="absolute -top-1.5 -right-1.5 bg-navy text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none">
                          {opt.minTier === "pro" ? "PRO" : "ELITE"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-navy">
                Recent Finds
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({totalResults})
                </span>
              </h2>
              {scanMessage && (
                <p className="text-sm text-navy font-medium mt-1">
                  {scanMessage}
                </p>
              )}
            </div>
            <button
              onClick={triggerScan}
              disabled={scanning}
              className="bg-navy text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-navy-light transition disabled:opacity-50"
            >
              {scanning ? "Scanning..." : "Scan Now"}
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={deleteSelected}
                className="bg-red-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-red-600 transition"
              >
                Delete {selectedIds.size} selected
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            {/* Sort bar + select all */}
            <div className="bg-navy px-4 py-3 flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-white text-xs">
                <input
                  type="checkbox"
                  checked={results.length > 0 && selectedIds.size === results.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-white rounded"
                />
                Select all
              </label>
              <span className="text-white/40 text-xs">|</span>
              <span className="text-white/60 text-xs">Sort by:</span>
              {[
                { key: "currentPrice", label: "Price" },
                { key: "listingType", label: "Type" },
                { key: "sellerFeedback", label: "Seller" },
                { key: "matchedPlayer", label: "Match" },
                { key: "listingStartTime", label: "Listed" },
              ].map((col) => (
                <button
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded transition ${
                    sortBy === col.key
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {col.label}
                  {sortBy === col.key && (
                    <span className="ml-1">{sortOrder === "asc" ? "\u25B2" : "\u25BC"}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="divide-y divide-border">
              {results.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  No results yet. Add players to your watchlist and run a scan.
                </div>
              )}
              {results.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 hover:bg-navy/[0.02] transition ${selectedIds.has(r.id) ? "bg-navy/5" : ""}`}
                >
                  <div className="flex gap-4">
                    {/* Checkbox */}
                    <div className="pt-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 accent-navy rounded"
                      />
                    </div>

                    {/* Image */}
                    {r.imageUrl && (
                      <a
                        href={r.itemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <img
                          src={r.imageUrl}
                          alt=""
                          className="w-32 h-32 object-contain rounded-lg border border-border bg-secondary"
                        />
                      </a>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <a
                          href={r.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy hover:text-navy/70 font-semibold transition text-sm leading-snug"
                        >
                          {r.title}
                        </a>
                        <button
                          onClick={() => dismissResult(r.id)}
                          className="text-muted-foreground/30 hover:text-destructive transition p-1 shrink-0"
                          title="Dismiss"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xl font-extrabold text-navy">
                          ${r.currentPrice.toFixed(2)}
                        </span>
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            r.listingType === "Auction"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-navy/10 text-navy"
                          }`}
                        >
                          {r.listingType === "Auction" ? "Auction" : "Buy Now"}
                        </span>
                        {r.bidCount > 0 && (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {r.bidCount} bid{r.bidCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          <span className="font-medium text-navy">{r.sellerName}</span>{" "}
                          ({r.sellerFeedback})
                        </span>
                        <span>Matched: <span className="font-medium text-navy">{r.matchedPlayer}</span></span>
                        <span>{timeAgo(r.listingStartTime)}</span>
                      </div>

                      <div className="mt-3">
                        <a
                          href={r.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-navy text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-navy-light transition"
                        >
                          View on eBay &rarr;
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="px-4 py-2 rounded-lg bg-white border border-border text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                className="px-4 py-2 rounded-lg bg-white border border-border text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Scan frequency confirmation modal */}
      {showIntervalConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-navy mb-2">
              Change scan frequency?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your scans will run <strong className="text-navy">{pendingIntervalLabel}</strong>.
              This takes effect immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowIntervalConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-navy hover:bg-secondary transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const res = await fetch("/api/subscription", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scanIntervalMinutes: pendingInterval }),
                  });
                  if (res.ok) setCurrentInterval(pendingInterval);
                  setShowIntervalConfirm(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-light transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
