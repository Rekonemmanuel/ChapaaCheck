import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, Shield, UserX, Trash2, Users as UsersIcon } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface UserRow {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  email?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  roles: string[];
}

const titleCase = (s?: string | null) =>
  (s ?? "").trim().split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");

const getInitials = (name?: string | null, email?: string | null) => {
  const src = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  return src.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
};

const AdminUsers = () => {
  const [params] = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ kind: "role" | "delete"; user: UserRow; hasAdmin?: boolean } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, authRes] = await Promise.all([
      supabase.from("profiles").select("*").is("deleted_at", null),
      supabase.from("user_roles").select("*"),
      supabase.functions.invoke("admin-list-users"),
    ]);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const authUsers = ((authRes.data as any)?.users ?? []) as any[];
    const authMap = new Map(authUsers.map((u) => [u.id, u]));

    const mapped: UserRow[] = profiles.map((p) => {
      const a = authMap.get(p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        display_name: p.display_name,
        created_at: p.created_at,
        email: a?.email,
        email_confirmed_at: a?.email_confirmed_at,
        last_sign_in_at: a?.last_sign_in_at,
        roles: roles.filter((r) => r.user_id === p.user_id).map((r) => r.role as string),
      };
    });

    setUsers(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleAdmin = async (userId: string, hasAdmin: boolean) => {
    if (hasAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast.success("Admin role removed");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      toast.success("Admin role granted");
    }
    fetchUsers();
  };

  const softDeleteUser = async (u: UserRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", u.id);
    if (error) { toast.error(error.message); return; }
    toast.success("User moved to Bin");
    fetchUsers();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) =>
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <UsersIcon className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No users found</p>
                      <p className="text-xs text-muted-foreground">Try a different search term.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.map((u) => {
                const hasAdmin = u.roles.includes("admin");
                const verified = !!u.email_confirmed_at;
                const name = titleCase(u.display_name) || (u.email?.split("@")[0] ?? "Unnamed");
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(name, u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{name}</p>
                          <p className="truncate text-xs text-muted-foreground max-w-[220px]">{u.email ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={verified ? "secondary" : "outline"} className={verified ? "text-primary" : "text-muted-foreground"}>
                        {verified ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {u.roles.length > 0 ? u.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="mr-1">{r}</Badge>
                      )) : <span className="text-xs text-muted-foreground">user</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant={hasAdmin ? "outline" : "outline"} onClick={() => setConfirm({ kind: "role", user: u, hasAdmin })}>
                          {hasAdmin ? <><UserX className="mr-1 h-3 w-3" />Revoke</> : <><Shield className="mr-1 h-3 w-3" />Make Admin</>}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirm({ kind: "delete", user: u })} title="Move to Bin">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === "delete"
            ? "Move user to Bin?"
            : confirm?.hasAdmin
              ? "Revoke admin role?"
              : "Grant admin role?"
        }
        description={
          confirm?.kind === "delete"
            ? `${titleCase(confirm.user.display_name) || confirm.user.email} will be moved to the Admin Bin and auto-removed after 7 days. You can restore them before then.`
            : confirm?.hasAdmin
              ? `${titleCase(confirm.user.display_name) || confirm.user.email} will lose admin access immediately.`
              : `${titleCase(confirm.user.display_name) || confirm.user.email} will gain full admin access.`
        }
        confirmLabel={confirm?.kind === "delete" ? "Move to Bin" : confirm?.hasAdmin ? "Revoke" : "Grant"}
        destructive={confirm?.kind === "delete" || confirm?.hasAdmin}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.kind === "delete") await softDeleteUser(confirm.user);
          else await toggleAdmin(confirm.user.user_id, !!confirm.hasAdmin);
          setConfirm(null);
        }}
      />
    </div>
  );
};

export default AdminUsers;
