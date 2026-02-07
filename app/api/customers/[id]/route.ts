import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
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
  prepaidCredit: z.number().optional(),
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
            payments: {
              orderBy: { date: "desc" },
            },
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
    // Calculate financial details
    const totalInvoices = customer.invoices.reduce(
      (sum: number, inv: any) => sum + Number(inv.total),
      0
    );

    const totalPaid = customer.invoices.reduce((sum: number, inv: any) => {
      const invoicePaid = inv.payments.reduce(
        (pSum: number, p: any) => pSum + Number(p.amount),
        0
      );
      return sum + invoicePaid;
    }, 0);

    // Calculate prepaid/credit amount from overpayments
    const calculatedPrepaidCredit = Math.max(0, totalPaid - totalInvoices);
    
    // Get manual prepaid credit from customer record (default to 0 if null)
    const manualPrepaidCredit = Number((customer as any).prepaidCredit || 0);
    
    // Total prepaid credit = calculated (from overpayments) + manual (user-set)
    const prepaidCredit = calculatedPrepaidCredit + manualPrepaidCredit;

    // Outstanding balance = total invoices - prepaid credit
    // If result is positive, show as positive. If negative or zero, show as 0.
    const balance = totalInvoices - prepaidCredit;
    const outstandingBalance = balance > 0 ? balance : 0;

    // Get prepaid credit history in credit/debit format
    // Only show manual prepaid credit adjustments (not PREPAID_CREDIT payment method entries)
    const prepaidCreditHistory: any[] = [];
    
    // Credits: Manual prepaid credit adjustments only
    if (manualPrepaidCredit > 0) {
      prepaidCreditHistory.push({
        id: `manual-${customer.id}`,
        type: "CREDIT" as const,
        credit: manualPrepaidCredit,
        debit: 0,
        date: customer.updatedAt,
        invoiceId: undefined,
        invoiceNumber: null,
        reference: null,
        notes: "Manual prepaid credit adjustment",
        createdAt: customer.updatedAt,
      });
    }

    // 3. Debits: Invoice amounts (invoices debit from prepaid credit)
    // Track each invoice as a debit entry
    customer.invoices.forEach((inv: any) => {
      const invoiceTotal = Number(inv.total);
      
      // Create debit entry for invoice amount
      if (invoiceTotal > 0) {
        prepaidCreditHistory.push({
          id: `invoice-${inv.id}`,
          type: "DEBIT" as const,
          credit: 0,
          debit: invoiceTotal, // Debit the invoice total amount
          date: inv.date,
          invoiceId: inv.id,
          invoiceNumber: inv.number,
          reference: null,
          notes: `Invoice ${inv.number}`,
          createdAt: inv.createdAt,
        });
      }
    });

    // Sort by date (oldest first for running balance calculation)
    prepaidCreditHistory.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate running balance
    let runningBalance = 0;
    const historyWithBalance = prepaidCreditHistory.map((entry) => {
      runningBalance = runningBalance + entry.credit - entry.debit;
      return {
        ...entry,
        balance: runningBalance,
      };
    });

    // Sort back to newest first for display
    historyWithBalance.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      ...customer,
      outstandingBalance,
      totalInvoices,
      totalPaid,
      prepaidCredit,
      calculatedPrepaidCredit,
      manualPrepaidCredit,
      prepaidCreditHistory: historyWithBalance,
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

    // Prepare update data
    const updateData: any = {
      name: validatedData.name,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
        billingAddress: validatedData.billingAddress || null,
        shippingAddress: validatedData.shippingAddress || null,
      paymentTerms: validatedData.paymentTerms || "Net 30",
      creditLimit: validatedData.creditLimit || 0,
      taxId: validatedData.taxId || null,
      notes: validatedData.notes || null,
    };

    // Handle prepaidCredit - set to 0 if undefined/null, otherwise use the value
    // Prisma Decimal accepts number, string, or Decimal
    if (validatedData.prepaidCredit !== undefined && validatedData.prepaidCredit !== null) {
      updateData.prepaidCredit = validatedData.prepaidCredit;
    } else {
      updateData.prepaidCredit = 0;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message, details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating customer:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", errorMessage, errorStack);
    return NextResponse.json(
      { error: "Failed to update customer", details: errorMessage },
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


