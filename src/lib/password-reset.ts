import crypto from "crypto";
import { prisma } from "./db";
import { sendEmail } from "./mailer";

const TOKEN_EXPIRY_HOURS = 1;

export async function createPasswordResetToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Delete any existing tokens for this email (reuse VerificationToken table with a prefix)
  await prisma.verificationToken.deleteMany({
    where: { email: { startsWith: `reset:${email}` } },
  });

  await prisma.verificationToken.create({
    data: { email: `reset:${email}`, token, expiresAt },
  });

  return token;
}

export async function verifyPasswordResetToken(
  token: string
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expiresAt < new Date()) {
    return null;
  }

  if (!record.email.startsWith("reset:")) {
    return null;
  }

  return record.email.replace("reset:", "");
}

export async function deletePasswordResetToken(token: string): Promise<void> {
  await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
}

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mycardwatch.com";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:0;">
    <div style="background:#0B1D3A;padding:24px;text-align:center;">
      <h1 style="color:#FFFFFF;font-size:22px;margin:0;">CardWatch</h1>
    </div>
    <div style="background:#FFFFFF;padding:32px 24px;text-align:center;">
      <h2 style="color:#0B1D3A;font-size:20px;margin:0 0 12px 0;">Reset your password</h2>
      <p style="color:#6B7A8D;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
        Click the button below to set a new password for your CardWatch account. This link expires in 1 hour.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#0B1D3A;color:#FFFFFF;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
        Reset Password
      </a>
      <p style="color:#6B7A8D;font-size:12px;margin-top:24px;">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
    </div>
  </div>
</body></html>`;

  try {
    await sendEmail({ to, subject: "Reset your CardWatch password", html });
    console.log(`[Password Reset] Email sent to ${to}`);
  } catch (e) {
    console.error("[Password Reset] Failed to send:", e);
  }
}
