import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Users, ArrowRightLeft, ArrowLeft, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/chapaacheck-logo.png";
import { useState } from "react";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: ArrowRightLeft },
  { to: "/admin/bin", label: "Bin", icon: Trash2 },
];

const AdminLayout = () => {
  const { isAdmin, loading } = useAdmin();
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  if (loading || authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-destructive">Access Denied</p>
        <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/admin/users?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} title="Back to app">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <button onClick={() => navigate("/admin")} className="flex items-center gap-2">
            <img src={logo} alt="ChapaaCheck" width={32} height={32} className="h-8 w-8" loading="lazy" />
            <span className="font-bold text-base hidden sm:inline">ChapaaCheck</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>
          </button>
          <form onSubmit={handleSearch} className="relative ml-auto hidden md:block flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
