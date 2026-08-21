"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerDocumentModalProps {
  customer: {
    id: string;
    name: string;
    w9Url?: string | null;
    w9Name?: string | null;
    w9UploadedAt?: string | Date | null;
    salesPermitUrl?: string | null;
    salesPermitName?: string | null;
    salesPermitUploadedAt?: string | Date | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedCustomer: any) => void;
}

export function CustomerDocumentModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: CustomerDocumentModalProps) {
  const [uploadingType, setUploadingType] = useState<"w9" | "salesPermit" | null>(null);
  const [deletingType, setDeletingType] = useState<"w9" | "salesPermit" | null>(null);
  const [error, setError] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    url: string;
    name: string;
  } | null>(null);

  const w9InputRef = useRef<HTMLInputElement>(null);
  const permitInputRef = useRef<HTMLInputElement>(null);

  if (!customer) return null;

  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return "—";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "w9" | "salesPermit"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed types: PDF, Images
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      setError("Please upload a PDF or image file (PNG, JPG, SVG)");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("File size must be less than 15MB");
      return;
    }

    setError("");
    setUploadingType(type);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fileData = reader.result as string;
        const response = await fetch(`/api/customers/${customer.id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            fileData,
            fileName: file.name,
          }),
        });

        const data = await response.json();
        if (response.ok && data.customer) {
          onSuccess(data.customer);
        } else {
          setError(data.error || "Failed to upload document");
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError("Something went wrong while uploading file");
      } finally {
        setUploadingType(null);
        // Reset input value so same file can be re-uploaded if needed
        if (e.target) e.target.value = "";
      }
    };

    reader.onerror = () => {
      setError("Failed to read file");
      setUploadingType(null);
    };

    reader.readAsDataURL(file);
  };

  const handleDelete = async (type: "w9" | "salesPermit") => {
    const docName = type === "w9" ? "W-9 Form" : "Sales Permit";
    if (!confirm(`Are you sure you want to remove this ${docName}?`)) return;

    setError("");
    setDeletingType(type);

    try {
      const response = await fetch(
        `/api/customers/${customer.id}/documents?type=${type}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (response.ok && data.customer) {
        onSuccess(data.customer);
      } else {
        setError(data.error || `Failed to remove ${docName}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(`Failed to remove ${docName}`);
    } finally {
      setDeletingType(null);
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">Customer Documents</DialogTitle>
                <DialogDescription>
                  Manage W-9 tax forms and Sales Tax Permits for{" "}
                  <strong className="text-foreground">{customer.name}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4 pt-2">
            {/* W-9 Form Card */}
            <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">IRS Form W-9</h4>
                      {customer.w9Url ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                          Missing
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Request for Taxpayer Identification Number and Certification
                    </p>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={w9InputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload(e, "w9")}
                  className="hidden"
                />

                {customer.w9Url ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewDoc({
                          title: "W-9 Form",
                          url: customer.w9Url!,
                          name: customer.w9Name || "W9_Form.pdf",
                        })
                      }
                      className="text-xs h-8"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDownload(customer.w9Url!, customer.w9Name || "W9_Form.pdf")
                      }
                      className="text-xs h-8"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => w9InputRef.current?.click()}
                      disabled={uploadingType === "w9"}
                      className="text-xs h-8"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      {uploadingType === "w9" ? "Uploading..." : "Replace"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete("w9")}
                      disabled={deletingType === "w9"}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Remove W-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => w9InputRef.current?.click()}
                    disabled={uploadingType === "w9"}
                    className="text-xs h-8 shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {uploadingType === "w9" ? "Uploading..." : "Upload W-9"}
                  </Button>
                )}
              </div>

              {customer.w9Url && (
                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate font-mono font-medium text-foreground max-w-xs">
                    {customer.w9Name || "w9_document.pdf"}
                  </span>
                  <span>Uploaded: {formatDate(customer.w9UploadedAt)}</span>
                </div>
              )}
            </div>

            {/* Sales Permit Card */}
            <div className="border rounded-xl p-4 bg-card shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">
                        Sales Tax Permit / Resale Certificate
                      </h4>
                      {customer.salesPermitUrl ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                          Missing
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      State resale license, sales tax exemption certificate, or permit
                    </p>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={permitInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload(e, "salesPermit")}
                  className="hidden"
                />

                {customer.salesPermitUrl ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewDoc({
                          title: "Sales Tax Permit",
                          url: customer.salesPermitUrl!,
                          name: customer.salesPermitName || "Sales_Permit.pdf",
                        })
                      }
                      className="text-xs h-8"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDownload(
                          customer.salesPermitUrl!,
                          customer.salesPermitName || "Sales_Permit.pdf"
                        )
                      }
                      className="text-xs h-8"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => permitInputRef.current?.click()}
                      disabled={uploadingType === "salesPermit"}
                      className="text-xs h-8"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      {uploadingType === "salesPermit" ? "Uploading..." : "Replace"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete("salesPermit")}
                      disabled={deletingType === "salesPermit"}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Remove Sales Permit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => permitInputRef.current?.click()}
                    disabled={uploadingType === "salesPermit"}
                    className="text-xs h-8 shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {uploadingType === "salesPermit"
                      ? "Uploading..."
                      : "Upload Sales Permit"}
                  </Button>
                )}
              </div>

              {customer.salesPermitUrl && (
                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate font-mono font-medium text-foreground max-w-xs">
                    {customer.salesPermitName || "sales_permit.pdf"}
                  </span>
                  <span>
                    Uploaded: {formatDate(customer.salesPermitUploadedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4">
            <DialogHeader className="pb-2 border-b flex flex-row items-center justify-between">
              <div>
                <DialogTitle>{previewDoc.title}</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {previewDoc.name}
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownload(previewDoc.url, previewDoc.name)}
                className="text-xs mr-6"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download
              </Button>
            </DialogHeader>

            <div className="flex-1 w-full h-full min-h-0 bg-muted/20 rounded-md overflow-hidden flex items-center justify-center p-2">
              {previewDoc.url.startsWith("data:application/pdf") ||
              previewDoc.name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full rounded border-0"
                  title={previewDoc.title}
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-w-full max-h-full object-contain rounded shadow-sm"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
