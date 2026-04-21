import { useState, useEffect } from "react";
import {
  getRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  RecurringTransaction,
  getCategoryEmoji,
} from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Trash2, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

const RecurringTransactionsPanel = () => {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);

  useEffect(() => {
    getRecurringTransactions().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await updateRecurringTransaction(id, { is_active: !currentActive });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: !currentActive } : i)));
      toast.success(currentActive ? "Paused" : "Resumed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRecurringTransaction(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success("Moved to Bin");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-card p-8 text-center shadow-sm">
        <Repeat className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-xs text-muted-foreground">No recurring transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm transition-opacity",
            !item.is_active && "opacity-50"
          )}
        >
          <span className="text-lg">{getCategoryEmoji(item.category)}</span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{item.description || item.category}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="capitalize">{item.frequency}</span>
              <span>·</span>
              <span>Next: {new Date(item.next_date).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
          <span className={cn("text-xs font-semibold", item.type === "income" ? "text-income" : "text-expense")}>
            {item.type === "income" ? "+" : "-"}KSh {item.amount.toLocaleString()}
          </span>
          <Switch checked={item.is_active} onCheckedChange={() => handleToggle(item.id, item.is_active)} />
          <button onClick={() => setDeleteTarget(item)} className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this recurring transaction?"
        description={`"${deleteTarget?.description || deleteTarget?.category}" will be moved to the Bin and auto-deleted after 7 days.`}
        confirmLabel="Move to Bin"
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default RecurringTransactionsPanel;
