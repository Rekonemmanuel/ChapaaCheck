import { useState, useEffect, useMemo } from "react";
import { getTransactions, deleteTransaction, Transaction, getCategoryEmoji, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/store";
import { Trash2, Search, Download, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState<"" | "income" | "expense">("");
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  useEffect(() => {
    getTransactions().then(setTransactions);
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !t.category.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterType && t.type !== filterType) return false;
      return true;
    });
  }, [transactions, search, filterCategory, filterType]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTransaction(deleteTarget.id);
      setTransactions((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success("Moved to Bin");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Type", "Category", "Description", "Amount"];
    const rows = filtered.map((t) => [t.date, t.type, t.category, t.description, t.amount]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const hasFilters = search || filterCategory || filterType;

  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const date = new Date(t.date).toLocaleDateString("en-KE", {
      weekday: "short", month: "short", day: "numeric",
    });
    (acc[date] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between animate-fade-in">
        <h1 className="text-xl font-bold">Transaction History</h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["", "expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterType === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-sm"
            }`}
          >
            {t === "" ? "All" : t === "income" ? "Income" : "Expenses"}
          </button>
        ))}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm border-0 outline-none"
        >
          <option value="">All Categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setFilterCategory(""); setFilterType(""); }}
            className="flex items-center gap-1 whitespace-nowrap rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center shadow-sm">
          <p className="text-4xl">📋</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {hasFilters ? "No matching transactions" : "No transactions yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="animate-slide-up">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{date}</p>
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                    <span className="text-xl">{getCategoryEmoji(t.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{t.description || t.category}</p>
                      <p className="text-[11px] text-muted-foreground">{t.category}</p>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === "income" ? "text-income" : "text-expense"}`}>
                      {t.type === "income" ? "+" : "-"}KSh {t.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this transaction?"
        description={`"${deleteTarget?.description || deleteTarget?.category}" will be moved to the Bin and auto-deleted after 7 days.`}
        confirmLabel="Move to Bin"
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Transactions;
