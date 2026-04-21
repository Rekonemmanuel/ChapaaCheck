import { useState, useEffect } from "react";
import {
  getTransactions,
  getBudgets,
  upsertBudget,
  deleteBudget,
  Budget,
  Transaction,
  getCategoryEmoji,
  EXPENSE_CATEGORIES,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SavingsJars from "@/components/SavingsJars";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const BudgetPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOriginal, setEditingOriginal] = useState<Budget | null>(null);
  const [formCategory, setFormCategory] = useState<string>("");
  const [formLimit, setFormLimit] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);

  useEffect(() => {
    if (!user) return;
    getTransactions().then(setTransactions);
    getBudgets(user.id).then(setBudgets);
  }, [user]);

  const thisMonthExpenses = transactions.filter((t) => {
    if (t.type !== "expense") return false;
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const spentByCategory = thisMonthExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const openAdd = () => {
    setEditingOriginal(null);
    const used = new Set(budgets.map((b) => b.category));
    const firstFree = EXPENSE_CATEGORIES.find((c) => !used.has(c)) ?? "";
    setFormCategory(firstFree);
    setFormLimit("");
    setDialogOpen(true);
  };

  const openEdit = (budget: Budget) => {
    setEditingOriginal(budget);
    setFormCategory(budget.category);
    setFormLimit(String(budget.limit));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const limitNum = Number(formLimit);
    if (!formCategory) {
      toast.error("Pick a category");
      return;
    }
    if (!Number.isFinite(limitNum) || limitNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (
      !editingOriginal &&
      budgets.some((b) => b.category === formCategory)
    ) {
      toast.error("A budget for this category already exists");
      return;
    }

    setSaving(true);
    try {
      // If category changed during edit, remove the old row first
      if (editingOriginal && editingOriginal.category !== formCategory) {
        await deleteBudget(editingOriginal.category, user.id);
      }
      await upsertBudget({ category: formCategory, limit: limitNum }, user.id);
      const fresh = await getBudgets(user.id);
      setBudgets(fresh);
      setDialogOpen(false);
      toast.success(editingOriginal ? "Budget updated" : "Budget added");
    } catch (e: any) {
      toast.error(e.message ?? "Could not save budget");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !deleteTarget) return;
    try {
      await deleteBudget(deleteTarget.category, user.id);
      setBudgets((prev) => prev.filter((b) => b.category !== deleteTarget.category));
      toast.success("Budget moved to Bin");
    } catch (e: any) {
      toast.error(e.message ?? "Could not delete budget");
    } finally {
      setDeleteTarget(null);
    }
  };

  const availableCategories = EXPENSE_CATEGORIES.filter(
    (c) =>
      c === editingOriginal?.category ||
      !budgets.some((b) => b.category === c)
  );

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-5 text-xl font-bold animate-fade-in">Budget & Goals</h1>

      {/* Savings Jars */}
      <div className="mb-6 animate-fade-in">
        <SavingsJars />
      </div>

      {/* Budget Categories */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Monthly Budgets</h3>
        <Button size="sm" variant="outline" onClick={openAdd} className="h-8 gap-1">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="space-y-3">
        {budgets.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No budgets yet. Tap "Add" to create one.
          </p>
        )}
        {budgets.map((budget) => {
          const spent = spentByCategory[budget.category] || 0;
          const percent = Math.min(100, (spent / budget.limit) * 100);
          const isOver = spent > budget.limit;

          return (
            <div key={budget.category} className="rounded-xl bg-card p-4 shadow-sm animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{getCategoryEmoji(budget.category)}</span>
                  <span className="text-sm font-medium">{budget.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold mr-1 ${isOver ? "text-expense" : "text-muted-foreground"}`}>
                    KSh {spent.toLocaleString()} / {budget.limit.toLocaleString()}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => openEdit(budget)}
                    aria-label={`Edit ${budget.category} budget`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-expense hover:text-expense"
                    onClick={() => setDeleteTarget(budget)}
                    aria-label={`Delete ${budget.category} budget`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Progress
                value={percent}
                className={`h-2 ${isOver ? "[&>div]:bg-expense" : "[&>div]:bg-primary"}`}
              />
              {isOver && (
                <p className="mt-1.5 text-[11px] text-expense font-medium">
                  ⚠️ Over budget by KSh {(spent - budget.limit).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingOriginal ? "Edit Budget" : "Add Budget"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {getCategoryEmoji(c)} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monthly limit (KSh)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={formLimit}
                onChange={(e) => setFormLimit(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>
              The {deleteTarget?.category} budget will be moved to the Bin and auto-deleted after 7 days. Your transactions are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-expense hover:bg-expense/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetPage;
