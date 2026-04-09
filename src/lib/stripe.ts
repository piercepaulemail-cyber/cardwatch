import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

export const SCAN_INTERVALS = [
  { label: "Every 1 min", minutes: 1, minTier: "elite" },
  { label: "Every 5 min", minutes: 5, minTier: "elite" },
  { label: "Every 15 min", minutes: 15, minTier: "elite" },
  { label: "Every 30 min", minutes: 30, minTier: "pro" },
  { label: "Every 45 min", minutes: 45, minTier: "pro" },
  { label: "Every hour", minutes: 60, minTier: "pro" },
  { label: "Every 2 hours", minutes: 120, minTier: "scout" },
  { label: "Every 6 hours", minutes: 360, minTier: "scout" },
  { label: "Every 12 hours", minutes: 720, minTier: "scout" },
  { label: "Daily", minutes: 1440, minTier: "scout" },
] as const;

export const TIER_RANK: Record<string, number> = {
  scout: 1,
  pro: 2,
  elite: 3,
};

export function canUseScanInterval(
  intervalMinutes: number,
  userTier: string
): boolean {
  const interval = SCAN_INTERVALS.find((i) => i.minutes === intervalMinutes);
  if (!interval) return false;
  return (TIER_RANK[userTier] || 0) >= (TIER_RANK[interval.minTier] || 0);
}

export const TIERS = {
  scout: {
    name: "Scout",
    price: 499,
    priceDisplay: "$4.99",
    interval: "month" as const,
    scanIntervalMinutes: 120,
    features: [
      "Scan up to every 2 hours",
      "Unlimited watchlist entries",
      "Email alerts",
      "Sortable results",
    ],
  },
  pro: {
    name: "Pro",
    price: 1499,
    priceDisplay: "$14.99",
    interval: "month" as const,
    scanIntervalMinutes: 30,
    features: [
      "Scan up to every 30 minutes",
      "Everything in Scout",
      "Priority scanning",
    ],
  },
  elite: {
    name: "Elite",
    price: 2999,
    priceDisplay: "$29.99",
    interval: "month" as const,
    scanIntervalMinutes: 15,
    features: [
      "Scan as fast as every 1 minute",
      "Everything in Pro",
      "PSA grade data (coming soon)",
      "Strong buy scoring (coming soon)",
    ],
  },
} as const;

export type TierKey = keyof typeof TIERS;
