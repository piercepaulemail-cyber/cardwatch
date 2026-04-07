import crypto from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "./db";

const TOKEN_EXPIRY_HOURS = 24;

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({ where: { email } });

  await prisma.verificationToken.create({
    data: { email, token, expiresAt },
  });

  return token;
}

export async function verifyToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt < new Date()) {
    return null;
  }

  // Mark user as verified
  await prisma.user.updateMany({
    where: { email: record.email },
    data: { emailVerified: new Date() },
  });

  // Delete the token
  await prisma.verificationToken.delete({ where: { id: record.id } });

  return record.email;
}

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mycardwatch.com";
  const verifyUrl = `${appUrl}/api/auth/verify?token=${token}`;

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpUser || !smtpPass) {
    console.warn("[Verification] No SMTP credentials — skipping email");
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:0;">
    <div style="background:#0B1D3A;padding:24px;text-align:center;">
      <h1 style="color:#FFFFFF;font-size:22px;margin:0;">CardWatch</h1>
    </div>
    <div style="background:#FFFFFF;padding:32px 24px;text-align:center;">
      <h2 style="color:#0B1D3A;font-size:20px;margin:0 0 12px 0;">Verify your email</h2>
      <p style="color:#6B7A8D;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Click the button below to verify your email address and activate your CardWatch account.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#0B1D3A;color:#FFFFFF;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
        Verify Email
      </a>
      <p style="color:#6B7A8D;font-size:12px;margin-top:24px;">
        This link expires in 24 hours. If you didn't create a CardWatch account, you can ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `CardWatch <${smtpFrom}>`,
      to,
      subject: "Verify your CardWatch email",
      html,
    });

    console.log(`[Verification] Email sent to ${to}`);
  } catch (e) {
    console.error("[Verification] Failed to send:", e);
  }
}
