"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Eye, Pencil, Settings, GripVertical, ChevronUp, ChevronDown, Calendar, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { InvoiceStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatInvoiceDate } from "@/lib/invoice-utils";

interface Invoice {
  id: string;
  number: string;
  customerId?: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  notes?: string;
  terms?: string;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
  items?: Array<{
    id?: string;
    productId?: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    tax?: number;
    product?: {
      name: string;
      sku: string | null;
    } | null;
  }>;
  payments: Array<{ amount: number }>;
}

type ColumnKey =
  | "number"
  | "customer"
  | "customerEmail"
  | "date"
  | "itemsCount"
  | "subtotal"
  | "tax"
  | "amount"
  | "paidAmount"
  | "balance"
  | "status"
  | "actions";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  align?: "left" | "right" | "center";
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "number", label: "Invoice #", defaultVisible: true, align: "left" },
  { key: "customer", label: "Customer", defaultVisible: true, align: "left" },
  { key: "customerEmail", label: "Email", defaultVisible: false, align: "left" },
  { key: "date", label: "Date", defaultVisible: true, align: "left" },
  { key: "itemsCount", label: "Items", defaultVisible: false, align: "center" },
  { key: "subtotal", label: "Subtotal", defaultVisible: false, align: "right" },
  { key: "tax", label: "Tax", defaultVisible: false, align: "right" },
  { key: "amount", label: "Total Amount", defaultVisible: true, align: "right" },
  { key: "paidAmount", label: "Paid", defaultVisible: true, align: "right" },
  { key: "balance", label: "Balance Due", defaultVisible: true, align: "right" },
  { key: "status", label: "Status", defaultVisible: true, align: "left" },
  { key: "actions", label: "Actions", defaultVisible: true, align: "right" },
];

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = ALL_COLUMNS.reduce(
  (acc, col) => ({ ...acc, [col.key]: col.defaultVisible }),
  {} as Record<ColumnKey, boolean>
);

const DEFAULT_COLUMN_ORDER: ColumnKey[] = ALL_COLUMNS.map((c) => c.key);

const STORAGE_KEY = "fastkeep_invoice_columns_preferences_v2";
const STORAGE_ORDER_KEY = "fastkeep_invoice_columns_order_v2";

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [draggedCol, setDraggedCol] = useState<ColumnKey | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnKey | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<ColumnKey | null>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (key: ColumnKey) => {
    if (key === "actions") return;
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder(key === "date" || key === "amount" || key === "subtotal" ? "desc" : "asc");
    }
  };

  useEffect(() => {
    try {
      const savedVisible = localStorage.getItem(STORAGE_KEY);
      if (savedVisible) {
        const parsed = JSON.parse(savedVisible);
        setVisibleColumns((prev) => ({ ...prev, ...parsed }));
      }
      const savedOrder = localStorage.getItem(STORAGE_ORDER_KEY);
      if (savedOrder) {
        const parsedOrder: ColumnKey[] = JSON.parse(savedOrder);
        // Ensure all valid keys exist and filter out any deprecated keys (like dueDate)
        const validKeys = ALL_COLUMNS.map((c) => c.key);
        const filteredOrder = parsedOrder.filter((k) => validKeys.includes(k));
        const missingKeys = validKeys.filter((k) => !filteredOrder.includes(k));
        setColumnOrder([...filteredOrder, ...missingKeys]);
      }
    } catch (error) {
      console.error("Failed to load column settings:", error);
    }
  }, []);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const anyVisible = Object.values(next).some(Boolean);
      if (!anyVisible) return prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error("Failed to save column settings:", error);
      }
      return next;
    });
  };

  const handleColumnReorder = (sourceKey: ColumnKey | null, targetKey: ColumnKey) => {
    if (!sourceKey || sourceKey === targetKey) return;
    setColumnOrder((prev) => {
      const next = [...prev];
      const sourceIndex = next.indexOf(sourceKey);
      const targetIndex = next.indexOf(targetKey);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, sourceKey);
      try {
        localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save column order:", e);
      }
      return next;
    });
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= columnOrder.length || toIndex >= columnOrder.length) return;
    setColumnOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      try {
        localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save column order:", e);
      }
      return next;
    });
  };

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VISIBLE_COLUMNS));
      localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(DEFAULT_COLUMN_ORDER));
    } catch (error) {
      console.error("Failed to reset column settings:", error);
    }
  };

  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter((key) => visibleColumns[key]);
  }, [columnOrder, visibleColumns]);

  const visibleColumnCount = orderedVisibleColumns.length;

  const sortedInvoices = useMemo(() => {
    if (!sortBy) return invoices;

    return [...invoices].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date": {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          comparison = timeA - timeB;
          break;
        }
        case "number": {
          comparison = (a.number || "").localeCompare(b.number || "", undefined, {
            numeric: true,
            sensitivity: "base",
          });
          break;
        }
        case "customer": {
          comparison = (a.customer?.name || "").localeCompare(b.customer?.name || "");
          break;
        }
        case "customerEmail": {
          comparison = (a.customer?.email || "").localeCompare(b.customer?.email || "");
          break;
        }
        case "status": {
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        }
        case "itemsCount": {
          const countA = a.items?.length || 0;
          const countB = b.items?.length || 0;
          comparison = countA - countB;
          break;
        }
        case "subtotal": {
          const subtotalA = Number(a.subtotal || a.total || 0);
          const subtotalB = Number(b.subtotal || b.total || 0);
          comparison = subtotalA - subtotalB;
          break;
        }
        case "tax": {
          const taxA = Number(a.tax || 0);
          const taxB = Number(b.tax || 0);
          comparison = taxA - taxB;
          break;
        }
        case "amount": {
          const amountA = Number(a.total || 0);
          const amountB = Number(b.total || 0);
          comparison = amountA - amountB;
          break;
        }
        case "paidAmount": {
          const paidA = (a.payments || []).reduce((s, p) => s + Number(p.amount), 0);
          const paidB = (b.payments || []).reduce((s, p) => s + Number(p.amount), 0);
          comparison = paidA - paidB;
          break;
        }
        case "balance": {
          const paidA = (a.payments || []).reduce((s, p) => s + Number(p.amount), 0);
          const paidB = (b.payments || []).reduce((s, p) => s + Number(p.amount), 0);
          const balA = Math.max(0, Number(a.total) - paidA);
          const balB = Math.max(0, Number(b.total) - paidB);
          comparison = balA - balB;
          break;
        }
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [invoices, sortBy, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=1000");
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (customerFilter !== "all") params.append("customerId", customerFilter);

      // Local calendar format YYYY-MM-DD
      const now = new Date();
      const getLocalISODate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const todayStr = getLocalISODate(now);

      if (dateFilter === "today") {
        params.append("datePreset", "today");
        params.append("clientDate", todayStr);
      } else if (dateFilter === "yesterday") {
        params.append("datePreset", "yesterday");
        params.append("clientDate", todayStr);
      } else if (dateFilter === "thisWeek") {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        const monday = new Date(now.setDate(diff));
        params.append("startDate", getLocalISODate(monday));
        params.append("endDate", todayStr);
      } else if (dateFilter === "thisMonth") {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        params.append("startDate", getLocalISODate(firstDay));
        params.append("endDate", todayStr);
      } else if (dateFilter === "lastMonth") {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        params.append("startDate", getLocalISODate(firstDayLastMonth));
        params.append("endDate", getLocalISODate(lastDayLastMonth));
      } else if (dateFilter === "thisYear") {
        const firstDayYear = new Date(now.getFullYear(), 0, 1);
        params.append("startDate", getLocalISODate(firstDayYear));
        params.append("endDate", todayStr);
      } else if (dateFilter === "custom") {
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
      }

      const response = await fetch(`/api/invoices?${params.toString()}`);
      
      if (!response.ok) {
        let errorMessage = "Unknown error";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText || "Failed to fetch invoices"}`;
        }
        console.error("API error:", response.status, errorMessage);
        alert(`Failed to fetch invoices: ${errorMessage}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      alert(`Error fetching invoices: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter, customerFilter, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (page === 1) {
        fetchInvoices();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingInvoice(null);
    fetchInvoices();
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID:
        return "bg-green-100 text-green-800";
      case InvoiceStatus.SENT:
        return "bg-blue-100 text-blue-800";
      case InvoiceStatus.OVERDUE:
        return "bg-red-100 text-red-800";
      case InvoiceStatus.PARTIAL:
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderCell = (colKey: ColumnKey, invoice: Invoice, paidAmount: number, balance: number) => {
    switch (colKey) {
      case "date":
        return (
          <TableCell key={colKey}>
            {formatInvoiceDate(invoice.date)}
          </TableCell>
        );
      case "number":
        return (
          <TableCell key={colKey} className="font-medium">
            {invoice.number}
          </TableCell>
        );
      case "customer":
        return (
          <TableCell key={colKey}>
            {invoice.customer?.name || "—"}
          </TableCell>
        );
      case "customerEmail":
        return (
          <TableCell key={colKey} className="text-muted-foreground text-sm">
            {invoice.customer?.email || "—"}
          </TableCell>
        );
      case "status":
        return (
          <TableCell key={colKey}>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                invoice.status
              )}`}
            >
              {invoice.status}
            </span>
          </TableCell>
        );
      case "itemsCount":
        return (
          <TableCell key={colKey} className="text-sm">
            {invoice.items ? `${invoice.items.length} ${invoice.items.length === 1 ? "item" : "items"}` : "—"}
          </TableCell>
        );
      case "subtotal":
        return (
          <TableCell key={colKey} className="text-right font-medium">
            ${Number(invoice.subtotal ?? invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
        );
      case "tax":
        return (
          <TableCell key={colKey} className="text-right">
            ${Number(invoice.tax ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
        );
      case "amount":
        return (
          <TableCell key={colKey} className="text-right">
            <div>
              <div className="font-medium">
                ${Number(invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {!visibleColumns.paidAmount && paidAmount > 0 && (
                <div className="text-xs text-muted-foreground">
                  Paid: ${paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </TableCell>
        );
      case "paidAmount":
        return (
          <TableCell key={colKey} className="text-right text-emerald-600 font-medium">
            ${paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
        );
      case "balance":
        return (
          <TableCell key={colKey} className="text-right font-medium">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </TableCell>
        );
      case "actions":
        return (
          <TableCell key={colKey} className="text-right">
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/dashboard/invoices/${invoice.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              {invoice.status !== InvoiceStatus.PAID && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingInvoice(invoice);
                    setIsDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your invoices and track payments
          </p>
        </div>
        <Button 
          type="button"
          onClick={() => {
            setEditingInvoice(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? "Edit Invoice" : "Create Invoice"}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice
                ? "Update invoice information"
                : "Create a new invoice for your customer"}
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingInvoice(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={InvoiceStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={InvoiceStatus.SENT}>Sent</SelectItem>
              <SelectItem value={InvoiceStatus.PARTIAL}>Partial</SelectItem>
              <SelectItem value={InvoiceStatus.PAID}>Paid</SelectItem>
              <SelectItem value={InvoiceStatus.OVERDUE}>Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-10 text-xs w-[140px]"
                title="From Date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-10 text-xs w-[140px]"
                title="To Date"
              />
            </div>
          )}
        </div>

        {/* Gear icon dropdown to customize and reorder table columns */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 gap-2 shrink-0"
              title="Customize columns"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Columns</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div>
                <DropdownMenuLabel className="p-0 font-semibold text-sm">
                  Customize Columns
                </DropdownMenuLabel>
                <p className="text-[11px] text-muted-foreground">Drag headers to reorder</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  resetColumns();
                }}
                className="text-xs text-primary hover:underline font-medium cursor-pointer"
              >
                Reset
              </button>
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-[320px] overflow-y-auto space-y-0.5 p-1">
              {columnOrder.map((colKey, index) => {
                const col = ALL_COLUMNS.find((c) => c.key === colKey);
                if (!col) return null;
                return (
                  <div
                    key={col.key}
                    className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm text-sm"
                  >
                    <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                      <input
                        type="checkbox"
                        checked={!!visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                      <span className={visibleColumns[col.key] ? "font-medium" : "text-muted-foreground"}>
                        {col.label}
                      </span>
                    </label>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.preventDefault();
                          moveColumn(index, index - 1);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-muted"
                        title="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === columnOrder.length - 1}
                        onClick={(e) => {
                          e.preventDefault();
                          moveColumn(index, index + 1);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-muted"
                        title="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {orderedVisibleColumns.map((colKey) => {
                const col = ALL_COLUMNS.find((c) => c.key === colKey);
                if (!col) return null;
                const isDragging = draggedCol === colKey;
                const isDragOver = dragOverCol === colKey;

                return (
                  <TableHead
                    key={colKey}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", colKey);
                      setDraggedCol(colKey);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (draggedCol && draggedCol !== colKey) {
                        setDragOverCol(colKey);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverCol === colKey) {
                        setDragOverCol(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleColumnReorder(draggedCol, colKey);
                      setDraggedCol(null);
                      setDragOverCol(null);
                    }}
                    onDragEnd={() => {
                      setDraggedCol(null);
                      setDragOverCol(null);
                    }}
                    className={cn(
                      "select-none cursor-grab active:cursor-grabbing transition-colors duration-150 group",
                      col.align === "right" ? "text-right" : "text-left",
                      isDragging && "opacity-40",
                      isDragOver && "bg-primary/10 border-l-2 border-primary"
                    )}
                    title="Drag to reorder column"
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1.5 inline-flex",
                        col.align === "right" && "flex-row-reverse"
                      )}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort(colKey);
                        }}
                        className={cn(
                          "flex items-center gap-1 font-semibold hover:text-foreground transition-colors cursor-pointer text-xs",
                          sortBy === colKey ? "text-foreground font-bold" : "text-muted-foreground"
                        )}
                        title={`Sort by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        {colKey !== "actions" && (
                          sortBy === colKey ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-70 shrink-0" />
                          )
                        )}
                      </button>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount || 1} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sortedInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount || 1} className="text-center">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              sortedInvoices.map((invoice) => {
                const paidAmount = invoice.payments?.reduce(
                  (sum, p) => sum + Number(p.amount),
                  0
                ) || 0;
                const balance = Math.max(0, Number(invoice.total) - paidAmount);
                return (
                  <TableRow key={invoice.id}>
                    {orderedVisibleColumns.map((colKey) =>
                      renderCell(colKey, invoice, paidAmount, balance)
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}


