"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { ArrowLeft, Mail, Download, FileText } from "lucide-react";
import { EstimateStatus } from "@prisma/client";

interface Estimate {
  id: string;
  number: string;
  date: string;
  expiryDate: string | null;
  status: EstimateStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  convertedToInvoice: boolean;
  convertedInvoiceId: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    billingAddress: any;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    product: {
      name: string;
      sku: string | null;
    } | null;
  }>;
}

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchEstimate();
  }, [params.id]);

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/estimates/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEstimate(data);
      } else {
        router.push("/dashboard/estimates");
      }
    } catch (error) {
      console.error("Error fetching estimate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    setConverting(true);
    try {
      const response = await fetch(`/api/estimates/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/dashboard/invoices/${data.invoice.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to convert estimate");
        setConverting(false);
      }
    } catch (error) {
      console.error("Error converting estimate:", error);
      alert("Failed to convert estimate");
      setConverting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!estimate) {
    return <div>Estimate not found</div>;
  }

  const isExpired =
    estimate.expiryDate && new Date(estimate.expiryDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/estimates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {estimate.number}
            </h1>
            <p className="text-muted-foreground">Estimate Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {!estimate.convertedToInvoice && (
            <>
              <Button onClick={() => setIsConvertDialogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Convert to Invoice
              </Button>
              <Dialog
                open={isConvertDialogOpen}
                onOpenChange={setIsConvertDialogOpen}
              >
                <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convert Estimate to Invoice</DialogTitle>
                  <DialogDescription>
                    This will create a new invoice from this estimate. The
                    estimate will be marked as converted.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsConvertDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConvertToInvoice}
                    disabled={converting}
                  >
                    {converting ? "Converting..." : "Convert"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </>
          )}
          {estimate.convertedToInvoice && estimate.convertedInvoiceId && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/invoices/${estimate.convertedInvoiceId}`}>
                View Invoice
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{estimate.customer.name}</div>
              {estimate.customer.email && (
                <div className="text-sm text-muted-foreground">
                  {estimate.customer.email}
                </div>
              )}
              {estimate.customer.billingAddress && (
                <div className="text-sm text-muted-foreground">
                  {estimate.customer.billingAddress.street && (
                    <div>{estimate.customer.billingAddress.street}</div>
                  )}
                  {(estimate.customer.billingAddress.city ||
                    estimate.customer.billingAddress.state ||
                    estimate.customer.billingAddress.zip) && (
                    <div>
                      {[
                        estimate.customer.billingAddress.city,
                        estimate.customer.billingAddress.state,
                        estimate.customer.billingAddress.zip,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Estimate Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Estimate Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  estimate.status === EstimateStatus.ACCEPTED
                    ? "bg-green-100 text-green-800"
                    : estimate.status === EstimateStatus.SENT
                    ? "bg-blue-100 text-blue-800"
                    : estimate.status === EstimateStatus.REJECTED
                    ? "bg-red-100 text-red-800"
                    : isExpired
                    ? "bg-gray-100 text-gray-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {isExpired ? "EXPIRED" : estimate.status}
                {estimate.convertedToInvoice && " (Converted)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{new Date(estimate.date).toLocaleDateString()}</span>
            </div>
            {estimate.expiryDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expiry Date:</span>
                <span>{new Date(estimate.expiryDate).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>${Number(estimate.total).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimate Items */}
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
              {estimate.items.map((item) => (
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
                <span>${Number(estimate.subtotal).toLocaleString()}</span>
              </div>
              {estimate.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${Number(estimate.tax).toLocaleString()}</span>
                </div>
              )}
              {estimate.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${Number(estimate.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${Number(estimate.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes and Terms */}
      {(estimate.notes || estimate.terms) && (
        <div className="grid gap-6 md:grid-cols-2">
          {estimate.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{estimate.notes}</p>
              </CardContent>
            </Card>
          )}
          {estimate.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{estimate.terms}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}


