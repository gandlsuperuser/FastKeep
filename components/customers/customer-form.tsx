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

import { Plus, Trash2, Upload, FileText, Building2, CheckCircle2, X } from "lucide-react";

interface Customer {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  paymentTerms?: string | null;
  creditLimit?: number | null;
  prepaidCredit?: number | null;
  taxId?: string | null;
  notes?: string | null;
  w9Url?: string | null;
  w9Name?: string | null;
  salesPermitUrl?: string | null;
  salesPermitName?: string | null;
}

interface CustomerFormProps {
  customer?: Customer | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    billingAddress: {
      street: customer?.billingAddress?.street || "",
      city: customer?.billingAddress?.city || "",
      state: customer?.billingAddress?.state || "",
      zip: customer?.billingAddress?.zip || "",
      country: customer?.billingAddress?.country || "US",
    },
    shippingAddress: {
      street: customer?.shippingAddress?.street || "",
      city: customer?.shippingAddress?.city || "",
      state: customer?.shippingAddress?.state || "",
      zip: customer?.shippingAddress?.zip || "",
      country: customer?.shippingAddress?.country || "US",
    },
    paymentTerms: customer?.paymentTerms || "Net 30",
    creditLimit: customer?.creditLimit?.toString() || "",
    prepaidCredit: customer?.prepaidCredit?.toString() || "",
    taxId: customer?.taxId || "",
    notes: customer?.notes || "",
    w9Url: customer?.w9Url || "",
    w9Name: customer?.w9Name || "",
    salesPermitUrl: customer?.salesPermitUrl || "",
    salesPermitName: customer?.salesPermitName || "",
  });

  const handleDocUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "w9" | "salesPermit"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      setError("Please select a PDF or image file");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("File size must be less than 15MB");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (type === "w9") {
        setFormData((prev) => ({
          ...prev,
          w9Url: reader.result as string,
          w9Name: file.name,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          salesPermitUrl: reader.result as string,
          salesPermitName: file.name,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = customer?.id
        ? `/api/customers/${customer.id}`
        : "/api/customers";
      const method = customer?.id ? "PUT" : "POST";

      const payload = {
        ...formData,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
        prepaidCredit: formData.prepaidCredit && formData.prepaidCredit.trim() !== "" 
          ? parseFloat(formData.prepaidCredit) 
          : 0,
        billingAddress: Object.values(formData.billingAddress).some(v => v)
          ? formData.billingAddress
          : undefined,
        shippingAddress: Object.values(formData.shippingAddress).some(v => v)
          ? formData.shippingAddress
          : undefined,
        w9Url: formData.w9Url || null,
        w9Name: formData.w9Name || null,
        salesPermitUrl: formData.salesPermitUrl || null,
        salesPermitName: formData.salesPermitName || null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to save customer";
        const details = data.details ? `: ${data.details}` : "";
        setError(`${errorMsg}${details}`);
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving customer:", error);
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxId">Tax ID</Label>
            <Input
              id="taxId"
              value={formData.taxId}
              onChange={(e) =>
                setFormData({ ...formData, taxId: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Billing Address</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="billingStreet">Street</Label>
            <Input
              id="billingStreet"
              value={formData.billingAddress.street}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    street: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingCity">City</Label>
            <Input
              id="billingCity"
              value={formData.billingAddress.city}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    city: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingState">State</Label>
            <Input
              id="billingState"
              value={formData.billingAddress.state}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    state: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingZip">ZIP Code</Label>
            <Input
              id="billingZip"
              value={formData.billingAddress.zip}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    zip: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingCountry">Country</Label>
            <Input
              id="billingCountry"
              value={formData.billingAddress.country}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    country: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Shipping Address</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="shippingStreet">Street</Label>
            <Input
              id="shippingStreet"
              value={formData.shippingAddress.street}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    street: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingCity">City</Label>
            <Input
              id="shippingCity"
              value={formData.shippingAddress.city}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    city: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingState">State</Label>
            <Input
              id="shippingState"
              value={formData.shippingAddress.state}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    state: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingZip">ZIP Code</Label>
            <Input
              id="shippingZip"
              value={formData.shippingAddress.zip}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    zip: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shippingCountry">Country</Label>
            <Input
              id="shippingCountry"
              value={formData.shippingAddress.country}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  shippingAddress: {
                    ...formData.shippingAddress,
                    country: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Payment Terms & Credit */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Terms</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Select
              value={formData.paymentTerms}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentTerms: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
                <SelectItem value="Net 90">Net 90</SelectItem>
                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit</Label>
            <Input
              id="creditLimit"
              type="number"
              step="0.01"
              value={formData.creditLimit}
              onChange={(e) =>
                setFormData({ ...formData, creditLimit: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prepaidCredit">Prepaid Credit</Label>
            <Input
              id="prepaidCredit"
              type="number"
              step="0.01"
              value={formData.prepaidCredit}
              onChange={(e) =>
                setFormData({ ...formData, prepaidCredit: e.target.value })
              }
              placeholder="Manual prepaid credit/adjustment"
            />
          </div>
        </div>
      </div>

      {/* Tax Documents (W-9 & Sales Permit) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Tax & Legal Documents
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* W-9 Upload */}
          <div className="p-3.5 border rounded-lg bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-xs flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-500" />
                IRS Form W-9
              </Label>
              {formData.w9Url ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Attached
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Optional</span>
              )}
            </div>

            {formData.w9Url ? (
              <div className="flex items-center justify-between p-2 rounded bg-background border text-xs">
                <span className="truncate font-mono max-w-[200px] text-foreground">
                  {formData.w9Name || "w9_document.pdf"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, w9Url: "", w9Name: "" }))
                  }
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  title="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div>
                <Label
                  htmlFor="customer-w9-upload"
                  className="cursor-pointer flex items-center justify-center gap-2 p-2.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload W-9 (PDF or Image)
                </Label>
                <input
                  id="customer-w9-upload"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => handleDocUpload(e, "w9")}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Sales Permit Upload */}
          <div className="p-3.5 border rounded-lg bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-xs flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-emerald-500" />
                Sales Tax Permit / Resale
              </Label>
              {formData.salesPermitUrl ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Attached
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Optional</span>
              )}
            </div>

            {formData.salesPermitUrl ? (
              <div className="flex items-center justify-between p-2 rounded bg-background border text-xs">
                <span className="truncate font-mono max-w-[200px] text-foreground">
                  {formData.salesPermitName || "sales_permit.pdf"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      salesPermitUrl: "",
                      salesPermitName: "",
                    }))
                  }
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  title="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div>
                <Label
                  htmlFor="customer-permit-upload"
                  className="cursor-pointer flex items-center justify-center gap-2 p-2.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Sales Permit (PDF or Image)
                </Label>
                <input
                  id="customer-permit-upload"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => handleDocUpload(e, "salesPermit")}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          rows={4}
        />
      </div>

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : customer?.id ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}



