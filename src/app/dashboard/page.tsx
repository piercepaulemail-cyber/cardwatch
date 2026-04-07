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
      }),
    });
    setPlayerName("");
    setCardDesc("");
    setMaxPrice("");
    setMinPrice("");
    setListingType("all");
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
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    {[
                      { key: "title", label: "Card" },
                      { key: "currentPrice", label: "Price" },
                      { key: "listingType", label: "Type" },
                      { key: "bidCount", label: "Bids" },
                      { key: "sellerFeedback", label: "Seller" },
                      { key: "matchedPlayer", label: "Match" },
                      { key: "listingStartTime", label: "Listed" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:bg-navy-light transition"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                        <SortIndicator column={col.key} />
                      </th>
                    ))}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-16 text-muted-foreground"
                      >
                        No results yet. Add players to your watchlist and run a
                        scan.
                      </td>
                    </tr>
                  )}
                  {results.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`border-b border-border hover:bg-navy/5 transition ${
                        i % 2 === 0 ? "bg-white" : "bg-secondary/50"
                      }`}
                    >
                      <td className="px-4 py-3 max-w-[250px]">
                        <a
                          href={r.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy hover:text-navy/70 font-medium line-clamp-2 transition"
                        >
                          {r.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-navy font-bold whitespace-nowrap">
                        ${r.currentPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            r.listingType === "Auction"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-navy/10 text-navy"
                          }`}
                        >
                          {r.listingType === "Auction" ? "Auction" : "Buy Now"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.bidCount}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{r.sellerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.sellerFeedback} feedback
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {r.matchedPlayer}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(r.listingStartTime)}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => dismissResult(r.id)}
                          className="text-muted-foreground/40 hover:text-destructive transition p-1"
                          title="Dismiss"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  );
}
