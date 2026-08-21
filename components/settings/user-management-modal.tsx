"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  FileText,
  Users,
  Package,
  Receipt,
  Landmark,
  BookOpen,
  BarChart3,
  Settings,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ACCOUNTANT" | "VIEWER";
  jobTitle?: string | null;
  functions?: Record<string, boolean> | null;
  isActive?: boolean;
  createdAt?: string;
}

interface UserManagementModalProps {
  user: OrgUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_FUNCTIONS = [
  {
    key: "invoices",
    label: "Invoices & Estimates",
    description: "Create, view, and send invoices, estimates, and customer billing",
    icon: FileText,
  },
  {
    key: "customers",
    label: "Customers & Contacts",
    description: "Manage customer profiles, payment terms, and W-9/sales permit docs",
    icon: Users,
  },
  {
    key: "products",
    label: "Products & Inventory",
    description: "Manage catalog items, pricing, inventory stock, and adjustments",
    icon: Package,
  },
  {
    key: "expenses",
    label: "Expenses & Vendors",
    description: "Record company expenses, receipts, and vendor management",
    icon: Receipt,
  },
  {
    key: "banking",
    label: "Banking & Transactions",
    description: "Connect bank accounts, view feeds, and reconcile transactions",
    icon: Landmark,
  },
  {
    key: "ledger",
    label: "General Ledger & Journal",
    description: "Access Chart of Accounts, manual journal entries, and trial balance",
    icon: BookOpen,
  },
  {
    key: "reports",
    label: "Financial Reports",
    description: "View Profit & Loss, Balance Sheet, cash flow, and tax reporting",
    icon: BarChart3,
  },
  {
    key: "settings",
    label: "Company Settings & Team",
    description: "Manage company profiles, user access, and system preferences",
    icon: Settings,
  },
];

const DEFAULT_ROLE_PRESETS: Record<"ADMIN" | "ACCOUNTANT" | "VIEWER", Record<string, boolean>> = {
  ADMIN: {
    invoices: true,
    customers: true,
    products: true,
    expenses: true,
    banking: true,
    ledger: true,
    reports: true,
    settings: true,
  },
  ACCOUNTANT: {
    invoices: true,
    customers: true,
    products: true,
    expenses: true,
    banking: true,
    ledger: true,
    reports: true,
    settings: false,
  },
  VIEWER: {
    invoices: true,
    customers: true,
    products: true,
    expenses: false,
    banking: false,
    ledger: false,
    reports: false,
    settings: false,
  },
};

export function UserManagementModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: UserManagementModalProps) {
  const isEditing = !!user;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "ACCOUNTANT" | "VIEWER">("VIEWER");
  const [jobTitle, setJobTitle] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [functions, setFunctions] = useState<Record<string, boolean>>({
    ...DEFAULT_ROLE_PRESETS.VIEWER,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPassword("");
      setRole(user.role || "VIEWER");
      setJobTitle(user.jobTitle || "");
      setIsActive(user.isActive !== false);
      setFunctions({
        ...DEFAULT_ROLE_PRESETS[user.role || "VIEWER"],
        ...(user.functions || {}),
      });
    } else {
      setName("");
      setEmail("");
      setPassword(generateRandomPassword());
      setRole("VIEWER");
      setJobTitle("");
      setIsActive(true);
      setFunctions({ ...DEFAULT_ROLE_PRESETS.VIEWER });
    }
    setError("");
  }, [user, isOpen]);

  function generateRandomPassword(): string {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  const handleRoleChange = (newRole: "ADMIN" | "ACCOUNTANT" | "VIEWER") => {
    setRole(newRole);
    // Apply role functional preset
    setFunctions({ ...DEFAULT_ROLE_PRESETS[newRole] });
  };

  const handleToggleFunction = (key: string) => {
    setFunctions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim()) {
      setError("Please enter the user's name");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Please enter a valid email");
      setLoading(false);
      return;
    }

    if (!isEditing && (!password || password.length < 6)) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const url = isEditing
        ? `/api/organization/users/${user.id}`
        : "/api/organization/users";
      const method = isEditing ? "PUT" : "POST";

      const payload: any = {
        name,
        email,
        role,
        jobTitle: jobTitle.trim() || null,
        functions,
        isActive,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save user");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving user:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {isEditing ? <ShieldCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl">
                {isEditing ? "Edit Team Member" : "Add New Team Member"}
              </DialogTitle>
              <DialogDescription>
                Configure user account details, role permissions, and functional module access.
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

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Basic User Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">User Details</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-name">Full Name *</Label>
                <Input
                  id="user-name"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-email">Email Address *</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="user-password">
                    {isEditing ? "Reset Password (Optional)" : "Initial Password *"}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setPassword(generateRandomPassword())}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Generate
                  </button>
                </div>
                <Input
                  id="user-password"
                  type="text"
                  placeholder={isEditing ? "Leave blank to keep existing password" : "Enter password (min 6 chars)"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-job-title">Job Title (Optional)</Label>
                <Input
                  id="user-job-title"
                  placeholder="e.g. Senior Accountant / Sales Lead"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Role & Status Selection */}
          <div className="space-y-4 pt-2 border-t">
            <div className="grid gap-4 sm:grid-cols-2 items-center">
              <div className="space-y-2">
                <Label htmlFor="user-role">Account Role *</Label>
                <Select
                  value={role}
                  onValueChange={(val: "ADMIN" | "ACCOUNTANT" | "VIEWER") =>
                    handleRoleChange(val)
                  }
                >
                  <SelectTrigger id="user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          Administrator
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Full system control, settings & user management
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ACCOUNTANT">
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          Accountant
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Invoices, banking, ledger, expenses & financial reports
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="VIEWER">
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">
                          Viewer / Sales
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Invoices, estimates, products & customers
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 sm:mt-6">
                <div>
                  <Label htmlFor="active-status" className="font-semibold text-sm block cursor-pointer">
                    Account Active
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Allow user to log in to this organization
                  </span>
                </div>
                <Switch
                  id="active-status"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
          </div>

          {/* Granular Functional Permissions Matrix */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Functional Module Permissions</h4>
                <p className="text-xs text-muted-foreground">
                  Fine-tune what modules and features this user is allowed to access and manage.
                </p>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded border">
                Preset: {role}
              </span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {AVAILABLE_FUNCTIONS.map((func) => {
                const Icon = func.icon;
                const isChecked = !!functions[func.key];

                return (
                  <div
                    key={func.key}
                    onClick={() => handleToggleFunction(func.key)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isChecked
                        ? "bg-primary/5 border-primary/40 text-foreground"
                        : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 rounded-md shrink-0 mt-0.5",
                        isChecked
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs text-foreground">
                          {func.label}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-primary pointer-events-none"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                        {func.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditing
                  ? "Updating..."
                  : "Adding..."
                : isEditing
                ? "Save Changes"
                : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
