import type { EbayResult } from "./ebay";
import { sendEmail } from "./mailer";

interface EmailResult extends EbayResult {
  marketUngraded?: number | null;
  marketPsa10?: number | null;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanTitleForSearch(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1FA00}-\u{1FA9F}\u{200D}\u{20E3}]/gu, "")
    .replace(/[-!()[\]|*~_]/g, " ")
    .replace(/\b(NM|EX|VG|MT|MINT|GEM|NEAR MINT|PACK FRESH|CLEAN|HOT|FIRE|LOOK|WOW|RARE|L@@K)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ").slice(0, 12).join(" ");
}

function safeUrl(url: string): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
  } catch { /* invalid URL */ }
  return "#";
}

function buildEmailHtml(results: EmailResult[]): string {
  const cards = results
    .map(
      (r) => `
      <div style="background:#FFFFFF;border:1px solid #E5E8ED;border-radius:8px;overflow:hidden;margin-bottom:12px;">
        ${r.imageUrl ? `<a href="${safeUrl(r.itemUrl)}"><img src="${safeUrl(r.imageUrl.replace(/s-l\d+\./, 's-l800.'))}" alt="" style="width:100%;max-height:200px;object-fit:contain;background:#F5F6F8;display:block;" /></a>` : ""}
        <div style="padding:16px;">
        <a href="${safeUrl(r.itemUrl)}" style="color:#0B1D3A;font-size:15px;font-weight:700;text-decoration:none;line-height:1.4;display:block;margin-bottom:12px;">${esc(r.title)}</a>
        <table style="width:100%;font-size:13px;color:#6B7A8D;" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;width:50%;">
              <span style="color:#6B7A8D;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Price</span><br/>
              <span style="color:#0B1D3A;font-size:18px;font-weight:800;">$${r.currentPrice.toFixed(2)}</span>
            </td>
            <td style="padding:4px 0;width:50%;">
              <span style="color:#6B7A8D;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Type</span><br/>
              <span style="display:inline-block;background:${r.listingType === "Auction" ? "#FEF3C7" : "#F0F4F8"};color:${r.listingType === "Auction" ? "#92400E" : "#0B1D3A"};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;margin-top:2px;">${r.listingType === "Auction" ? "Auction" : "Buy Now"}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0 4px 0;">
              <span style="color:#6B7A8D;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Seller</span><br/>
              <span style="color:#0B1D3A;font-weight:600;font-size:13px;">${esc(r.sellerName)}</span>
              <span style="color:#6B7A8D;font-size:12px;"> (${r.sellerFeedback})</span>
            </td>
            <td style="padding:8px 0 4px 0;">
              <span style="color:#6B7A8D;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Bids</span><br/>
              <span style="color:#0B1D3A;font-weight:600;font-size:13px;">${r.bidCount}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:8px 0 0 0;">
              <span style="color:#6B7A8D;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Matched</span><br/>
              <span style="color:#0B1D3A;font-weight:600;font-size:13px;">${esc(r.matchedPlayer)} — ${esc(r.matchedDesc)}</span>
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;padding:10px;background:#F5F6F8;border-radius:8px;">
          <span style="color:#6B7A8D;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Market Value</span>
          ${(r.marketUngraded || r.marketPsa10) ? `
          <table style="width:100%;margin-top:6px;" cellpadding="0" cellspacing="0">
            <tr>
              ${r.marketUngraded ? `<td style="padding:2px 8px 2px 0;"><span style="color:#6B7A8D;font-size:11px;">Raw:</span> <span style="color:#0B1D3A;font-weight:700;font-size:14px;">$${r.marketUngraded.toFixed(2)}</span></td>` : ""}
              ${r.marketPsa10 ? `<td style="padding:2px 0;"><span style="color:#6B7A8D;font-size:11px;">PSA 10:</span> <span style="color:#0B1D3A;font-weight:700;font-size:14px;">$${r.marketPsa10.toFixed(2)}</span></td>` : ""}
            </tr>
          </table>
          ` : `<p style="color:#9CA3AF;font-size:11px;margin:6px 0 0 0;">No market data available</p>`}
        </div>
        <div style="margin-top:12px;">
          <a href="${safeUrl(r.itemUrl)}" style="display:inline-block;background:#0B1D3A;color:#FFFFFF;padding:8px 20px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">View on eBay &rarr;</a>
          <a href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(cleanTitleForSearch(r.title))}&LH_Complete=1&LH_Sold=1&_sop=12&rt=nc" style="display:inline-block;background:#FFFFFF;color:#0B1D3A;padding:8px 20px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;border:2px solid #D4A847;margin-left:8px;">View eBay Comps &rarr;</a>
        </div>
        </div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:0;">
    <!-- Header -->
    <div style="background:#0B1D3A;padding:24px 24px 20px 24px;text-align:center;">
      <h1 style="color:#FFFFFF;font-size:22px;margin:0;letter-spacing:-0.5px;">CardWatch</h1>
    </div>

    <!-- Alert banner -->
    <div style="background:#0B1D3A;padding:0 24px 24px 24px;text-align:center;">
      <div style="background:rgba(255,255,255,0.1);border-radius:8px;padding:16px;">
        <p style="color:#FFFFFF;font-size:28px;font-weight:800;margin:0;">${results.length}</p>
        <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:4px 0 0 0;">new listing${results.length !== 1 ? "s" : ""} found</p>
      </div>
    </div>

    <!-- Cards -->
    <div style="padding:20px 16px;">
      ${cards}
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px 32px 24px;text-align:center;">
      <a href="https://mycardwatch.com/dashboard" style="display:inline-block;background:#0B1D3A;color:#FFFFFF;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">View All Results</a>
      <p style="color:#6B7A8D;font-size:11px;margin-top:20px;">
        You're receiving this because you have an active CardWatch subscription.<br/>
        <a href="https://mycardwatch.com/dashboard" style="color:#0B1D3A;">Manage your watchlist</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendCardAlertEmail(
  to: string,
  results: EmailResult[]
): Promise<void> {
  if (!results.length) return;

  const subject = `CardWatch: ${results.length} new listing${results.length !== 1 ? "s" : ""} found`;
  const html = buildEmailHtml(results);

  try {
    await sendEmail({ to, subject, html });
    console.log(`[Email] Alert sent to ${to}`);
  } catch (e) {
    console.error("[Email] Send failed:", e);
  }
}
