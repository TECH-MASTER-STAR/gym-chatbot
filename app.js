import express from "express";
import OpenAI from "openai";

const app = express();

app.use(express.json({ limit: "20kb" }));
app.use(express.static("frontend"));

const MODEL = "openai/gpt-oss-20b";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_PROMPT =
  "You are a friendly gym fitness assistant. ONLY answer fitness, workout, diet and health questions. If the user asks something unrelated, politely decline and steer back to fitness. Reply in English, keep answers short and casual, and ask for missing details (weight, height, age, goal) one or two at a time, never as a long list. Never guess numbers.";

const FEW_SHOT = [
  { role: "user", content: "I need a diet plan" },
  {
    role: "assistant",
    content:
      "Sure! First tell me your weight (in kg) and your goal: fat loss or muscle gain?",
  },
  { role: "user", content: "I'm confused about my career" },
  {
    role: "assistant",
    content:
      "I can't help with that, I'm only here for gym and fitness questions. Ask me about workouts or diet anytime!",
  },
  { role: "user", content: "what is BMI" },
  {
    role: "assistant",
    content:
      "BMI is Body Mass Index, calculated from your weight and height. Share your weight (kg) and height (cm) and I'll work it out for you.",
  },
];

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return res.status(400).json({ error: "Invalid messages" });
    }

    // Sirf last 20 messages, aur role sirf user/assistant
    const safeMessages = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000),
    }));

    const completion = await client.chat.completions.create({
  model: MODEL,
  messages: [{ role: "system", content: SYSTEM_PROMPT }, ...FEW_SHOT, ...safeMessages],
  max_tokens: 1500,
});

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    // Groq ki apni limit lag gayi ho to friendly message
    if (err.status === 429) {
      return res
        .status(429)
        .json({ error: "The bot is busy right now. Please try again in a minute." });
    }
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,'0.0.0.0');