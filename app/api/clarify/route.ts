import Groq from "groq-sdk";
import { readFileSync } from "fs";
import { join } from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function loadAgent(name: string): string {
  return readFileSync(join(process.cwd(), "agents", `${name}.md`), "utf-8");
}

export async function POST(req: Request) {
  const { decision, priorities } = await req.json();
  if (!decision?.trim()) {
    return Response.json({ error: "Decision is required" }, { status: 400 });
  }

  const priorityText =
    Array.isArray(priorities) && priorities.length ? priorities.join(", ") : "not specified";

  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        { role: "system", content: loadAgent("intake") },
        { role: "user", content: `DECISION: ${decision}\nWHAT MATTERS MOST: ${priorityText}` },
      ],
    });

    const text = res.choices[0]?.message?.content ?? "";
    let questions: string[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      questions = JSON.parse(match?.[0] ?? text);
    } catch {
      questions = [];
    }

    // Fallback to solid decision-science questions
    if (!Array.isArray(questions) || questions.length === 0) {
      questions = [
        "When do you need to decide by?",
        "If this goes wrong, can you reverse it?",
        "Which option are you secretly hoping wins?",
      ];
    }

    return Response.json({ questions: questions.slice(0, 3) });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
