import { TrendingUp, TrendingDown } from "lucide-react";
import { Transaction } from "@/lib/store";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { motion } from "framer-motion";

interface BalanceCardProps {
  transactions: Transaction[];
}

const BalanceCard = ({ transactions }: BalanceCardProps) => {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  const animatedBalance = useAnimatedNumber(balance);
  const animatedIncome = useAnimatedNumber(totalIncome);
  const animatedExpenses = useAnimatedNumber(totalExpenses);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-lg"
    >
      <p className="text-sm font-medium opacity-80">Total Balance</p>
      <h2 className="mt-1 text-3xl font-bold tracking-tight">
        KSh {animatedBalance.toLocaleString()}
      </h2>
      <div className="mt-4 flex gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2"
        >
          <div className="rounded-full bg-primary-foreground/20 p-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[10px] opacity-70">Income</p>
            <p className="text-sm font-semibold">KSh {animatedIncome.toLocaleString()}</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2"
        >
          <div className="rounded-full bg-primary-foreground/20 p-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[10px] opacity-70">Expenses</p>
            <p className="text-sm font-semibold">KSh {animatedExpenses.toLocaleString()}</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BalanceCard;
