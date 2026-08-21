"use client";

import { useState, useRef, useEffect, useMemo, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Package, Search, ChevronDown, Check, X, Tag, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductItem {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  cost?: number;
  category?: string | null;
  inventory?: number | null;
  unit?: string | null;
  type?: string;
  description?: string | null;
}

interface LineItemProductSearchProps {
  description: string;
  productId?: string;
  products: ProductItem[];
  onSelectProduct: (product: ProductItem) => void;
  onChangeDescription: (description: string) => void;
  onClearProduct?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function LineItemProductSearch({
  description,
  productId,
  products = [],
  onSelectProduct,
  onChangeDescription,
  onClearProduct,
  placeholder = "Type item name, SKU, or description...",
  disabled = false,
  required = false,
}: LineItemProductSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find currently linked product if any
  const linkedProduct = useMemo(() => {
    if (!productId) return null;
    return products.find((p) => p.id === productId) || null;
  }, [productId, products]);

  // Filter and rank products based on search term
  const filteredProducts = useMemo(() => {
    const query = description.trim().toLowerCase();
    if (!query) {
      // If empty query, show first 10 products
      return products.slice(0, 10);
    }

    const scored: Array<{ product: ProductItem; score: number }> = [];

    for (const product of products) {
      const name = (product.name || "").toLowerCase();
      const sku = (product.sku || "").toLowerCase();
      const category = (product.category || "").toLowerCase();
      const desc = (product.description || "").toLowerCase();

      let score = 0;

      // Exact matches
      if (name === query || sku === query) {
        score += 100;
      }
      // Starts with query
      else if (name.startsWith(query)) {
        score += 75;
      } else if (sku.startsWith(query)) {
        score += 70;
      }
      // Word inside name starts with query
      else if (name.split(/\s+/).some((w) => w.startsWith(query))) {
        score += 50;
      }
      // Substring match in name
      else if (name.includes(query)) {
        score += 40;
      }
      // Substring match in SKU
      else if (sku.includes(query)) {
        score += 35;
      }
      // Category match
      else if (category.includes(query)) {
        score += 25;
      }
      // Description match
      else if (desc.includes(query)) {
        score += 15;
      }

      if (score > 0) {
        scored.push({ product, score });
      }
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((s) => s.product);
  }, [description, products]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(filteredProducts.length > 0 ? 0 : -1);
  }, [filteredProducts]);

  // Scroll active item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (product: ProductItem) => {
    onSelectProduct(product);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (isOpen && highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  // Helper to highlight matching text in search results
  const highlightMatch = (text: string, query: string): ReactNode => {
    if (!query.trim() || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="bg-primary/20 text-primary font-semibold rounded px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          type="text"
          value={description}
          onChange={(e) => {
            onChangeDescription(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            "pr-14 transition-all",
            linkedProduct && "border-primary/50 focus-visible:ring-primary"
          )}
          autoComplete="off"
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {linkedProduct && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onClearProduct) onClearProduct();
              }}
              title="Unlink inventory product (keep as custom description)"
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            title="Browse products"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      {/* Linked product indicator badge */}
      {linkedProduct && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Package className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">
            Linked to <strong className="text-foreground">{linkedProduct.name}</strong>
            {linkedProduct.sku ? ` (${linkedProduct.sku})` : ""} · $
            {Number(linkedProduct.price).toFixed(2)}
          </span>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {filteredProducts.length > 0 ? (
            <div className="p-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center border-b pb-1 mb-1">
                <span>Matching Products ({filteredProducts.length})</span>
                <span className="text-[10px] lowercase font-normal">
                  ↑↓ to navigate · Enter to select
                </span>
              </div>
              {filteredProducts.map((product, index) => {
                const isSelected = product.id === productId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={product.id}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(product)}
                    className={cn(
                      "flex items-center justify-between gap-2 px-2.5 py-2 rounded-sm cursor-pointer text-sm transition-colors",
                      isHighlighted
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60",
                      isSelected && "font-medium"
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Package className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate text-foreground">
                            {highlightMatch(product.name, description)}
                          </span>
                          {product.sku && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-muted text-muted-foreground border">
                              {highlightMatch(product.sku, description)}
                            </span>
                          )}
                          {product.category && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Tag className="h-2.5 w-2.5" />
                              {product.category}
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="font-semibold text-primary">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      {product.inventory !== null && product.inventory !== undefined ? (
                        <span
                          className={cn(
                            "text-[10px]",
                            product.inventory > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-500 font-medium"
                          )}
                        >
                          {product.inventory > 0
                            ? `${product.inventory} ${product.unit || "in stock"}`
                            : "Out of stock"}
                        </span>
                      ) : (
                        product.unit && (
                          <span className="text-[10px] text-muted-foreground">
                            /{product.unit}
                          </span>
                        )
                      )}
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0 ml-1" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground">
              <p className="font-medium">No inventory products found</p>
              <p className="mt-0.5 text-[11px]">
                You can continue typing to use &ldquo;{description}&rdquo; as a custom line item.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
