import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ShareButton } from "./ShareButton";
import { OutcomeLogger } from "./OutcomeLogger";
import { Logo } from "../../Logo";
import { Footer } from "../../Footer";
import { getStakeBadge } from "@/lib/stakes";

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

function parseConfidence(text: string): number | null {
  const m = text.match(/Confidence:\s*\*{0,2}\s*(\d{1,3})/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 100 ? n : null;
}

export default async function VerdictPage({ params }: { params: { slug: string } }) {
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!report) notFound();

  const decision = report.topic;
  const verdict = report.synthesized;
  const confidence = parseConfidence(verdict);
  const stakeBadge = getStakeBadge(report.stakes, report.reversibility);

  const agents = [
    { label: "Facts", tag: "grounded", content: report.background, accent: "#5ba3e8", glyph: "i" },
    { label: "Risks", tag: "caution", content: report.current_events, accent: "#e0a83a", glyph: "!" },
    { label: "Tradeoffs", tag: "weighed", content: report.perspectives, accent: "#8b8fe8", glyph: "⇄" },
    { label: "Devil's Advocate", tag: "pushback", content: report.so_what, accent: "#e85a7a", glyph: "↺" },
  ];

  return (
    <main style={{ background: "transparent", minHeight: "100vh", color: "#e8eef4" }}>
      <nav style={{ borderBottom: "1px solid #1c3942", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20, background: "rgba(10,32,38,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <a href="/journal" style={{ fontSize: 11, color: "#7d93a8", textDecoration: "none" }}>Journal</a>
          <span style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace" }}>
            {new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 28px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>the decision</p>
          <p style={{ fontSize: 17, color: "#d4e0ec", lineHeight: 1.5 }}>{decision}</p>
        </div>

        {/* Stakes / reversibility badge — only when it matters */}
        {stakeBadge && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: `${stakeBadge.color}12`, border: `1px solid ${stakeBadge.color}33`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: stakeBadge.color, border: `1px solid ${stakeBadge.color}55`, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap", flexShrink: 0 }}>{stakeBadge.label}</span>
            <span style={{ fontSize: 12, color: "#9fb4c8", lineHeight: 1.5 }}>{stakeBadge.note}</span>
          </div>
        )}

        {/* Verdict */}
        <div style={{ background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)", border: "1px solid #2a4d57", borderRadius: 16, padding: "24px 26px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#5fe3d0", background: "#0a2a2a", border: "1px solid #18484a", padding: "4px 11px", borderRadius: 99 }}>the call</span>
            {confidence !== null && (
              <span style={{ fontSize: 11, color: "#5e7488", fontFamily: "monospace", marginLeft: "auto" }}>confidence {confidence}%</span>
            )}
          </div>
          <div className="verdict-body">
            <ReactMarkdown>{cleanVerdict(verdict)}</ReactMarkdown>
          </div>
          {confidence !== null && (
            <div style={{ height: 5, background: "#1c3942", borderRadius: 99, marginTop: 16, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${confidence}%`, background: "#2bb3a3", borderRadius: 99 }} />
            </div>
          )}
        </div>

        {/* Make it work — action callout */}
        {(() => {
          const action = parseMakeItWork(verdict);
          return action ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#112a3a", border: "1px solid #2f6fe040", borderRadius: 12, padding: "13px 16px", marginBottom: 20 }}>
              <span style={{ fontSize: 10, color: "#3b9cff", border: "1px solid #3b9cff40", borderRadius: 6, padding: "3px 9px", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0, whiteSpace: "nowrap" }}>next step</span>
              <span style={{ fontSize: 13, color: "#d4e0ec", lineHeight: 1.5 }}>{action}</span>
            </div>
          ) : null;
        })()}

        {/* Outcome loop */}
        <div style={{ marginBottom: 24 }}>
          <OutcomeLogger
            slug={params.slug}
            initialRating={report.outcome_rating ?? null}
            initialOutcome={report.outcome ?? null}
            loggedAt={report.outcome_logged_at ?? null}
          />
        </div>

        {/* Agents */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>how the agents reasoned</p>
          {agents.map((a) => (
            <details key={a.label} style={{ borderBottom: "1px solid #1c3942" }}>
              <summary style={{ display: "flex", gap: 14, padding: "15px 0", cursor: "pointer", listStyle: "none", alignItems: "flex-start" }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, background: `${a.accent}1e`, color: a.accent }}>{a.glyph}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#e8eef4", display: "flex", alignItems: "center", gap: 8 }}>
                    {a.label}
                    <span style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 7px", borderRadius: 5, background: `${a.accent}1e`, color: a.accent }}>{a.tag}</span>
                  </span>
                </span>
              </summary>
              <div style={{ paddingLeft: 48, paddingBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#7d93a8", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.content}</div>
              </div>
            </details>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #1c3942", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <ShareButton />
          <a
            href="/decide"
            style={{ fontSize: 12, color: "#3b9cff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            + Make another decision
          </a>
        </div>
      </div>
      <Footer />
    </main>
  );
}
