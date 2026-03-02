import { useState, useEffect } from "react";
import { getTransactions, deleteTransaction, Transaction, getCategoryEmoji } from "@/lib/store";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getTransactions().then(setTransactions);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Transaction deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
    const date = new Date(t.date).toLocaleDateString("en-KE", {
      weekday: "short", month: "short", day: "numeric",
    });
    (acc[date] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-5 text-xl font-bold animate-fade-in">Transaction History</h1>

      {transactions.length === 0 ? (
        <div className="rounded-xl bg-card p-10 text-center shadow-sm">
          <p className="text-4xl">📋</p>
          <p className="mt-3 text-sm text-muted-foreground">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="animate-slide-up">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{date}</p>
              <div className="space-y-2">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm"
                  >
                    <span className="text-xl">{getCategoryEmoji(t.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {t.description || t.category}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{t.category}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        t.type === "income" ? "text-income" : "text-expense"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}KSh {t.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDelete(t.id)}
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
    </div>
  );
};

export default Transactions;
