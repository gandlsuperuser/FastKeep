import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { hashPassword } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
  jobTitle: z.string().optional().nullable(),
  functions: z.record(z.string(), z.boolean()).optional().nullable(),
  isActive: z.boolean().default(true),
});

// GET - List all users in the organization
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
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
        updatedAt: true,
      },
      orderBy: [
        { role: "asc" }, // ADMINs first
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching organization users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST - Add a new user to the organization
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN or ACCOUNTANT can manage users
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Only administrators can add new users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    const email = validatedData.email.trim().toLowerCase();

    // Check if email is already taken
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(validatedData.password);

    // Default function presets based on role if not explicitly provided
    let functions = validatedData.functions;
    if (!functions) {
      if (validatedData.role === UserRole.ADMIN) {
        functions = {
          invoices: true,
          estimates: true,
          customers: true,
          products: true,
          expenses: true,
          banking: true,
          ledger: true,
          reports: true,
          settings: true,
        };
      } else if (validatedData.role === UserRole.ACCOUNTANT) {
        functions = {
          invoices: true,
          estimates: true,
          customers: true,
          products: true,
          expenses: true,
          banking: true,
          ledger: true,
          reports: true,
          settings: false,
        };
      } else {
        // VIEWER
        functions = {
          invoices: true,
          estimates: true,
          customers: true,
          products: true,
          expenses: false,
          banking: false,
          ledger: false,
          reports: false,
          settings: false,
        };
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email,
        password: hashedPassword,
        role: validatedData.role,
        jobTitle: validatedData.jobTitle || null,
        functions,
        isActive: validatedData.isActive,
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
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "User added successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating organization user:", error);
    return NextResponse.json(
      { error: "Failed to add user" },
      { status: 500 }
    );
  }
}
