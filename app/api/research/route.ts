import Groq from "groq-sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { checkRateLimit } from "@/lib/ratelimit";
import { headers } from "next/headers";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function loadAgent(name: string): string {
  return readFileSync(join(process.cwd(), "agents", `${name}.md`), "utf-8");
}

async function runAgent(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  onChunk: (text: string) => void
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  let output = "";
  for await (const chunk of response) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) {
      output += text;
      onChunk(text);
    }
  }
  return output;
}

export async function POST(req: Request) {
  const ip = headers().get("x-forwarded-for") ?? "anonymous";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit reached. Try again in an hour." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { decision, priorities, answers } = await req.json();

  if (!decision?.trim()) {
    return new Response("Decision is required", { status: 400 });
  }

  const priorityText =
    Array.isArray(priorities) && priorities.length
      ? priorities.join(", ")
      : "not specified";

  // answers: array of { q, a } from the clarifying step
  const answerText =
    Array.isArray(answers) && answers.length
      ? answers
          .filter((x: { q: string; a: string }) => x?.a?.trim())
          .map((x: { q: string; a: string }) => `- ${x.q} → ${x.a}`)
          .join("\n")
      : "";

  const context =
    `DECISION: ${decision}\nWHAT MATTERS MOST TO THEM: ${priorityText}` +
    (answerText ? `\n\nADDED CONTEXT (their answers to clarifying questions):\n${answerText}` : "");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Step 1: Coordinator assigns each agent a question
        const coordinatorResponse = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 500,
          stream: false,
          messages: [
            { role: "system", content: loadAgent("coordinator") },
            { role: "user", content: context },
          ],
        });

        const coordinatorText = coordinatorResponse.choices[0]?.message?.content ?? "";
        let questions: Record<string, string>;
        try {
          const jsonMatch = coordinatorText.match(/\{[\s\S]*\}/);
          questions = JSON.parse(jsonMatch?.[0] ?? coordinatorText);
        } catch {
          questions = {
            facts_question: `What is objectively true about each option in this decision?`,
            risks_question: `What could go wrong with each option?`,
            tradeoffs_question: `What does the person gain and lose with each option, given their priorities?`,
            devils_advocate_question: `Argue against the most obvious choice in this decision.`,
          };
        }

        const stakes = ["low", "medium", "high"].includes(questions.stakes)
          ? questions.stakes
          : "medium";
        const reversibility = questions.reversibility === "irreversible"
          ? "irreversible"
          : "reversible";
        send({ type: "classification", stakes, reversibility });

        // Step 2: 4 agents in parallel
        const agents = [
          { name: "facts", question: questions.facts_question, tokens: 600 },
          { name: "risks", question: questions.risks_question, tokens: 600 },
          { name: "tradeoffs", question: questions.tradeoffs_question, tokens: 600 },
          { name: "devils-advocate", question: questions.devils_advocate_question, tokens: 600 },
        ];

        for (const agent of agents) {
          send({ type: "status", agent: agent.name, status: "working" });
        }

        const results = await Promise.all(
          agents.map(({ name, question, tokens }) => {
            const promptFile = name === "devils-advocate" ? "devils-advocate" : name;
            const userMessage = `${context}\n\nYOUR TASK: ${question}`;
            return runAgent(loadAgent(promptFile), userMessage, tokens, (text) =>
              send({ type: "chunk", agent: name, text })
            ).then((output) => {
              send({ type: "status", agent: name, status: "done" });
              return { name, output };
            });
          })
        );

        const outputs: Record<string, string> = {};
        for (const { name, output } of results) outputs[name] = output;

        // Step 3: The Call — the verdict
        send({ type: "status", agent: "the-call", status: "working" });

        const callMessage = `${context}

FACTS:
${outputs["facts"]}

RISKS:
${outputs["risks"]}

TRADEOFFS:
${outputs["tradeoffs"]}

DEVIL'S ADVOCATE:
${outputs["devils-advocate"]}

Now make the call.`;

        let verdict = "";
        await runAgent(loadAgent("the-call"), callMessage, 500, (text) => {
          verdict += text;
          send({ type: "chunk", agent: "the-call", text });
        });

        send({ type: "status", agent: "the-call", status: "done" });
        send({ type: "complete", outputs: { ...outputs, verdict }, questions, stakes, reversibility });
      } catch (err) {
        send({ type: "error", message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
