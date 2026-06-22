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
  agentName: string,
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1500,
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

  const { topic } = await req.json();

  if (!topic?.trim()) {
    return new Response("Topic is required", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Step 1: Coordinator decomposes the topic
        send({ type: "status", agent: "coordinator", status: "working" });

        const coordinatorPrompt = loadAgent("coordinator");
        const coordinatorResponse = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 500,
          stream: false,
          messages: [
            { role: "system", content: coordinatorPrompt },
            { role: "user", content: `Topic: ${topic}` },
          ],
        });

        const coordinatorText = coordinatorResponse.choices[0]?.message?.content ?? "";
        let questions: Record<string, string>;
        try {
          const jsonMatch = coordinatorText.match(/\{[\s\S]*\}/);
          questions = JSON.parse(jsonMatch?.[0] ?? coordinatorText);
        } catch {
          questions = {
            background_question: `What is ${topic} and why does it matter?`,
            current_events_question: `What are the latest developments in ${topic}?`,
            perspectives_question: `What are the main debates and opposing views on ${topic}?`,
            so_what_question: `What are the practical implications of ${topic} for ordinary people?`,
          };
        }

        send({ type: "status", agent: "coordinator", status: "done", questions });

        // Step 2: All 4 research agents in parallel
        const agents = [
          { name: "background", question: questions.background_question },
          { name: "current-events", question: questions.current_events_question },
          { name: "perspectives", question: questions.perspectives_question },
          { name: "so-what", question: questions.so_what_question },
        ];

        for (const agent of agents) {
          send({ type: "status", agent: agent.name, status: "working" });
        }

        const results = await Promise.all(
          agents.map(({ name, question }) =>
            runAgent(
              name,
              loadAgent(name),
              question,
              (text) => send({ type: "chunk", agent: name, text })
            ).then((output) => {
              send({ type: "status", agent: name, status: "done" });
              return { name, output };
            })
          )
        );

        const outputs: Record<string, string> = {};
        for (const { name, output } of results) {
          outputs[name] = output;
        }

        // Step 3: Synthesizer
        send({ type: "status", agent: "synthesizer", status: "working" });

        const synthPrompt = loadAgent("synthesizer");
        const synthUserMessage = `
Topic: ${topic}

BACKGROUND RESEARCH:
${outputs["background"]}

CURRENT EVENTS:
${outputs["current-events"]}

PERSPECTIVES:
${outputs["perspectives"]}

SO WHAT / PRACTICAL IMPLICATIONS:
${outputs["so-what"]}

Write the unified research brief now.
        `.trim();

        let synthesized = "";
        await runAgent("synthesizer", synthPrompt, synthUserMessage, (text) => {
          synthesized += text;
          send({ type: "chunk", agent: "synthesizer", text });
        });

        send({ type: "status", agent: "synthesizer", status: "done" });
        send({
          type: "complete",
          outputs: { ...outputs, synthesized },
          questions,
        });
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
