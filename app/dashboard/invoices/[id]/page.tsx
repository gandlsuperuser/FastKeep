"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import jsPDFImport from "jspdf";
import html2canvas from "html2canvas";

const jsPDF = (jsPDFImport as any).jsPDF || jsPDFImport;
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, Download, Check, DollarSign, Pencil, Trash2, Package, Printer } from "lucide-react";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { extractInvoiceMetadata, getInvoiceShipToLines, formatAddressLines, formatInvoiceDate } from "@/lib/invoice-utils";

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  organization: {
    id: string;
    name: string;
    settings: any;
  };
  customer: {
    id: string;
    name: string;
    email: string | null;
    billingAddress: any;
    shippingAddress?: any;
  };
  items: Array<{
    id: string;
    productId?: string | null;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    product: {
      id: string;
      name: string;
      sku: string | null;
    } | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    reference: string | null;
    notes: string | null;
  }>;
  paidAmount: number;
  remainingAmount: number;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPackingListOpen, setIsPackingListOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPayment, setEditingPayment] = useState<{
    id: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    reference: string | null;
    notes: string | null;
  } | null>(null);
  const [paymentData, setPaymentData] = useState<{
    amount: string;
    date: string;
    method: PaymentMethod;
    reference: string;
    notes: string;
  }>({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: PaymentMethod.CASH,
    reference: "",
    notes: "",
  });

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        router.push("/dashboard/invoices");
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: InvoiceStatus) => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchInvoice();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/invoices/${params.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentData,
          amount: parseFloat(paymentData.amount),
        }),
      });

      if (response.ok) {
        setIsPaymentDialogOpen(false);
        setPaymentData({
          amount: "",
          date: new Date().toISOString().split("T")[0],
          method: PaymentMethod.CASH,
          reference: "",
          notes: "",
        });
        fetchInvoice();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment");
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    fetchInvoice();
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment({
      id: payment.id,
      amount: Number(payment.amount),
      date: new Date(payment.date).toISOString().split("T")[0],
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes,
    });
    setIsEditPaymentDialogOpen(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    try {
      const response = await fetch(`/api/payments/${editingPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: editingPayment.amount,
          date: editingPayment.date,
          method: editingPayment.method,
          reference: editingPayment.reference || "",
          notes: editingPayment.notes || "",
        }),
      });

      if (response.ok) {
        setIsEditPaymentDialogOpen(false);
        setEditingPayment(null);
        fetchInvoice();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update payment");
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Failed to update payment");
    }
  };

  const handleDeleteInvoice = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard/invoices");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete invoice");
        setIsDeleting(false);
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
      setIsDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "fixed";
      pdfContainer.style.left = "0";
      pdfContainer.style.top = "0";
      pdfContainer.style.zIndex = "-9999";
      pdfContainer.style.width = "210mm";
      pdfContainer.style.padding = "20mm";
      pdfContainer.style.backgroundColor = "white";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "12px";
      pdfContainer.style.color = "black";
      document.body.appendChild(pdfContainer);

      const addressLines = formatAddressLines(invoice.customer.billingAddress);
      const shipToLines = getInvoiceShipToLines(invoice);
      const parsedNotes = extractInvoiceMetadata(invoice.notes);

      // Build organization address lines
      const orgAddressLines = invoice.organization.settings?.address
        ? formatAddressLines(invoice.organization.settings.address)
        : [];

      pdfContainer.innerHTML = `
        <div style="margin-bottom: 25px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div style="flex: 1;">
              ${invoice.organization.settings?.logoUrl ? `<img src="${invoice.organization.settings.logoUrl}" style="max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 12px; display: block;" />` : ""}
              <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">INVOICE</h1>
              <div style="font-size: 13px; line-height: 1.5;">
                <div style="font-weight: 600; margin-bottom: 4px;">${invoice.organization.name}</div>
                ${invoice.organization.settings?.email ? `<div>${invoice.organization.settings.email}</div>` : ""}
                ${invoice.organization.settings?.phone ? `<div>${invoice.organization.settings.phone}</div>` : ""}
                ${orgAddressLines.map((line) => `<div>${line}</div>`).join("")}
              </div>
            </div>
            <div style="flex: 1; text-align: right; font-size: 13px; line-height: 1.6;">
              <div style="margin-bottom: 6px;"><strong>Invoice #:</strong> ${invoice.number}</div>
              <div><strong>Date:</strong> ${formatInvoiceDate(invoice.date)}</div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 30px; margin-bottom: 20px;">
          <div style="flex: 1;">
            <h2 style="font-size: 15px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Bill To:</h2>
            <div style="font-size: 13px; line-height: 1.5;">
              <div style="font-weight: 600; margin-bottom: 3px;">${invoice.customer.name}</div>
              ${invoice.customer.email ? `<div>${invoice.customer.email}</div>` : ""}
              ${addressLines.map((line) => `<div>${line}</div>`).join("")}
            </div>
          </div>
          <div style="flex: 1;">
            <h2 style="font-size: 15px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Ship To:</h2>
            <div style="font-size: 13px; line-height: 1.5;">
              ${shipToLines.length > 0
                ? shipToLines.map((line, idx) => `<div style="${idx === 0 ? "font-weight: 600; margin-bottom: 3px;" : ""}">${line}</div>`).join("")
                : `<div style="font-weight: 600;">${invoice.customer.name}</div>`
              }
            </div>
          </div>
        </div>

        ${parsedNotes.sideMark ? `
          <div style="margin-bottom: 20px; background-color: #f9fafb; padding: 10px 14px; border-radius: 4px; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; font-size: 12px; color: #4b5563; margin-bottom: 3px;">SIDE MARK:</div>
            <div style="white-space: pre-wrap; font-size: 12px; color: #111;">${parsedNotes.sideMark}</div>
          </div>
        ` : ""}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #000;">
              <th style="text-align: left; padding: 10px 0; font-weight: bold;">Description</th>
              <th style="text-align: center; padding: 10px 0; font-weight: bold; width: 80px;">Qty</th>
              <th style="text-align: right; padding: 10px 0; font-weight: bold; width: 100px;">Rate</th>
              <th style="text-align: right; padding: 10px 0; font-weight: bold; width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items
          .map(
            (item) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px 0;">
                  <div style="font-weight: 500;">${item.description}</div>
                  ${item.product?.sku ? `<div style="font-size: 11px; color: #666;">SKU: ${item.product.sku}</div>` : ""}
                </td>
                <td style="text-align: center; padding: 10px 0;">${item.quantity}</td>
                <td style="text-align: right; padding: 10px 0;">$${Number(item.rate).toFixed(2)}</td>
                <td style="text-align: right; padding: 10px 0;">$${Number(item.amount).toFixed(2)}</td>
              </tr>
            `
          )
          .join("")}
          </tbody>
        </table>

        <div style="margin-left: auto; width: 300px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Subtotal:</span>
            <span>$${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          ${invoice.tax > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Tax:</span><span>$${Number(invoice.tax).toFixed(2)}</span></div>` : ""}
          ${invoice.discount > 0 ? `<div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Discount:</span><span>-$${Number(invoice.discount).toFixed(2)}</span></div>` : ""}
          <div style="border-top: 2px solid #000; margin-top: 5px; padding-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
            <span>Total:</span>
            <span>$${Number(invoice.total).toFixed(2)}</span>
          </div>
          ${invoice.paidAmount > 0 ? `
            <div style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Paid:</span><span>$${invoice.paidAmount.toFixed(2)}</span></div>
              <div style="display: flex; justify-content: space-between; padding: 5px 0;"><span>Remaining:</span><span>$${invoice.remainingAmount.toFixed(2)}</span></div>
            </div>
          ` : ""}
        </div>

        ${parsedNotes.notes || invoice.terms ? `
          <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            ${parsedNotes.notes ? `
              <div style="margin-bottom: 15px;">
                <h3 style="font-weight: bold; margin-bottom: 5px;">Notes:</h3>
                <div style="white-space: pre-wrap; font-size: 12px;">${parsedNotes.notes}</div>
              </div>
            ` : ""}
            ${invoice.terms ? `
              <div>
                <h3 style="font-weight: bold; margin-bottom: 5px;">Terms & Conditions:</h3>
                <div style="white-space: pre-wrap; font-size: 12px;">${invoice.terms}</div>
              </div>
            ` : ""}
          </div>
        ` : ""}
      `;

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(pdfContainer, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: pdfContainer.scrollWidth,
        windowHeight: pdfContainer.scrollHeight,
      });

      document.body.removeChild(pdfContainer);

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgPdfHeight = pdfWidth / ratio;
      let heightLeft = imgPdfHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`Invoice-${invoice.number}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDownloadPackingList = async () => {
    if (!invoice) return;

    try {
      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "fixed";
      pdfContainer.style.left = "0";
      pdfContainer.style.top = "0";
      pdfContainer.style.zIndex = "-9999";
      pdfContainer.style.width = "210mm";
      pdfContainer.style.padding = "20mm";
      pdfContainer.style.backgroundColor = "white";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      pdfContainer.style.fontSize = "12px";
      pdfContainer.style.color = "black";
      document.body.appendChild(pdfContainer);

      const addressLines = formatAddressLines(invoice.customer.billingAddress);
      const shipToLines = getInvoiceShipToLines(invoice);
      const parsedNotes = extractInvoiceMetadata(invoice.notes);

      const orgAddressLines = invoice.organization.settings?.address
        ? formatAddressLines(invoice.organization.settings.address)
        : [];

      pdfContainer.innerHTML = `
        <div style="margin-bottom: 25px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div style="flex: 1;">
              ${invoice.organization.settings?.logoUrl ? `<img src="${invoice.organization.settings.logoUrl}" style="max-height: 55px; max-width: 180px; object-fit: contain; margin-bottom: 10px; display: block;" />` : ""}
              <h1 style="font-size: 26px; font-weight: bold; margin-bottom: 6px; color: #111;">PACKING LIST</h1>
              <div style="font-size: 13px; line-height: 1.5;">
                <div style="font-weight: 600;">${invoice.organization.name}</div>
                ${invoice.organization.settings?.email ? `<div>${invoice.organization.settings.email}</div>` : ""}
                ${invoice.organization.settings?.phone ? `<div>${invoice.organization.settings.phone}</div>` : ""}
                ${orgAddressLines.map((line) => `<div>${line}</div>`).join("")}
              </div>
            </div>
            <div style="flex: 1; text-align: right; font-size: 13px; line-height: 1.6;">
              <div style="margin-bottom: 6px;"><strong>Invoice / Order #:</strong> ${invoice.number}</div>
              <div style="margin-bottom: 6px;"><strong>Date:</strong> ${formatInvoiceDate(invoice.date)}</div>
              <div><strong>Status:</strong> ${invoice.status}</div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 20px; background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
          <div style="flex: 1;">
            <h2 style="font-size: 13px; font-weight: bold; margin-bottom: 6px; color: #374151; text-transform: uppercase;">Bill To:</h2>
            <div style="font-size: 13px; line-height: 1.5;">
              <div style="font-weight: 600;">${invoice.customer.name}</div>
              ${invoice.customer.email ? `<div>${invoice.customer.email}</div>` : ""}
              ${addressLines.map((line) => `<div>${line}</div>`).join("")}
            </div>
          </div>
          <div style="flex: 1;">
            <h2 style="font-size: 13px; font-weight: bold; margin-bottom: 6px; color: #374151; text-transform: uppercase;">Ship To:</h2>
            <div style="font-size: 13px; line-height: 1.5;">
              ${shipToLines.length > 0
                ? shipToLines.map((line, idx) => `<div style="${idx === 0 ? "font-weight: 600;" : ""}">${line}</div>`).join("")
                : `<div style="font-weight: 600;">${invoice.customer.name}</div>`
              }
            </div>
          </div>
        </div>

        ${parsedNotes.sideMark ? `
          <div style="margin-bottom: 20px; background-color: #f3f4f6; padding: 10px 15px; border-radius: 4px; border: 1px solid #d1d5db;">
            <div style="font-weight: bold; font-size: 12px; color: #374151; margin-bottom: 3px;">SIDE MARK:</div>
            <div style="white-space: pre-wrap; font-size: 12px; font-weight: 500; color: #111;">${parsedNotes.sideMark}</div>
          </div>
        ` : ""}

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="border-bottom: 2px solid #111; background-color: #f3f4f6;">
              <th style="text-align: left; padding: 8px 10px; font-weight: bold; font-size: 12px; width: 40px;">#</th>
              <th style="text-align: left; padding: 8px 10px; font-weight: bold; font-size: 12px;">Item Description</th>
              <th style="text-align: center; padding: 8px 10px; font-weight: bold; font-size: 12px; width: 110px;">Qty Ordered</th>
              <th style="text-align: center; padding: 8px 10px; font-weight: bold; font-size: 12px; width: 110px;">Qty Shipped</th>
              <th style="text-align: center; padding: 8px 10px; font-weight: bold; font-size: 12px; width: 70px;">Verified</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map((item, idx) => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; font-size: 12px; color: #6b7280;">${idx + 1}</td>
                <td style="padding: 10px;">
                  <div style="font-weight: 500;">${item.description}</div>
                  ${item.product?.sku ? `<div style="font-size: 11px; color: #6b7280;">SKU: ${item.product.sku}</div>` : ""}
                </td>
                <td style="text-align: center; padding: 10px; font-weight: 600;">${item.quantity}</td>
                <td style="text-align: center; padding: 10px; font-weight: 600;">${item.quantity}</td>
                <td style="text-align: center; padding: 10px;">
                  <div style="display: inline-block; width: 16px; height: 16px; border: 1px solid #9ca3af; border-radius: 3px;"></div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        ${parsedNotes.notes ? `
          <div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
            <h3 style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">Delivery / Shipping Notes:</h3>
            <div style="white-space: pre-wrap; font-size: 12px; color: #4b5563;">${parsedNotes.notes}</div>
          </div>
        ` : ""}

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; border-top: 1px dashed #d1d5db; padding-top: 20px;">
          <div><strong>Packed By:</strong> ______________________</div>
          <div><strong>Date:</strong> ______________________</div>
          <div><strong>Received By (Sign):</strong> ______________________</div>
        </div>
      `;

      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(pdfContainer, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: pdfContainer.scrollWidth,
        windowHeight: pdfContainer.scrollHeight,
      });

      document.body.removeChild(pdfContainer);

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      const imgPdfHeight = pdfWidth / ratio;
      let heightLeft = imgPdfHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgPdfHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`PackingList-${invoice.number}.pdf`);
    } catch (error) {
      console.error("Error generating packing list:", error);
      alert(`Failed to generate packing list: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  const isOverdue =
    invoice.status !== InvoiceStatus.PAID &&
    new Date(invoice.dueDate) < new Date();

  const parsedNotes = extractInvoiceMetadata(invoice.notes);
  const shipToLines = getInvoiceShipToLines(invoice);

  // Convert invoice to form format for editing
  const invoiceForForm = invoice ? {
    id: invoice.id,
    customerId: invoice.customer.id,
    shipTo: parsedNotes.shipTo,
    sideMark: parsedNotes.sideMark,
    date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: invoice.status,
    items: invoice.items.map(item => ({
      id: item.id,
      productId: item.productId || undefined,
      description: item.description,
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      amount: Number(item.amount) || 0,
    })),
    subtotal: Number(invoice.subtotal) || 0,
    tax: Number(invoice.tax) || 0,
    discount: Number(invoice.discount) || 0,
    total: Number(invoice.total) || 0,
    notes: parsedNotes.notes || undefined,
    terms: invoice.terms || undefined,
    // Calculate taxRate from existing tax and subtotal
    taxRate: invoice.subtotal > 0 ? (Number(invoice.tax) / Number(invoice.subtotal)) * 100 : 0,
  } : null;

  return (
    <div className="space-y-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice information
            </DialogDescription>
          </DialogHeader>
          {invoiceForForm && (
            <InvoiceForm
              invoice={invoiceForForm}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Packing List Preview Modal */}
      <Dialog open={isPackingListOpen} onOpenChange={setIsPackingListOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle>Packing List — {invoice.number}</DialogTitle>
                <DialogDescription>
                  Review packing list details before printing or downloading
                </DialogDescription>
              </div>
              <Button size="sm" onClick={handleDownloadPackingList}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </DialogHeader>

          <div className="border rounded-lg p-6 bg-card space-y-6 text-sm">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="text-xl font-bold tracking-tight mb-1">PACKING LIST</div>
                <div className="font-semibold">{invoice.organization.name}</div>
                {invoice.organization.settings?.email && (
                  <div className="text-muted-foreground text-xs">{invoice.organization.settings.email}</div>
                )}
                {invoice.organization.settings?.phone && (
                  <div className="text-muted-foreground text-xs">{invoice.organization.settings.phone}</div>
                )}
              </div>
              <div className="text-right space-y-1">
                <div><span className="text-muted-foreground">Invoice #: </span><span className="font-semibold">{invoice.number}</span></div>
                <div><span className="text-muted-foreground">Date: </span><span>{formatInvoiceDate(invoice.date)}</span></div>
                <div><span className="text-muted-foreground">Status: </span><span className="font-medium">{invoice.status}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-md">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</div>
                <div className="font-medium">{invoice.customer.name}</div>
                {invoice.customer.email && <div className="text-xs text-muted-foreground">{invoice.customer.email}</div>}
                {formatAddressLines(invoice.customer.billingAddress).map((line, i) => (
                  <div key={i} className="text-xs text-muted-foreground">{line}</div>
                ))}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ship To</div>
                {shipToLines.length > 0 ? (
                  shipToLines.map((line, i) => (
                    <div key={i} className={i === 0 ? "font-medium" : "text-xs text-muted-foreground"}>
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="font-medium">{invoice.customer.name}</div>
                )}
              </div>
            </div>

            {parsedNotes.sideMark && (
              <div className="bg-muted/40 p-3 rounded-md border text-xs space-y-1">
                <div className="font-semibold text-muted-foreground uppercase tracking-wider">Side Mark</div>
                <div className="font-medium whitespace-pre-wrap">{parsedNotes.sideMark}</div>
              </div>
            )}

            <div>
              <div className="font-semibold mb-2">Items to Pack</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center w-28">Qty Ordered</TableHead>
                    <TableHead className="text-center w-28">Qty Shipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.description}</div>
                        {item.product?.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {item.product.sku}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedNotes.notes && (
              <div className="border-t pt-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Shipping Notes</div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{parsedNotes.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {invoice.number}
            </h1>
            <p className="text-muted-foreground">Invoice Details</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Invoice
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPackingListOpen(true)}
          >
            <Package className="mr-2 h-4 w-4" />
            Packing List
          </Button>
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Invoice
          </Button>
          {invoice.status === InvoiceStatus.DRAFT && (
            <Button
              onClick={() => handleStatusUpdate(InvoiceStatus.SENT)}
            >
              Mark as Sent
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* From Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>From</span>
              {invoice.organization.settings?.logoUrl && (
                <img
                  src={invoice.organization.settings.logoUrl}
                  alt="Company Logo"
                  className="h-8 max-w-[100px] object-contain"
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              <div className="font-medium">{invoice.organization.name}</div>
              {invoice.organization.settings && typeof invoice.organization.settings === 'object' && (
                <>
                  {invoice.organization.settings.email && (
                    <div className="text-muted-foreground">
                      {invoice.organization.settings.email}
                    </div>
                  )}
                  {invoice.organization.settings.phone && (
                    <div className="text-muted-foreground">
                      {invoice.organization.settings.phone}
                    </div>
                  )}
                  {invoice.organization.settings.address && (
                    <div className="text-muted-foreground">
                      {invoice.organization.settings.address.street && (
                        <div>{invoice.organization.settings.address.street}</div>
                      )}
                      {(invoice.organization.settings.address.city ||
                        invoice.organization.settings.address.state ||
                        invoice.organization.settings.address.zip) && (
                          <div>
                            {[
                              invoice.organization.settings.address.city,
                              invoice.organization.settings.address.state,
                              invoice.organization.settings.address.zip,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                      {invoice.organization.settings.address.country && (
                        <div>{invoice.organization.settings.address.country}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              <div className="font-medium">{invoice.customer.name}</div>
              {invoice.customer.email && (
                <div className="text-muted-foreground">
                  {invoice.customer.email}
                </div>
              )}
              {invoice.customer.billingAddress && (
                <div className="text-muted-foreground">
                  {invoice.customer.billingAddress.street && (
                    <div>{invoice.customer.billingAddress.street}</div>
                  )}
                  {(invoice.customer.billingAddress.city ||
                    invoice.customer.billingAddress.state ||
                    invoice.customer.billingAddress.zip) && (
                      <div>
                        {[
                          invoice.customer.billingAddress.city,
                          invoice.customer.billingAddress.state,
                          invoice.customer.billingAddress.zip,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  {invoice.customer.billingAddress.country && (
                    <div>{invoice.customer.billingAddress.country}</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ship To Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ship To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              {shipToLines.length > 0 ? (
                shipToLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={idx === 0 ? "font-medium" : "text-muted-foreground"}
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground italic">
                  Same as billing address
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${invoice.status === InvoiceStatus.PAID
                  ? "bg-green-100 text-green-800"
                  : invoice.status === InvoiceStatus.SENT
                    ? "bg-blue-100 text-blue-800"
                    : isOverdue
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
              >
                {isOverdue && invoice.status !== InvoiceStatus.PAID
                  ? "OVERDUE"
                  : invoice.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{formatInvoiceDate(invoice.date)}</span>
            </div>
            {parsedNotes.sideMark && (
              <div className="flex justify-between items-start gap-2 pt-1 border-t">
                <span className="text-muted-foreground shrink-0">Side Mark:</span>
                <span className="font-medium text-right whitespace-pre-wrap">{parsedNotes.sideMark}</span>
              </div>
            )}
            <div className="flex justify-between font-medium pt-1 border-t">
              <span>Total:</span>
              <span>${Number(invoice.total).toLocaleString()}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="text-green-600">
                    ${invoice.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Remaining:</span>
                  <span>${invoice.remainingAmount.toLocaleString()}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.description}</div>
                    {item.product && (
                      <div className="text-sm text-muted-foreground">
                        {item.product.sku && `SKU: ${item.product.sku}`}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.rate.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    ${item.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${Number(invoice.subtotal).toLocaleString()}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${Number(invoice.tax).toLocaleString()}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${Number(invoice.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${Number(invoice.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>{payment.reference || "-"}</TableCell>
                    <TableCell className="text-right">
                      ${Number(payment.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPayment(payment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Record Payment */}
      {invoice.remainingAmount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsPaymentDialogOpen(true)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
            <Dialog
              open={isPaymentDialogOpen}
              onOpenChange={setIsPaymentDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment for this invoice
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={invoice.remainingAmount}
                        value={paymentData.amount}
                        onChange={(e) =>
                          setPaymentData({
                            ...paymentData,
                            amount: e.target.value,
                          })
                        }
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setPaymentData({
                            ...paymentData,
                            amount: invoice.total.toString(),
                          })
                        }
                      >
                        Whole Amount
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Remaining: ${invoice.remainingAmount.toLocaleString()} | Total: ${invoice.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={paymentData.date}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          date: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Payment Method *</Label>
                    <Select
                      value={paymentData.method}
                      onValueChange={(value) =>
                        setPaymentData({
                          ...paymentData,
                          method: value as PaymentMethod,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                        <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                        <SelectItem value={PaymentMethod.CREDIT_CARD}>
                          Credit Card
                        </SelectItem>
                        <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value={PaymentMethod.PREPAID_CREDIT}>
                          Prepaid Credit
                        </SelectItem>
                        <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      value={paymentData.reference}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          reference: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPaymentDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Record Payment</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Edit Payment Dialog */}
      {editingPayment && (
        <Dialog
          open={isEditPaymentDialogOpen}
          onOpenChange={setIsEditPaymentDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
              <DialogDescription>
                Update payment information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount *</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editingPayment.amount}
                    onChange={(e) =>
                      setEditingPayment({
                        ...editingPayment,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEditingPayment({
                        ...editingPayment,
                        amount: invoice.total,
                      })
                    }
                  >
                    Whole Amount
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Invoice Total: ${invoice.total.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editingPayment.date}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      date: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-method">Payment Method *</Label>
                <Select
                  value={editingPayment.method}
                  onValueChange={(value) =>
                    setEditingPayment({
                      ...editingPayment,
                      method: value as PaymentMethod,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                    <SelectItem value={PaymentMethod.CHECK}>Check</SelectItem>
                    <SelectItem value={PaymentMethod.CREDIT_CARD}>
                      Credit Card
                    </SelectItem>
                    <SelectItem value={PaymentMethod.BANK_TRANSFER}>
                      Bank Transfer
                    </SelectItem>
                    <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reference">Reference</Label>
                <Input
                  id="edit-reference"
                  value={editingPayment.reference || ""}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      reference: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingPayment.notes || ""}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditPaymentDialogOpen(false);
                    setEditingPayment(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Payment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Invoice Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice {invoice?.number}? This action cannot be undone.
              {invoice?.payments && invoice.payments.length > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  This invoice has {invoice.payments.length} payment(s). Please delete payments first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvoice}
              disabled={isDeleting || (invoice?.payments && invoice.payments.length > 0)}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes and Terms */}
      {(parsedNotes.notes || invoice.terms) && (
        <div className="grid gap-6 md:grid-cols-2">
          {parsedNotes.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{parsedNotes.notes}</p>
              </CardContent>
            </Card>
          )}
          {invoice.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
