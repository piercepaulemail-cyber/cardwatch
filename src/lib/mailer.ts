import { Resend } from "resend";
import nodemailer from "nodemailer";

/**
 * Send a transactional email.
 * Prefers Resend (RESEND_API_KEY) over nodemailer (SMTP_USER + SMTP_PASS).
 * Logs a warning and does nothing if neither is configured.
 */
export async function sendEmail(params: {
  to: string;
  from?: string;
  subject: string;
  html: string;
}): Promise<void> {
  const { to, subject, html } = params;
  const from = params.from ?? "CardWatch <noreply@mycardwatch.com>";

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("[Mailer] Resend error:", error);
      throw new Error(error.message);
    }
    console.log(`[Mailer] Sent via Resend to ${to}`);
    return;
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT ?? "587");
    const smtpFrom = process.env.SMTP_FROM ?? smtpUser;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({ from: `CardWatch <${smtpFrom}>`, to, subject, html });
    console.log(`[Mailer] Sent via SMTP to ${to}`);
    return;
  }

  console.warn("[Mailer] No email transport configured (set RESEND_API_KEY or SMTP_USER+SMTP_PASS)");
}
