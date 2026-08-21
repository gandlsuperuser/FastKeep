"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Building2, Upload, Trash2, Image as ImageIcon, Database, RefreshCw, HardDrive, AlertTriangle, CheckCircle2, Server, Layers, UserPlus, Users, Shield, Pencil, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserManagementModal, OrgUser } from "@/components/settings/user-management-modal";

interface OrganizationSettings {
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  taxId?: string;
}

interface Organization {
  id: string;
  name: string;
  settings: OrganizationSettings | null;
}

interface DatabaseUsage {
  databaseName: string;
  provider: string;
  usedBytes: number;
  usedFormatted: string;
  limitBytes: number;
  limitFormatted: string;
  remainingBytes: number;
  remainingFormatted: string;
  percentage: number;
  percentageFormatted: string;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  tables: Array<{
    tableName: string;
    bytes: number;
    sizeFormatted: string;
    rowCount: number;
  }>;
  counts: {
    invoices: number;
    products: number;
    customers: number;
    expenses: number;
  };
  updatedAt: string;
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Database usage state
  const [dbUsage, setDbUsage] = useState<DatabaseUsage | null>(null);
  const [loadingDbUsage, setLoadingDbUsage] = useState(false);
  const [showTableBreakdown, setShowTableBreakdown] = useState(false);

  // Team & User management state
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    taxId: "",
  });

  useEffect(() => {
    fetchOrganization();
    fetchDbUsage();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch("/api/organization/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this account?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/organization/users/${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (response.ok) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user");
    }
  };

  const fetchDbUsage = async () => {
    setLoadingDbUsage(true);
    try {
      const response = await fetch("/api/system/database-usage");
      if (response.ok) {
        const data = await response.json();
        setDbUsage(data);
      }
    } catch (err) {
      console.error("Error fetching database usage:", err);
    } finally {
      setLoadingDbUsage(false);
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await fetch("/api/organization");
      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
        setFormData({
          name: data.name || "",
          logoUrl: data.settings?.logoUrl || "",
          email: data.settings?.email || "",
          phone: data.settings?.phone || "",
          street: data.settings?.address?.street || "",
          city: data.settings?.address?.city || "",
          state: data.settings?.address?.state || "",
          zip: data.settings?.address?.zip || "",
          country: data.settings?.address?.country || "",
          taxId: data.settings?.taxId || "",
        });
      } else {
        setError("Failed to load organization settings");
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      setError("Failed to load organization settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Logo file size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const settings: OrganizationSettings = {
        logoUrl: formData.logoUrl || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: {
          street: formData.street || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip: formData.zip || undefined,
          country: formData.country || undefined,
        },
        taxId: formData.taxId || undefined,
      };

      // Remove undefined values from nested objects
      if (settings.address) {
        Object.keys(settings.address).forEach((key) => {
          if (settings.address![key as keyof typeof settings.address] === undefined) {
            delete settings.address![key as keyof typeof settings.address];
          }
        });
        if (Object.keys(settings.address).length === 0) {
          delete settings.address;
        }
      }

      const response = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          settings,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        fetchOrganization();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization information and preferences
        </p>
      </div>

      {/* Supabase Database Storage Usage Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Supabase Database Usage
                  {dbUsage && (
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium border",
                        dbUsage.status === "HEALTHY" &&
                          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
                        dbUsage.status === "WARNING" &&
                          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
                        dbUsage.status === "CRITICAL" &&
                          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                      )}
                    >
                      {dbUsage.status === "HEALTHY"
                        ? "Optimal"
                        : dbUsage.status === "WARNING"
                        ? "Moderate"
                        : "Near Limit"}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Live PostgreSQL database storage measured against your 500 MB Supabase free tier allocation.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchDbUsage}
              disabled={loadingDbUsage}
              className="text-xs h-8 self-start sm:self-auto"
            >
              <RefreshCw
                className={cn(
                  "mr-1.5 h-3.5 w-3.5",
                  loadingDbUsage && "animate-spin"
                )}
              />
              {loadingDbUsage ? "Checking..." : "Refresh Usage"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {dbUsage ? (
            <>
              {/* Progress Bar Header */}
              <div className="space-y-2">
                <div className="flex items-end justify-between text-sm">
                  <div>
                    <span className="font-semibold text-foreground">
                      {dbUsage.usedFormatted}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      used of {dbUsage.limitFormatted} limit
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground">
                      {dbUsage.percentageFormatted}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">used</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-secondary/80 h-3.5 rounded-full overflow-hidden p-0.5 border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      dbUsage.percentage < 70
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : dbUsage.percentage < 90
                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                        : "bg-gradient-to-r from-rose-500 to-red-600"
                    )}
                    style={{
                      width: `${Math.max(1.5, Math.min(100, dbUsage.percentage))}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
                  <span>0 MB</span>
                  <span className="font-medium text-foreground/80">
                    {dbUsage.remainingFormatted} remaining
                  </span>
                  <span>500 MB</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-xs text-muted-foreground block">
                    Storage Used
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {dbUsage.usedFormatted}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-xs text-muted-foreground block">
                    Available Free Space
                  </span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {dbUsage.remainingFormatted}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-xs text-muted-foreground block">
                    Database Engine
                  </span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {dbUsage.databaseName}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-xs text-muted-foreground block">
                    Total Invoices & Products
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {(dbUsage.counts?.invoices || 0) + (dbUsage.counts?.products || 0)} records
                  </span>
                </div>
              </div>

              {/* Collapsible Table Breakdown */}
              {dbUsage.tables && dbUsage.tables.length > 0 && (
                <div className="pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowTableBreakdown((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>
                      {showTableBreakdown
                        ? "Hide Table Storage Breakdown"
                        : "Show Table Storage Breakdown"}
                    </span>
                  </button>

                  {showTableBreakdown && (
                    <div className="mt-3 rounded-md border overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 p-2 bg-muted text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <div className="col-span-6">Table Name</div>
                        <div className="col-span-3 text-right">Estimated Rows</div>
                        <div className="col-span-3 text-right">Size</div>
                      </div>
                      <div className="divide-y text-xs max-h-48 overflow-y-auto">
                        {dbUsage.tables.map((t, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 p-2 hover:bg-muted/40 transition-colors"
                          >
                            <div className="col-span-6 font-mono text-[11px] truncate">
                              {t.tableName}
                            </div>
                            <div className="col-span-3 text-right text-muted-foreground">
                              {t.rowCount.toLocaleString()}
                            </div>
                            <div className="col-span-3 text-right font-medium text-foreground">
                              {t.sizeFormatted}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              <Database className="h-6 w-6 mx-auto mb-2 opacity-40 animate-pulse" />
              Loading database usage metrics...
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>
              This information will appear on invoices and other documents as the
              "From" company details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200">
                Settings saved successfully!
              </div>
            )}

            {/* Company Logo Section */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-center h-20 w-36 rounded-md border border-dashed bg-background overflow-hidden relative group">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Company Logo"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-2">
                      <ImageIcon className="h-6 w-6 mb-1 opacity-50" />
                      <span>No Logo</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload Logo
                    </Label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    {formData.logoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive text-xs h-7"
                        onClick={() => setFormData({ ...formData, logoUrl: "" })}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Input
                      id="logoUrl"
                      type="text"
                      value={formData.logoUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, logoUrl: e.target.value })
                      }
                      placeholder="Or paste image URL (e.g. https://example.com/logo.png)"
                      className="text-xs h-8"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG, SVG or GIF (max 2MB). This logo will appear on all invoices & quotes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Your Company Name"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="company@example.com"
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
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="State"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP/Postal Code</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({ ...formData, zip: e.target.value })
                  }
                  placeholder="12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                placeholder="Country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / Business Number</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) =>
                  setFormData({ ...formData, taxId: e.target.value })
                }
                placeholder="Tax identification number"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Team & User Access Management Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Team & User Access
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border">
                    {users.length} {users.length === 1 ? "Member" : "Members"}
                  </span>
                </CardTitle>
                <CardDescription>
                  Manage team members, roles, and granular functional permissions for this account.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                setSelectedUser(null);
                setIsUserModalOpen(true);
              }}
              size="sm"
              className="text-xs h-8 self-start sm:self-auto"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add Team Member
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left">
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Job Title</th>
                    <th className="p-3">Functional Access</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                        Loading team members...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                        No team members found. Click &quot;Add Team Member&quot; to invite a user.
                      </td>
                    </tr>
                  ) : (
                    users.map((member) => {
                      const activeFuncs = Object.entries(member.functions || {})
                        .filter(([_, active]) => active)
                        .map(([k]) => k);

                      return (
                        <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                                {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate">
                                  {member.name || "Unnamed User"}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
                                member.role === "ADMIN" &&
                                  "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
                                member.role === "ACCOUNTANT" &&
                                  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
                                member.role === "VIEWER" &&
                                  "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800"
                              )}
                            >
                              {member.role === "ADMIN"
                                ? "Administrator"
                                : member.role === "ACCOUNTANT"
                                ? "Accountant"
                                : "Viewer / Sales"}
                            </span>
                          </td>

                          <td className="p-3 text-xs text-muted-foreground">
                            {member.jobTitle || "—"}
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1 flex-wrap max-w-xs">
                              {member.role === "ADMIN" ? (
                                <span className="text-[11px] font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                  Full System Access
                                </span>
                              ) : activeFuncs.length > 0 ? (
                                activeFuncs.slice(0, 3).map((f) => (
                                  <span
                                    key={f}
                                    className="capitalize text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border font-mono"
                                  >
                                    {f}
                                  </span>
                                )).concat(
                                  activeFuncs.length > 3 ? [
                                    <span
                                      key="more"
                                      className="text-[10px] text-muted-foreground font-mono"
                                    >
                                      +{activeFuncs.length - 3} more
                                    </span>
                                  ] : []
                                )
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  No modules
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs font-medium",
                                member.isActive !== false
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-muted-foreground line-through"
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  member.isActive !== false
                                    ? "bg-emerald-500"
                                    : "bg-muted-foreground"
                                )}
                              />
                              {member.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex justify-end items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(member);
                                  setIsUserModalOpen(true);
                                }}
                                className="h-7 text-xs"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(member.id, member.name || member.email)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Remove team member"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Management Modal */}
      <UserManagementModal
        user={selectedUser}
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          fetchUsers();
        }}
      />
    </div>
  );
}


