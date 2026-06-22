import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ShareButton } from "./ShareButton";

export default async function ReportPage({ params }: { params: { slug: string } }) {
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!report) notFound();

  const agents = [
    { label: "Background", content: report.background, accent: "#4a9eff" },
    { label: "Current Events", content: report.current_events, accent: "#a855f7" },
    { label: "Perspectives", content: report.perspectives, accent: "#f97316" },
    { label: "So What?", content: report.so_what, accent: "#22c55e" },
  ];

  return (
    <main style={{ background: "#0e0b0d", minHeight: "100vh", color: "#f0e0e5" }}>
      <nav style={{ borderBottom: "1px solid #1e1318", padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 500, color: "#f0e0e5", textDecoration: "none", letterSpacing: -0.5 }}>Scopa</a>
        <span style={{ fontSize: 11, color: "#3d2030", fontFamily: "monospace" }}>
          {new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </nav>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 40px" }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 10, color: "#3d2030", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Report</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, color: "#f0e0e5", letterSpacing: -0.5 }}>{report.topic}</h1>
        </div>

        {/* Report card */}
        <div style={{ background: "#130c10", border: "1px solid #2a1520", borderRadius: 14, padding: "24px 28px", marginBottom: 28 }}>
          <div className="report-body">
            <ReactMarkdown>{report.synthesized}</ReactMarkdown>
          </div>
        </div>

        {/* Agent sources */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 10, color: "#3d2030", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Agent sources</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {agents.map((agent) => (
              <details key={agent.label} style={{ borderRadius: 10, border: "1px solid #1e1318", background: "#130c10", overflow: "hidden" }}>
                <summary style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", listStyle: "none" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: agent.accent, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#f0e0e5" }}>{agent.label}</span>
                </summary>
                <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1e1318" }}>
                  <div style={{ fontSize: 13, color: "#a07080", lineHeight: 1.7, whiteSpace: "pre-wrap", paddingTop: 12 }}>{agent.content}</div>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Share */}
        <div style={{ borderTop: "1px solid #1e1318", paddingTop: 24 }}>
          <ShareButton />
        </div>
      </div>
    </main>
  );
}
