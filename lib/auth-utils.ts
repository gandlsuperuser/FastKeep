import { getToken } from "next-auth/jwt";
import { headers } from "next/headers";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";

// TODO: Set this to false in production! This is only for testing
const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

/**
 * Get the current user on the server
 * Works in both API routes and server components
 */
export async function getCurrentUser(request?: Request) {
  // Temporarily disable auth for testing - return mock user with real organization
  if (DISABLE_AUTH) {
    try {
      // Get a real organization from the database
      const org = await prisma.organization.findFirst();
      if (org) {
        return {
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
          role: UserRole.ADMIN,
          organizationId: org.id,
        };
      }
    } catch (error) {
      console.error("Error fetching organization for DISABLE_AUTH:", error);
    }
    // Fallback if no organization found
    return {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: UserRole.ADMIN,
      organizationId: "test-org-id",
    };
  }

  let token;
  
  try {
    if (request) {
      // In API routes, prefer the request object for better performance
      token = await getToken({
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET,
      });
    } else {
      // Fallback to headers() which works in both contexts
      const headersList = await headers();
      const cookieHeader = headersList.get("cookie") || "";
      
      token = await getToken({
        req: {
          headers: {
            cookie: cookieHeader,
          },
        } as any,
        secret: process.env.NEXTAUTH_SECRET,
      });
    }
  } catch (error) {
    // If headers() fails (e.g., not in server context), return null
    console.error("Error getting current user:", error);
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return null;
  }

  if (!token) {
    return null;
  }

  // Reconstruct user object from token
  return {
    id: token.id as string,
    email: token.email as string,
    name: token.name as string,
    role: token.role as UserRole,
    organizationId: token.organizationId as string,
  };
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth() {
  // Temporarily disable auth for testing
  if (DISABLE_AUTH) {
    try {
      // Get a real organization from the database
      const org = await prisma.organization.findFirst();
      if (org) {
        return {
          id: "test-user-id",
          email: "test@example.com",
          name: "Test User",
          role: UserRole.ADMIN,
          organizationId: org.id,
        };
      }
    } catch (error) {
      console.error("Error fetching organization for DISABLE_AUTH:", error);
    }
    // Fallback if no organization found
    return {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: UserRole.ADMIN,
      organizationId: "test-org-id",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Require specific role - redirects to unauthorized if role doesn't match
 */
export async function requireRole(role: UserRole | UserRole[]) {
  const user = await requireAuth();
  const requiredRoles = Array.isArray(role) ? role : [role];

  if (!requiredRoles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return requiredRoles.includes(userRole);
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Check if user is accountant or admin
 */
export function canManageFinancial(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.ACCOUNTANT;
}

/**
 * Get permission level for a role
 */
export function getPermissionLevel(role: UserRole): number {
  switch (role) {
    case UserRole.ADMIN:
      return 3;
    case UserRole.ACCOUNTANT:
      return 2;
    case UserRole.VIEWER:
      return 1;
    default:
      return 0;
  }
}

