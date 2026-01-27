import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Get single customer
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        invoices: {
          include: {
            payments: true,
          },
          orderBy: { date: "desc" },
        },
        estimates: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Calculate outstanding balance
    const outstandingInvoices = customer.invoices.filter(
      (inv) => inv.status !== "PAID" && inv.status !== "CANCELLED"
    );
    const outstandingBalance = outstandingInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    );

    return NextResponse.json({
      ...customer,
      outstandingBalance,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

// PUT - Update customer
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    // Check if customer exists and belongs to organization
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        billingAddress: validatedData.billingAddress || Prisma.JsonNull,
        shippingAddress: validatedData.shippingAddress || Prisma.JsonNull,
        paymentTerms: validatedData.paymentTerms || "Net 30",
        creditLimit: validatedData.creditLimit || 0,
        taxId: validatedData.taxId || null,
        notes: validatedData.notes || null,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

// DELETE - Delete customer
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Check if customer exists and belongs to organization
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        invoices: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has invoices
    if (customer.invoices.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete customer with existing invoices. Please delete or transfer invoices first.",
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}


