"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo";

export default function RedeemPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    if (!session) {
      router.push("/login");
      return;
    }

    setError("");
    setLoading(true);

    const res = await fetch("/api/invites/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } else {
      setError(data.error || "Failed to redeem code");
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="bg-navy px-6 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-xl font-bold text-white tracking-tight flex items-center gap-2"
        >
          <Logo size={22} />
          CardWatch
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          {success ? (
            <div className="bg-white rounded-2xl shadow-2xl border border-border p-8 text-center">
              <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg
                  className="w-8 h-8 text-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-navy mb-2">
                You&apos;re in!
              </h2>
              <p className="text-muted-foreground mb-4">
                Your Elite access has been activated. Redirecting to your
                dashboard...
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl border border-border p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-gold/10 rounded-full px-4 py-1.5 mb-4">
                  <span className="text-sm font-semibold text-gold">
                    Invite Only
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-navy mb-1">
                  Redeem your invite code
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter the code you received to activate your free access
                </p>
              </div>

              {!session && (
                <div className="bg-navy/5 rounded-xl p-4 mb-6 text-center">
                  <p className="text-sm text-navy font-medium mb-2">
                    You need to sign in first
                  </p>
                  <Link
                    href="/login"
                    className="inline-block bg-navy text-white font-semibold px-6 py-2 rounded-full text-sm hover:bg-navy-light transition"
                  >
                    Sign in or create account
                  </Link>
                </div>
              )}

              <form onSubmit={handleRedeem} className="space-y-4">
                <div>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="BETA-XXXXXX"
                    className="w-full px-4 py-4 rounded-xl border-2 border-border text-center text-lg font-bold tracking-widest focus:border-gold focus:outline-none transition"
                    maxLength={20}
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm font-medium px-4 py-2 rounded-xl text-center">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || !session || !code.trim()}
                  className="w-full bg-green text-white font-bold py-3 rounded-full hover:bg-green-light transition text-sm disabled:opacity-50"
                >
                  {loading ? "Redeeming..." : "Activate Access"}
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Don&apos;t have a code?{" "}
                <Link
                  href="/pricing"
                  className="text-navy font-semibold hover:underline"
                >
                  View pricing plans
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
