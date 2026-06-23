"use client";

import { useState, useEffect, useRef } from "react";
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
  { name: "background", label: "Background", accent: "#4a9eff" },
  { name: "current-events", label: "Current Events", accent: "#a855f7" },
  { name: "perspectives", label: "Perspectives", accent: "#f97316" },
  { name: "so-what", label: "So What?", accent: "#22c55e" },
];

const HOW_IT_WORKS = [
  { label: "You type", desc: "Any topic, any depth", color: "#3d2030" },
  { label: "Coordinator", desc: "Splits into 4 questions", color: "#8b1a3a" },
  { label: "4 agents", desc: "Run in parallel", color: "#4a9eff" },
  { label: "You review", desc: "Re-run anything", color: "#22c55e" },
  { label: "Share", desc: "Permanent URL", color: "#f97316" },
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

  async function runResearch(topicText: string) {
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
    <main style={{ background: "#0e0b0d", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #2a1520", padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 18, fontWeight: 500, color: "#f5eaee", letterSpacing: -0.5 }}>Scopa</span>
        {phase !== "input" && (
          <button onClick={handleReset} style={{ fontSize: 12, color: "#7a4560", background: "none", border: "none", cursor: "pointer" }}>
            ← new topic
          </button>
        )}
      </nav>

      {/* Landing page */}
      {phase === "input" && (
        <LandingPage
          topic={topic}
          setTopic={setTopic}
          onSubmit={handleSubmit}
        />
      )}

      {/* Research phase */}
      {phase !== "input" && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 40px" }}>
          <div style={{ marginBottom: 36 }}>
            <p style={{ fontSize: 10, color: "#7a4560", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Topic</p>
            <h2 style={{ fontSize: 24, fontWeight: 500, color: "#f5eaee", letterSpacing: -0.5 }}>{topic}</h2>
          </div>

          {error && (
            <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: "#2a0a10", border: "1px solid #5a1520", color: "#f08090", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Agent pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
            {AGENT_CONFIG.map((agent) => {
              const status = research.status[agent.name] ?? "idle";
              if (status === "idle") return null;
              return <AgentPill key={agent.name} label={agent.label} status={status} accent={agent.accent} />;
            })}
            {research.synthStatus !== "idle" && (
              <AgentPill label="Synthesizing" status={research.synthStatus} accent="#8b1a3a" />
            )}
          </div>

          {/* Report */}
          {research.synthesized && (
            <div style={{ marginBottom: 28 }}>
              {research.synthStatus === "working" && (
                <p style={{ fontSize: 11, color: "#7a4560", fontFamily: "monospace", marginBottom: 14 }}>writing report...</p>
              )}
              <div style={{ background: "#130c10", border: "1px solid #2a1520", borderRadius: 14, padding: "24px 28px" }}>
                <div className="report-body">
                  <ReactMarkdown>{research.synthesized}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Review step */}
          {reportReady && (
            <div style={{ marginBottom: 28, padding: 20, background: "#130c10", border: "1px solid #3d2030", borderRadius: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#f5eaee", marginBottom: 4 }}>Review before finalizing</p>
              <p style={{ fontSize: 11, color: "#7a4560", marginBottom: 16 }}>
                Not happy with a section? Re-run it. Happy? Finalize to get a shareable link.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {AGENT_CONFIG.map((agent) => (
                  <button
                    key={agent.name}
                    onClick={() => handleRerun(agent.name)}
                    disabled={!!rerunning}
                    style={{ padding: "6px 13px", borderRadius: 8, border: "1px solid #3d2030", fontSize: 11, color: "#c4899a", background: "#0e0b0d", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, opacity: rerunning ? 0.4 : 1 }}
                  >
                    <span style={{ color: agent.accent }}>↺</span> Re-run {agent.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                style={{ width: "100%", padding: "13px", background: "#8b1a3a", color: "#f5eaee", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: finalizing ? 0.6 : 1 }}
              >
                {finalizing ? "Saving..." : "Looks good — finalize & get shareable link →"}
              </button>
            </div>
          )}

          {/* Agent sources */}
          {allAgentsDone && (
            <div>
              <p style={{ fontSize: 10, color: "#7a4560", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Agent sources</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
    </main>
  );
}

function LandingPage({ topic, setTopic, onSubmit }: { topic: string; setTopic: (t: string) => void; onSubmit: (e: React.FormEvent) => void }) {
  const DEMO_TOPICS = [
    "why everyone is suddenly burnt out",
    "what agents actually are in AI",
    "sleep debt and how bad it really is",
    "why journaling actually works",
  ];

  const [typedText, setTypedText] = useState("");
  const [demoIndex, setDemoIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [activeAgent, setActiveAgent] = useState(0);
  const [agentProgress, setAgentProgress] = useState([0, 0, 0, 0]);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Typing animation for demo input
  useEffect(() => {
    if (topic) return;
    const current = DEMO_TOPICS[demoIndex];
    if (isTyping) {
      if (typedText.length < current.length) {
        typingRef.current = setTimeout(() => setTypedText(current.slice(0, typedText.length + 1)), 55);
      } else {
        typingRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    } else {
      if (typedText.length > 0) {
        typingRef.current = setTimeout(() => setTypedText(typedText.slice(0, -1)), 25);
      } else {
        setDemoIndex((i) => (i + 1) % DEMO_TOPICS.length);
        setIsTyping(true);
      }
    }
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [typedText, isTyping, demoIndex, topic]);

  // Animate agent progress bars
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAgent((a) => (a + 1) % 4);
      setAgentProgress(() => AGENT_CONFIG.map(() => Math.floor(Math.random() * 60) + 30));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "64px 40px 80px" }}>
      {/* Hero */}
      <div style={{ marginBottom: 52 }}>
        <p style={{ fontSize: 10, color: "#7a4560", letterSpacing: "0.14em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>
          know anything, instantly
        </p>
        <h1 style={{ fontSize: 96, fontWeight: 500, letterSpacing: -5, lineHeight: 1, color: "#f5eaee", marginBottom: 20 }}>
          Scopa.
        </h1>
        <p style={{ fontSize: 15, color: "#c4899a", lineHeight: 1.7, maxWidth: 440, marginBottom: 36 }}>
          4 AI agents research any topic in parallel. You see every source, every angle. You control what makes the final report.
        </p>

        <form onSubmit={onSubmit} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              placeholder=""
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: "100%", background: "#160e12", border: "1px solid #3d2030", borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "#f5eaee", outline: "none", boxSizing: "border-box" }}
            />
            {!topic && (
              <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#7a4560", pointerEvents: "none", whiteSpace: "nowrap", overflow: "hidden", maxWidth: "calc(100% - 36px)" }}>
                {typedText}<span className="animate-blink" style={{ borderRight: "1.5px solid #7a4560", marginLeft: 1 }} />
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={!topic.trim()}
            style={{ background: "#8b1a3a", color: "#f5eaee", border: "none", borderRadius: 12, padding: "14px 22px", fontSize: 14, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", opacity: topic.trim() ? 1 : 0.5 }}
          >
            Research this →
          </button>
        </form>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EXAMPLE_TOPICS.map((t) => (
            <button key={t} onClick={() => setTopic(t)} style={{ padding: "5px 14px", borderRadius: 99, border: "1px solid #2a1520", fontSize: 11, color: "#c4899a", background: "#130c10", cursor: "pointer" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ marginBottom: 52 }}>
        <p style={{ fontSize: 10, color: "#7a4560", letterSpacing: "0.14em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 20 }}>how it works</p>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.label} style={{ display: "flex", alignItems: "flex-start", gap: 6, flex: 1 }}>
              <div style={{ flex: 1, background: "#130c10", border: "1px solid #2a1520", borderRadius: 10, padding: "12px 14px", transition: "border-color 0.3s" }}>
                <div className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: step.color, marginBottom: 8 }} />
                <div style={{ fontSize: 11, fontWeight: 500, color: "#f5eaee", marginBottom: 3 }}>{step.label}</div>
                <div style={{ fontSize: 10, color: "#c4899a", lineHeight: 1.5 }}>{step.desc}</div>
              </div>
              {i < HOW_IT_WORKS.length - 1 && (
                <div style={{ color: "#7a4560", fontSize: 14, paddingTop: 20, flexShrink: 0 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live agent preview */}
      <div style={{ marginBottom: 52 }}>
        <p style={{ fontSize: 10, color: "#7a4560", letterSpacing: "0.14em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 20 }}>4 agents, one topic</p>
        <div style={{ display: "flex", gap: 8 }}>
          {AGENT_CONFIG.map((agent, i) => (
            <div
              key={agent.name}
              style={{ flex: 1, background: "#130c10", border: `1px solid ${i === activeAgent ? agent.accent + "60" : "#2a1520"}`, borderRadius: 10, padding: "14px", transition: "border-color 0.5s" }}
            >
              <div
                className={i === activeAgent ? "animate-pulse-dot" : ""}
                style={{ width: 6, height: 6, borderRadius: "50%", background: agent.accent, marginBottom: 10 }}
              />
              <div style={{ fontSize: 11, fontWeight: 500, color: "#f5eaee", marginBottom: 8 }}>{agent.label}</div>
              {[agentProgress[i] ?? 70, (agentProgress[i] ?? 50) - 20, (agentProgress[i] ?? 60) - 10].map((w, j) => (
                <div
                  key={j}
                  className="animate-shimmer"
                  style={{ height: 5, borderRadius: 2, background: i === activeAgent ? `${agent.accent}40` : "#2a1520", marginBottom: 4, width: `${Math.max(30, w)}%`, transition: "width 1s ease, background 0.5s" }}
                />
              ))}
              <div style={{ marginTop: 8, fontSize: 9, color: i === activeAgent ? agent.accent : "#7a4560", fontFamily: "monospace" }}>
                {i === activeAgent ? "researching..." : "standby"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* You stay in control */}
      <div>
        <p style={{ fontSize: 10, color: "#7a4560", letterSpacing: "0.14em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 20 }}>you stay in control</p>
        <div style={{ background: "#130c10", border: "1px solid #2a1520", borderRadius: 14, padding: "22px 24px" }}>
          <p style={{ fontSize: 10, color: "#7a4560", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Report · burnout in modern work</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: "#f5eaee", marginBottom: 14 }}>Why everyone is suddenly burnt out</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {AGENT_CONFIG.map((a) => (
              <span key={a.name} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 500, background: `${a.accent}18`, color: a.accent, border: `1px solid ${a.accent}30` }}>
                ✓ {a.label}
              </span>
            ))}
          </div>
          {[100, 88, 72].map((w, i) => (
            <div key={i} style={{ height: 6, borderRadius: 2, background: "#2a1520", marginBottom: 5, width: `${w}%` }} />
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {AGENT_CONFIG.map((a) => (
              <div key={a.name} style={{ padding: "5px 12px", border: "1px solid #2a1520", borderRadius: 7, fontSize: 10, color: "#c4899a", background: "#0e0b0d" }}>
                ↺ Re-run {a.label}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "11px", background: "#8b1a3a", color: "#f5eaee", borderRadius: 10, fontSize: 12, fontWeight: 500, textAlign: "center" }}>
            Looks good — finalize & get shareable link →
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentPill({ label, status, accent }: { label: string; status: AgentStatus; accent: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, border: `1px solid ${accent}30`, background: `${accent}12`, color: accent }}>
      {status === "working" ? <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, display: "inline-block", animation: "pulse 1.5s infinite" }} /> : "✓"}
      {label}
    </span>
  );
}

function SourceCard({ label, question, content, accent, isOpen, onToggle }: {
  label: string; question?: string; content: string; accent: string; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${isOpen ? accent + "40" : "#2a1520"}`, background: "#130c10", overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, flexShrink: 0, display: "inline-block" }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "#f5eaee" }}>{label}</span>
          {question && !isOpen && (
            <span style={{ fontSize: 11, color: "#7a4560", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
              &quot;{question}&quot;
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: "#7a4560" }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #2a1520" }}>
          {question && <p style={{ fontSize: 11, color: "#7a4560", fontStyle: "italic", margin: "12px 0" }}>&quot;{question}&quot;</p>}
          <div style={{ fontSize: 13, color: "#a07080", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{content}</div>
        </div>
      )}
    </div>
  );
}
