import { requireAuth } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ExpensesPieChart } from "@/components/dashboard/expenses-pie-chart";

// Mock data - replace with real data from database
const revenueData = [
  { month: "Jan", revenue: 45000 },
  { month: "Feb", revenue: 52000 },
  { month: "Mar", revenue: 48000 },
  { month: "Apr", revenue: 61000 },
  { month: "May", revenue: 55000 },
  { month: "Jun", revenue: 67000 },
];

const expensesData = [
  { category: "Salaries", amount: 25000 },
  { category: "Rent", amount: 8000 },
  { category: "Utilities", amount: 2000 },
  { category: "Marketing", amount: 5000 },
  { category: "Other", amount: 3000 },
];

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();

  // Mock metrics - replace with real calculations
  const metrics = {
    revenue: 325000,
    expenses: 43000,
    profit: 282000,
    cashFlow: 125000,
  };

  const recentTransactions = [
    { id: 1, type: "Invoice", description: "Invoice #INV-001", amount: 5000, date: "2024-01-15" },
    { id: 2, type: "Payment", description: "Payment from Customer A", amount: 3000, date: "2024-01-14" },
    { id: 3, type: "Expense", description: "Office Supplies", amount: -250, date: "2024-01-13" },
  ];

  const upcomingInvoices = [
    { id: 1, number: "INV-002", customer: "Customer B", amount: 7500, dueDate: "2024-01-20" },
    { id: 2, number: "INV-003", customer: "Customer C", amount: 4200, dueDate: "2024-01-22" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || user.email}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.expenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">-5.2%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.profit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+18.3%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.cashFlow.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current available balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>Monthly revenue for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses Breakdown</CardTitle>
            <CardDescription>Expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensesPieChart data={expensesData} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions & Upcoming Invoices */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.type} · {transaction.date}
                    </p>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      transaction.amount > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.amount > 0 ? "+" : ""}
                    ${Math.abs(transaction.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Invoices</CardTitle>
            <CardDescription>Invoices due soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{invoice.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.customer} · Due {invoice.dueDate}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    ${invoice.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Balance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No alerts at this time.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

