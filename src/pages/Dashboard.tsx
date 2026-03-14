import { useState, useEffect } from "react";
import { getTransactions, getBudgets, Transaction, Budget } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/use-admin";
import BalanceCard from "@/components/BalanceCard";
import RecentTransactions from "@/components/RecentTransactions";
import SpendingChart from "@/components/SpendingChart";
import SpendingTrends from "@/components/SpendingTrends";
import SpendingInsights from "@/components/SpendingInsights";
import { BalanceCardSkeleton, ChartSkeleton, TransactionsSkeleton } from "@/components/DashboardSkeleton";
import PageTransition from "@/components/PageTransition";
import { User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Dashboard = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const txns = await getTransactions();
        setTransactions(txns);
        if (user) {
          const b = await getBudgets(user.id);
          setBudgets(b);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

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
          <div>
            <p className="text-sm text-muted-foreground">{greeting} 👋</p>
            <h1 className="text-xl font-bold">ChapaaCheck</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="rounded-lg p-2 text-primary hover:bg-muted transition-colors"
                title="Admin Dashboard"
              >
                <ShieldCheck className="h-5 w-5" />
              </button>
            )}
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
              <SpendingInsights transactions={transactions} budgets={budgets} />
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
