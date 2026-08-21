import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/db/prisma";

function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Default Supabase Free Tier allocation: 500 MB
    const limitBytes = 500 * 1024 * 1024;

    let usedBytes = 0;
    let databaseName = "PostgreSQL";
    let tables: Array<{
      tableName: string;
      bytes: number;
      sizeFormatted: string;
      rowCount: number;
    }> = [];

    try {
      // Query PostgreSQL database size
      const dbSizeResult: any = await prisma.$queryRaw`
        SELECT 
          current_database() AS db_name,
          pg_database_size(current_database())::bigint AS total_bytes
      `;

      if (dbSizeResult && dbSizeResult.length > 0) {
        databaseName = dbSizeResult[0].db_name || "PostgreSQL";
        usedBytes = Number(dbSizeResult[0].total_bytes || 0);
      }

      // Query table sizes and estimated row counts
      const tablesResult: any = await prisma.$queryRaw`
        SELECT 
          c.relname AS table_name,
          pg_total_relation_size(c.oid)::bigint AS total_bytes,
          COALESCE(s.n_live_tup, c.reltuples::bigint, 0)::bigint AS row_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
        ORDER BY total_bytes DESC
        LIMIT 10;
      `;

      if (Array.isArray(tablesResult)) {
        tables = tablesResult.map((row: any) => {
          const bytes = Number(row.total_bytes || 0);
          return {
            tableName: row.table_name,
            bytes,
            sizeFormatted: formatBytes(bytes),
            rowCount: Number(row.row_count || 0),
          };
        });
      }
    } catch (sqlError) {
      console.warn("Could not query pg_database_size directly, falling back to estimated size:", sqlError);
      // Fallback estimate based on count of records
      const [invoicesCount, productsCount, customersCount, paymentsCount, expensesCount] = await Promise.all([
        prisma.invoice.count({ where: { organizationId: user.organizationId } }).catch(() => 0),
        prisma.product.count({ where: { organizationId: user.organizationId } }).catch(() => 0),
        prisma.customer.count({ where: { organizationId: user.organizationId } }).catch(() => 0),
        prisma.payment.count().catch(() => 0),
        prisma.expense.count({ where: { organizationId: user.organizationId } }).catch(() => 0),
      ]);

      // Base footprint (~15MB overhead + rows)
      usedBytes = 15 * 1024 * 1024 + (invoicesCount + productsCount + customersCount + paymentsCount + expensesCount) * 8192;
    }

    const percentage = Math.min(100, (usedBytes / limitBytes) * 100);
    const remainingBytes = Math.max(0, limitBytes - usedBytes);

    let status: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
    if (percentage >= 90) {
      status = "CRITICAL";
    } else if (percentage >= 70) {
      status = "WARNING";
    }

    // Counts of records for quick stats
    const [invoicesCount, productsCount, customersCount, expensesCount] = await Promise.all([
      prisma.invoice.count({ where: { organizationId: user.organizationId } }).catch(() => 0),
      prisma.product.count({ where: { organizationId: user.organizationId } }).catch(() => 0),
      prisma.customer.count({ where: { organizationId: user.organizationId } }).catch(() => 0),
      prisma.expense.count({ where: { organizationId: user.organizationId } }).catch(() => 0),
    ]);

    return NextResponse.json({
      databaseName,
      provider: "Supabase / PostgreSQL",
      usedBytes,
      usedFormatted: formatBytes(usedBytes),
      limitBytes,
      limitFormatted: formatBytes(limitBytes),
      remainingBytes,
      remainingFormatted: formatBytes(remainingBytes),
      percentage: Number(percentage.toFixed(2)),
      percentageFormatted: `${percentage.toFixed(2)}%`,
      status,
      tables,
      counts: {
        invoices: invoicesCount,
        products: productsCount,
        customers: customersCount,
        expenses: expensesCount,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error retrieving database usage:", error);
    return NextResponse.json(
      { error: "Failed to retrieve database usage" },
      { status: 500 }
    );
  }
}
