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
import { ArrowLeft, Pencil, Mail, Phone, MapPin } from "lucide-react";
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
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Customer
        </Button>
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
            <div>
              <div className="text-sm text-muted-foreground">
                Outstanding Balance
              </div>
              <div className="font-medium text-lg">
                ${customer.outstandingBalance.toLocaleString()}
              </div>
            </div>
            {customer.taxId && (
              <div>
                <div className="text-sm text-muted-foreground">Tax ID</div>
                <div className="font-medium">{customer.taxId}</div>
              </div>
            )}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-primary hover:underline"
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
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(invoice.total).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
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

