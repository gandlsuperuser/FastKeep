"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Download } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  billingAddress: any;
  shippingAddress: any;
  paymentTerms: string | null;
  creditLimit: number | null;
  taxId: string | null;
  notes: string | null;
  outstandingBalance: number;
  totalInvoices: number;
  totalPaid: number;
  prepaidCredit: number;
  invoices: Array<{
    id: string;
    number: string;
    date: string;
    status: string;
    total: number;
    payments: Array<{ amount: number; date: string }>;
  }>;
  estimates: Array<{
    id: string;
    number: string;
    date: string;
    status: string;
    total: number;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/customers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
      } else {
        router.push("/dashboard/customers");
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDetails = async () => {
    if (!customer) return;

    try {
      // Create a hidden container for PDF generation
      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.width = "210mm"; // A4 width
      pdfContainer.style.padding = "20mm";
      pdfContainer.style.backgroundColor = "white";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "12px";
      pdfContainer.style.color = "black";
      document.body.appendChild(pdfContainer);

      // Build address lines
      const billingAddressLines: string[] = [];
      if (customer.billingAddress) {
        const addr = customer.billingAddress;
        if (addr.street) billingAddressLines.push(addr.street);
        const cityStateZip = [addr.city, addr.state, addr.zip]
          .filter(Boolean)
          .join(", ");
        if (cityStateZip) billingAddressLines.push(cityStateZip);
        if (addr.country) billingAddressLines.push(addr.country);
      }

      // Format date
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
      };

      // Format currency
      const formatCurrency = (amount: number) => {
        return `$${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      };

      pdfContainer.innerHTML = `
        <div style="margin-bottom: 30px;">
          <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #1a1a1a;">
            Customer Details Report
          </h1>
          <div style="font-size: 11px; color: #666; margin-bottom: 20px;">
            Generated: ${new Date().toLocaleString()}
          </div>
        </div>

        <!-- Customer Information -->
        <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px;">
            Customer Information
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px;">
            <div>
              <div style="font-weight: 600; color: #666; margin-bottom: 3px;">Name</div>
              <div style="margin-bottom: 10px;">${customer.name}</div>
            </div>
            ${customer.email ? `
              <div>
                <div style="font-weight: 600; color: #666; margin-bottom: 3px;">Email</div>
                <div style="margin-bottom: 10px;">${customer.email}</div>
              </div>
            ` : ""}
            ${customer.phone ? `
              <div>
                <div style="font-weight: 600; color: #666; margin-bottom: 3px;">Phone</div>
                <div style="margin-bottom: 10px;">${customer.phone}</div>
              </div>
            ` : ""}
            ${customer.taxId ? `
              <div>
                <div style="font-weight: 600; color: #666; margin-bottom: 3px;">Tax ID</div>
                <div style="margin-bottom: 10px;">${customer.taxId}</div>
              </div>
            ` : ""}
            ${billingAddressLines.length > 0 ? `
              <div style="grid-column: 1 / -1;">
                <div style="font-weight: 600; color: #666; margin-bottom: 3px;">Billing Address</div>
                <div style="margin-bottom: 10px;">
                  ${billingAddressLines.map((line) => `<div>${line}</div>`).join("")}
                </div>
              </div>
            ` : ""}
            ${customer.paymentTerms ? `
              <div>
                <div style="font-weight: 600; color: #666; margin-bottom: 3px;">Payment Terms</div>
                <div style="margin-bottom: 10px;">${customer.paymentTerms}</div>
              </div>
            ` : ""}
            ${customer.creditLimit ? `
              <div>
                <div style="font-weight: 600; color: #666; margin-bottom: 3px;">Credit Limit</div>
                <div style="margin-bottom: 10px;">${formatCurrency(customer.creditLimit)}</div>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Financial Summary -->
        <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px;">
            Financial Summary
          </h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; font-size: 13px;">
            <div style="padding: 10px; background-color: #f9f9f9; border-radius: 3px;">
              <div style="font-weight: 600; color: #666; margin-bottom: 5px; font-size: 11px;">Total Invoices</div>
              <div style="font-size: 18px; font-weight: bold; color: #1a1a1a;">
                ${formatCurrency(customer.totalInvoices || 0)}
              </div>
            </div>
            <div style="padding: 10px; background-color: #f0f9f0; border-radius: 3px;">
              <div style="font-weight: 600; color: #666; margin-bottom: 5px; font-size: 11px;">Total Paid</div>
              <div style="font-size: 18px; font-weight: bold; color: #16a34a;">
                ${formatCurrency(customer.totalPaid || 0)}
              </div>
            </div>
            <div style="padding: 10px; background-color: #fef2f2; border-radius: 3px;">
              <div style="font-weight: 600; color: #666; margin-bottom: 5px; font-size: 11px;">Outstanding Balance</div>
              <div style="font-size: 18px; font-weight: bold; color: #dc2626;">
                -$${(customer.outstandingBalance || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div style="padding: 10px; background-color: #eff6ff; border-radius: 3px;">
              <div style="font-weight: 600; color: #666; margin-bottom: 5px; font-size: 11px;">Prepaid Credit</div>
              <div style="font-size: 18px; font-weight: bold; color: #2563eb;">
                ${formatCurrency(customer.prepaidCredit || 0)}
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice History -->
        ${customer.invoices.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #1a1a1a; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px;">
              Invoice History
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background-color: #f3f4f6; border-bottom: 2px solid #1a1a1a;">
                  <th style="text-align: left; padding: 10px 8px; font-weight: bold;">Invoice #</th>
                  <th style="text-align: left; padding: 10px 8px; font-weight: bold;">Date</th>
                  <th style="text-align: center; padding: 10px 8px; font-weight: bold;">Status</th>
                  <th style="text-align: right; padding: 10px 8px; font-weight: bold;">Amount</th>
                  <th style="text-align: right; padding: 10px 8px; font-weight: bold;">Paid</th>
                  <th style="text-align: right; padding: 10px 8px; font-weight: bold;">Remaining</th>
                </tr>
              </thead>
              <tbody>
                ${customer.invoices.map((inv: any, index: number) => {
                  const paid = inv.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                  const remaining = Number(inv.total) - paid;
                  const statusColors: { [key: string]: string } = {
                    PAID: "#16a34a",
                    SENT: "#2563eb",
                    PARTIAL: "#ca8a04",
                    OVERDUE: "#dc2626",
                    DRAFT: "#6b7280",
                  };
                  const statusBg: { [key: string]: string } = {
                    PAID: "#dcfce7",
                    SENT: "#dbeafe",
                    PARTIAL: "#fef3c7",
                    OVERDUE: "#fee2e2",
                    DRAFT: "#f3f4f6",
                  };
                  return `
                    <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? "background-color: #fafafa;" : ""}">
                      <td style="padding: 8px; font-weight: 500;">${inv.number}</td>
                      <td style="padding: 8px;">${formatDate(inv.date)}</td>
                      <td style="padding: 8px; text-align: center;">
                        <span style="padding: 3px 8px; border-radius: 3px; font-size: 10px; background-color: ${statusBg[inv.status] || "#f3f4f6"}; color: ${statusColors[inv.status] || "#6b7280"};">
                          ${inv.status}
                        </span>
                      </td>
                      <td style="padding: 8px; text-align: right; font-weight: 500;">${formatCurrency(Number(inv.total))}</td>
                      <td style="padding: 8px; text-align: right; color: #16a34a;">${formatCurrency(paid)}</td>
                      <td style="padding: 8px; text-align: right; color: #dc2626;">${formatCurrency(remaining)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="margin-bottom: 20px; padding: 20px; text-align: center; color: #666; border: 1px dashed #ddd; border-radius: 5px;">
            No invoices found for this customer
          </div>
        `}

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center;">
          <div>This report was generated on ${new Date().toLocaleString()}</div>
          <div style="margin-top: 5px;">FastKeep Accounting System</div>
        </div>
      `;

      // Generate PDF
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(pdfContainer);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgPdfHeight = imgHeight * ratio;
      let heightLeft = imgPdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgPdfHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgPdfHeight);
        heightLeft -= pdfHeight;
      }

      // Save PDF
      pdf.save(`${customer.name.replace(/\s+/g, "_")}_details_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!customer) {
    return <div>Customer not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadDetails}>
            <Download className="mr-2 h-4 w-4" />
            Download Details
          </Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Customer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.billingAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {customer.billingAddress.street && (
                    <div>{customer.billingAddress.street}</div>
                  )}
                  {(customer.billingAddress.city ||
                    customer.billingAddress.state ||
                    customer.billingAddress.zip) && (
                    <div>
                      {[
                        customer.billingAddress.city,
                        customer.billingAddress.state,
                        customer.billingAddress.zip,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {customer.billingAddress.country && (
                    <div>{customer.billingAddress.country}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Payment Terms</div>
              <div className="font-medium">
                {customer.paymentTerms || "Not set"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Credit Limit</div>
              <div className="font-medium">
                {customer.creditLimit
                  ? `$${customer.creditLimit.toLocaleString()}`
                  : "Not set"}
              </div>
            </div>
            {customer.taxId && (
              <div>
                <div className="text-sm text-muted-foreground">Tax ID</div>
                <div className="font-medium">{customer.taxId}</div>
              </div>
            )}
            
            {/* Financial Summary Section */}
            <div className="pt-4 border-t">
              <div className="text-sm font-semibold mb-3">Financial Summary</div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Total Invoices</div>
                  <div className="font-medium text-lg">
                    ${(customer.totalInvoices || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Paid</div>
                  <div className="font-medium text-lg text-green-600">
                    ${(customer.totalPaid || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Outstanding Balance
                  </div>
                  <div className="font-medium text-lg text-red-600">
                    -${(customer.outstandingBalance || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(customer.totalInvoices || 0) > 0 || (customer.prepaidCredit || 0) > 0 ? (
                      <>
                        ${(customer.totalInvoices || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} - ${(customer.prepaidCredit || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} = -${(customer.outstandingBalance || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </>
                    ) : (
                      "No invoices or prepaid credit"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Prepaid Credit
                  </div>
                  <div className="font-medium text-lg text-blue-600">
                    ${(customer.prepaidCredit || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            All invoices for this customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customer.invoices.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No invoices found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.invoices.map((invoice) => {
                  const paid = invoice.payments.reduce(
                    (sum, p) => sum + Number(p.amount),
                    0
                  );
                  const remaining = Number(invoice.total) - paid;
                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="text-primary hover:underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            invoice.status === "PAID"
                              ? "bg-green-100 text-green-800"
                              : invoice.status === "SENT"
                              ? "bg-blue-100 text-blue-800"
                              : invoice.status === "PARTIAL"
                              ? "bg-yellow-100 text-yellow-800"
                              : invoice.status === "OVERDUE"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(invoice.total).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ${paid.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        ${remaining.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer information</DialogDescription>
          </DialogHeader>
          <CustomerForm
            customer={customer}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              fetchCustomer();
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

