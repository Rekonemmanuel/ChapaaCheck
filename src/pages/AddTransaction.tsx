import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addTransaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryEmoji } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const AddTransaction = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = async () => {
    if (!amount || !category || !user) {
      toast.error("Please fill in amount and category");
      return;
    }
    setLoading(true);
    try {
      await addTransaction({
        type,
        amount: Number(amount),
        category,
        description,
        date: new Date().toISOString().split("T")[0],
      }, user.id);
      toast.success(`${type === "income" ? "Income" : "Expense"} added!`);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-5 text-xl font-bold animate-fade-in">Add Transaction</h1>

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
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Amount (KSh)
        </label>
        <Input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-14 text-2xl font-bold text-center border-2 focus:border-primary"
        />
      </div>

      {/* Category */}
      <div className="mb-5">
        <label className="mb-2 block text-xs font-medium text-muted-foreground">
          Category
        </label>
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
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Note (optional)
        </label>
        <Input
          placeholder="What was this for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <Button onClick={handleSubmit} className="w-full h-12 text-base font-semibold" disabled={loading}>
        {loading ? "Adding..." : `Add ${type === "expense" ? "Expense" : "Income"}`}
      </Button>
    </div>
  );
};

export default AddTransaction;
