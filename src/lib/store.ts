import { supabase } from "@/integrations/supabase/client";

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Budget {
  category: string;
  limit: number;
}

export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    type: t.type as "income" | "expense",
    amount: Number(t.amount),
    category: t.category,
    description: t.description ?? "",
    date: t.date,
  }));
};

export const addTransaction = async (t: Omit<Transaction, "id">, userId: string): Promise<Transaction> => {
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...t, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    type: data.type as "income" | "expense",
    amount: Number(data.amount),
    category: data.category,
    description: data.description ?? "",
    date: data.date,
  };
};

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
};

export const getBudgets = async (userId: string): Promise<Budget[]> => {
  const { data, error } = await supabase
    .from("budgets")
    .select("category, limit")
    .eq("user_id", userId);
  if (error) throw error;
  if (data && data.length > 0) {
    return data.map((b) => ({ category: b.category, limit: Number(b.limit) }));
  }
  // Seed default budgets
  const defaults: Budget[] = [
    { category: "Food", limit: 5000 },
    { category: "Transport", limit: 3000 },
    { category: "Entertainment", limit: 2000 },
    { category: "Shopping", limit: 4000 },
    { category: "Other", limit: 3000 },
  ];
  await supabase.from("budgets").insert(
    defaults.map((b) => ({ ...b, user_id: userId }))
  );
  return defaults;
};

export const saveBudgets = async (budgets: Budget[], userId: string) => {
  for (const b of budgets) {
    await supabase
      .from("budgets")
      .upsert({ category: b.category, limit: b.limit, user_id: userId }, { onConflict: "user_id,category" });
  }
};

export const getSavingsGoal = async (userId: string): Promise<number> => {
  const { data } = await supabase
    .from("savings_goals")
    .select("amount")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? Number(data.amount) : 10000;
};

export const setSavingsGoal = async (amount: number, userId: string) => {
  await supabase
    .from("savings_goals")
    .upsert({ amount, user_id: userId }, { onConflict: "user_id" });
};

export interface SavingsJar {
  id: string;
  name: string;
  emoji: string;
  target_amount: number;
  saved_amount: number;
  color: string;
}

export const JAR_COLORS = ["emerald", "amber", "sky", "rose", "violet", "orange", "teal", "yellow"] as const;

export const getSavingsJars = async (): Promise<SavingsJar[]> => {
  const { data, error } = await supabase
    .from("savings_jars")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((j: any) => ({
    id: j.id,
    name: j.name,
    emoji: j.emoji,
    target_amount: Number(j.target_amount),
    saved_amount: Number(j.saved_amount),
    color: j.color,
  }));
};

export const addSavingsJar = async (
  jar: Omit<SavingsJar, "id" | "saved_amount"> & { saved_amount?: number },
  userId: string
): Promise<SavingsJar> => {
  const { data, error } = await supabase
    .from("savings_jars")
    .insert({
      name: jar.name,
      emoji: jar.emoji,
      target_amount: jar.target_amount,
      saved_amount: jar.saved_amount ?? 0,
      color: jar.color,
      user_id: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    emoji: data.emoji,
    target_amount: Number(data.target_amount),
    saved_amount: Number(data.saved_amount),
    color: data.color,
  };
};

export const updateSavingsJar = async (id: string, updates: Partial<Omit<SavingsJar, "id">>) => {
  const { error } = await supabase.from("savings_jars").update(updates).eq("id", id);
  if (error) throw error;
};

export const deleteSavingsJar = async (id: string) => {
  const { error } = await supabase.from("savings_jars").delete().eq("id", id);
  if (error) throw error;
};

export const EXPENSE_CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Bills", "Education", "Health", "Other"];
export const INCOME_CATEGORIES = ["Allowance", "Part-time Job", "Freelance", "Gift", "Other"];

export interface RecurringTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  next_date: string;
  is_active: boolean;
  last_processed: string | null;
}

export const getRecurringTransactions = async (): Promise<RecurringTransaction[]> => {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .order("next_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    type: r.type as "income" | "expense",
    amount: Number(r.amount),
    category: r.category,
    description: r.description ?? "",
    frequency: r.frequency as RecurringTransaction["frequency"],
    next_date: r.next_date,
    is_active: r.is_active,
    last_processed: r.last_processed,
  }));
};

export const addRecurringTransaction = async (
  t: Omit<RecurringTransaction, "id" | "is_active" | "last_processed">,
  userId: string
): Promise<RecurringTransaction> => {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .insert({ ...t, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    type: data.type as "income" | "expense",
    amount: Number(data.amount),
    category: data.category,
    description: (data as any).description ?? "",
    frequency: data.frequency as RecurringTransaction["frequency"],
    next_date: data.next_date,
    is_active: data.is_active,
    last_processed: data.last_processed,
  };
};

export const updateRecurringTransaction = async (id: string, updates: Partial<RecurringTransaction>) => {
  const { error } = await supabase
    .from("recurring_transactions")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
};

export const deleteRecurringTransaction = async (id: string) => {
  const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
  if (error) throw error;
};

export const getCategoryEmoji = (cat: string): string => {
  const map: Record<string, string> = {
    Food: "🍔", Transport: "🚌", Entertainment: "🎮", Shopping: "🛍️",
    Bills: "💡", Education: "📚", Health: "💊", Other: "📦",
    Allowance: "💰", "Part-time Job": "💼", Freelance: "💻", Gift: "🎁",
  };
  return map[cat] || "📦";
};
