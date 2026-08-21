export interface ParsedInvoiceMetadata {
  shipTo: string;
  sideMark: string;
  notes: string;
}

export function extractInvoiceMetadata(rawNotes?: string | null): ParsedInvoiceMetadata {
  if (!rawNotes) return { shipTo: "", sideMark: "", notes: "" };

  let shipTo = "";
  let sideMark = "";
  let notes = rawNotes;

  const shipToMatch = notes.match(/\[Ship To\]\n([\s\S]*?)(?=(?:\n\n\[Side Mark\]|\n\n\[Notes\]|$))/);
  if (shipToMatch) {
    shipTo = shipToMatch[1]?.trim() || "";
  }

  const sideMarkMatch = notes.match(/\[Side Mark\]\n([\s\S]*?)(?=(?:\n\n\[Notes\]|$))/);
  if (sideMarkMatch) {
    sideMark = sideMarkMatch[1]?.trim() || "";
  }

  const notesMatch = notes.match(/\[Notes\]\n([\s\S]*)$/);
  if (notesMatch) {
    notes = notesMatch[1]?.trim() || "";
  } else {
    notes = notes
      .replace(/\[Ship To\]\n[\s\S]*?(?=(?:\n\n\[Side Mark\]|\n\n\[Notes\]|$))/, "")
      .replace(/\[Side Mark\]\n[\s\S]*?(?=(?:\n\n\[Notes\]|$))/, "")
      .trim();
  }

  return { shipTo, sideMark, notes };
}

// Backward compatibility alias
export function extractShipToAndNotes(rawNotes?: string | null): { shipTo: string; sideMark: string; notes: string } {
  return extractInvoiceMetadata(rawNotes);
}

export function combineInvoiceMetadata(shipTo?: string, sideMark?: string, notes?: string): string | undefined {
  const parts: string[] = [];

  if (shipTo?.trim()) {
    parts.push(`[Ship To]\n${shipTo.trim()}`);
  }
  if (sideMark?.trim()) {
    parts.push(`[Side Mark]\n${sideMark.trim()}`);
  }
  if (notes?.trim()) {
    parts.push(`[Notes]\n${notes.trim()}`);
  }

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

// Backward compatibility alias
export function combineShipToAndNotes(shipTo?: string, notes?: string, sideMark?: string): string | undefined {
  return combineInvoiceMetadata(shipTo, sideMark, notes);
}

export function formatAddressLines(addr: any): string[] {
  if (!addr) return [];
  if (typeof addr === "string") return [addr];
  const lines: string[] = [];
  if (addr.street) lines.push(addr.street);
  const cityStateZip = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
  if (cityStateZip) lines.push(cityStateZip);
  if (addr.country) lines.push(addr.country);
  return lines;
}

export function getInvoiceShipToLines(invoice: {
  notes?: string | null;
  customer?: {
    name?: string;
    shippingAddress?: any;
    billingAddress?: any;
  } | null;
}): string[] {
  const { shipTo } = extractInvoiceMetadata(invoice.notes);
  if (shipTo) {
    return shipTo.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  if (invoice.customer?.shippingAddress) {
    const lines = formatAddressLines(invoice.customer.shippingAddress);
    if (lines.length > 0) {
      return [invoice.customer.name || "", ...lines].filter(Boolean);
    }
  }
  if (invoice.customer?.billingAddress) {
    const lines = formatAddressLines(invoice.customer.billingAddress);
    if (lines.length > 0) {
      return [invoice.customer.name || "", ...lines].filter(Boolean);
    }
  }
  return invoice.customer?.name ? [invoice.customer.name] : [];
}

export function formatInvoiceDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [_, year, month, day] = match;
      return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}
