import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ArrowRightLeft, TrendingUp, ShieldCheck } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, transactions: 0, totalVolume: 0 });
  const [recentSignups, setRecentSignups] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [profilesRes, txRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("transactions").select("*"),
      ]);

      const profiles = profilesRes.data ?? [];
      const transactions = txRes.data ?? [];
      const totalVolume = transactions.reduce((s, t) => s + Number(t.amount), 0);

      setStats({ users: profiles.length, transactions: transactions.length, totalVolume });
      setRecentSignups(profiles.slice(0, 5));
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
    { title: "Total Transactions", value: stats.transactions, icon: ArrowRightLeft, color: "text-accent-foreground" },
    { title: "Total Volume", value: `KSh ${stats.totalVolume.toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentSignups.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="font-medium">{p.display_name || "Unnamed"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
