import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["state"],
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Account locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`
          );
        }

        // Check email verification (Google users are auto-verified)
        if (!user.emailVerified) {
          throw new Error("Please verify your email before signing in. Check your inbox.");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
          // Increment failed attempts
          const newAttempts = user.failedLoginAttempts + 1;
          const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
            failedLoginAttempts: newAttempts,
          };

          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            updateData.lockedUntil = new Date(
              Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
            );
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            throw new Error(
              `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`
            );
          }

          return null;
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
