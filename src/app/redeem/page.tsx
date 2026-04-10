"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo";

export default function RedeemPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);

    // If not signed in, create account first
    if (!session) {
      if (!email.trim() || !password) {
        setError("Email and password are required");
        setLoading(false);
        return;
      }

      // Register with auto-verify (invite-specific endpoint)
      const regRes = await fetch("/api/invites/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, code: code.trim() }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        setError(regData.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Sign in immediately (email is already verified)
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        setError("Account created. Please sign in and come back to redeem.");
        setLoading(false);
        return;
      }
    }

    // Redeem the code
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
                  {session ? "Redeem your invite code" : "Join CardWatch"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {session
                    ? "Enter the code you received to activate your free access"
                    : "Create your account and enter your invite code"}
                </p>
              </div>

              {session && (
                <div className="bg-green/5 rounded-xl p-3 mb-4 text-center">
                  <p className="text-sm text-green font-medium">
                    Signed in as {session.user?.email}
                  </p>
                </div>
              )}

              <form onSubmit={handleRedeem} className="space-y-4">
                {!session && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-navy block mb-1">
                        Name
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy block mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy block mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        minLength={8}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                      />
                    </div>
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-border"></div>
                      <span className="text-xs text-muted-foreground">
                        Invite Code
                      </span>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>
                  </>
                )}

                <div>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="BETA-XXXXXX"
                    className="w-full px-4 py-4 rounded-xl border-2 border-gold/50 text-center text-lg font-bold tracking-widest focus:border-gold focus:outline-none transition bg-gold/5"
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
                  disabled={loading || !code.trim()}
                  className="w-full bg-green text-white font-bold py-3 rounded-full hover:bg-green-light transition text-sm disabled:opacity-50"
                >
                  {loading
                    ? "Activating..."
                    : session
                      ? "Activate Access"
                      : "Create Account & Activate"}
                </button>
              </form>

              {!session && (
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-navy font-semibold hover:underline"
                  >
                    Sign in
                  </Link>
                  , then come back here to redeem.
                </p>
              )}

              <p className="text-center text-xs text-muted-foreground mt-4">
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
