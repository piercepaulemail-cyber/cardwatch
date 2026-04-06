import type { EbayResult } from "./ebay";

export async function sendCardAlertEmail(
  to: string,
  results: EbayResult[]
): Promise<void> {
  if (!results.length) return;

  const resendKey = process.env.RESEND_API_KEY;
  const gmailAddr = process.env.GMAIL_ADDRESS;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  const subject = `CardWatch Alert: ${results.length} new listing${results.length !== 1 ? "s" : ""} found`;

  const rows = results
    .map(
      (r) => `<tr>
    <td style="padding:8px;border-bottom:1px solid #333;">
      <a href="${r.itemUrl}" style="color:#58a6ff;">${r.title}</a>
    </td>
    <td style="padding:8px;border-bottom:1px solid #333;color:#3fb950;font-weight:600;">$${r.currentPrice.toFixed(2)}</td>
    <td style="padding:8px;border-bottom:1px solid #333;">${r.listingType}</td>
    <td style="padding:8px;border-bottom:1px solid #333;">${r.bidCount}</td>
    <td style="padding:8px;border-bottom:1px solid #333;">${r.sellerName} (${r.sellerFeedback})</td>
    <td style="padding:8px;border-bottom:1px solid #333;">${r.matchedPlayer}</td>
  </tr>`
    )
    .join("");

  const html = `<div style="font-family:sans-serif;background:#0f1117;color:#e1e4e8;padding:24px;">
    <h2 style="color:#58a6ff;">${subject}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="background:#161b22;color:#8b949e;font-size:12px;text-transform:uppercase;">
        <th style="padding:10px 8px;text-align:left;">Card</th>
        <th style="padding:10px 8px;text-align:left;">Price</th>
        <th style="padding:10px 8px;text-align:left;">Type</th>
        <th style="padding:10px 8px;text-align:left;">Bids</th>
        <th style="padding:10px 8px;text-align:left;">Seller</th>
        <th style="padding:10px 8px;text-align:left;">Match</th>
      </tr>
      ${rows}
    </table>
    <p style="color:#484f58;font-size:12px;margin-top:16px;">Sent by CardWatch</p>
  </div>`;

  // Try Resend first, fall back to Gmail SMTP via API route
  if (resendKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CardWatch <alerts@cardwatch.app>",
          to,
          subject,
          html,
        }),
      });
      if (resp.ok) return;
      console.error("Resend failed:", await resp.text());
    } catch (e) {
      console.error("Resend error:", e);
    }
  }

  // Fallback: Gmail SMTP via nodemailer-like approach
  if (gmailAddr && gmailPass) {
    try {
      // Use a simple SMTP approach via fetch to a self-hosted endpoint
      // For MVP, we'll log that email would be sent
      console.log(`[Email] Would send "${subject}" to ${to} via Gmail`);
      console.log(`[Email] ${results.length} cards found`);
    } catch (e) {
      console.error("Gmail error:", e);
    }
  }
}
