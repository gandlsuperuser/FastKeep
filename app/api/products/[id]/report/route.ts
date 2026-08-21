import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";
import { extractInvoiceMetadata, formatAddressLines } from "@/lib/invoice-utils";

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

    // Fetch product with organization info
    const product = await prisma.product.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
        invoiceItems: {
          include: {
            invoice: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    shippingAddress: true,
                    billingAddress: true,
                  },
                },
              },
            },
          },
          orderBy: {
            invoice: {
              date: "desc",
            },
          },
        },
        estimateItems: {
          include: {
            estimate: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            estimate: {
              date: "desc",
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Build timeline of movements
    const movements: Array<{
      id: string;
      date: string;
      type: "ADDED_INVENTORY" | "SOLD_INVOICE" | "ESTIMATE_QUOTE";
      typeName: string;
      reference: string;
      referenceId?: string;
      referenceUrl?: string;
      soldTo?: string;
      pickupByOrShipTo?: string;
      sideMark?: string;
      quantityChange: number;
      rate?: number;
      amount?: number;
      status?: string;
      notes?: string;
    }> = [];

    // 1. Initial product creation / added inventory event
    movements.push({
      id: `init-${product.id}`,
      date: product.createdAt.toISOString(),
      type: "ADDED_INVENTORY",
      typeName: "Added to Inventory",
      reference: "Initial Entry / Restock",
      soldTo: undefined,
      pickupByOrShipTo: product.location ? `Warehouse (${product.location})` : "Main Warehouse",
      quantityChange: product.inventory ?? 0,
      rate: Number(product.cost) || 0,
      amount: (product.inventory ?? 0) * (Number(product.cost) || 0),
      status: "COMPLETED",
      notes: product.description || "Product catalog entry",
    });

    // 2. Invoice sales (when this product was sold or picked up by who)
    let totalUnitsSold = 0;
    let totalRevenue = 0;
    const uniqueCustomers = new Set<string>();

    for (const item of product.invoiceItems) {
      const invoice = item.invoice;
      const parsed = extractInvoiceMetadata(invoice.notes);
      
      // Determine pickup/shipTo
      let pickupByOrShipTo = parsed.shipTo;
      if (!pickupByOrShipTo && invoice.customer.shippingAddress) {
        const addrLines = formatAddressLines(invoice.customer.shippingAddress);
        pickupByOrShipTo = [invoice.customer.name, ...addrLines].join(", ");
      } else if (!pickupByOrShipTo && invoice.customer.billingAddress) {
        const addrLines = formatAddressLines(invoice.customer.billingAddress);
        pickupByOrShipTo = [invoice.customer.name, ...addrLines].join(", ");
      }
      if (!pickupByOrShipTo) {
        pickupByOrShipTo = invoice.customer.name;
      }

      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const amount = Number(item.amount) || 0;

      totalUnitsSold += qty;
      totalRevenue += amount;
      uniqueCustomers.add(invoice.customer.name);

      movements.push({
        id: item.id,
        date: invoice.date.toISOString(),
        type: "SOLD_INVOICE",
        typeName: "Sold / Dispatched",
        reference: invoice.number,
        referenceId: invoice.id,
        referenceUrl: `/dashboard/invoices/${invoice.id}`,
        soldTo: invoice.customer.name,
        pickupByOrShipTo: pickupByOrShipTo,
        sideMark: parsed.sideMark || undefined,
        quantityChange: -qty,
        rate: rate,
        amount: amount,
        status: invoice.status,
        notes: parsed.notes || item.description,
      });
    }

    // Sort movements descending by date
    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const reportData = {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        type: product.type,
        category: product.category,
        location: product.location,
        unit: product.unit || "pcs",
        price: Number(product.price) || 0,
        cost: Number(product.cost) || 0,
        inventory: product.inventory,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
      },
      organization: product.organization,
      summary: {
        totalUnitsSold,
        totalRevenue,
        currentStock: product.inventory ?? 0,
        uniqueBuyersCount: uniqueCustomers.size,
        totalTransactions: product.invoiceItems.length,
        stockValue: (product.inventory ?? 0) * (Number(product.cost) || Number(product.price) || 0),
      },
      movements,
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error generating product movement report:", error);
    return NextResponse.json(
      { error: "Failed to generate product movement report" },
      { status: 500 }
    );
  }
}
