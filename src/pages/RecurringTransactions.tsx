import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  RecurringTransaction,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryEmoji,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Plus, Trash2, Repeat, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

const RecurringTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<RecurringTransaction["frequency"]>("monthly");
  const [nextDate, setNextDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  useEffect(() => {
    getRecurringTransactions().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const resetForm = () => {
    setType("expense");
    setAmount("");
    setCategory("");
    setDescription("");
    setFrequency("monthly");
    setNextDate(new Date());
  };

  const handleAdd = async () => {
    if (!amount || !category || !user) {
      toast.error("Please fill in amount and category");
      return;
    }
    setSubmitting(true);
    try {
      const newItem = await addRecurringTransaction(
        { type, amount: Number(amount), category, description, frequency, next_date: format(nextDate, "yyyy-MM-dd") },
        user.id
      );
      setItems((prev) => [newItem, ...prev]);
      setDialogOpen(false);
      resetForm();
      toast.success("Recurring transaction added! 🔄");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await updateRecurringTransaction(id, { is_active: !currentActive });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_active: !currentActive } : i)));
      toast.success(currentActive ? "Paused" : "Resumed");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurringTransaction(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <div className="mb-5 flex items-center gap-3 animate-fade-in">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-xl font-bold">Recurring Transactions</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] rounded-2xl sm:max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Recurring Transaction</DialogTitle>
              </DialogHeader>

              {/* Type Toggle */}
              <div className="flex gap-2 rounded-xl bg-muted p-1">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setType(t); setCategory(""); }}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                      type === t
                        ? t === "expense" ? "bg-expense text-primary-foreground shadow-sm" : "bg-income text-primary-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t === "expense" ? "Expense" : "Income"}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount (KSh)</label>
                <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-xl font-bold text-center" />
              </div>

              {/* Frequency */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Frequency</label>
                <div className="grid grid-cols-4 gap-2">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFrequency(f.value)}
                      className={`rounded-lg py-2 text-xs font-medium transition-all ${
                        frequency === f.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-foreground shadow-sm"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Starting Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(nextDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={nextDate} onSelect={(d) => d && setNextDate(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2.5 text-xs transition-all ${
                        category === cat ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-card text-foreground shadow-sm hover:shadow-md"
                      }`}
                    >
                      <span className="text-base">{getCategoryEmoji(cat)}</span>
                      <span className="font-medium leading-tight text-[10px]">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Note (optional)</label>
                <Input placeholder="e.g. Netflix subscription" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <Button onClick={handleAdd} className="w-full h-11 font-semibold" disabled={submitting}>
                {submitting ? "Adding..." : "Add Recurring"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-card p-10 text-center shadow-sm">
            <Repeat className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No recurring transactions yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Tap "Add" to set up automated entries</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-opacity",
                  !item.is_active && "opacity-50"
                )}
              >
                <span className="text-xl">{getCategoryEmoji(item.category)}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{item.description || item.category}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="capitalize">{item.frequency}</span>
                    <span>·</span>
                    <span>Next: {new Date(item.next_date).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
                <span className={cn("text-sm font-semibold", item.type === "income" ? "text-income" : "text-expense")}>
                  {item.type === "income" ? "+" : "-"}KSh {item.amount.toLocaleString()}
                </span>
                <Switch checked={item.is_active} onCheckedChange={() => handleToggle(item.id, item.is_active)} />
                <button onClick={() => handleDelete(item.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default RecurringTransactions;
