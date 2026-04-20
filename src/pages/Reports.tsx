import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getTransactions, Transaction, getCategoryEmoji } from "@/lib/store";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Download, FileText, TrendingUp, PieChartIcon, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = [
  "hsl(158, 64%, 36%)", "hsl(38, 92%, 55%)", "hsl(200, 70%, 50%)",
  "hsl(340, 65%, 55%)", "hsl(270, 50%, 55%)", "hsl(15, 75%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(60, 60%, 50%)",
];

const Letterhead = () => (
  <div className="mb-6 rounded-2xl bg-card p-5 shadow-sm">
    <div className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <img src="/pwa-192x192.png" alt="ChapaaCheck logo" className="h-10 w-10 rounded-xl object-contain" crossOrigin="anonymous" />
        <div>
          <h2 className="text-lg font-bold tracking-tight">ChapaaCheck</h2>
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Financial Report</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium">{format(new Date(), "MMMM yyyy")}</p>
        <p className="text-[10px] text-muted-foreground">Generated {format(new Date(), "dd MMM yyyy")}</p>
      </div>
    </div>
  </div>
);

const SummaryCards = ({ transactions }: { transactions: Transaction[] }) => {
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;

  const cards = [
    { label: "Total Income", value: totalIncome, color: "text-primary", prefix: "+" },
    { label: "Total Expenses", value: totalExpenses, color: "text-destructive", prefix: "-" },
    { label: "Net Savings", value: Math.abs(net), color: net >= 0 ? "text-primary" : "text-destructive", prefix: net >= 0 ? "+" : "-" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className="rounded-xl bg-card p-3 shadow-sm text-center"
        >
          <p className="text-[10px] text-muted-foreground mb-1">{c.label}</p>
          <p className={`text-sm font-bold ${c.color}`}>
            {c.prefix}KSh {c.value.toLocaleString()}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

const MonthlyComparisonChart = ({ transactions }: { transactions: Transaction[] }) => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, "MMM") };
  });

  const data = months.map((month) => {
    const inRange = (t: Transaction) =>
      isWithinInterval(new Date(t.date), { start: month.start, end: month.end });
    const income = transactions.filter(t => t.type === "income" && inRange(t)).reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === "expense" && inRange(t)).reduce((s, t) => s + t.amount, 0);
    return { name: month.label, income, expenses };
  });

  const hasData = data.some(d => d.income > 0 || d.expenses > 0);
  if (!hasData) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Monthly Comparison</h3>
      </div>
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
              formatter={(value: number, name: string) => [`KSh ${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
            />
            <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="expenses" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Expenses</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CategoryBreakdownChart = ({ transactions }: { transactions: Transaction[] }) => {
  const expenses = transactions.filter(t => t.type === "expense");
  const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const data = Object.entries(byCategory).map(([name, value]) => ({ name, value, pct: total > 0 ? ((value / total) * 100).toFixed(1) : "0" })).sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
      <div className="flex items-center gap-2 mb-3">
        <PieChartIcon className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold">Category Breakdown</h3>
      </div>
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-1/2">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-2">
            {data.slice(0, 5).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{getCategoryEmoji(item.name)} {item.name}</span>
                </div>
                <span className="font-medium">{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const IncomeExpenseTrendChart = ({ transactions }: { transactions: Transaction[] }) => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, "MMM") };
  });

  const data = months.map((month) => {
    const inRange = (t: Transaction) =>
      isWithinInterval(new Date(t.date), { start: month.start, end: month.end });
    const income = transactions.filter(t => t.type === "income" && inRange(t)).reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === "expense" && inRange(t)).reduce((s, t) => s + t.amount, 0);
    return { name: month.label, income, expenses, savings: income - expenses };
  });

  const hasData = data.some(d => d.income > 0 || d.expenses > 0);
  if (!hasData) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Income vs Expense Trends</h3>
      </div>
      <div className="rounded-xl bg-card p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
              formatter={(value: number, name: string) => [`KSh ${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
            />
            <Area type="monotone" dataKey="income" stroke="hsl(var(--income))" fill="url(#incomeGrad)" strokeWidth={2} dot={{ r: 3 }} />
            <Area type="monotone" dataKey="expenses" stroke="hsl(var(--expense))" fill="url(#expenseGrad)" strokeWidth={2} dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Expenses</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TopSpendingTable = ({ transactions }: { transactions: Transaction[] }) => {
  const expenses = transactions.filter(t => t.type === "expense");
  const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  if (sorted.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
      <h3 className="text-sm font-semibold mb-3">Top Spending Categories</h3>
      <div className="rounded-xl bg-card p-4 shadow-sm space-y-3">
        {sorted.map(([cat, amount], i) => {
          const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{getCategoryEmoji(cat)} {cat}</span>
                <span className="text-muted-foreground">KSh {amount.toLocaleString()} ({pct.toFixed(1)}%)</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

const Reports = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [user]);

  const handleDownloadPDF = async () => {
    if (!page1Ref.current || !page2Ref.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      const renderPage = async (el: HTMLElement, isFirst: boolean) => {
        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const imgData = canvas.toDataURL("image/png");
        const ratio = canvas.width / canvas.height;
        let imgWidth = contentWidth;
        let imgHeight = imgWidth / ratio;
        if (imgHeight > contentHeight) {
          imgHeight = contentHeight;
          imgWidth = imgHeight * ratio;
        }
        const x = (pageWidth - imgWidth) / 2;
        const y = margin;
        if (!isFirst) pdf.addPage();
        pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      };

      await renderPage(page1Ref.current, true);
      await renderPage(page2Ref.current, false);

      pdf.save(`ChapaaCheck-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-md px-4 pb-24 pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 rounded-xl bg-muted" />
            <div className="h-10 rounded-xl bg-muted" />
            <div className="h-48 rounded-xl bg-muted" />
            <div className="h-48 rounded-xl bg-muted" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Reports</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloading} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Generating..." : "Download PDF"}
          </Button>
        </motion.div>

        {/* Page 1 */}
        <div ref={page1Ref} className="space-y-4 rounded-2xl border border-border/50 bg-background p-4">
          <Letterhead />
          <SummaryCards transactions={transactions} />
          <MonthlyComparisonChart transactions={transactions} />
          <CategoryBreakdownChart transactions={transactions} />
        </div>

        {/* Page divider */}
        <div className="my-5 flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Page 2</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Page 2 */}
        <div ref={page2Ref} className="space-y-4 rounded-2xl border border-border/50 bg-background p-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <img src="/pwa-192x192.png" alt="ChapaaCheck logo" className="h-8 w-8 rounded-lg object-contain" crossOrigin="anonymous" />
              <p className="text-xs font-semibold">ChapaaCheck — Detailed Insights</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Page 2 of 2</p>
          </div>
          <IncomeExpenseTrendChart transactions={transactions} />
          <TopSpendingTable transactions={transactions} />
          <div className="mt-4 border-t border-border pt-3 text-center">
            <p className="text-[10px] text-muted-foreground">
              ChapaaCheck — Your Personal Finance Companion • {format(new Date(), "dd MMMM yyyy")}
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Reports;
