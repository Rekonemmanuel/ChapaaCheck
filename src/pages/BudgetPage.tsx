import { useState, useEffect } from "react";
import { getTransactions, getBudgets, Budget, Transaction, getCategoryEmoji } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import SavingsJars from "@/components/SavingsJars";

const BudgetPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

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

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-5 text-xl font-bold animate-fade-in">Budget & Goals</h1>

      {/* Savings Jars (multiple categorized goals) */}
      <div className="mb-6 animate-fade-in">
        <SavingsJars />
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
