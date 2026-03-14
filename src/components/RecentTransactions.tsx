import { Transaction, getCategoryEmoji } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const RecentTransactions = ({ transactions }: RecentTransactionsProps) => {
  const navigate = useNavigate();
  const recent = transactions.slice(0, 5);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">Recent Transactions</h3>
        {transactions.length > 5 && (
          <button
            onClick={() => navigate("/transactions")}
            className="text-xs font-medium text-primary"
          >
            See all
          </button>
        )}
      </div>
      {recent.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl bg-card p-8 text-center"
        >
          <p className="text-3xl">💸</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No transactions yet. Tap + to add one!
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {recent.map((t) => (
            <motion.div
              key={t.id}
              variants={item}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-xl">{getCategoryEmoji(t.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{t.description || t.category}</p>
                <p className="text-[11px] text-muted-foreground">{t.category}</p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  t.type === "income" ? "text-income" : "text-expense"
                }`}
              >
                {t.type === "income" ? "+" : "-"}KSh {t.amount.toLocaleString()}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default RecentTransactions;
