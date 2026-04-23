import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Shield, UserX } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  roles: string[];
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];

    const mapped: UserProfile[] = profiles.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      display_name: p.display_name,
      created_at: p.created_at,
      roles: roles.filter((r) => r.user_id === p.user_id).map((r) => r.role),
    }));

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

  const filtered = users.filter((u) =>
    (u.display_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No users found</TableCell></TableRow>
              ) : filtered.map((u) => {
                const hasAdmin = u.roles.includes("admin");
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.display_name || "Unnamed"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {u.roles.length > 0 ? u.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="mr-1">{r}</Badge>
                      )) : <span className="text-xs text-muted-foreground">user</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={hasAdmin ? "destructive" : "outline"} onClick={() => toggleAdmin(u.user_id, hasAdmin)}>
                        {hasAdmin ? <><UserX className="mr-1 h-3 w-3" />Revoke</> : <><Shield className="mr-1 h-3 w-3" />Make Admin</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
