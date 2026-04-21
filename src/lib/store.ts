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

// ---------- Transactions ----------
export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .is("deleted_at", null)
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

// Soft delete -> moves to Bin
export const deleteTransaction = async (id: string) => {
  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// ---------- Budgets ----------
export const getBudgets = async (userId: string): Promise<Budget[]> => {
  const { data, error } = await supabase
    .from("budgets")
    .select("category, limit")
    .eq("user_id", userId)
    .is("deleted_at", null);
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

export const upsertBudget = async (budget: Budget, userId: string) => {
  const { error } = await supabase
    .from("budgets")
    .upsert(
      { category: budget.category, limit: budget.limit, user_id: userId, deleted_at: null },
      { onConflict: "user_id,category" }
    );
  if (error) throw error;
};

export const deleteBudget = async (category: string, userId: string) => {
  const { error } = await supabase
    .from("budgets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("category", category)
    .is("deleted_at", null);
  if (error) throw error;
};

// ---------- Savings goal ----------
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

// ---------- Savings Jars ----------
export interface SavingsJar {
  id: string;
  name: string;
  emoji: string;
  target_amount: number;
  saved_amount: number;
  color: string;
}

// Available balance = income - expenses - already saved in jars
export const getAvailableToSave = async (userId: string): Promise<number> => {
  const [{ data: txs }, { data: jars }] = await Promise.all([
    supabase.from("transactions").select("type, amount").eq("user_id", userId).is("deleted_at", null),
    supabase.from("savings_jars").select("saved_amount").eq("user_id", userId).is("deleted_at", null),
  ]);
  const income = (txs ?? []).filter((t: any) => t.type === "income").reduce((s, t: any) => s + Number(t.amount), 0);
  const expense = (txs ?? []).filter((t: any) => t.type === "expense").reduce((s, t: any) => s + Number(t.amount), 0);
  // expenses already include any "Savings" auto-logged ones, which mirror jar deposits
  return income - expense;
};

export const JAR_COLORS = ["emerald", "amber", "sky", "rose", "violet", "orange", "teal", "yellow"] as const;

export const getSavingsJars = async (): Promise<SavingsJar[]> => {
  const { data, error } = await supabase
    .from("savings_jars")
    .select("*")
    .is("deleted_at", null)
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
  const { error } = await supabase
    .from("savings_jars")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// ---------- Categories ----------
export const EXPENSE_CATEGORIES = ["Food", "Transport", "Entertainment", "Shopping", "Bills", "Education", "Health", "Savings", "Other"];
export const INCOME_CATEGORIES = ["Allowance", "Part-time Job", "Freelance", "Gift", "Savings", "Other"];

// ---------- Recurring ----------
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
    .is("deleted_at", null)
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
  const { error } = await supabase
    .from("recurring_transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// ---------- BIN (soft-deleted items) ----------
export type BinItemType = "transaction" | "recurring" | "jar" | "budget";

export interface BinItem {
  id: string;
  type: BinItemType;
  label: string;
  sublabel: string;
  amount?: number;
  amountKind?: "income" | "expense";
  emoji: string;
  deleted_at: string;
}

const daysAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export const getBinItems = async (): Promise<BinItem[]> => {
  const [tx, rec, jars, bud] = await Promise.all([
    supabase.from("transactions").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    supabase.from("recurring_transactions").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    supabase.from("savings_jars").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
    supabase.from("budgets").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
  ]);

  const items: BinItem[] = [];

  (tx.data ?? []).forEach((t: any) => {
    items.push({
      id: t.id,
      type: "transaction",
      label: t.description || t.category,
      sublabel: `${t.category} · ${new Date(t.date).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}`,
      amount: Number(t.amount),
      amountKind: t.type,
      emoji: getCategoryEmoji(t.category),
      deleted_at: t.deleted_at,
    });
  });
  (rec.data ?? []).forEach((r: any) => {
    items.push({
      id: r.id,
      type: "recurring",
      label: r.description || r.category,
      sublabel: `Recurring · ${r.frequency}`,
      amount: Number(r.amount),
      amountKind: r.type,
      emoji: "🔄",
      deleted_at: r.deleted_at,
    });
  });
  (jars.data ?? []).forEach((j: any) => {
    items.push({
      id: j.id,
      type: "jar",
      label: j.name,
      sublabel: `Savings jar · KSh ${Number(j.saved_amount).toLocaleString()} saved`,
      emoji: j.emoji || "🏺",
      deleted_at: j.deleted_at,
    });
  });
  (bud.data ?? []).forEach((b: any) => {
    items.push({
      id: b.id,
      type: "budget",
      label: `${b.category} budget`,
      sublabel: `Limit KSh ${Number(b.limit).toLocaleString()}`,
      emoji: getCategoryEmoji(b.category),
      deleted_at: b.deleted_at,
    });
  });

  return items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
};

const tableFor = (type: BinItemType) =>
  type === "transaction"
    ? "transactions"
    : type === "recurring"
    ? "recurring_transactions"
    : type === "jar"
    ? "savings_jars"
    : "budgets";

export const restoreBinItem = async (item: BinItem) => {
  const { error } = await supabase
    .from(tableFor(item.type) as any)
    .update({ deleted_at: null })
    .eq("id", item.id);
  if (error) throw error;
};

export const purgeBinItem = async (item: BinItem) => {
  const { error } = await supabase
    .from(tableFor(item.type) as any)
    .delete()
    .eq("id", item.id);
  if (error) throw error;
};

export const purgeAllBinItems = async (items: BinItem[]) => {
  for (const i of items) await purgeBinItem(i);
};

export const daysUntilPurge = (deleted_at: string) => Math.max(0, 7 - daysAgo(deleted_at));

// ---------- Helpers ----------
export const getCategoryEmoji = (cat: string): string => {
  const map: Record<string, string> = {
    Food: "🍔", Transport: "🚌", Entertainment: "🎮", Shopping: "🛍️",
    Bills: "💡", Education: "📚", Health: "💊", Savings: "🏦", Other: "📦",
    Allowance: "💰", "Part-time Job": "💼", Freelance: "💻", Gift: "🎁",
  };
  return map[cat] || "📦";
};
