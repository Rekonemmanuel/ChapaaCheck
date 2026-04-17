import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  addTransaction,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryEmoji,
  addRecurringTransaction,
  RecurringTransaction,
} from "@/lib/store";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarIcon, Repeat, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import RecurringTransactionsPanel from "@/components/RecurringTransactionsPanel";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

const AddTransaction = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"one-time" | "recurring">("one-time");

  // Shared form state
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [frequency, setFrequency] = useState<RecurringTransaction["frequency"]>("monthly");
  const [loading, setLoading] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const resetForm = () => {
    setAmount("");
    setCategory("");
    setDescription("");
    setDate(new Date());
    setFrequency("monthly");
  };

  const handleSubmit = async () => {
    if (!amount || !category || !user) {
      toast.error("Please fill in amount and category");
      return;
    }
    setLoading(true);
    try {
      if (mode === "one-time") {
        await addTransaction({
          type,
          amount: Number(amount),
          category,
          description,
          date: format(date, "yyyy-MM-dd"),
        }, user.id);
        toast.success(`${type === "income" ? "Income" : "Expense"} added! 🎉`);
        navigate("/");
      } else {
        await addRecurringTransaction({
          type,
          amount: Number(amount),
          category,
          description,
          frequency,
          next_date: format(date, "yyyy-MM-dd"),
        }, user.id);
        toast.success("Recurring transaction added! 🔄");
        resetForm();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-4 text-xl font-bold animate-fade-in">Add Transaction</h1>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "one-time" | "recurring")} className="mb-5">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="one-time" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> One-time
          </TabsTrigger>
          <TabsTrigger value="recurring" className="gap-1.5 text-xs">
            <Repeat className="h-3.5 w-3.5" /> Recurring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="one-time" className="mt-5 space-y-5">
          {/* Form is shared; rendered below */}
        </TabsContent>
        <TabsContent value="recurring" className="mt-5 space-y-5">
          {/* Form is shared; rendered below */}
        </TabsContent>
      </Tabs>

      {/* Type Toggle */}
      <div className="mb-5 flex gap-2 rounded-xl bg-card p-1 shadow-sm">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setCategory(""); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              type === t
                ? t === "expense"
                  ? "bg-expense text-primary-foreground shadow-sm"
                  : "bg-income text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (KSh)</label>
        <Input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-14 text-2xl font-bold text-center border-2 focus:border-primary"
        />
      </div>

      {/* Frequency (recurring only) */}
      {mode === "recurring" && (
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Frequency</label>
          <div className="grid grid-cols-4 gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={`rounded-lg py-2 text-xs font-medium transition-all ${
                  frequency === f.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-foreground shadow-sm"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date Picker */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {mode === "recurring" ? "Starting Date" : "Date"}
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Category */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">Category</label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex flex-col items-center gap-1 rounded-xl p-3 text-xs transition-all ${
                category === cat
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-card text-foreground shadow-sm hover:shadow-md"
              }`}
            >
              <span className="text-lg">{getCategoryEmoji(cat)}</span>
              <span className="font-medium leading-tight">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Note (optional)</label>
        <Input
          placeholder={mode === "recurring" ? "e.g. Netflix subscription" : "What was this for?"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <Button onClick={handleSubmit} className="w-full h-12 text-base font-semibold" disabled={loading}>
        {loading ? "Adding..." : mode === "recurring" ? "Add Recurring" : `Add ${type === "expense" ? "Expense" : "Income"}`}
      </Button>

      {mode === "recurring" && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Your Recurring Items</h2>
          <RecurringTransactionsPanel />
        </div>
      )}
    </div>
  );
};

export default AddTransaction;
