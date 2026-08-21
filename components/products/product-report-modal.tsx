"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Printer,
  FileSpreadsheet,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  DollarSign,
  Users,
  Calendar,
  Layers,
  MapPin,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ProductReportModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ReportData {
  product: {
    id: string;
    name: string;
    sku: string | null;
    type: string;
    category: string | null;
    location: string | null;
    unit: string;
    price: number;
    cost: number;
    inventory: number | null;
    isActive: boolean;
    createdAt: string;
  };
  organization: {
    id: string;
    name: string;
    settings: any;
  };
  summary: {
    totalUnitsSold: number;
    totalRevenue: number;
    currentStock: number;
    uniqueBuyersCount: number;
    totalTransactions: number;
    stockValue: number;
  };
  movements: Array<{
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
  }>;
}

export function ProductReportModal({
  productId,
  isOpen,
  onClose,
}: ProductReportModalProps) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      fetchReport(productId);
    } else {
      setData(null);
      setSearch("");
      setTypeFilter("all");
    }
  }, [isOpen, productId]);

  const fetchReport = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}/report`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching product report:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredMovements = (data?.movements || []).filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSoldTo = m.soldTo?.toLowerCase().includes(q);
      const matchPickup = m.pickupByOrShipTo?.toLowerCase().includes(q);
      const matchRef = m.reference?.toLowerCase().includes(q);
      const matchNotes = m.notes?.toLowerCase().includes(q);
      const matchSideMark = m.sideMark?.toLowerCase().includes(q);
      return matchSoldTo || matchPickup || matchRef || matchNotes || matchSideMark;
    }
    return true;
  });

  const handleExportCSV = () => {
    if (!data) return;

    const headers = [
      "Date",
      "Activity Type",
      "Sold To (Customer)",
      "Pickup By / Ship To",
      "Side Mark",
      "Reference (Invoice #)",
      "Qty Change",
      "Unit Price",
      "Total Amount",
      "Status",
      "Notes",
    ];

    const rows = filteredMovements.map((m) => [
      new Date(m.date).toLocaleDateString(),
      m.typeName,
      m.soldTo || "-",
      m.pickupByOrShipTo || "-",
      m.sideMark || "-",
      m.reference,
      m.quantityChange,
      m.rate !== undefined ? `$${m.rate.toFixed(2)}` : "-",
      m.amount !== undefined ? `$${m.amount.toFixed(2)}` : "-",
      m.status || "-",
      `"${(m.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Inventory_Report_${data.product.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    if (!data) return;
    setIsExporting(true);

    try {
      const printContainer = document.createElement("div");
      printContainer.style.position = "fixed";
      printContainer.style.left = "0";
      printContainer.style.top = "0";
      printContainer.style.zIndex = "-9999";
      printContainer.style.width = "210mm";
      printContainer.style.padding = "16mm";
      printContainer.style.backgroundColor = "white";
      printContainer.style.fontFamily = "Arial, sans-serif";
      printContainer.style.fontSize = "11px";
      printContainer.style.color = "black";
      document.body.appendChild(printContainer);

      printContainer.innerHTML = `
        <div style="border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 4px 0;">PRODUCT INVENTORY & MOVEMENT REPORT</h1>
            <div style="font-size: 13px; font-weight: 600; color: #4b5563;">${data.organization?.name || "FastKeep"}</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #6b7280;">
            <div>Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 11px;">
            <div>
              <div style="color: #6b7280; font-size: 10px; text-transform: uppercase;">Product Name</div>
              <div style="font-weight: bold; font-size: 13px; color: #111;">${data.product.name}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 10px; text-transform: uppercase;">SKU / Code</div>
              <div style="font-weight: 600;">${data.product.sku || "N/A"}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 10px; text-transform: uppercase;">Current Stock</div>
              <div style="font-weight: bold; font-size: 13px; color: #047857;">${data.product.inventory !== null ? `${data.product.inventory} ${data.product.unit}` : "Not tracked"}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 10px; text-transform: uppercase;">Total Units Sold</div>
              <div style="font-weight: bold; font-size: 13px; color: #2563eb;">${data.summary.totalUnitsSold} ${data.product.unit}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 10px; text-transform: uppercase;">Location / Warehouse</div>
              <div>${data.product.location || "Main Warehouse"}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 10px; text-transform: uppercase;">Unit Price / Cost</div>
              <div>$${data.product.price.toFixed(2)} / $${data.product.cost.toFixed(2)}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 10px; text-transform: uppercase;">Total Revenue</div>
              <div style="font-weight: 600;">$${data.summary.totalRevenue.toFixed(2)}</div>
            </div>
            <div>
              <div style="color: #6b7280; font-size: 10px; text-transform: uppercase;">Unique Buyers</div>
              <div>${data.summary.uniqueBuyersCount} Customers</div>
            </div>
          </div>
        </div>

        <h2 style="font-size: 13px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; color: #374151;">Stock Activity & Sales Ledger</h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #374151; text-align: left;">
              <th style="padding: 6px 8px;">Date</th>
              <th style="padding: 6px 8px;">Activity</th>
              <th style="padding: 6px 8px;">Sold To (Customer)</th>
              <th style="padding: 6px 8px;">Pickup By / Ship To</th>
              <th style="padding: 6px 8px;">Side Mark</th>
              <th style="padding: 6px 8px;">Reference</th>
              <th style="padding: 6px 8px; text-align: center;">Qty</th>
              <th style="padding: 6px 8px; text-align: right;">Rate</th>
              <th style="padding: 6px 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMovements
              .map(
                (m) => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 6px 8px;">${new Date(m.date).toLocaleDateString()}</td>
                <td style="padding: 6px 8px; font-weight: 500;">${m.typeName}</td>
                <td style="padding: 6px 8px; font-weight: 600;">${m.soldTo || "-"}</td>
                <td style="padding: 6px 8px; color: #4b5563;">${m.pickupByOrShipTo || "-"}</td>
                <td style="padding: 6px 8px; color: #4b5563;">${m.sideMark || "-"}</td>
                <td style="padding: 6px 8px;">${m.reference}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: ${m.quantityChange >= 0 ? "#047857" : "#b91c1c"};">
                  ${m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                </td>
                <td style="padding: 6px 8px; text-align: right;">${m.rate !== undefined ? `$${m.rate.toFixed(2)}` : "-"}</td>
                <td style="padding: 6px 8px; text-align: right; font-weight: 600;">${m.amount !== undefined ? `$${m.amount.toFixed(2)}` : "-"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      await new Promise((r) => setTimeout(r, 400));

      const canvas = await html2canvas(printContainer, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(printContainer);

      const imgData = canvas.toDataURL("image/jpeg", 0.85);
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

      pdf.save(`Movement_Report_${data.product.name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Error generating PDF report:", err);
      alert("Failed to generate PDF report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span>Product Movement & History Report</span>
              </DialogTitle>
              <DialogDescription>
                Track when this product was added to inventory and who bought or picked it up.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={!data || loading}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                disabled={!data || loading || isExporting}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {isExporting ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
            <div>Loading movement report...</div>
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-muted-foreground">
            No report data available.
          </div>
        ) : (
          <div className="space-y-6 text-sm">
            {/* Product & Summary Header */}
            <div className="bg-muted/40 border rounded-lg p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {data.product.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {data.product.sku && <span>SKU: <strong className="text-foreground">{data.product.sku}</strong></span>}
                    {data.product.category && <span>Category: <strong className="text-foreground">{data.product.category}</strong></span>}
                    {data.product.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Location: <strong className="text-foreground">{data.product.location}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-muted-foreground">Unit Price: <span className="font-semibold text-foreground">${data.product.price.toFixed(2)}</span></div>
                  {data.product.cost > 0 && (
                    <div className="text-muted-foreground">Unit Cost: <span className="font-semibold text-foreground">${data.product.cost.toFixed(2)}</span></div>
                  )}
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border rounded-md p-3">
                  <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                    <span>Current Stock</span>
                    <Package className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">
                    {data.product.inventory !== null ? `${data.product.inventory} ${data.product.unit}` : "N/A"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Stock value: ${(data.summary.stockValue).toLocaleString()}
                  </div>
                </div>

                <div className="bg-card border rounded-md p-3">
                  <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                    <span>Total Sold / Dispatched</span>
                    <ArrowDownLeft className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="text-xl font-bold text-blue-600 mt-1">
                    {data.summary.totalUnitsSold} {data.product.unit}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Across {data.summary.totalTransactions} invoices
                  </div>
                </div>

                <div className="bg-card border rounded-md p-3">
                  <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                    <span>Total Revenue</span>
                    <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    ${data.summary.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Gross sales to date
                  </div>
                </div>

                <div className="bg-card border rounded-md p-3">
                  <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                    <span>Unique Buyers</span>
                    <Users className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {data.summary.uniqueBuyersCount}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Distinct customer accounts
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search buyer, pickup, invoice #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <SelectValue placeholder="All Activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="SOLD_INVOICE">Sold / Dispatched</SelectItem>
                    <SelectItem value="ADDED_INVENTORY">Added Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Movement Ledger Table */}
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="w-32">Activity</TableHead>
                    <TableHead>Sold To (Customer)</TableHead>
                    <TableHead>Pickup By / Ship To</TableHead>
                    <TableHead>Side Mark</TableHead>
                    <TableHead className="w-28">Reference</TableHead>
                    <TableHead className="text-center w-24">Qty</TableHead>
                    <TableHead className="text-right w-24">Rate</TableHead>
                    <TableHead className="text-right w-24">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No movement records found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(m.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {m.type === "ADDED_INVENTORY" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                              <ArrowUpRight className="mr-1 h-3 w-3" />
                              Added Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <ArrowDownLeft className="mr-1 h-3 w-3" />
                              Sold / Picked
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {m.soldTo || <span className="text-muted-foreground italic">Added to Warehouse</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.pickupByOrShipTo || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.sideMark ? (
                            <span className="font-medium text-foreground bg-muted px-1.5 py-0.5 rounded">
                              {m.sideMark}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.referenceUrl ? (
                            <Link
                              href={m.referenceUrl}
                              className="text-primary font-medium hover:underline flex items-center gap-1"
                            >
                              {m.reference}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{m.reference}</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-center font-bold text-xs ${
                            m.quantityChange >= 0 ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {m.rate !== undefined ? `$${m.rate.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold">
                          {m.amount !== undefined ? `$${m.amount.toFixed(2)}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
