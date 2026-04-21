import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Trash2, Trash } from "lucide-react";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  BinItem,
  getBinItems,
  restoreBinItem,
  purgeBinItem,
  purgeAllBinItems,
  daysUntilPurge,
} from "@/lib/store";

const Bin = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<BinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purgeTarget, setPurgeTarget] = useState<BinItem | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);

  const load = () => {
    setLoading(true);
    getBinItems()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRestore = async (item: BinItem) => {
    try {
      await restoreBinItem(item);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success(`Restored ${item.label}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRestoreAll = async () => {
    try {
      await Promise.all(items.map((i) => restoreBinItem(i)));
      toast.success("All items restored");
      setItems([]);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    try {
      await purgeBinItem(purgeTarget);
      setItems((prev) => prev.filter((i) => i.id !== purgeTarget.id));
      toast.success("Permanently deleted");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPurgeTarget(null);
    }
  };

  const handleEmpty = async () => {
    try {
      await purgeAllBinItems(items);
      setItems([]);
      toast.success("Bin emptied");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmptyOpen(false);
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        {/* Header */}
        <div className="mb-3 flex items-center gap-3 animate-fade-in">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-xl font-bold">Bin</h1>
        </div>

        {/* Action bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleRestoreAll}
            disabled={items.length === 0 || loading}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restore all
          </button>
          <button
            onClick={() => setEmptyOpen(true)}
            disabled={items.length === 0 || loading}
            className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash className="h-3.5 w-3.5" /> Empty bin
          </button>
          <p className="ml-auto text-[11px] text-muted-foreground">Auto-deletes after 7 days</p>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-card p-10 text-center shadow-sm">
            <Trash2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">The bin is empty</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Deleted items appear here for 7 days</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const days = daysUntilPurge(item.deleted_at);
              return (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.sublabel} · {days === 0 ? "Deletes today" : `${days}d left`}
                    </p>
                  </div>
                  {item.amount !== undefined && (
                    <span className={`text-xs font-semibold ${item.amountKind === "income" ? "text-income" : "text-expense"}`}>
                      {item.amountKind === "income" ? "+" : "-"}KSh {item.amount.toLocaleString()}
                    </span>
                  )}
                  <button
                    onClick={() => handleRestore(item)}
                    className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
                    title="Restore"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPurgeTarget(item)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Delete forever"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!purgeTarget}
        onOpenChange={(o) => !o && setPurgeTarget(null)}
        title="Delete forever?"
        description={`"${purgeTarget?.label}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete forever"
        onConfirm={handlePurge}
      />

      <ConfirmDialog
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title="Empty the bin?"
        description={`All ${items.length} item${items.length === 1 ? "" : "s"} will be permanently removed. This cannot be undone.`}
        confirmLabel="Empty bin"
        onConfirm={handleEmpty}
      />
    </PageTransition>
  );
};

export default Bin;
