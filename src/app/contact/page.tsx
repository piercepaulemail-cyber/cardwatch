"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/logo";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mailto = `mailto:hello@mycardwatch.com?subject=${encodeURIComponent(subject || "CardWatch Support")}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-navy px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Logo size={22} />
          CardWatch
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
          <Link href="/pricing" className="hover:text-white transition">
            Pricing
          </Link>
          <Link href="/contact" className="text-white font-medium">
            Support
          </Link>
          <Link href="/login" className="hover:text-white transition">
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="bg-white text-navy font-semibold px-5 py-2.5 rounded-full hover:bg-silver-light transition"
          >
            Get Started &rarr;
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16">
          {/* Left: Info */}
          <div>
            <h1 className="text-4xl font-extrabold text-navy tracking-tight mb-4">
              Get in touch
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              Have a question, feature request, or need help with your account?
              We&apos;d love to hear from you.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-navy">Email us</p>
                  <a href="mailto:hello@mycardwatch.com" className="text-muted-foreground hover:text-navy transition">
                    hello@mycardwatch.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-navy">Response time</p>
                  <p className="text-muted-foreground">We typically respond within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-navy">Quick answers</p>
                  <p className="text-muted-foreground">Try our chat widget in the bottom-right corner for instant help</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div>
            {sent ? (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-lg font-bold text-green-900 mb-2">Message ready!</h3>
                <p className="text-sm text-green-700 mb-4">
                  Your email app should have opened with the message pre-filled. Just hit send!
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="text-sm font-semibold text-green-700 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-navy block mb-1.5">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-navy block mb-1.5">Email</label>
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
                  <label className="text-sm font-medium text-navy block mb-1.5">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-navy block mb-1.5">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us more..."
                    rows={5}
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-border text-sm focus:border-navy focus:outline-none transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-navy text-white font-bold py-3 rounded-full hover:bg-navy-light transition text-sm"
                >
                  Send message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-navy-dark py-8 text-center">
        <p className="text-white/40 text-sm">
          &copy; 2026 CardWatch. Built for collectors.
        </p>
      </footer>
    </div>
  );
}
