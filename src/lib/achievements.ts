import { Transaction } from "@/lib/store";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  transactions: Transaction[];
  streak: number;
  totalSaved: number;
  savingsGoal: number;
}

export interface EarnedAchievement extends Achievement {
  earned: true;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_transaction",
    title: "First Step",
    description: "Record your first transaction",
    emoji: "🎯",
    check: (ctx) => ctx.transactions.length >= 1,
  },
  {
    id: "ten_transactions",
    title: "Getting Serious",
    description: "Record 10 transactions",
    emoji: "📊",
    check: (ctx) => ctx.transactions.length >= 10,
  },
  {
    id: "fifty_transactions",
    title: "Finance Pro",
    description: "Record 50 transactions",
    emoji: "🏆",
    check: (ctx) => ctx.transactions.length >= 50,
  },
  {
    id: "hundred_transactions",
    title: "Money Master",
    description: "Record 100 transactions",
    emoji: "👑",
    check: (ctx) => ctx.transactions.length >= 100,
  },
  {
    id: "streak_3",
    title: "On a Roll",
    description: "Log transactions 3 days in a row",
    emoji: "🔥",
    check: (ctx) => ctx.streak >= 3,
  },
  {
    id: "streak_7",
    title: "Weekly Warrior",
    description: "7-day logging streak",
    emoji: "⚡",
    check: (ctx) => ctx.streak >= 7,
  },
  {
    id: "streak_30",
    title: "Unstoppable",
    description: "30-day logging streak!",
    emoji: "💎",
    check: (ctx) => ctx.streak >= 30,
  },
  {
    id: "saver_positive",
    title: "In the Green",
    description: "Have a positive balance",
    emoji: "💚",
    check: (ctx) => ctx.totalSaved > 0,
  },
  {
    id: "saver_10k",
    title: "Stacking Up",
    description: "Save KSh 10,000+",
    emoji: "💰",
    check: (ctx) => ctx.totalSaved >= 10000,
  },
  {
    id: "saver_50k",
    title: "Big Saver",
    description: "Save KSh 50,000+",
    emoji: "🏦",
    check: (ctx) => ctx.totalSaved >= 50000,
  },
  {
    id: "goal_reached",
    title: "Goal Crusher",
    description: "Reach your savings goal",
    emoji: "🎉",
    check: (ctx) => ctx.totalSaved >= ctx.savingsGoal && ctx.savingsGoal > 0,
  },
  {
    id: "budget_conscious",
    title: "Budget Boss",
    description: "Record 5+ expense categories",
    emoji: "📋",
    check: (ctx) => {
      const cats = new Set(ctx.transactions.filter(t => t.type === "expense").map(t => t.category));
      return cats.size >= 5;
    },
  },
];

export function calculateStreak(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;

  const uniqueDays = [...new Set(transactions.map(t => t.date))].sort().reverse();
  if (uniqueDays.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const latestDate = new Date(uniqueDays[0]);
  latestDate.setHours(0, 0, 0, 0);

  // Streak must include today or yesterday
  if (latestDate < yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const current = new Date(uniqueDays[i - 1]);
    const prev = new Date(uniqueDays[i]);
    const diffDays = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getEarnedAchievements(ctx: AchievementContext): EarnedAchievement[] {
  return ACHIEVEMENTS.filter(a => a.check(ctx)).map(a => ({ ...a, earned: true }));
}
