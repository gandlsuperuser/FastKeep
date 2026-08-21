"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus, Trash2 } from "lucide-react";
import { InvoiceStatus } from "@prisma/client";
import { extractInvoiceMetadata, combineInvoiceMetadata } from "@/lib/invoice-utils";
import { LineItemProductSearch } from "@/components/invoices/line-item-product-search";

interface InvoiceItem {
  id?: string;
  productId?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax?: number;
}

interface Invoice {
  id?: string;
  customerId?: string;
  date?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  items?: InvoiceItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  notes?: string;
  terms?: string;
  taxRate?: number;
  shipTo?: string;
  sideMark?: string;
}

interface InvoiceFormProps {
  invoice?: Invoice | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceForm({ invoice, onSuccess, onCancel }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const initialNotesParsed = extractInvoiceMetadata(invoice?.notes);

  const [formData, setFormData] = useState({
    customerId: invoice?.customerId || "",
    shipTo: invoice?.shipTo || initialNotesParsed.shipTo || "",
    sideMark: invoice?.sideMark || initialNotesParsed.sideMark || "",
    date: invoice?.date || new Date().toISOString().split("T")[0],
    dueDate: invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: invoice?.status || InvoiceStatus.DRAFT,
    items: invoice?.items || [
      { description: "", quantity: 1, rate: 0, amount: 0 },
    ],
    taxRate: invoice?.taxRate ?? (invoice?.subtotal && invoice?.tax ? (invoice.tax / invoice.subtotal) * 100 : 0),
    discount: invoice?.discount || 0,
    notes: invoice?.notes ? initialNotesParsed.notes : "",
    terms: invoice?.terms || "",
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  // Update form data when invoice prop changes (for editing)
  useEffect(() => {
    if (invoice) {
      const formatDate = (date: string | Date | undefined): string => {
        if (!date) return new Date().toISOString().split("T")[0];
        if (typeof date === 'string') {
          return new Date(date).toISOString().split("T")[0];
        }
        return date.toISOString().split("T")[0];
      };

      const parsedNotes = extractInvoiceMetadata(invoice.notes);

      setFormData({
        customerId: invoice.customerId || "",
        shipTo: invoice.shipTo || parsedNotes.shipTo || "",
        sideMark: invoice.sideMark || parsedNotes.sideMark || "",
        date: formatDate(invoice.date),
        dueDate: formatDate(invoice.dueDate),
        status: invoice.status || InvoiceStatus.DRAFT,
        items: invoice.items?.map(item => ({
          id: item.id,
          productId: item.productId,
          description: item.description || "",
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
          tax: item.tax ? Number(item.tax) : undefined,
        })) || [{ description: "", quantity: 1, rate: 0, amount: 0 }],
        taxRate: invoice.taxRate ?? (invoice.subtotal && invoice.tax ? (Number(invoice.tax) / Number(invoice.subtotal)) * 100 : 0),
        discount: Number(invoice.discount) || 0,
        notes: parsedNotes.notes || "",
        terms: invoice.terms || "",
      });
    }
  }, [invoice]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=1000");
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=1000");
      const data = await response.json();
      setProducts(data.products?.filter((p: any) => p.isActive) || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const calculateItemAmount = (quantity: number, rate: number) => {
    return Number(quantity || 0) * Number(rate || 0);
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const tax = Number(subtotal) * (Number(formData.taxRate || 0) / 100);
    const discountAmount = Number(formData.discount || 0);
    const total = Number(subtotal) + Number(tax) - Number(discountAmount);

    return { subtotal: Number(subtotal), tax: Number(tax), total: Number(total) };
  };

  const { subtotal, tax, total } = calculateTotals();

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };

    if (field === "productId") {
      if (value === "custom") {
        item.productId = undefined;
      } else {
        const product = products.find((p) => p.id === value);
        if (product) {
          item.productId = value;
          item.description = product.name;
          item.rate = product.price;
          item.quantity = 1;
          item.amount = calculateItemAmount(1, product.price);
        }
      }
    } else if (field === "quantity") {
      item.quantity = parseFloat(value) || 0;
      item.amount = calculateItemAmount(item.quantity, item.rate);
    } else if (field === "rate") {
      item.rate = parseFloat(value) || 0;
      item.amount = calculateItemAmount(item.quantity, item.rate);
    } else if (field === "description") {
      item.description = value;
    } else if (field === "tax") {
      item.tax = value ? parseFloat(value) : undefined;
    } else if (field === "id") {
      item.id = value;
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index: number, product: any) => {
    const newItems = [...formData.items];
    const currentQty = Number(newItems[index].quantity) > 0 ? Number(newItems[index].quantity) : 1;
    const price = Number(product.price) || 0;

    newItems[index] = {
      ...newItems[index],
      productId: product.id,
      description: product.name,
      rate: price,
      quantity: currentQty,
      amount: calculateItemAmount(currentQty, price),
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleClearProduct = (index: number) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      productId: undefined,
    };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { description: "", quantity: 1, rate: 0, amount: 0 },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.customerId) {
      setError("Please select a customer");
      setLoading(false);
      return;
    }

    if (formData.items.length === 0 || formData.items.some((item) => !item.description)) {
      setError("Please add at least one item with description");
      setLoading(false);
      return;
    }

    try {
      const url = invoice?.id
        ? `/api/invoices/${invoice.id}`
        : "/api/invoices";
      const method = invoice?.id ? "PUT" : "POST";

      const combinedNotes = combineInvoiceMetadata(formData.shipTo, formData.sideMark, formData.notes);

      const payload = {
        customerId: formData.customerId,
        date: formData.date,
        dueDate: formData.dueDate,
        status: formData.status,
        items: formData.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: Number(item.amount) || 0,
          productId: item.productId === "custom" ? undefined : item.productId || undefined,
          tax: item.tax ? Number(item.tax) : undefined,
        })),
        subtotal: Number(subtotal) || 0,
        tax: Number(tax) || 0,
        discount: Number(formData.discount) || 0,
        total: Number(total) || 0,
        notes: combinedNotes,
        terms: formData.terms || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save invoice");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving invoice:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">Customer *</Label>
          <Select
            value={formData.customerId}
            onValueChange={(value) => {
              const selectedCustomer = customers.find((c) => c.id === value);
              let defaultShipTo = formData.shipTo;
              if (selectedCustomer && !formData.shipTo) {
                const shipAddr = selectedCustomer.shippingAddress || selectedCustomer.billingAddress;
                if (shipAddr) {
                  const lines = [
                    selectedCustomer.name,
                    shipAddr.street,
                    [shipAddr.city, shipAddr.state, shipAddr.zip].filter(Boolean).join(", "),
                    shipAddr.country,
                  ].filter(Boolean);
                  defaultShipTo = lines.join("\n");
                } else if (selectedCustomer.name) {
                  defaultShipTo = selectedCustomer.name;
                }
              }
              setFormData({ ...formData, customerId: value, shipTo: defaultShipTo });
            }}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) =>
              setFormData({ ...formData, status: value as InvoiceStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={InvoiceStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={InvoiceStatus.SENT}>Sent</SelectItem>
              <SelectItem value={InvoiceStatus.PAID}>Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Invoice Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
            required
          />
        </div>
      </div>

      {/* Shipping & Side Mark Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="shipTo">Ship To</Label>
            <span className="text-xs text-muted-foreground">
              Shipping recipient & address
            </span>
          </div>
          <Textarea
            id="shipTo"
            placeholder="Recipient Name&#10;Street Address&#10;City, State Zip&#10;Country"
            value={formData.shipTo}
            onChange={(e) => setFormData({ ...formData, shipTo: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sideMark">Side Mark</Label>
            <span className="text-xs text-muted-foreground">
              Carton / Shipping mark, PO #, Case No.
            </span>
          </div>
          <Textarea
            id="sideMark"
            placeholder="e.g., C/NO. 1-50&#10;PO #10429&#10;MADE IN USA"
            value={formData.sideMark}
            onChange={(e) => setFormData({ ...formData, sideMark: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Line Items</h3>
            <p className="text-xs text-muted-foreground">
              Type in the Item box to promptly search and select inventory products or enter custom items.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
        <div className="border rounded-lg overflow-visible">
          <div className="grid grid-cols-12 gap-2 p-2.5 bg-muted font-medium text-sm">
            <div className="col-span-5">Product / Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Rate ($)</div>
            <div className="col-span-2">Amount ($)</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 p-2.5 border-t items-start">
              <div className="col-span-5">
                <LineItemProductSearch
                  description={item.description}
                  productId={item.productId}
                  products={products}
                  onSelectProduct={(product) => handleProductSelect(index, product)}
                  onChangeDescription={(desc) => handleItemChange(index, "description", desc)}
                  onClearProduct={() => handleClearProduct(index)}
                  placeholder="Search product or enter description..."
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, "quantity", e.target.value)
                  }
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.rate}
                  onChange={(e) =>
                    handleItemChange(index, "rate", e.target.value)
                  }
                  required
                />
              </div>
              <div className="col-span-2 flex items-center h-10 font-semibold">
                ${Number(item.amount).toFixed(2)}
              </div>
              <div className="col-span-1 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={formData.items.length === 1}
                  className="text-muted-foreground hover:text-destructive"
                  title="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-md space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{`$${Number(subtotal || 0).toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="taxRate">Tax Rate (%):</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-20"
                value={formData.taxRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    taxRate: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <span>{`$${Number(tax || 0).toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="discount">Discount:</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                className="w-24"
                value={formData.discount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <span>{`-$${Number(formData.discount || 0).toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>{`$${Number(total || 0).toFixed(2)}`}</span>
          </div>
        </div>
      </div>

      {/* Notes and Terms */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="terms">Terms & Conditions</Label>
          <Textarea
            id="terms"
            value={formData.terms}
            onChange={(e) =>
              setFormData({ ...formData, terms: e.target.value })
            }
            rows={3}
          />
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : invoice?.id
            ? "Update Invoice"
            : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}


