import { useState, useEffect } from "react";
import { getTransactions, Transaction } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/use-admin";
import BalanceCard from "@/components/BalanceCard";
import RecentTransactions from "@/components/RecentTransactions";
import SpendingChart from "@/components/SpendingChart";
import SpendingTrends from "@/components/SpendingTrends";
import { User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    getTransactions().then(setTransactions);
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <div className="mb-5 flex items-center justify-between animate-fade-in">
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
      </div>

      <div className="space-y-5">
        <BalanceCard transactions={transactions} />
        <SpendingChart transactions={transactions} />
        <SpendingTrends transactions={transactions} />
        <RecentTransactions transactions={transactions} />
      </div>
    </div>
  );
};

export default Dashboard;
