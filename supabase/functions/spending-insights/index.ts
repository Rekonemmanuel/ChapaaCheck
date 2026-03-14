import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transactions, budgets } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Summarize transaction data for the AI
    const expenses = transactions.filter((t: any) => t.type === "expense");
    const income = transactions.filter((t: any) => t.type === "income");
    const totalExpenses = expenses.reduce((s: number, t: any) => s + t.amount, 0);
    const totalIncome = income.reduce((s: number, t: any) => s + t.amount, 0);

    const byCategory: Record<string, number> = {};
    for (const t of expenses) {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    }

    // Group by month for trend analysis
    const byMonth: Record<string, number> = {};
    for (const t of expenses) {
      const month = t.date?.slice(0, 7) || "unknown";
      byMonth[month] = (byMonth[month] || 0) + t.amount;
    }

    const summaryData = {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      spendingByCategory: byCategory,
      monthlySpending: byMonth,
      budgets: budgets || [],
      transactionCount: transactions.length,
      recentTransactions: expenses.slice(0, 10).map((t: any) => ({
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date,
      })),
    };

    const systemPrompt = `You are a smart financial advisor for a Kenyan personal finance app called ChapaaCheck. All amounts are in KSh (Kenyan Shillings).

Analyze the user's financial data and return insights using the provided tool. Be specific with numbers and percentages. Use a friendly, encouraging tone. Keep insights concise (1-2 sentences each).

Focus on:
1. Spending patterns and anomalies (unusually high spending in a category vs their average)
2. Budget adherence (are they over/under budget?)
3. Actionable savings tips based on their actual data
4. Positive reinforcement for good habits`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is my financial data:\n${JSON.stringify(summaryData, null, 2)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_insights",
              description: "Return structured financial insights for the user",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A brief 1-sentence financial health summary",
                  },
                  healthScore: {
                    type: "number",
                    description: "Financial health score from 0-100",
                  },
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["tip", "warning", "achievement"] },
                        emoji: { type: "string", description: "A relevant emoji" },
                        title: { type: "string", description: "Short title (3-5 words)" },
                        description: { type: "string", description: "1-2 sentence explanation" },
                      },
                      required: ["type", "emoji", "title", "description"],
                      additionalProperties: false,
                    },
                  },
                  budgetAlerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        spent: { type: "number" },
                        limit: { type: "number" },
                        percentUsed: { type: "number" },
                      },
                      required: ["category", "spent", "limit", "percentUsed"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "healthScore", "insights", "budgetAlerts"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("spending-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
