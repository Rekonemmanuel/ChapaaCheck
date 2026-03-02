import { useState, useEffect } from "react";
import { getTransactions, getBudgets, getSavingsGoal, setSavingsGoal, Budget, Transaction, getCategoryEmoji } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { PiggyBank, Pencil, Check } from "lucide-react";

const BudgetPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsTarget, setSavingsTarget] = useState(0);
  const [editingSavings, setEditingSavings] = useState(false);
  const [tempSavings, setTempSavings] = useState("");

  useEffect(() => {
    if (!user) return;
    getTransactions().then(setTransactions);
    getBudgets(user.id).then(setBudgets);
    getSavingsGoal(user.id).then(setSavingsTarget);
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

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const saved = totalIncome - totalExpenses;
  const savingsPercent = savingsTarget > 0 ? Math.min(100, (saved / savingsTarget) * 100) : 0;

  const handleSaveSavings = async () => {
    const val = Number(tempSavings);
    if (val > 0 && user) {
      await setSavingsGoal(val, user.id);
      setSavingsTarget(val);
    }
    setEditingSavings(false);
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-5 text-xl font-bold animate-fade-in">Budget & Goals</h1>

      {/* Savings Jar */}
      <div className="mb-5 rounded-2xl bg-accent/30 p-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank className="h-5 w-5 text-accent-foreground" />
          <h3 className="text-sm font-semibold text-accent-foreground">Savings Jar</h3>
          <button
            onClick={() => {
              setEditingSavings(!editingSavings);
              setTempSavings(String(savingsTarget));
            }}
            className="ml-auto rounded-lg p-1 text-accent-foreground/60 hover:text-accent-foreground"
          >
            {editingSavings ? <Check className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
        </div>
        {editingSavings ? (
          <div className="flex gap-2">
            <Input
              type="number"
              value={tempSavings}
              onChange={(e) => setTempSavings(e.target.value)}
              placeholder="Target amount"
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSaveSavings()}
            />
            <button
              onClick={handleSaveSavings}
              className="rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              Save
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-bold text-accent-foreground">
                KSh {Math.max(0, saved).toLocaleString()}
              </span>
              <span className="text-xs text-accent-foreground/60">
                of KSh {savingsTarget.toLocaleString()}
              </span>
            </div>
            <Progress value={savingsPercent} className="h-3 bg-accent/30" />
          </>
        )}
      </div>

      {/* Budget Categories */}
      <h3 className="mb-3 text-sm font-semibold">Monthly Budgets</h3>
      <div className="space-y-3">
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
                <span className={`text-xs font-semibold ${isOver ? "text-expense" : "text-muted-foreground"}`}>
                  KSh {spent.toLocaleString()} / {budget.limit.toLocaleString()}
                </span>
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
    </div>
  );
};

export default BudgetPage;
