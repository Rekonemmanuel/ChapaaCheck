import { useState, useEffect } from "react";
import { getTransactions, Transaction } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import BalanceCard from "@/components/BalanceCard";
import RecentTransactions from "@/components/RecentTransactions";
import SpendingChart from "@/components/SpendingChart";
import SpendingTrends from "@/components/SpendingTrends";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();
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
        <button
          onClick={signOut}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
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
