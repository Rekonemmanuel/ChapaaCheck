import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Trash2, Download, Inbox } from "lucide-react";
import { getCategoryEmoji } from "@/lib/store";
import ConfirmDialog from "@/components/ConfirmDialog";

const titleCase = (s?: string | null) =>
  (s ?? "").trim().split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [range, setRange] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [txRes, pRes] = await Promise.all([
      supabase.from("transactions").select("*").is("deleted_at", null).order("date", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    setTransactions(txRes.data ?? []);
    const map: Record<string, string> = {};
    (pRes.data ?? []).forEach((p) => { map[p.user_id] = titleCase(p.display_name) || "Unnamed"; });
    setProfiles(map);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Moved to Bin");
    fetchData();
  };

  const filtered = useMemo(() => {
    const cutoff = (() => {
      if (range === "all") return null;
      const d = new Date(); d.setDate(d.getDate() - ({ "7d": 7, "30d": 30, "90d": 90 })[range]); return d;
    })();
    return transactions.filter((t) => {
      const matchesSearch = t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        (profiles[t.user_id] ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesRange = !cutoff || new Date(t.date ?? t.created_at) >= cutoff;
      return matchesSearch && matchesType && matchesRange;
    });
  }, [transactions, search, typeFilter, range, profiles]);

  const totalAmount = filtered.reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);

  const exportCSV = () => {
    const rows = [
      ["id", "user", "type", "category", "description", "amount", "date"],
      ...filtered.map((t) => [t.id, profiles[t.user_id] ?? "Unknown", t.type, t.category, (t.description ?? "").replace(/"/g, '""'), t.amount, t.date]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">All Transactions</h1>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search description, category, or user…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as any)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} transactions · Net: <span className={totalAmount >= 0 ? "text-primary" : "text-destructive"}>KSh {totalAmount.toLocaleString()}</span>
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Inbox className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No transactions</p>
                      <p className="text-xs text-muted-foreground">Try changing your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{profiles[t.user_id] ?? "Unknown"}</TableCell>
                  <TableCell>
                    <span className="mr-1">{getCategoryEmoji(t.category)}</span>{t.category}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.description || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.date}</TableCell>
                  <TableCell className="text-right font-medium">
                    <Badge variant={t.type === "income" ? "default" : "destructive"}>
                      {t.type === "income" ? "+" : "-"}KSh {Number(t.amount).toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(t)} title="Move to Bin">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Move transaction to Bin?"
        description="This transaction will be moved to the Admin Bin and auto-removed after 7 days. You can restore it before then."
        confirmLabel="Move to Bin"
        onConfirm={async () => {
          if (confirmDelete) await handleDelete(confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
};

export default AdminTransactions;
