import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Trash2 } from "lucide-react";
import { getCategoryEmoji } from "@/lib/store";

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchData = async () => {
    const [txRes, pRes] = await Promise.all([
      supabase.from("transactions").select("*").order("date", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    setTransactions(txRes.data ?? []);
    const map: Record<string, string> = {};
    (pRes.data ?? []).forEach((p) => { map[p.user_id] = p.display_name ?? "Unnamed"; });
    setProfiles(map);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    toast.success("Transaction deleted");
    fetchData();
  };

  const filtered = transactions.filter((t) => {
    const matchesSearch = t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      (profiles[t.user_id] ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalAmount = filtered.reduce((s, t) => s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Transactions</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
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
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No transactions</TableCell></TableRow>
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
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTransactions;
