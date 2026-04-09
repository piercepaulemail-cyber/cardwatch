import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 email changes per user per hour
  const { allowed } = await rateLimit(`email-change:${session.user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { newEmail } = await request.json();
  const trimmed = String(newEmail).trim().toLowerCase();

  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Check if email is already taken
  const existing = await prisma.user.findUnique({ where: { email: trimmed } });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: "This email is already in use" }, { status: 409 });
  }

  if (existing && existing.id === session.user.id) {
    return NextResponse.json({ error: "This is already your email" }, { status: 400 });
  }

  // Create a verification token for the new email
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { email: trimmed } });
  await prisma.verificationToken.create({
    data: { email: trimmed, token, expiresAt },
  });

  // Store the pending email change on the token (encode userId + newEmail in the token lookup)
  // We'll use a convention: email field stores "change:<userId>:<newEmail>"
  await prisma.verificationToken.update({
    where: { token },
    data: { email: `change:${session.user.id}:${trimmed}` },
  });

  // Send verification email to the NEW address
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mycardwatch.com";
  const verifyUrl = `${appUrl}/api/user/email/verify?token=${token}`;

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `CardWatch <${smtpFrom}>`,
        to: trimmed,
        subject: "Verify your new CardWatch email",
        html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F5F6F8;font-family:-apple-system,sans-serif;">
  <div style="max-width:500px;margin:0 auto;">
    <div style="background:#0B1D3A;padding:24px;text-align:center;">
      <h1 style="color:#FFF;font-size:22px;margin:0;">CardWatch</h1>
    </div>
    <div style="background:#FFF;padding:32px 24px;text-align:center;">
      <h2 style="color:#0B1D3A;font-size:20px;margin:0 0 12px;">Confirm your new email</h2>
      <p style="color:#6B7A8D;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Click the button below to confirm changing your CardWatch email to <strong>${trimmed}</strong>.
      </p>
      <a href="${verifyUrl}" style="display:inline-block;background:#0B1D3A;color:#FFF;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">
        Confirm Email Change
      </a>
      <p style="color:#6B7A8D;font-size:12px;margin-top:24px;">This link expires in 24 hours. If you didn't request this change, ignore this email.</p>
    </div>
  </div>
</body></html>`,
      });
    } catch (e) {
      console.error("[Email Change] Send failed:", e);
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
