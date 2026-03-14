import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Trophy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Transaction, Budget } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface InsightsData {
  summary: string;
  healthScore: number;
  insights: Array<{
    type: "tip" | "warning" | "achievement";
    emoji: string;
    title: string;
    description: string;
  }>;
  budgetAlerts: Array<{
    category: string;
    spent: number;
    limit: number;
    percentUsed: number;
  }>;
}

interface SpendingInsightsProps {
  transactions: Transaction[];
  budgets: Budget[];
}

const typeStyles = {
  tip: "bg-primary/10 border-primary/20 text-primary",
  warning: "bg-destructive/10 border-destructive/20 text-destructive",
  achievement: "bg-accent/10 border-accent/20 text-accent-foreground",
};

const typeIcons = {
  tip: TrendingUp,
  warning: AlertTriangle,
  achievement: Trophy,
};

const SpendingInsights = ({ transactions, budgets }: SpendingInsightsProps) => {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const fetchInsights = async () => {
    if (transactions.length === 0) {
      toast({ title: "No data yet", description: "Add some transactions first to get AI insights!", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("spending-insights", {
        body: { transactions, budgets },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result);
      setExpanded(true);
    } catch (e: any) {
      toast({ title: "Couldn't get insights", description: e.message || "Please try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-income";
    if (score >= 50) return "text-accent-foreground";
    return "text-expense";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 75) return "from-[hsl(var(--income))] to-[hsl(158,64%,46%)]";
    if (score >= 50) return "from-[hsl(var(--accent))] to-[hsl(38,92%,65%)]";
    return "from-[hsl(var(--expense))] to-[hsl(0,72%,61%)]";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-accent-foreground" />
          AI Insights
        </h3>
        {data && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>

      {!data && !loading && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchInsights}
          className="w-full rounded-xl bg-card p-5 shadow-sm border border-border text-center transition-shadow hover:shadow-md"
        >
          <Sparkles className="h-8 w-8 mx-auto text-accent-foreground mb-2" />
          <p className="text-sm font-medium">Get AI Spending Insights</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tap to analyze your spending patterns
          </p>
        </motion.button>
      )}

      {loading && (
        <div className="rounded-xl bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your spending...</p>
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </div>
      )}

      <AnimatePresence>
        {data && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-card p-4 shadow-sm space-y-4">
              {/* Health Score */}
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <motion.circle
                      cx="18" cy="18" r="15" fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className={`stroke-current ${getScoreColor(data.healthScore)}`}
                      strokeDasharray={`${(data.healthScore / 100) * 94.2} 94.2`}
                      initial={{ strokeDasharray: "0 94.2" }}
                      animate={{ strokeDasharray: `${(data.healthScore / 100) * 94.2} 94.2` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getScoreColor(data.healthScore)}`}>
                    {data.healthScore}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Financial Health</p>
                  <p className="text-sm font-medium leading-snug">{data.summary}</p>
                </div>
              </div>

              {/* Insights */}
              <motion.div
                className="space-y-2"
                variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                initial="hidden"
                animate="show"
              >
                {data.insights.map((insight, i) => {
                  const Icon = typeIcons[insight.type];
                  return (
                    <motion.div
                      key={i}
                      variants={{
                        hidden: { opacity: 0, x: -12 },
                        show: { opacity: 1, x: 0 },
                      }}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 ${typeStyles[insight.type]}`}
                    >
                      <span className="text-lg flex-shrink-0">{insight.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{insight.title}</p>
                        <p className="text-xs opacity-80 mt-0.5">{insight.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Budget Alerts */}
              {data.budgetAlerts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Budget Status</p>
                  <div className="space-y-2">
                    {data.budgetAlerts.map((alert, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{alert.category}</span>
                          <span className="text-muted-foreground">
                            KSh {alert.spent.toLocaleString()} / {alert.limit.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              alert.percentUsed > 100
                                ? "bg-destructive"
                                : alert.percentUsed > 80
                                ? "bg-accent"
                                : "bg-primary"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(alert.percentUsed, 100)}%` }}
                            transition={{ duration: 0.8, delay: i * 0.1 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh */}
              <button
                onClick={fetchInsights}
                disabled={loading}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 pt-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh insights
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {data && !expanded && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpanded(true)}
          className="w-full rounded-xl bg-card p-3 shadow-sm flex items-center gap-3 text-left"
        >
          <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getScoreGradient(data.healthScore)} flex items-center justify-center text-white text-xs font-bold`}>
            {data.healthScore}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{data.summary}</p>
            <p className="text-[11px] text-muted-foreground">{data.insights.length} insights available</p>
          </div>
        </motion.button>
      )}
    </motion.div>
  );
};

export default SpendingInsights;
