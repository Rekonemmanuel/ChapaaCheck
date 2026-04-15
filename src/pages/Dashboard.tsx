import { useState, useEffect } from "react";
import { getTransactions, getSavingsGoal, Transaction } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import BalanceCard from "@/components/BalanceCard";
import RecentTransactions from "@/components/RecentTransactions";
import SpendingChart from "@/components/SpendingChart";
import SpendingTrends from "@/components/SpendingTrends";
import StreakBadge from "@/components/StreakBadge";
import AchievementCard from "@/components/AchievementCard";
import { BalanceCardSkeleton, ChartSkeleton, TransactionsSkeleton } from "@/components/DashboardSkeleton";
import PageTransition from "@/components/PageTransition";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { calculateStreak, AchievementContext } from "@/lib/achievements";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoal, setSavingsGoal] = useState(10000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTransactions(),
      user ? getSavingsGoal(user.id) : Promise.resolve(10000),
    ])
      .then(([txns, goal]) => {
        setTransactions(txns);
        setSavingsGoal(goal);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const streak = calculateStreak(transactions);
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const achievementCtx: AchievementContext = {
    transactions,
    streak,
    totalSaved: totalIncome - totalExpenses,
    savingsGoal,
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <PageTransition>
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{greeting} 👋</p>
              <h1 className="text-xl font-bold">ChapaaCheck</h1>
            </div>
            {!loading && <StreakBadge streak={streak} />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/profile")}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
              title="Profile"
            >
              <User className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        <div className="space-y-5">
          {loading ? (
            <>
              <BalanceCardSkeleton />
              <ChartSkeleton />
              <TransactionsSkeleton />
            </>
          ) : (
            <>
              <BalanceCard transactions={transactions} />
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <SpendingChart transactions={transactions} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                <SpendingTrends transactions={transactions} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <AchievementCard context={achievementCtx} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <RecentTransactions transactions={transactions} />
              </motion.div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
