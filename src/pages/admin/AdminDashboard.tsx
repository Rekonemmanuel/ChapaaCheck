import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Download,
  Inbox,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RangeKey = "7d" | "30d" | "90d";

const RANGE_LABEL: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};
const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 70% 45%)",
  "hsl(38 92% 55%)",
  "hsl(199 89% 55%)",
  "hsl(280 70% 60%)",
  "hsl(340 75% 55%)",
  "hsl(20 90% 55%)",
];

const titleCase = (s?: string | null) =>
  (s ?? "").trim().split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");

const getInitials = (name?: string | null, email?: string | null) => {
  const src = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
};

const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

const AdminDashboard = () => {
  const [range, setRange] = useState<RangeKey>("30d");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [authUsers, setAuthUsers] = useState<Record<string, { email?: string; last_sign_in_at?: string; email_confirmed_at?: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [pRes, tRes, auRes] = await Promise.all([
        supabase.from("profiles").select("*").is("deleted_at", null),
        supabase.from("transactions").select("*").is("deleted_at", null),
        supabase.functions.invoke("admin-list-users"),
      ]);
      if (!mounted) return;
      setProfiles(pRes.data ?? []);
      setTransactions(tRes.data ?? []);
      const map: Record<string, any> = {};
      const users = (auRes.data as any)?.users ?? [];
      users.forEach((u: any) => { map[u.id] = u; });
      setAuthUsers(map);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const days = RANGE_DAYS[range];
  const now = new Date();
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - days);
  const prevCutoff = new Date(now); prevCutoff.setDate(prevCutoff.getDate() - days * 2);

  const inRange = (iso: string, from: Date, to: Date) => {
    const d = new Date(iso); return d >= from && d <= to;
  };

  // Build daily series
  const dailySeries = useMemo(() => {
    const buckets: { date: string; users: number; tx: number; volume: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ date: key, users: 0, tx: 0, volume: 0 });
    }
    const idx = (key: string) => buckets.findIndex((b) => b.date === key);
    profiles.forEach((p) => {
      const k = (p.created_at ?? "").slice(0, 10);
      const i = idx(k); if (i >= 0) buckets[i].users += 1;
    });
    transactions.forEach((t) => {
      const k = (t.date ?? t.created_at ?? "").slice(0, 10);
      const i = idx(k);
      if (i >= 0) { buckets[i].tx += 1; buckets[i].volume += Number(t.amount); }
    });
    return buckets;
  }, [profiles, transactions, days]);

  // Period totals + delta vs previous period
  const stats = useMemo(() => {
    const usersThis = profiles.filter((p) => inRange(p.created_at, cutoff, now)).length;
    const usersPrev = profiles.filter((p) => inRange(p.created_at, prevCutoff, cutoff)).length;
    const txThis = transactions.filter((t) => inRange(t.date ?? t.created_at, cutoff, now));
    const txPrev = transactions.filter((t) => inRange(t.date ?? t.created_at, prevCutoff, cutoff));
    const volThis = txThis.reduce((s, t) => s + Number(t.amount), 0);
    const volPrev = txPrev.reduce((s, t) => s + Number(t.amount), 0);
    const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);
    return {
      totalUsers: profiles.length,
      totalTx: transactions.length,
      totalVolume: transactions.reduce((s, t) => s + Number(t.amount), 0),
      usersThis,
      usersDelta: pct(usersThis, usersPrev),
      txThis: txThis.length,
      txDelta: pct(txThis.length, txPrev.length),
      volThis,
      volDelta: pct(volThis, volPrev),
    };
  }, [profiles, transactions, cutoff, prevCutoff]);

  // Category breakdown (expenses only, in range)
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === "expense" && inRange(t.date ?? t.created_at, cutoff, now))
      .forEach((t) => { map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount)); });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [transactions, cutoff]);

  // Recent signups (last 5, with email)
  const recentSignups = useMemo(() => {
    return [...profiles]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [profiles]);

  const exportCSV = () => {
    const rows = [
      ["id", "user_id", "type", "category", "description", "amount", "date"],
      ...transactions.map((t) => [t.id, t.user_id, t.type, t.category, (t.description ?? "").replace(/"/g, '""'), t.amount, t.date]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `chapaacheck-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      sub: `+${stats.usersThis} in ${RANGE_LABEL[range].toLowerCase()}`,
      delta: stats.usersDelta,
      icon: Users,
      sparkKey: "users" as const,
    },
    {
      title: "Total Transactions",
      value: stats.totalTx,
      sub: `${stats.txThis} in ${RANGE_LABEL[range].toLowerCase()}`,
      delta: stats.txDelta,
      icon: ArrowRightLeft,
      sparkKey: "tx" as const,
    },
    {
      title: "Total Volume",
      value: ksh(stats.totalVolume),
      sub: `${ksh(stats.volThis)} in ${RANGE_LABEL[range].toLowerCase()}`,
      delta: stats.volDelta,
      icon: TrendingUp,
      sparkKey: "volume" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => {
          const positive = c.delta >= 0;
          return (
            <Card key={c.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                <c.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">{c.value}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground truncate">{c.sub}</span>
                  <Badge variant="secondary" className={`gap-1 ${positive ? "text-primary" : "text-destructive"}`}>
                    {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(c.delta).toFixed(0)}%
                  </Badge>
                </div>
                <div className="h-12 -mx-2 -mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySeries}>
                      <defs>
                        <linearGradient id={`g-${c.sparkKey}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey={c.sparkKey} stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#g-${c.sparkKey})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity + Categories */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Daily Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Transactions per day · {RANGE_LABEL[range]}</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {dailySeries.every((d) => d.tx === 0) ? (
                <EmptyState icon={Inbox} title="No activity yet" hint="Transactions will appear here once users start logging." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySeries}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="tx" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Categories</CardTitle>
            <p className="text-xs text-muted-foreground">Expenses · {RANGE_LABEL[range]}</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {categoryData.length === 0 ? (
                <EmptyState icon={Inbox} title="No expenses yet" hint="Category breakdown will appear here." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => ksh(v)}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {categoryData.length > 0 && (
              <ul className="mt-2 space-y-1">
                {categoryData.slice(0, 4).map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="font-medium">{ksh(c.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent signups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : recentSignups.length === 0 ? (
            <EmptyState icon={Users} title="No users yet" hint="New signups will appear here." />
          ) : (
            <ul className="space-y-2">
              {recentSignups.map((p) => {
                const auth = authUsers[p.user_id];
                const name = titleCase(p.display_name) || (auth?.email?.split("@")[0] ?? "Unnamed");
                const verified = !!auth?.email_confirmed_at;
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {getInitials(name, auth?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{auth?.email ?? "—"}</p>
                    </div>
                    <Badge variant={verified ? "secondary" : "outline"} className={verified ? "text-primary" : "text-muted-foreground"}>
                      {verified ? "Active" : "Pending"}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, hint }: { icon: any; title: string; hint: string }) => (
  <div className="flex h-full flex-col items-center justify-center text-center">
    <Icon className="h-10 w-10 text-muted-foreground/40" />
    <p className="mt-2 text-sm font-medium">{title}</p>
    <p className="text-xs text-muted-foreground">{hint}</p>
  </div>
);

export default AdminDashboard;
