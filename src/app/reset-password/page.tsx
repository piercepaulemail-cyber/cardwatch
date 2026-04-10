"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
    } else {
      setError(data.error || "Failed to reset password");
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-navy flex flex-col">
        <nav className="px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Logo size={22} />
            CardWatch
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-navy mb-4">Invalid link</h2>
            <p className="text-muted-foreground mb-6">This password reset link is invalid or has expired.</p>
            <Link href="/login" className="text-navy font-semibold hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-navy flex flex-col">
        <nav className="px-6 py-4">
          <Link href="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Logo size={22} />
            CardWatch
          </Link>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4 pb-16">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-navy mb-2">Password reset!</h2>
            <p className="text-muted-foreground mb-6">Your password has been updated. You can now sign in.</p>
            <Link
              href="/login"
              className="inline-block bg-navy text-white font-bold py-3 px-8 rounded-full hover:bg-navy-light transition text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <nav className="px-6 py-4">
        <Link href="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Logo size={22} />
          CardWatch
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-extrabold text-navy text-center mb-1">
            Set new password
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter your new password below
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-navy block mb-1">
                New password
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
            <div>
              <label className="text-sm font-medium text-navy block mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
              />
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm font-medium px-4 py-2 rounded-xl">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white font-bold py-3 rounded-full hover:bg-navy-light transition text-sm"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
