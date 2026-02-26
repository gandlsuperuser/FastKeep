import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
// EmailProvider temporarily removed - requires nodemailer or Resend configuration
// import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/db/prisma";
import { compare, hash } from "bcryptjs";
import { UserRole } from "@prisma/client";

// Validate required environment variables (log warnings instead of throwing)
if (!process.env.NEXTAUTH_SECRET) {
  console.error("⚠️  NEXTAUTH_SECRET is not set. Authentication will not work.");
  console.error("Please set NEXTAUTH_SECRET in your environment variables.");
  console.error("Generate one with: openssl rand -base64 32");
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === "production") {
  console.warn("⚠️  NEXTAUTH_URL is not set. This may cause issues in production.");
  console.warn("Please set NEXTAUTH_URL to your production URL (e.g., https://fast-keep.vercel.app)");
}

// Build providers array conditionally
const providers: any[] = [
  // Email/Password Provider
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      const email = credentials.email as string;
      const password = credentials.password as string;
      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });

      if (!user || !user.password) {
        throw new Error("Invalid email or password");
      }

      const isPasswordValid = await compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      };
    },
  }),
];

// Only add OAuth providers if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

// Only use PrismaAdapter if we have a valid database connection
let adapter: any = undefined;
try {
  adapter = PrismaAdapter(prisma) as any;
} catch (error) {
  console.warn("Failed to initialize PrismaAdapter:", error);
  // Adapter is optional for JWT strategy
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(adapter && { adapter }),
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }

      // Fetch fresh user data on each request
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            include: { organization: true },
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.organizationId = dbUser.organizationId;
          }
        } catch (error) {
          console.error("Error fetching user in JWT callback:", error);
          // Return existing token if database query fails
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.organizationId = token.organizationId as string | null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
});

// Password hashing utility
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

// Password comparison utility
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}


