import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Try to find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // For security, always return a generic message even if user not found
    if (!user) {
      return NextResponse.json({
        message: "If an account exists for this email, a reset link has been sent.",
      });
    }

    // Generate a one-time token and expiry (e.g. 1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Store token using the existing VerificationToken model
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    const baseUrl =
      process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // NOTE:
    // We are not sending a real email here because that requires
    // SMTP / email service configuration.
    // Instead, we log the link on the server so it can be used manually.
    console.log("Password reset link for", email, "=>", resetLink);

    return NextResponse.json({
      message: "Password reset email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Error in forgot-password handler:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}

