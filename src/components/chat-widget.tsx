"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "bot" | "user";
  text: string;
}

const FAQ: { keywords: string[]; response: string }[] = [
  {
    keywords: ["what", "cardwatch", "does", "about", "do"],
    response:
      "CardWatch monitors eBay 24/7 for newly listed raw and ungraded sports cards. You build a watchlist of players and card types, and we alert you the moment matching cards are listed — so you can grab deals before anyone else.",
  },
  {
    keywords: ["price", "cost", "how much", "pricing", "plan", "plans", "subscription", "subscribe", "pay"],
    response:
      "We have 3 plans:\n\n• Scout — $4.99/mo: 25 watchlist entries, scan every 2h, 6h, 12h, or daily\n• Pro — $14.99/mo: 100 watchlist entries, scan every 30m, 45m, 1h, plus Scout options\n• Elite — $29.99/mo: Unlimited watchlist entries, scan as fast as every 15 minutes\n\nAll plans include email alerts, price check, and a 7-day free trial!",
  },
  {
    keywords: ["scout"],
    response:
      "The Scout plan is $4.99/mo. You get 25 watchlist entries and can scan every 2 hours, 6 hours, 12 hours, or daily. Includes email alerts and sortable results. Great for casual collectors!",
  },
  {
    keywords: ["pro"],
    response:
      "The Pro plan is $14.99/mo. You can scan as often as every 30 minutes, plus every 45min, 1h, 2h, 6h, 12h, or daily. Includes everything in Scout with priority scanning. Perfect for active collectors!",
  },
  {
    keywords: ["elite"],
    response:
      "The Elite plan is $29.99/mo. You get access to every scan interval including every 15 minutes — the fastest available. Includes everything in Pro, plus upcoming features like PSA grade data and strong buy scoring. Built for serious collectors and flippers!",
  },
  {
    keywords: ["trial", "free"],
    response:
      "Yes! All plans come with a 7-day free trial. You won't be charged until the trial ends, and you can cancel anytime. Pick any plan to get started!",
  },
  {
    keywords: ["scan", "how often", "frequency", "fast", "speed", "interval"],
    response:
      "You choose your scan frequency from the dashboard! Options range from every 15 minutes to once daily, depending on your plan:\n\n• Scout: 2h, 6h, 12h, daily\n• Pro: 30m, 45m, 1h + Scout options\n• Elite: 15m + all options\n\nElite users also get the 'Scan Now' button for instant on-demand scans.",
  },
  {
    keywords: ["cancel", "refund", "unsubscribe"],
    response:
      "You can cancel your subscription anytime — no cancellation fees, no hassles. Your access continues until the end of your current billing period.",
  },
  {
    keywords: ["watchlist", "add", "player", "how do i", "search"],
    response:
      "From your dashboard, use the form on the left side to add players. Enter the player name, card description, and optionally set min/max price filters. You can also choose to see only Buy It Now listings, only Auctions, or both!",
  },
  {
    keywords: ["email", "notification", "alert", "notify"],
    response:
      "When new cards matching your watchlist are found, we automatically send you an email alert with all the details — card title, price, seller info, and a direct link to view it on eBay.",
  },
  {
    keywords: ["ebay", "listing", "buy", "purchase"],
    response:
      "CardWatch monitors eBay for newly listed raw/ungraded sports cards. When you find a card you want, just click the link in your dashboard or email to go straight to the eBay listing and buy it.",
  },
  {
    keywords: ["filter", "sort", "type", "auction", "buy it now", "bin"],
    response:
      "You can filter your watchlist entries by Buy It Now or Auction listings, set minimum and maximum prices, and sort your results by price, bids, seller rating, listing type, and more — all from the dashboard.",
  },
  {
    keywords: ["account", "login", "sign", "register", "signup"],
    response:
      "Sign in with Google or create an account with email and password at mycardwatch.com/login. After signing up, pick a plan to start your 7-day free trial!",
  },
  {
    keywords: ["contact", "support", "help", "email us", "reach", "question"],
    response:
      "For support, email us at hello@mycardwatch.com — we typically respond within 24 hours!",
  },
  {
    keywords: ["graded", "psa", "bgs", "sgc", "grade"],
    response:
      "CardWatch currently focuses on raw/ungraded cards. PSA grade data and strong buy scoring features are coming soon for Elite tier subscribers — stay tuned!",
  },
  {
    keywords: ["safe", "secure", "privacy", "data"],
    response:
      "Your data is secure. We use industry-standard encryption and never share your personal information with third parties. Payments are processed securely through Stripe.",
  },
  {
    keywords: ["upgrade", "change plan", "switch", "downgrade"],
    response:
      "You can upgrade or downgrade your plan anytime. Changes take effect immediately — upgrading gives you instant access to faster scan intervals!",
  },
  {
    keywords: ["raw", "ungraded", "condition"],
    response:
      "CardWatch specifically monitors for raw (ungraded) cards. We filter eBay listings to only show ungraded condition cards, so you don't have to sift through graded or slabbed listings.",
  },
  {
    keywords: ["sport", "football", "basketball", "baseball", "hockey"],
    response:
      "CardWatch works for all sports! Football, basketball, baseball, hockey — any sports trading card listed on eBay. Just add the player name and card description to your watchlist.",
  },
  {
    keywords: ["remove", "delete", "dismiss"],
    response:
      "You can remove results from your Recent Finds by clicking the X button on any listing. You can also remove players from your watchlist by clicking the X next to their name.",
  },
];

const FALLBACK =
  "I'm not sure about that one! For more help, email us at hello@mycardwatch.com or check out our pricing page.";

const SUGGESTIONS = [
  "What does CardWatch do?",
  "How much does it cost?",
  "How do I add players?",
  "How often does it scan?",
];

function matchFaq(input: string): string {
  const lower = input.toLowerCase();
  let bestMatch = { score: 0, response: FALLBACK };

  for (const faq of FAQ) {
    let score = 0;
    for (const keyword of faq.keywords) {
      if (lower.includes(keyword)) score++;
    }
    if (score > bestMatch.score) {
      bestMatch = { score, response: faq.response };
    }
  }

  return bestMatch.response;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi! I'm the CardWatch assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg: Message = { role: "user", text: msg };
    const botMsg: Message = { role: "bot", text: matchFaq(msg) };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    setShowSuggestions(false);
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[360px] bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
          style={{
            zIndex: 9999,
            maxHeight: "min(480px, calc(100vh - 120px))",
            animation: "chatOpen 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div className="bg-navy px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-white font-semibold text-sm">
                CardWatch Support
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white transition"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "bot"
                      ? "bg-white text-navy rounded-2xl rounded-tl-md border border-border"
                      : "bg-navy text-white rounded-2xl rounded-tr-md"
                  }`}
                >
                  {msg.text.split("\n").map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < msg.text.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Suggestions */}
            {showSuggestions && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="bg-white border border-border text-navy text-xs font-medium px-3 py-1.5 rounded-full hover:bg-navy hover:text-white transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:border-navy focus:outline-none transition"
              />
              <button
                type="submit"
                className="bg-navy text-white px-3 py-2 rounded-lg hover:bg-navy-light transition shrink-0"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:right-6 w-14 h-14 bg-navy text-white rounded-full shadow-lg hover:bg-navy-light transition flex items-center justify-center"
        style={{ zIndex: 9999 }}
        aria-label="Open chat"
      >
        {open ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Animation keyframe */}
      <style jsx global>{`
        @keyframes chatOpen {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}
