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
  prepaidCreditHistory?: Array<{
    id: string;
    type: "CREDIT" | "DEBIT";
    credit: number;
    debit: number;
    balance: number;
    date: string;
    invoiceId?: string;
    invoiceNumber: string | null;
    reference: string | null;
    notes: string | null;
    createdAt: string;
  }>;
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
      pdfContainer.style.width = "800px"; // Wider container for better readability
      pdfContainer.style.padding = "40px";
      pdfContainer.style.backgroundColor = "#ffffff";
      pdfContainer.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
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

      // Outstanding balance display (exact value: positive = owes, negative = credit)
      const ob = customer.outstandingBalance ?? 0;
      const obDisplay =
        ob > 0
          ? `-$${ob.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : ob < 0
            ? `+$${Math.abs(ob).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : formatCurrency(0);
      const obColor = ob > 0 ? "#c62828" : ob < 0 ? "#1b5e20" : "#000000";

      pdfContainer.innerHTML = `
        <style>
          * {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            box-sizing: border-box;
          }
        </style>
        <div style="margin-bottom: 30px;">
          <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 10px; color: #000000; letter-spacing: 0.2px; line-height: 1.3;">
            Customer Details Report
          </h1>
          <div style="font-size: 9px; color: #000000; margin-bottom: 15px; font-weight: 500; line-height: 1.3;">
            Generated: ${new Date().toLocaleString()}
          </div>
        </div>

        <!-- Customer Information -->
        <div style="margin-bottom: 20px; border: 1px solid #000000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
          <h2 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #000000; border-bottom: 1px solid #000000; padding-bottom: 5px; line-height: 1.3; letter-spacing: 0.1px;">
            Customer Information
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 9px; line-height: 1.4;">
            <div>
              <div style="font-weight: 700; color: #000000; margin-bottom: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Name</div>
              <div style="margin-bottom: 8px; color: #000000; font-weight: 600; font-size: 9px; line-height: 1.3;">${customer.name}</div>
            </div>
            ${customer.email ? `
              <div>
                <div style="font-weight: 700; color: #000000; margin-bottom: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Email</div>
                <div style="margin-bottom: 8px; color: #000000; font-weight: 600; font-size: 9px; line-height: 1.3;">${customer.email}</div>
              </div>
            ` : ""}
            ${customer.phone ? `
              <div>
                <div style="font-weight: 700; color: #000000; margin-bottom: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Phone</div>
                <div style="margin-bottom: 8px; color: #000000; font-weight: 600; font-size: 9px; line-height: 1.3;">${customer.phone}</div>
              </div>
            ` : ""}
            ${customer.taxId ? `
              <div>
                <div style="font-weight: 700; color: #000000; margin-bottom: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Tax ID</div>
                <div style="margin-bottom: 8px; color: #000000; font-weight: 600; font-size: 9px; line-height: 1.3;">${customer.taxId}</div>
              </div>
            ` : ""}
            ${billingAddressLines.length > 0 ? `
              <div style="grid-column: 1 / -1;">
                <div style="font-weight: 700; color: #000000; margin-bottom: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Billing Address</div>
                <div style="margin-bottom: 8px; color: #000000; font-weight: 600; font-size: 9px; line-height: 1.4;">
                  ${billingAddressLines.map((line) => `<div style="margin-bottom: 2px;">${line}</div>`).join("")}
                </div>
              </div>
            ` : ""}
            ${customer.paymentTerms ? `
              <div>
                <div style="font-weight: 700; color: #000000; margin-bottom: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Payment Terms</div>
                <div style="margin-bottom: 8px; color: #000000; font-weight: 600; font-size: 9px; line-height: 1.3;">${customer.paymentTerms}</div>
              </div>
            ` : ""}
            ${customer.creditLimit ? `
              <div>
                <div style="font-weight: 700; color: #000000; margin-bottom: 3px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Credit Limit</div>
                <div style="margin-bottom: 8px; color: #000000; font-weight: 600; font-size: 9px; line-height: 1.3;">${formatCurrency(customer.creditLimit)}</div>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Financial Summary -->
        <div style="margin-bottom: 20px; border: 1px solid #000000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
          <h2 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #000000; border-bottom: 1px solid #000000; padding-bottom: 5px; line-height: 1.3; letter-spacing: 0.1px;">
            Financial Summary
          </h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 9px;">
            <div style="padding: 10px; background-color: #f5f5f5; border-radius: 4px; border: 1px solid #000000;">
              <div style="font-weight: 700; color: #000000; margin-bottom: 5px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Total Invoices</div>
              <div style="font-size: 14px; font-weight: 700; color: #000000; line-height: 1.3;">
                ${formatCurrency(customer.totalInvoices || 0)}
              </div>
            </div>
            <div style="padding: 10px; background-color: #e8f5e9; border-radius: 4px; border: 1px solid #000000;">
              <div style="font-weight: 700; color: #000000; margin-bottom: 5px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Total Paid</div>
              <div style="font-size: 14px; font-weight: 700; color: #1b5e20; line-height: 1.3;">
                ${formatCurrency(customer.totalPaid || 0)}
              </div>
            </div>
            <div style="padding: 10px; background-color: #ffebee; border-radius: 4px; border: 1px solid #000000;">
              <div style="font-weight: 700; color: #000000; margin-bottom: 5px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Outstanding Balance</div>
              <div style="font-size: 14px; font-weight: 700; color: ${obColor}; line-height: 1.3;">
                ${obDisplay}
              </div>
            </div>
            <div style="padding: 10px; background-color: #e3f2fd; border-radius: 4px; border: 1px solid #000000;">
              <div style="font-weight: 700; color: #000000; margin-bottom: 5px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Prepaid Credit</div>
              <div style="font-size: 14px; font-weight: 700; color: #1565c0; line-height: 1.3;">
                ${formatCurrency(customer.prepaidCredit || 0)}
              </div>
            </div>
          </div>
        </div>

        <!-- Prepaid Credit History -->
        ${customer.prepaidCreditHistory && customer.prepaidCreditHistory.length > 0 ? `
          <div style="margin-bottom: 20px; border: 1px solid #000000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <h2 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #000000; border-bottom: 1px solid #000000; padding-bottom: 5px; line-height: 1.3; letter-spacing: 0.1px;">
              Prepaid Credit History
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
              <thead>
                <tr style="background-color: #f5f5f5; border-bottom: 1px solid #000000;">
                  <th style="text-align: left; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Date</th>
                  <th style="text-align: left; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Description</th>
                  <th style="text-align: right; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Credit</th>
                  <th style="text-align: right; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Debit</th>
                  <th style="text-align: right; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Balance</th>
                  <th style="text-align: left; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Invoice #</th>
                </tr>
              </thead>
              <tbody>
                ${customer.prepaidCreditHistory.map((entry: any, index: number) => {
                  return `
                    <tr style="border-bottom: 1px solid #000000; ${index % 2 === 0 ? "background-color: #fafafa;" : "background-color: #ffffff;"}">
                      <td style="padding: 6px 5px; color: #000000; font-weight: 600; font-size: 8px; line-height: 1.3;">${formatDate(entry.date)}</td>
                      <td style="padding: 6px 5px; color: #000000; line-height: 1.3;">
                        <div style="font-weight: 600; margin-bottom: 2px; font-size: 8px; line-height: 1.2;">${entry.type === "CREDIT" ? "Credit Added" : "Credit Used"}</div>
                        ${entry.notes ? `<div style="font-size: 7px; color: #000000; font-weight: 400; line-height: 1.2;">${entry.notes}</div>` : ""}
                      </td>
                      <td style="padding: 6px 5px; text-align: right; color: ${entry.credit > 0 ? "#1b5e20" : "#666666"}; font-weight: 700; font-size: 8px; line-height: 1.3;">
                        ${entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                      </td>
                      <td style="padding: 6px 5px; text-align: right; color: ${entry.debit > 0 ? "#c62828" : "#666666"}; font-weight: 700; font-size: 8px; line-height: 1.3;">
                        ${entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                      </td>
                      <td style="padding: 6px 5px; text-align: right; color: ${(entry.balance || 0) >= 0 ? "#1565c0" : "#c62828"}; font-weight: 700; font-size: 8px; line-height: 1.3;">
                        ${formatCurrency(entry.balance || 0)}
                      </td>
                      <td style="padding: 6px 5px; color: #000000; font-weight: 600; font-size: 8px; line-height: 1.3;">
                        ${entry.invoiceNumber || "-"}
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        ` : ""}

        <!-- Invoice History -->
        ${customer.invoices.length > 0 ? `
          <div style="margin-bottom: 20px; border: 1px solid #000000; padding: 12px; border-radius: 6px; background-color: #ffffff;">
            <h2 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #000000; border-bottom: 1px solid #000000; padding-bottom: 5px; line-height: 1.3; letter-spacing: 0.1px;">
              Invoice History
            </h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
              <thead>
                <tr style="background-color: #f5f5f5; border-bottom: 1px solid #000000;">
                  <th style="text-align: left; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Invoice #</th>
                  <th style="text-align: left; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Date</th>
                  <th style="text-align: center; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Status</th>
                  <th style="text-align: right; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Amount</th>
                  <th style="text-align: right; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Paid</th>
                  <th style="text-align: right; padding: 6px 5px; font-weight: 700; color: #000000; font-size: 7px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">Remaining</th>
                </tr>
              </thead>
              <tbody>
                ${customer.invoices.map((inv: any, index: number) => {
                  const paid = inv.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                  const remaining = Number(inv.total) - paid;
                  const statusColors: { [key: string]: string } = {
                    PAID: "#1b5e20",
                    SENT: "#1565c0",
                    PARTIAL: "#e65100",
                    OVERDUE: "#c62828",
                    DRAFT: "#424242",
                  };
                  const statusBg: { [key: string]: string } = {
                    PAID: "#c8e6c9",
                    SENT: "#bbdefb",
                    PARTIAL: "#ffe0b2",
                    OVERDUE: "#ffcdd2",
                    DRAFT: "#e0e0e0",
                  };
                  return `
                    <tr style="border-bottom: 1px solid #000000; ${index % 2 === 0 ? "background-color: #fafafa;" : "background-color: #ffffff;"}">
                      <td style="padding: 6px 5px; font-weight: 700; color: #000000; font-size: 8px; line-height: 1.3;">${inv.number}</td>
                      <td style="padding: 6px 5px; color: #000000; font-weight: 600; font-size: 8px; line-height: 1.3;">${formatDate(inv.date)}</td>
                      <td style="padding: 6px 5px; text-align: center; line-height: 1.3;">
                        <span style="padding: 2px 6px; border-radius: 2px; font-size: 7px; font-weight: 700; background-color: ${statusBg[inv.status] || "#e0e0e0"}; color: ${statusColors[inv.status] || "#424242"}; border: 1px solid #000000; line-height: 1.2;">
                          ${inv.status}
                        </span>
                      </td>
                      <td style="padding: 6px 5px; text-align: right; font-weight: 700; color: #000000; font-size: 8px; line-height: 1.3;">${formatCurrency(Number(inv.total))}</td>
                      <td style="padding: 6px 5px; text-align: right; color: #1b5e20; font-weight: 700; font-size: 8px; line-height: 1.3;">${formatCurrency(paid)}</td>
                      <td style="padding: 6px 5px; text-align: right; color: #c62828; font-weight: 700; font-size: 8px; line-height: 1.3;">${formatCurrency(remaining)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="margin-bottom: 20px; padding: 12px; text-align: center; color: #000000; border: 1px dashed #000000; border-radius: 6px; background-color: #f5f5f5;">
            <div style="font-weight: 600; font-size: 9px; line-height: 1.3;">No invoices found for this customer</div>
          </div>
        `}

        <!-- Footer -->
        <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #000000; font-size: 8px; color: #000000; text-align: center; font-weight: 600; line-height: 1.3;">
          <div style="margin-bottom: 4px; line-height: 1.2;">This report was generated on ${new Date().toLocaleString()}</div>
          <div style="font-weight: 700; color: #000000; font-size: 9px; line-height: 1.2;">FastKeep Accounting System</div>
        </div>
      `;

      // Generate PDF
      const canvas = await html2canvas(pdfContainer, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
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
                  <div className={`font-medium text-lg ${(customer.outstandingBalance ?? 0) > 0 ? "text-red-600" : (customer.outstandingBalance ?? 0) < 0 ? "text-green-600" : ""}`}>
                    {(customer.outstandingBalance ?? 0) > 0
                      ? `-$${customer.outstandingBalance!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : (customer.outstandingBalance ?? 0) < 0
                        ? `+$${Math.abs(customer.outstandingBalance!).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `$${(0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                        })} ={" "}
                        {(customer.outstandingBalance ?? 0) >= 0
                          ? `-$${(customer.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `+$${Math.abs(customer.outstandingBalance!).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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

      {/* Prepaid Credit History */}
      <Card>
        <CardHeader>
          <CardTitle>Prepaid Credit History</CardTitle>
          <CardDescription>
            Track all prepaid credit transactions and adjustments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!customer.prepaidCreditHistory || customer.prepaidCreditHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No prepaid credit history found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.prepaidCreditHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {entry.type === "CREDIT" ? "Credit Added" : "Credit Used"}
                        </span>
                        {entry.notes && (
                          <span className="text-xs text-muted-foreground">
                            {entry.notes}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.credit > 0 ? (
                        <span className="font-medium text-green-600">
                          ${entry.credit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.debit > 0 ? (
                        <span className="font-medium text-red-600">
                          ${entry.debit.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          (entry.balance || 0) >= 0
                            ? "text-blue-600"
                            : "text-red-600"
                        }
                      >
                        ${(entry.balance || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.invoiceNumber ? (
                        entry.invoiceId ? (
                          <Link
                            href={`/dashboard/invoices/${entry.invoiceId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {entry.invoiceNumber}
                          </Link>
                        ) : (
                          <span>{entry.invoiceNumber}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.reference || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

