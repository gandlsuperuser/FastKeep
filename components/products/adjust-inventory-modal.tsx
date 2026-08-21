"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Minus,
  RotateCcw,
  Check,
  MapPin,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface AdjustInventoryProduct {
  id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  inventory?: number | null;
  location?: string | null;
}

interface AdjustInventoryModalProps {
  product: AdjustInventoryProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjustInventoryModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: AdjustInventoryModalProps) {
  const [mode, setMode] = useState<"set" | "add" | "subtract">("add");
  const [quantity, setQuantity] = useState<string>("10");
  const [location, setLocation] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentStock = product?.inventory ?? 0;
  const unit = product?.unit || "pcs";

  useEffect(() => {
    if (product) {
      setLocation(product.location || "");
      setQuantity("10");
      setMode("add");
      setError("");
      setReason("");
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const parsedQty = Math.max(0, parseInt(quantity, 10) || 0);

  let resultingStock = currentStock;
  if (mode === "set") {
    resultingStock = parsedQty;
  } else if (mode === "add") {
    resultingStock = currentStock + parsedQty;
  } else if (mode === "subtract") {
    resultingStock = Math.max(0, currentStock - parsedQty);
  }

  const stockDifference = resultingStock - currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          quantity: parsedQty,
          location: location.trim() || null,
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update inventory");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error updating inventory:", err);
      setError(err.message || "Failed to update inventory");
    } finally {
      setLoading(false);
    }
  };

  const applyQuickQty = (amount: number) => {
    setQuantity(String(amount));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Adjust Inventory</DialogTitle>
              <DialogDescription className="text-xs">
                Quickly update on-hand stock for this item
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm mt-1">
          {/* Item Banner */}
          <div className="bg-muted/50 border rounded-lg p-3 space-y-1">
            <div className="font-semibold text-foreground">{product.name}</div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{product.sku ? `SKU: ${product.sku}` : "No SKU"}</span>
              <span>
                Current: <strong className="text-foreground text-sm">{currentStock} {unit}</strong>
              </span>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-semibold">Adjustment Action</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("add")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border text-xs font-medium transition-all ${
                  mode === "add"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 ring-1 ring-emerald-600"
                    : "bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                Add Stock
              </button>

              <button
                type="button"
                onClick={() => setMode("subtract")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border text-xs font-medium transition-all ${
                  mode === "subtract"
                    ? "border-red-600 bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 ring-1 ring-red-600"
                    : "bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <Minus className="h-3.5 w-3.5 text-red-600" />
                Remove
              </button>

              <button
                type="button"
                onClick={() => setMode("set")}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border text-xs font-medium transition-all ${
                  mode === "set"
                    ? "border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 ring-1 ring-blue-600"
                    : "bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                Set Exact
              </button>
            </div>
          </div>

          {/* Quantity Input with Quick Buttons */}
          <div className="space-y-1.5">
            <Label htmlFor="adjust-qty" className="text-xs text-muted-foreground uppercase font-semibold">
              {mode === "set" ? "New Exact Stock Count" : mode === "add" ? "Quantity to Add" : "Quantity to Remove"} ({unit}) *
            </Label>
            <Input
              id="adjust-qty"
              type="number"
              min="0"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="text-lg font-bold tracking-tight h-11"
              autoFocus
            />

            {/* Quick amount shortcuts */}
            <div className="flex gap-1.5 pt-1">
              {[1, 5, 10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => applyQuickQty(amt)}
                  className="flex-1 py-1 text-xs border rounded bg-muted/30 hover:bg-muted font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Live Result Calculation Preview */}
          <div className="p-3 rounded-md border bg-card flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">New Stock Level</div>
              <div className="text-2xl font-black tracking-tight text-foreground flex items-center gap-1.5 mt-0.5">
                <span>{resultingStock}</span>
                <span className="text-xs font-normal text-muted-foreground">{unit}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-muted-foreground">Change</div>
              <div
                className={`text-sm font-bold flex items-center justify-end gap-1 ${
                  stockDifference > 0
                    ? "text-emerald-600"
                    : stockDifference < 0
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {stockDifference > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    +{stockDifference} {unit}
                  </>
                ) : stockDifference < 0 ? (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    {stockDifference} {unit}
                  </>
                ) : (
                  "No change"
                )}
              </div>
            </div>
          </div>

          {/* Location & Reason */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="adjust-loc" className="text-xs text-muted-foreground">Warehouse / Location</Label>
              <Input
                id="adjust-loc"
                placeholder="e.g. Aisle 3, Bin B"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="adjust-reason" className="text-xs text-muted-foreground">Reason (Optional)</Label>
              <Input
                id="adjust-reason"
                placeholder="e.g. Restocked, Recount"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving..." : "Update Inventory"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
