import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { hashPassword } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Valid email is required").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.nativeEnum(UserRole).optional(),
  jobTitle: z.string().optional().nullable(),
  functions: z.record(z.string(), z.boolean()).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET - Get single user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jobTitle: true,
        functions: true,
        isActive: true,
        image: true,
        createdAt: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(targetUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT - Update a user's role, functions, or info
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Only administrators can update team members" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safety check: If demoting or deactivating an ADMIN, verify there's at least one other active ADMIN
    if (
      targetUser.role === UserRole.ADMIN &&
      ((validatedData.role && validatedData.role !== UserRole.ADMIN) ||
        validatedData.isActive === false)
    ) {
      const activeAdminCount = await prisma.user.count({
        where: {
          organizationId: user.organizationId,
          role: UserRole.ADMIN,
          isActive: true,
          id: { not: targetUser.id },
        },
      });

      if (activeAdminCount === 0) {
        return NextResponse.json(
          { error: "Cannot demote or deactivate the only active Administrator" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    if (validatedData.jobTitle !== undefined) updateData.jobTitle = validatedData.jobTitle;
    if (validatedData.functions !== undefined) updateData.functions = validatedData.functions;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    if (validatedData.email && validatedData.email !== targetUser.email) {
      const email = validatedData.email.trim().toLowerCase();
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: "insensitive" },
          id: { not: targetUser.id },
        },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "A user with this email address already exists" },
          { status: 400 }
        );
      }
      updateData.email = email;
    }

    if (validatedData.password && validatedData.password.trim().length >= 6) {
      updateData.password = await hashPassword(validatedData.password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        jobTitle: true,
        functions: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a user from the organization
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Only administrators can remove users" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent user from deleting themselves
    if (user.id === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account while logged in" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If deleting an admin, ensure at least one other admin exists
    if (targetUser.role === UserRole.ADMIN) {
      const activeAdminCount = await prisma.user.count({
        where: {
          organizationId: user.organizationId,
          role: UserRole.ADMIN,
          isActive: true,
          id: { not: targetUser.id },
        },
      });

      if (activeAdminCount === 0) {
        return NextResponse.json(
          { error: "Cannot delete the only active Administrator" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
