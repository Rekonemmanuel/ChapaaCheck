import { useNavigate } from "react-router-dom";
import { ArrowLeft, User as UserIcon, Trash2, Sun, Moon, Monitor, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useState } from "react";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <PageTransition>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <div className="mb-5 flex items-center gap-3 animate-fade-in">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Account */}
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</h2>
            <div className="rounded-xl bg-card shadow-sm overflow-hidden">
              <button
                onClick={() => navigate("/profile")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <UserIcon className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Profile</p>
                  <p className="text-[11px] text-muted-foreground">Display name & avatar</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Appearance</h2>
            <div className="rounded-xl bg-card p-4 shadow-sm">
              <p className="mb-3 text-sm font-medium">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-all ${
                      theme === value ? "border-primary bg-primary/5 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Data */}
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data</h2>
            <div className="rounded-xl bg-card shadow-sm overflow-hidden">
              <button
                onClick={() => navigate("/bin")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <Trash2 className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Bin</p>
                  <p className="text-[11px] text-muted-foreground">Restore recently deleted items (kept 7 days)</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* Session */}
          <section>
            <button
              onClick={() => setSignOutOpen(true)}
              className="w-full rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/15 transition-colors"
            >
              Sign out
            </button>
          </section>

          <p className="pt-4 text-center text-[11px] text-muted-foreground">
            ChapaaCheck — Smart Student Finance Tracker
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out?"
        description="You'll need to sign in again to access your data."
        confirmLabel="Sign out"
        destructive
        onConfirm={async () => {
          await signOut();
          setSignOutOpen(false);
          navigate("/auth");
        }}
      />
    </PageTransition>
  );
};

export default Settings;
