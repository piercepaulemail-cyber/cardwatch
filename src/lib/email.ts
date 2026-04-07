import nodemailer from "nodemailer";
import type { EbayResult } from "./ebay";

export async function sendCardAlertEmail(
  to: string,
  results: EbayResult[]
): Promise<void> {
  if (!results.length) return;

  const gmailAddr = process.env.GMAIL_ADDRESS;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const resendKey = process.env.RESEND_API_KEY;

  const subject = `CardWatch Alert: ${results.length} new listing${results.length !== 1 ? "s" : ""} found`;

  const rows = results
    .map(
      (r) => `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #E5E8ED;">
      <a href="${r.itemUrl}" style="color:#0B1D3A;font-weight:600;text-decoration:none;">${r.title}</a>
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid #E5E8ED;font-weight:700;color:#0B1D3A;">$${r.currentPrice.toFixed(2)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #E5E8ED;">${r.listingType === "Auction" ? "Auction" : "Buy Now"}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #E5E8ED;">${r.bidCount}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #E5E8ED;">${r.sellerName} (${r.sellerFeedback})</td>
    <td style="padding:10px 12px;border-bottom:1px solid #E5E8ED;">${r.matchedPlayer}</td>
  </tr>`
    )
    .join("");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FFFFFF;color:#0B1D3A;max-width:700px;margin:0 auto;">
    <div style="background:#0B1D3A;padding:20px 24px;">
      <h1 style="color:#FFFFFF;font-size:18px;margin:0;">CardWatch</h1>
    </div>
    <div style="padding:24px;">
      <h2 style="color:#0B1D3A;font-size:20px;margin:0 0 16px 0;">${results.length} new listing${results.length !== 1 ? "s" : ""} found</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="background:#F5F6F8;color:#6B7A8D;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
          <th style="padding:10px 12px;text-align:left;">Card</th>
          <th style="padding:10px 12px;text-align:left;">Price</th>
          <th style="padding:10px 12px;text-align:left;">Type</th>
          <th style="padding:10px 12px;text-align:left;">Bids</th>
          <th style="padding:10px 12px;text-align:left;">Seller</th>
          <th style="padding:10px 12px;text-align:left;">Match</th>
        </tr>
        ${rows}
      </table>
      <p style="color:#6B7A8D;font-size:12px;margin-top:24px;">Sent by <a href="https://mycardwatch.com" style="color:#0B1D3A;">CardWatch</a></p>
    </div>
  </div>`;

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

  // Fallback: Gmail SMTP via nodemailer
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
    console.warn("[Email] No email provider configured (set RESEND_API_KEY or GMAIL_ADDRESS + GMAIL_APP_PASSWORD)");
  }
}
