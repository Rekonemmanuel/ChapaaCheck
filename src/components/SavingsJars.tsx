import { useState, useEffect } from "react";
import {
  getSavingsJars,
  addSavingsJar,
  updateSavingsJar,
  deleteSavingsJar,
  getAvailableToSave,
  addTransaction,
  SavingsJar,
  JAR_COLORS,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PiggyBank, Plus, Trash2, Minus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";

const SUGGESTED_EMOJIS = ["🎯", "💻", "🚗", "🏠", "✈️", "📱", "🎓", "💍", "🎮", "📚", "🚲", "🎸", "🆘", "🎁"];

const colorMap: Record<string, { bg: string; text: string; bar: string; ring: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", bar: "[&>div]:bg-emerald-500", ring: "ring-emerald-500/30" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", bar: "[&>div]:bg-amber-500", ring: "ring-amber-500/30" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-400", bar: "[&>div]:bg-sky-500", ring: "ring-sky-500/30" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", bar: "[&>div]:bg-rose-500", ring: "ring-rose-500/30" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-400", bar: "[&>div]:bg-violet-500", ring: "ring-violet-500/30" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", bar: "[&>div]:bg-orange-500", ring: "ring-orange-500/30" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-400", bar: "[&>div]:bg-teal-500", ring: "ring-teal-500/30" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400", bar: "[&>div]:bg-yellow-500", ring: "ring-yellow-500/30" },
};

const SavingsJars = () => {
  const { user } = useAuth();
  const [jars, setJars] = useState<SavingsJar[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contributeJar, setContributeJar] = useState<SavingsJar | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SavingsJar | null>(null);

  // New jar form
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [color, setColor] = useState<string>("emerald");

  useEffect(() => {
    getSavingsJars().then((data) => {
      setJars(data);
      setLoading(false);
    });
  }, []);

  const resetForm = () => {
    setName(""); setEmoji("🎯"); setTarget(""); setColor("emerald");
  };

  const handleAdd = async () => {
    if (!name || !target || !user) {
      toast.error("Please add a name and target amount");
      return;
    }
    try {
      const jar = await addSavingsJar({ name, emoji, target_amount: Number(target), color }, user.id);
      setJars((prev) => [...prev, jar]);
      setDialogOpen(false);
      resetForm();
      toast.success(`${emoji} ${name} jar created!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleContribute = async (delta: number) => {
    if (!contributeJar || !user) return;
    const amt = Number(contributeAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    if (delta > 0) {
      // Deposit: must have available (unallocated) income to cover it
      const available = await getAvailableToSave(user.id);
      if (amt > available) {
        toast.error(`Not enough income. You only have KSh ${available.toLocaleString()} available to save.`);
        return;
      }
    } else {
      // Withdraw: can't take more than is in the jar
      if (amt > contributeJar.saved_amount) {
        toast.error("You can't withdraw more than the jar holds");
        return;
      }
    }

    const newSaved = Math.max(0, contributeJar.saved_amount + delta * amt);
    try {
      await updateSavingsJar(contributeJar.id, { saved_amount: newSaved });
      // Mirror the move in the transactions ledger so balance stays accurate
      await addTransaction(
        {
          type: delta > 0 ? "expense" : "income",
          amount: amt,
          category: "Savings",
          description: `${delta > 0 ? "Deposit to" : "Withdraw from"} ${contributeJar.emoji} ${contributeJar.name}`,
          date: new Date().toISOString().slice(0, 10),
        },
        user.id
      );
      setJars((prev) => prev.map((j) => (j.id === contributeJar.id ? { ...j, saved_amount: newSaved } : j)));
      setContributeJar(null);
      setContributeAmount("");
      toast.success(delta > 0 ? "Saved to jar 💰" : "Withdrawn from jar");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSavingsJar(deleteTarget.id);
      setJars((prev) => prev.filter((j) => j.id !== deleteTarget.id));
      toast.success("Jar moved to Bin");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Savings Jars</h2>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> New Jar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create a Savings Jar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
                <Input placeholder="e.g. New Laptop, Trip to Mombasa" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Target Amount (KSh)</label>
                <Input type="number" placeholder="50000" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Choose an Icon</label>
                <div className="grid grid-cols-7 gap-2">
                  {SUGGESTED_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={cn(
                        "h-10 rounded-lg text-xl transition-all",
                        emoji === e ? "bg-primary/10 ring-2 ring-primary scale-110" : "bg-card hover:bg-muted"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Color</label>
                <div className="flex flex-wrap gap-2">
                  {JAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "h-8 w-8 rounded-full transition-all",
                        colorMap[c].bar.replace("[&>div]:", ""),
                        color === c && "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                      )}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">Create Jar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />)}
        </div>
      ) : jars.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center shadow-sm">
          <PiggyBank className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No savings jars yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Create one for each goal you're saving toward</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {jars.map((jar) => {
            const c = colorMap[jar.color] ?? colorMap.emerald;
            const pct = jar.target_amount > 0 ? Math.min(100, (jar.saved_amount / jar.target_amount) * 100) : 0;
            const remaining = Math.max(0, jar.target_amount - jar.saved_amount);
            const complete = pct >= 100;
            return (
              <div key={jar.id} className={cn("rounded-2xl p-4 shadow-sm transition-all", c.bg)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{jar.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold">{jar.name}</p>
                      <p className={cn("text-[11px] font-medium", c.text)}>
                        {complete ? "🎉 Goal reached!" : `KSh ${remaining.toLocaleString()} to go`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget(jar)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-baseline justify-between mb-1.5">
                  <span className={cn("text-lg font-bold", c.text)}>
                    KSh {jar.saved_amount.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    of {jar.target_amount.toLocaleString()} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={pct} className={cn("h-2 bg-background/60", c.bar)} />

                <button
                  onClick={() => { setContributeJar(jar); setContributeAmount(""); }}
                  className="mt-3 w-full rounded-lg bg-background/80 py-1.5 text-xs font-medium hover:bg-background transition-colors"
                >
                  Add / Withdraw
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Contribute dialog */}
      <Dialog open={!!contributeJar} onOpenChange={(o) => !o && setContributeJar(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {contributeJar?.emoji} {contributeJar?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Amount (KSh)"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              className="h-12 text-center text-lg font-semibold"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleContribute(-1)} className="gap-1.5">
                <Minus className="h-4 w-4" /> Withdraw
              </Button>
              <Button onClick={() => handleContribute(1)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Deposit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this jar?"
        description={`"${deleteTarget?.name}" will be moved to the Bin. Your saved amount stays with the jar and can be restored within 7 days.`}
        confirmLabel="Move to Bin"
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default SavingsJars;
