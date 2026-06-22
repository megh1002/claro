"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";

const EXAMPLE_TOPICS = [
  "why everyone is suddenly burnt out",
  "what agents actually are in AI",
  "sleep debt and how bad it really is",
  "why social media makes you feel behind",
  "what is vibe coding",
  "screen time and the brain",
  "why journaling actually works",
  "new job roles AI is creating right now",
];

const AGENT_CONFIG = [
  { name: "background", label: "Background", accent: "#2563eb" },
  { name: "current-events", label: "Current Events", accent: "#7c3aed" },
  { name: "perspectives", label: "Perspectives", accent: "#ea580c" },
  { name: "so-what", label: "So What?", accent: "#16a34a" },
];

type AgentStatus = "idle" | "working" | "done";

type ResearchState = {
  status: Record<string, AgentStatus>;
  text: Record<string, string>;
  questions: Record<string, string>;
  synthesized: string;
  synthStatus: AgentStatus;
};

const initialState: ResearchState = {
  status: {},
  text: {},
  questions: {},
  synthesized: "",
  synthStatus: "idle",
};

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState<ResearchState>(initialState);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"input" | "researching" | "done">("input");
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [rerunning, setRerunning] = useState<string | null>(null);

  async function runResearch(topicText: string, onComplete?: () => void) {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topicText }),
    });

    if (!res.ok) throw new Error("Research request failed");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "status") {
            if (data.agent === "synthesizer") {
              setResearch((r) => ({ ...r, synthStatus: data.status }));
            } else {
              setResearch((r) => ({
                ...r,
                status: { ...r.status, [data.agent]: data.status },
                questions: data.questions ? { ...r.questions, ...data.questions } : r.questions,
              }));
            }
          } else if (data.type === "chunk") {
            if (data.agent === "synthesizer") {
              setResearch((r) => ({ ...r, synthesized: r.synthesized + data.text }));
            } else {
              setResearch((r) => ({
                ...r,
                text: { ...r.text, [data.agent]: (r.text[data.agent] ?? "") + data.text },
              }));
            }
          } else if (data.type === "complete") {
            setPhase("done");
            onComplete?.();
          } else if (data.type === "error") {
            setError(data.message);
          }
        } catch {}
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setResearch(initialState);
    setOpenAgent(null);
    setPhase("researching");
    try {
      await runResearch(topic);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRerun(agentName: string) {
    if (rerunning) return;
    setRerunning(agentName);

    // Clear just this agent's output and re-run full research
    // (simpler than a single-agent rerun — re-runs everything and keeps UI consistent)
    setResearch((r) => ({
      ...r,
      status: { ...r.status, [agentName]: "working" },
      text: { ...r.text, [agentName]: "" },
      synthesized: "",
      synthStatus: "idle",
    }));

    try {
      await runResearch(topic);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRerunning(null);
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          background: research.text["background"],
          current_events: research.text["current-events"],
          perspectives: research.text["perspectives"],
          so_what: research.text["so-what"],
          synthesized: research.synthesized,
        }),
      });
      const { slug, error: err } = await res.json();
      if (err) throw new Error(err);
      router.push(`/report/${slug}`);
    } catch (err) {
      setError((err as Error).message);
      setFinalizing(false);
    }
  }

  function handleReset() {
    setPhase("input");
    setResearch(initialState);
    setError("");
    setTopic("");
  }

  const questionMap: Record<string, string> = {
    background: research.questions.background_question,
    "current-events": research.questions.current_events_question,
    perspectives: research.questions.perspectives_question,
    "so-what": research.questions.so_what_question,
  };

  const allAgentsDone = AGENT_CONFIG.every((a) => research.status[a.name] === "done");
  const reportReady = phase === "done" && research.synthesized && research.synthStatus === "done";

  return (
    <main className="min-h-screen bg-[#f7f6f3]">
      {/* Nav */}
      <nav className="border-b border-[#e8e6e1] bg-[#f7f6f3] px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight text-[#111]">Scopa</span>
        {phase !== "input" && (
          <button onClick={handleReset} className="text-xs text-[#999] hover:text-[#111] transition-colors">
            ← new topic
          </button>
        )}
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-16">

        {/* Input phase */}
        {phase === "input" && (
          <>
            <div className="mb-12">
              <h1 className="text-[9rem] font-black tracking-tighter text-[#111] leading-none mb-4">
                Scopa
              </h1>
              <p className="text-[#555] text-lg font-medium mb-1">Know anything, instantly.</p>
              <p className="text-[#bbb] text-sm">
                4 AI agents research your topic in parallel. You review. You decide.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mb-6">
              <textarea
                rows={2}
                placeholder="Type any topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (topic.trim()) handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                className="w-full bg-white border border-[#ddd] rounded-xl px-4 py-3.5 text-sm text-[#111] placeholder-[#bbb] resize-none focus:outline-none focus:border-[#aaa] transition-colors shadow-sm"
              />
              <button
                type="submit"
                disabled={!topic.trim()}
                className="w-full bg-[#111] text-white font-medium text-sm py-3.5 rounded-xl hover:bg-[#222] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Research this →
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#e0e0e0] text-xs text-[#888] hover:text-[#111] hover:border-[#bbb] transition-colors shadow-sm"
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Researching / done */}
        {phase !== "input" && (
          <div>
            <div className="mb-8">
              <p className="text-xs text-[#aaa] uppercase tracking-widest font-mono mb-1">Topic</p>
              <h2 className="text-2xl font-bold text-[#111] tracking-tight">{topic}</h2>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Agent status pills */}
            <div className="flex flex-wrap gap-2 mb-10">
              {AGENT_CONFIG.map((agent) => {
                const status = research.status[agent.name] ?? "idle";
                if (status === "idle") return null;
                return <AgentPill key={agent.name} label={agent.label} status={status} accent={agent.accent} />;
              })}
              {research.synthStatus !== "idle" && (
                <AgentPill label="Synthesizing" status={research.synthStatus} accent="#111" />
              )}
            </div>

            {/* Synthesized report */}
            {research.synthesized && (
              <div className="mb-8">
                {research.synthStatus === "working" && (
                  <p className="text-xs text-[#aaa] font-mono mb-4 animate-pulse">writing report...</p>
                )}
                <div className="bg-white border border-[#e8e6e1] rounded-2xl px-7 py-6 shadow-sm">
                  <div className="report-body">
                    <ReactMarkdown>{research.synthesized}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Human review step */}
            {reportReady && (
              <div className="mb-10 p-5 bg-white border border-[#e8e6e1] rounded-2xl shadow-sm">
                <p className="text-sm font-semibold text-[#111] mb-1">Review before finalizing</p>
                <p className="text-xs text-[#aaa] mb-4">
                  Not happy with a section? Re-run it. Happy with everything? Finalize to get a shareable link.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {AGENT_CONFIG.map((agent) => (
                    <button
                      key={agent.name}
                      onClick={() => handleRerun(agent.name)}
                      disabled={!!rerunning}
                      className="px-3 py-1.5 rounded-lg border border-[#e0e0e0] text-xs text-[#666] hover:text-[#111] hover:border-[#bbb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <span style={{ color: agent.accent }}>↺</span>
                      Re-run {agent.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="w-full bg-[#111] text-white font-medium text-sm py-3 rounded-xl hover:bg-[#222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {finalizing ? "Saving..." : "Looks good — finalize & get shareable link →"}
                </button>
              </div>
            )}

            {/* Collapsible agent sources */}
            {allAgentsDone && (
              <div>
                <p className="text-xs text-[#bbb] font-mono uppercase tracking-widest mb-3">Agent sources</p>
                <div className="space-y-2">
                  {AGENT_CONFIG.map((agent) => (
                    <SourceCard
                      key={agent.name}
                      label={agent.label}
                      question={questionMap[agent.name]}
                      content={research.text[agent.name] ?? ""}
                      accent={agent.accent}
                      isOpen={openAgent === agent.name}
                      onToggle={() => setOpenAgent((p) => (p === agent.name ? null : agent.name))}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function AgentPill({ label, status, accent }: { label: string; status: AgentStatus; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
      style={{ borderColor: `${accent}25`, backgroundColor: `${accent}10`, color: accent }}
    >
      {status === "working" ? (
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
      ) : "✓"}
      {label}
    </span>
  );
}

function SourceCard({
  label, question, content, accent, isOpen, onToggle,
}: {
  label: string; question?: string; content: string; accent: string; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#e8e6e1] bg-white overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#fafaf9] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
          <span className="text-sm font-medium text-[#333]">{label}</span>
          {question && !isOpen && (
            <span className="text-xs text-[#bbb] italic truncate max-w-xs hidden sm:block">"{question}"</span>
          )}
        </div>
        <span className="text-xs text-[#ccc]">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[#f0eeeb]">
          {question && <p className="text-xs text-[#aaa] italic mt-3 mb-3">"{question}"</p>}
          <div className="text-sm text-[#555] leading-relaxed whitespace-pre-wrap">{content}</div>
        </div>
      )}
    </div>
  );
}
