"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import { supabase } from "@/lib/supabase";
import { Logo } from "../Logo";
import { Footer } from "../Footer";
import { getStakeBadge } from "@/lib/stakes";

const PRIORITIES = [
  "Money",
  "Growth & learning",
  "Stability",
  "Freedom",
  "Speed",
  "Relationships",
  "Long-term payoff",
];

const AGENT_CONFIG = [
  { name: "facts", label: "Facts", tag: "grounded", accent: "#5ba3e8", glyph: "i" },
  { name: "risks", label: "Risks", tag: "caution", accent: "#e0a83a", glyph: "!" },
  { name: "tradeoffs", label: "Tradeoffs", tag: "weighed", accent: "#8b8fe8", glyph: "⇄" },
  { name: "devils-advocate", label: "Devil's Advocate", tag: "pushback", accent: "#e85a7a", glyph: "↺" },
];

const DEMO_DECISIONS = [
  "I got two job offers — a Series A startup at $145k or Google at $190k. I'm 26 and want to start my own thing someday.",
  "Should I break my 2-year lease to move closer to work? It'd cost me ~$3k in penalties.",
  "I'm deciding whether to do a master's degree or keep working. I'm worried about falling behind.",
  "Should I take the promotion that means more money but way more travel away from my family?",
];

type AgentStatus = "idle" | "working" | "done";

type State = {
  status: Record<string, AgentStatus>;
  text: Record<string, string>;
  verdict: string;
  verdictStatus: AgentStatus;
};

const initialState: State = { status: {}, text: {}, verdict: "", verdictStatus: "idle" };

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const [decision, setDecision] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [state, setState] = useState<State>(initialState);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"input" | "clarify" | "thinking" | "done">("input");
  const [finalizing, setFinalizing] = useState(false);
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [stakes, setStakes] = useState<string | null>(null);
  const [reversibility, setReversibility] = useState<string | null>(null);

  function togglePriority(p: string) {
    setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function run(answersArr: { q: string; a: string }[]) {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, priorities, answers: answersArr }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Request failed");
    }

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
          if (data.type === "classification") {
            setStakes(data.stakes);
            setReversibility(data.reversibility);
          } else if (data.type === "status") {
            if (data.agent === "the-call") {
              setState((s) => ({ ...s, verdictStatus: data.status }));
            } else {
              setState((s) => ({ ...s, status: { ...s.status, [data.agent]: data.status } }));
            }
          } else if (data.type === "chunk") {
            if (data.agent === "the-call") {
              setState((s) => ({ ...s, verdict: s.verdict + data.text }));
            } else {
              setState((s) => ({
                ...s,
                text: { ...s.text, [data.agent]: (s.text[data.agent] ?? "") + data.text },
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

  // Step 1: get tailored clarifying questions
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidDecision(decision) || clarifyLoading) return;
    setError("");
    setAnswers({});
    setClarifyLoading(true);
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, priorities }),
      });
      const data = await res.json();
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setPhase("clarify");
    } catch {
      // If clarify fails, skip straight to the verdict
      await startVerdict([]);
    } finally {
      setClarifyLoading(false);
    }
  }

  // Step 2: run the agents (with or without answers)
  async function startVerdict(answersArr: { q: string; a: string }[]) {
    setError("");
    setState(initialState);
    setOpenAgent(null);
    setPhase("thinking");
    try {
      await run(answersArr);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleGetVerdict() {
    const arr = questions.map((q, i) => ({ q, a: answers[i] ?? "" }));
    startVerdict(arr);
  }

  async function handleFinalize() {
    if (!user) {
      router.push("/login");
      return;
    }
    setFinalizing(true);
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          facts: state.text["facts"],
          risks: state.text["risks"],
          tradeoffs: state.text["tradeoffs"],
          devils_advocate: state.text["devils-advocate"],
          verdict: state.verdict,
          user_id: user.id,
          stakes,
          reversibility,
        }),
      });
      const { slug, error: err } = await res.json();
      if (err) throw new Error(err);
      router.push(`/verdict/${slug}`);
    } catch (err) {
      setError((err as Error).message);
      setFinalizing(false);
    }
  }

  function reset() {
    setPhase("input");
    setState(initialState);
    setError("");
    setDecision("");
    setPriorities([]);
    setQuestions([]);
    setAnswers({});
    setStakes(null);
    setReversibility(null);
  }

  const confidence = parseConfidence(state.verdict);
  const verdictReady = phase === "done" && state.verdict && state.verdictStatus === "done";

  return (
    <main style={{ background: "transparent", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid #1c3942", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20, background: "rgba(10,32,38,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <a href="/journal" style={{ fontSize: 11, color: "#7d93a8", textDecoration: "none" }}>Journal</a>
          {phase !== "input" && (
            <button onClick={reset} style={{ fontSize: 11, color: "#3e5266", background: "none", border: "none", cursor: "pointer" }}>
              ← new decision
            </button>
          )}
          {user ? (
            <button
              onClick={async () => { await supabase.auth.signOut(); }}
              style={{ fontSize: 11, color: "#3e5266", background: "none", border: "none", cursor: "pointer" }}
              title={user.email ?? ""}
            >
              Log out
            </button>
          ) : (
            <a href="/login" style={{ fontSize: 11, color: "#3b9cff", textDecoration: "none" }}>Log in</a>
          )}
        </div>
      </nav>

      {phase === "input" ? (
        <InputScreen
          decision={decision}
          setDecision={setDecision}
          priorities={priorities}
          togglePriority={togglePriority}
          onSubmit={handleSubmit}
          loading={clarifyLoading}
        />
      ) : phase === "clarify" ? (
        <ClarifyScreen
          decision={decision}
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          onProceed={handleGetVerdict}
        />
      ) : (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 28px 80px" }}>
          {/* Decision recap */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>your decision</p>
            <p style={{ fontSize: 15, color: "#9fb4c8", lineHeight: 1.6 }}>{decision}</p>
            {priorities.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {priorities.map((p) => (
                  <span key={p} style={{ fontSize: 10, color: "#5e7488", border: "1px solid #244650", borderRadius: 99, padding: "3px 10px" }}>{p}</span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "#2a0a10", border: "1px solid #5a1520", color: "#f08090", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Working indicator */}
          {!verdictReady && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>agents working</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {AGENT_CONFIG.map((a) => {
                  const status = state.status[a.name] ?? "idle";
                  if (status === "idle") return null;
                  const done = status === "done";
                  return (
                    <span key={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, border: `1px solid ${done ? a.accent + "60" : a.accent + "30"}`, background: done ? `${a.accent}1e` : `${a.accent}0a`, color: done ? a.accent : a.accent + "99", transition: "all 0.3s" }}>
                      {done
                        ? <span style={{ fontSize: 10 }}>✓</span>
                        : <span className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: a.accent }} />
                      }
                      {a.label}
                    </span>
                  );
                })}
                {state.verdictStatus === "working" && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, border: "1px solid #2bb3a340", background: "#0a2a2a10", color: "#2dd4bf" }}>
                    <span className="animate-pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#2dd4bf" }} /> Making the call
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Stakes / reversibility badge — only when it matters */}
          {state.verdict && (() => {
            const b = getStakeBadge(stakes, reversibility);
            return b ? (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: `${b.color}12`, border: `1px solid ${b.color}33`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: b.color, border: `1px solid ${b.color}55`, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}>{b.label}</span>
                <span style={{ fontSize: 12, color: "#9fb4c8", lineHeight: 1.5 }}>{b.note}</span>
              </div>
            ) : null;
          })()}

          {/* Verdict card */}
          {state.verdict && (
            <>
              <div style={{ background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)", border: "1px solid #2a4d57", borderRadius: 16, padding: "24px 26px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#5fe3d0", background: "#0a2a2a", border: "1px solid #18484a", padding: "4px 11px", borderRadius: 99 }}>
                    the call
                  </span>
                  {confidence !== null && (
                    <span style={{ fontSize: 11, color: "#5e7488", fontFamily: "monospace", marginLeft: "auto" }}>confidence {confidence}%</span>
                  )}
                </div>
                <div className="verdict-body">
                  <ReactMarkdown>{cleanVerdict(state.verdict)}</ReactMarkdown>
                </div>
                {confidence !== null && (
                  <div style={{ height: 5, background: "#1c3942", borderRadius: 99, marginTop: 16, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${confidence}%`, background: "#2bb3a3", borderRadius: 99, transition: "width 0.6s ease" }} />
                  </div>
                )}
              </div>

              {/* Make it work — action callout */}
              {phase === "done" && (() => {
                const action = parseMakeItWork(state.verdict);
                return action ? (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#112a3a", border: "1px solid #2f6fe040", borderRadius: 12, padding: "13px 16px", marginBottom: 20 }}>
                    <span style={{ fontSize: 10, color: "#3b9cff", border: "1px solid #3b9cff40", borderRadius: 6, padding: "3px 9px", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0, whiteSpace: "nowrap" }}>next step</span>
                    <span style={{ fontSize: 13, color: "#d4e0ec", lineHeight: 1.5 }}>{action}</span>
                  </div>
                ) : null;
              })()}
            </>
          )}

          {/* Supporting agents */}
          {(state.text["facts"] || state.text["risks"]) && (
            <div>
              <p style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                how the agents reasoned
              </p>
              <div>
                {AGENT_CONFIG.map((a) => {
                  const content = state.text[a.name] ?? "";
                  if (!content) return null;
                  const open = openAgent === a.name;
                  return (
                    <div key={a.name} style={{ borderBottom: "1px solid #1c3942" }}>
                      <button
                        onClick={() => setOpenAgent((p) => (p === a.name ? null : a.name))}
                        style={{ width: "100%", display: "flex", gap: 14, padding: "15px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", alignItems: "flex-start" }}
                      >
                        <span style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, background: `${a.accent}1e`, color: a.accent }}>
                          {a.glyph}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#e8eef4", display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            {a.label}
                            <span style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 7px", borderRadius: 5, background: `${a.accent}1e`, color: a.accent }}>{a.tag}</span>
                          </span>
                          <span style={{ fontSize: 12, color: "#7d93a8", lineHeight: 1.6, display: "block", whiteSpace: open ? "pre-wrap" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {open ? content : content.slice(0, 90) + (content.length > 90 ? "…" : "")}
                          </span>
                        </span>
                        <span style={{ fontSize: 10, color: "#3e5266", flexShrink: 0, paddingTop: 4 }}>{open ? "▲" : "▼"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Finalize */}
          {verdictReady && (
            <div style={{ marginTop: 20 }}>
              {user ? (
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  style={{ width: "100%", padding: "14px", background: "#2f6fe0", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: finalizing ? "default" : "pointer", opacity: finalizing ? 0.6 : 1 }}
                >
                  {finalizing ? "Saving..." : "Save to journal →"}
                </button>
              ) : (
                <>
                  <a
                    href="/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ width: "100%", display: "block", padding: "14px", background: "#2f6fe0", color: "#fff", borderRadius: 12, fontSize: 13, fontWeight: 500, textDecoration: "none", textAlign: "center" }}
                  >
                    Log in to save this verdict →
                  </a>
                  <p style={{ fontSize: 11, color: "#3e5266", textAlign: "center", marginTop: 8 }}>
                    Opens in a new tab — your verdict stays here.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function isValidDecision(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length >= 4 && text.trim().length >= 15;
}

function parseConfidence(text: string): number | null {
  const m = text.match(/Confidence:\s*\*{0,2}\s*(\d{1,3})/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 100 ? n : null;
}

function parseMakeItWork(text: string): string | null {
  const m = text.match(/\*\*Make it work:\*\*\s*(.+)/i);
  return m ? m[1].trim() : null;
}

function cleanVerdict(text: string): string {
  return text
    .replace(/^.*confidence:.*$/im, "")
    .replace(/\*\*\s*The Call:\s*\*\*\s*/i, "")
    .replace(/^\s*The Call:\s*/i, "")
    .replace(/\n*\*\*Make it work:\*\*[\s\S]*$/, "")
    .trim();
}

function InputScreen({
  decision, setDecision, priorities, togglePriority, onSubmit, loading,
}: {
  decision: string;
  setDecision: (s: string) => void;
  priorities: string[];
  togglePriority: (p: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [di, setDi] = useState(0);
  const [typing, setTyping] = useState(true);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (decision) return;
    const cur = DEMO_DECISIONS[di];
    if (typing) {
      if (typed.length < cur.length) {
        ref.current = setTimeout(() => setTyped(cur.slice(0, typed.length + 1)), 35);
      } else {
        ref.current = setTimeout(() => setTyping(false), 2600);
      }
    } else {
      if (typed.length > 0) {
        ref.current = setTimeout(() => setTyped(typed.slice(0, -1)), 12);
      } else {
        setDi((i) => (i + 1) % DEMO_DECISIONS.length);
        setTyping(true);
      }
    }
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [typed, typing, di, decision]);

  return (
    <>
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "56px 28px 80px" }}>
      <p style={{ fontSize: 10, color: "#5e7488", letterSpacing: "0.14em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 16 }}>
        think it through in 60 seconds
      </p>
      <h1 style={{ fontSize: 48, fontWeight: 500, letterSpacing: -2, lineHeight: 1.05, color: "#e8eef4", marginBottom: 16 }}>
        Make the call<br />you won&apos;t <span style={{ color: "#3b9cff" }}>regret.</span>
      </h1>
      <p style={{ fontSize: 14, color: "#7d93a8", lineHeight: 1.6, maxWidth: 440, marginBottom: 30 }}>
        Describe a decision you&apos;re stuck on. Five agents debate it from every angle — facts, risks, tradeoffs, and the counter-argument — then hand you a verdict you can trust.
      </p>

      <form onSubmit={onSubmit}>
        <div style={{ position: "relative", marginBottom: 18 }}>
          <textarea
            rows={4}
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            style={{ width: "100%", background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)", border: "1px solid #244650", borderRadius: 14, padding: "16px 18px", fontSize: 14, color: "#d4e0ec", outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit" }}
          />
          {!decision && (
            <div style={{ position: "absolute", top: 16, left: 18, right: 18, fontSize: 14, color: "#3e5266", pointerEvents: "none", lineHeight: 1.6 }}>
              {typed}<span className="animate-blink" style={{ borderRight: "1.5px solid #3b9cff", marginLeft: 1 }} />
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: "#5e7488", marginBottom: 10, fontFamily: "monospace", letterSpacing: "0.06em" }}>what matters most to you?</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
          {PRIORITIES.map((p) => {
            const on = priorities.includes(p);
            return (
              <button
                type="button"
                key={p}
                onClick={() => togglePriority(p)}
                style={{ padding: "7px 14px", borderRadius: 99, fontSize: 12, cursor: "pointer", border: on ? "1px solid #3b9cff" : "1px solid #244650", background: on ? "#112a3a" : "#102931", color: on ? "#8fc4e8" : "#5e7488", transition: "all 0.15s" }}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={!isValidDecision(decision) || loading}
          style={{ width: "100%", padding: "15px", background: "#2f6fe0", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: isValidDecision(decision) && !loading ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {loading ? "Reading your situation..." : "Continue →"}
        </button>
      </form>

      <p style={{ fontSize: 11, color: "#3e5266", marginTop: 12, textAlign: "center" }}>
        Next, Claro asks a couple of quick questions to sharpen the verdict.
      </p>

      {/* Agent teaser */}
      <div style={{ marginTop: 40 }}>
        <p style={{ fontSize: 10, color: "#3e5266", letterSpacing: "0.14em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 14 }}>
          5 agents, one verdict
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AGENT_CONFIG.map((a) => (
            <span key={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 13px", borderRadius: 10, border: "1px solid #1c3942", background: "#0e2027", fontSize: 12, color: "#7d93a8" }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, background: `${a.accent}1e`, color: a.accent }}>{a.glyph}</span>
              {a.label}
            </span>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 13px", borderRadius: 10, border: "1px solid #18484a", background: "#0a2a2a", fontSize: 12, color: "#5fe3d0" }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, background: "#18484a55", color: "#2dd4bf" }}>✓</span>
            The Call
          </span>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}

function ClarifyScreen({
  decision,
  questions,
  answers,
  setAnswers,
  onProceed,
}: {
  decision: string;
  questions: string[];
  answers: Record<number, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  onProceed: () => void;
}) {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 28px 80px" }}>
      <p style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>your decision</p>
      <p style={{ fontSize: 14, color: "#9fb4c8", lineHeight: 1.6, marginBottom: 32 }}>{decision}</p>

      <h2 style={{ fontSize: 24, fontWeight: 500, letterSpacing: -0.6, color: "#e8eef4", marginBottom: 6 }}>
        A few things first.
      </h2>
      <p style={{ fontSize: 13, color: "#7d93a8", lineHeight: 1.6, marginBottom: 28 }}>
        These are tailored to your situation — your answers make the verdict sharper. Skip any you&apos;re unsure about.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
        {questions.map((q, i) => (
          <div key={i}>
            <label style={{ display: "flex", gap: 8, fontSize: 14, color: "#d4e0ec", marginBottom: 8, lineHeight: 1.4 }}>
              <span style={{ color: "#3b9cff", fontFamily: "monospace", flexShrink: 0 }}>{i + 1}.</span>
              {q}
            </label>
            <input
              type="text"
              value={answers[i] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
              placeholder="Your answer (optional)"
              style={{ width: "100%", background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)", border: "1px solid #244650", borderRadius: 10, padding: "12px 16px", fontSize: 14, color: "#e8eef4", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onProceed}
        style={{ width: "100%", padding: "15px", background: "#2f6fe0", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 12 }}
      >
        ⚡ Get my verdict
      </button>
      <button
        onClick={onProceed}
        style={{ width: "100%", padding: "10px", background: "none", color: "#5e7488", border: "none", fontSize: 12, cursor: "pointer" }}
      >
        Skip — decide with what I gave
      </button>
    </div>
  );
}
