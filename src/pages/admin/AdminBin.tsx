import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Trash2, Trash, User, ArrowRightLeft, Inbox } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface AdminBinItem {
  id: string;
  type: "transaction" | "profile";
  label: string;
  sublabel: string;
  deleted_at: string;
  amount?: number;
  amountKind?: "income" | "expense";
}

const titleCase = (s?: string | null) =>
  (s ?? "").trim().split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");

const daysLeft = (deletedAt: string) => {
  const purge = new Date(deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purge - Date.now()) / (24 * 60 * 60 * 1000)));
};

const AdminBin = () => {
  const [items, setItems] = useState<AdminBinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purgeTarget, setPurgeTarget] = useState<AdminBinItem | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [txRes, pRes] = await Promise.all([
      supabase.from("transactions").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
      supabase.from("profiles").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    ]);
    const txItems: AdminBinItem[] = (txRes.data ?? []).map((t) => ({
      id: t.id,
      type: "transaction",
      label: t.description || t.category,
      sublabel: `${t.category} · ${t.date}`,
      deleted_at: t.deleted_at!,
      amount: Number(t.amount),
      amountKind: t.type as "income" | "expense",
    }));
    const profileItems: AdminBinItem[] = (pRes.data ?? []).map((p) => ({
      id: p.id,
      type: "profile",
      label: titleCase(p.display_name) || "Unnamed user",
      sublabel: `Joined ${new Date(p.created_at).toLocaleDateString()}`,
      deleted_at: p.deleted_at!,
    }));
    setItems([...txItems, ...profileItems].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const restore = async (item: AdminBinItem) => {
    const table = item.type === "transaction" ? "transactions" : "profiles";
    const { error } = await supabase.from(table).update({ deleted_at: null }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.type === item.type)));
    toast.success(`Restored ${item.label}`);
  };

  const restoreAll = async () => {
    try {
      await Promise.all(items.map((i) => {
        const table = i.type === "transaction" ? "transactions" : "profiles";
        return supabase.from(table).update({ deleted_at: null }).eq("id", i.id);
      }));
      toast.success("All items restored");
      setItems([]);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const purge = async () => {
    if (!purgeTarget) return;
    const table = purgeTarget.type === "transaction" ? "transactions" : "profiles";
    const { error } = await supabase.from(table).delete().eq("id", purgeTarget.id);
    if (error) { toast.error(error.message); setPurgeTarget(null); return; }
    setItems((prev) => prev.filter((i) => !(i.id === purgeTarget.id && i.type === purgeTarget.type)));
    toast.success("Permanently deleted");
    setPurgeTarget(null);
  };

  const emptyAll = async () => {
    try {
      await Promise.all(items.map((i) => {
        const table = i.type === "transaction" ? "transactions" : "profiles";
        return supabase.from(table).delete().eq("id", i.id);
      }));
      setItems([]);
      toast.success("Bin emptied");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEmptyOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Bin</h1>
        <p className="text-sm text-muted-foreground">Items here are auto-deleted after 7 days.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={restoreAll} disabled={items.length === 0 || loading}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> Restore all
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setEmptyOpen(true)} disabled={items.length === 0 || loading}>
          <Trash className="mr-1.5 h-4 w-4" /> Empty bin
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">The Bin is empty</p>
              <p className="text-xs text-muted-foreground">Deleted items will appear here for 7 days.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const days = daysLeft(item.deleted_at);
                const Icon = item.type === "transaction" ? ArrowRightLeft : User;
                return (
                  <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                    </div>
                    {item.amount !== undefined && (
                      <span className={`text-xs font-semibold ${item.amountKind === "income" ? "text-primary" : "text-destructive"}`}>
                        {item.amountKind === "income" ? "+" : "-"}KSh {item.amount.toLocaleString()}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {days === 0 ? "Deletes today" : `${days}d left`}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => restore(item)} title="Restore">
                      <RotateCcw className="h-4 w-4 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setPurgeTarget(item)} title="Delete forever">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!purgeTarget}
        onOpenChange={(o) => !o && setPurgeTarget(null)}
        title="Delete forever?"
        description={`"${purgeTarget?.label}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete forever"
        onConfirm={purge}
      />
      <ConfirmDialog
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title="Empty the Admin Bin?"
        description={`All ${items.length} item${items.length === 1 ? "" : "s"} will be permanently removed. This cannot be undone.`}
        confirmLabel="Empty bin"
        onConfirm={emptyAll}
      />
    </div>
  );
};

export default AdminBin;
