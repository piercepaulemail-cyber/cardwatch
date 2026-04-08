"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Tab = "profile" | "security" | "subscription" | "privacy" | "danger";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  // Subscription state
  const [subTier, setSubTier] = useState("");
  const [subStatus, setSubStatus] = useState("");
  const [subEnd, setSubEnd] = useState("");
  const [subInterval, setSubInterval] = useState(0);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user").then((r) => r.json()).then((data) => {
      setName(data.name || "");
      setEmail(data.email || "");
      setCreatedAt(data.createdAt || "");
      setHasPassword(data.hasPassword || false);
    });
    fetch("/api/subscription").then((r) => r.json()).then((data) => {
      if (data.active) {
        setSubTier(data.tier);
        setSubStatus(data.status);
        setSubEnd(data.currentPeriodEnd);
        setSubInterval(data.scanIntervalMinutes);
      }
    });
  }, [session]);

  async function saveProfile() {
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setProfileMsg("Profile updated!");
    setTimeout(() => setProfileMsg(""), 3000);
  }

  async function changePassword() {
    setPwMsg("");
    setPwError("");
    if (newPw !== confirmPw) {
      setPwError("Passwords don't match");
      return;
    }
    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg("Password updated!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwMsg(""), 3000);
    } else {
      setPwError(data.error || "Failed to update password");
    }
  }

  async function openBillingPortal() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    await fetch("/api/user", { method: "DELETE" });
    await signOut({ callbackUrl: "/" });
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { key: "security", label: "Security", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
    { key: "subscription", label: "Subscription", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
    { key: "privacy", label: "Privacy Policy", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { key: "danger", label: "Delete Account", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
  ];

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Nav */}
      <nav className="bg-navy px-6 py-3 flex justify-between items-center">
        <Link href="/dashboard" className="text-lg font-bold text-white tracking-tight">
          CardWatch
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-white/60 hover:text-white text-sm transition">
            &larr; Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-extrabold text-navy mb-8">Account Settings</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar tabs */}
          <div className="md:w-56 shrink-0">
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition text-left ${
                    tab === t.key
                      ? "bg-navy text-white"
                      : t.key === "danger"
                        ? "text-red-500 hover:bg-red-50"
                        : "text-navy hover:bg-secondary"
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-border p-6">

              {/* Profile Tab */}
              {tab === "profile" && (
                <div>
                  <h2 className="text-lg font-bold text-navy mb-5">Profile Information</h2>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="text-sm font-medium text-navy block mb-1.5">Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy block mb-1.5">Email</label>
                      <input
                        value={email}
                        disabled
                        className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm bg-secondary text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy block mb-1.5">Member since</label>
                      <p className="text-sm text-muted-foreground">
                        {createdAt ? new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <button
                      onClick={saveProfile}
                      className="bg-navy text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-navy-light transition"
                    >
                      Save changes
                    </button>
                    {profileMsg && (
                      <p className="text-sm text-green-600 font-medium">{profileMsg}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {tab === "security" && (
                <div>
                  <h2 className="text-lg font-bold text-navy mb-5">
                    {hasPassword ? "Change Password" : "Set Password"}
                  </h2>
                  <div className="space-y-4 max-w-md">
                    {hasPassword && (
                      <div>
                        <label className="text-sm font-medium text-navy block mb-1.5">Current password</label>
                        <input
                          type="password"
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-navy block mb-1.5">New password</label>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-navy block mb-1.5">Confirm new password</label>
                      <input
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                      />
                    </div>
                    {pwError && (
                      <p className="text-sm text-red-500 font-medium">{pwError}</p>
                    )}
                    {pwMsg && (
                      <p className="text-sm text-green-600 font-medium">{pwMsg}</p>
                    )}
                    <button
                      onClick={changePassword}
                      className="bg-navy text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-navy-light transition"
                    >
                      {hasPassword ? "Update password" : "Set password"}
                    </button>
                    {!hasPassword && (
                      <p className="text-xs text-muted-foreground">
                        You signed in with Google. Set a password to also sign in with email.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Subscription Tab */}
              {tab === "subscription" && (
                <div>
                  <h2 className="text-lg font-bold text-navy mb-5">Subscription</h2>
                  {subTier ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div className="bg-secondary rounded-xl p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Plan</p>
                          <p className="text-lg font-bold text-navy capitalize">{subTier}</p>
                        </div>
                        <div className="bg-secondary rounded-xl p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                          <p className={`text-lg font-bold capitalize ${subStatus === "active" || subStatus === "trialing" ? "text-green-600" : "text-red-500"}`}>
                            {subStatus}
                          </p>
                        </div>
                        <div className="bg-secondary rounded-xl p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Scan frequency</p>
                          <p className="text-lg font-bold text-navy">
                            {subInterval < 60 ? `${subInterval} min` : subInterval < 1440 ? `${subInterval / 60}h` : "Daily"}
                          </p>
                        </div>
                        <div className="bg-secondary rounded-xl p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Next billing</p>
                          <p className="text-sm font-bold text-navy">
                            {subEnd ? new Date(subEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={openBillingPortal}
                          className="bg-navy text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-navy-light transition"
                        >
                          Manage billing &rarr;
                        </button>
                        <Link
                          href="/pricing"
                          className="border-2 border-border text-navy font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-secondary transition"
                        >
                          Change plan
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Manage your payment method, view invoices, or cancel your subscription through the Stripe billing portal.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground mb-4">You don&apos;t have an active subscription.</p>
                      <Link
                        href="/pricing"
                        className="bg-navy text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-navy-light transition inline-block"
                      >
                        View plans &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Privacy Policy Tab */}
              {tab === "privacy" && (
                <div>
                  <h2 className="text-lg font-bold text-navy mb-5">Privacy Policy</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                    <p className="text-xs text-muted-foreground">Last updated: April 2026</p>

                    <h3 className="text-sm font-bold text-navy mt-6">1. Information We Collect</h3>
                    <p className="text-sm leading-relaxed">We collect information you provide when creating an account, including your name, email address, and payment information (processed securely through Stripe). We also collect data about your watchlist preferences and scan results to provide our service.</p>

                    <h3 className="text-sm font-bold text-navy mt-6">2. How We Use Your Information</h3>
                    <p className="text-sm leading-relaxed">Your information is used to provide and improve CardWatch services, including scanning eBay for card listings matching your watchlist, sending email notifications about new listings, processing subscription payments, and communicating important service updates.</p>

                    <h3 className="text-sm font-bold text-navy mt-6">3. Data Storage & Security</h3>
                    <p className="text-sm leading-relaxed">Your data is stored securely using industry-standard encryption. Passwords are hashed using bcrypt. Payment information is handled entirely by Stripe and is never stored on our servers. We use secure HTTPS connections for all data transmission.</p>

                    <h3 className="text-sm font-bold text-navy mt-6">4. Third-Party Services</h3>
                    <p className="text-sm leading-relaxed">We use the following third-party services: Stripe for payment processing, eBay APIs for card listing data, and email services for notifications. Each of these services has their own privacy policies governing their use of data.</p>

                    <h3 className="text-sm font-bold text-navy mt-6">5. Data Sharing</h3>
                    <p className="text-sm leading-relaxed">We do not sell, trade, or share your personal information with third parties for marketing purposes. Data is only shared with service providers necessary to operate CardWatch (payment processing, email delivery).</p>

                    <h3 className="text-sm font-bold text-navy mt-6">6. Cookies</h3>
                    <p className="text-sm leading-relaxed">We use essential cookies to maintain your login session and preferences. We do not use third-party tracking cookies or advertising cookies.</p>

                    <h3 className="text-sm font-bold text-navy mt-6">7. Your Rights</h3>
                    <p className="text-sm leading-relaxed">You have the right to access, update, or delete your personal information at any time through your account settings. You can delete your entire account and all associated data from the Account Settings page.</p>

                    <h3 className="text-sm font-bold text-navy mt-6">8. Data Retention</h3>
                    <p className="text-sm leading-relaxed">We retain your data for as long as your account is active. When you delete your account, all personal data, watchlist entries, and scan results are permanently removed from our systems.</p>

                    <h3 className="text-sm font-bold text-navy mt-6">9. Changes to This Policy</h3>
                    <p className="text-sm leading-relaxed">We may update this privacy policy from time to time. We will notify you of significant changes via email or through our service.</p>

                    <h3 className="text-sm font-bold text-navy mt-6">10. Contact</h3>
                    <p className="text-sm leading-relaxed">If you have questions about this privacy policy, contact us at <a href="mailto:hello@mycardwatch.com" className="text-navy font-medium underline">hello@mycardwatch.com</a>.</p>
                  </div>
                </div>
              )}

              {/* Delete Account Tab */}
              {tab === "danger" && (
                <div>
                  <h2 className="text-lg font-bold text-red-500 mb-2">Delete Account</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    This action is permanent and cannot be undone. All your data will be permanently deleted, including your watchlist, scan results, and subscription.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-5 max-w-md">
                    <p className="text-sm text-red-800 font-medium mb-3">
                      Type <strong>DELETE</strong> to confirm:
                    </p>
                    <input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full px-4 py-3 rounded-xl border-2 border-red-200 text-sm focus:border-red-500 focus:outline-none transition mb-3"
                    />
                    <button
                      onClick={deleteAccount}
                      disabled={deleteConfirm !== "DELETE" || deleting}
                      className="w-full bg-red-500 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? "Deleting..." : "Permanently delete my account"}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
