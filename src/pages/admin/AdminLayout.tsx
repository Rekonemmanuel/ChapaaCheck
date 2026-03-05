import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Users, ArrowRightLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/transactions", label: "Transactions", icon: ArrowRightLeft },
];

const AdminLayout = () => {
  const { isAdmin, loading } = useAdmin();
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="mx-auto max-w-5xl px-4 pb-8 pt-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <nav className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
};

export default AdminLayout;
