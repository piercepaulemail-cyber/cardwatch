import nodemailer from "nodemailer";
import type { EbayResult } from "./ebay";

function buildEmailHtml(results: EbayResult[]): string {
  const cards = results
    .map(
      (r) => `
      <div style="background:#FFFFFF;border:1px solid #E5E8ED;border-radius:8px;padding:16px;margin-bottom:12px;">
        <a href="${r.itemUrl}" style="color:#0B1D3A;font-size:15px;font-weight:700;text-decoration:none;line-height:1.4;display:block;margin-bottom:12px;">${r.title}</a>
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
              <span style="color:#0B1D3A;font-weight:600;font-size:13px;">${r.sellerName}</span>
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
              <span style="color:#0B1D3A;font-weight:600;font-size:13px;">${r.matchedPlayer} — ${r.matchedDesc}</span>
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;">
          <a href="${r.itemUrl}" style="display:inline-block;background:#0B1D3A;color:#FFFFFF;padding:8px 20px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">View on eBay &rarr;</a>
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
  results: EbayResult[]
): Promise<void> {
  if (!results.length) return;

  const gmailAddr = process.env.GMAIL_ADDRESS;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const resendKey = process.env.RESEND_API_KEY;

  const subject = `CardWatch: ${results.length} new listing${results.length !== 1 ? "s" : ""} found`;
  const html = buildEmailHtml(results);

  // Try Resend first
  if (resendKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "CardWatch <alerts@mycardwatch.com>",
          to,
          subject,
          html,
        }),
      });
      if (resp.ok) {
        console.log(`[Email] Sent via Resend to ${to}`);
        return;
      }
      console.error("Resend failed:", await resp.text());
    } catch (e) {
      console.error("Resend error:", e);
    }
  }

  // Fallback: Gmail SMTP
  if (gmailAddr && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: gmailAddr,
          pass: gmailPass,
        },
      });

      await transporter.sendMail({
        from: `CardWatch <${gmailAddr}>`,
        to,
        subject,
        html,
      });

      console.log(`[Email] Sent via Gmail to ${to}`);
    } catch (e) {
      console.error("[Email] Gmail send failed:", e);
    }
  } else {
    console.warn("[Email] No email provider configured");
  }
}
