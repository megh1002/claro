import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ShareButton } from "./ShareButton";

export default async function ReportPage({
  params,
}: {
  params: { slug: string };
}) {
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!report) notFound();

  const agents = [
    { label: "Background", content: report.background, accent: "#2563eb" },
    { label: "Current Events", content: report.current_events, accent: "#7c3aed" },
    { label: "Perspectives", content: report.perspectives, accent: "#ea580c" },
    { label: "So What?", content: report.so_what, accent: "#16a34a" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f6f3]">
      <nav className="border-b border-[#e8e6e1] bg-[#f7f6f3] px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-bold tracking-tight text-[#111]">
          Scopa
        </a>
        <span className="text-xs text-[#aaa] font-mono">
          {new Date(report.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-14">
        <div className="mb-10">
          <p className="text-xs text-[#aaa] uppercase tracking-widest font-mono mb-1">Report</p>
          <h1 className="text-3xl font-bold text-[#111] tracking-tight">{report.topic}</h1>
        </div>

        {/* Synthesized report */}
        <div className="bg-white border border-[#e8e6e1] rounded-2xl px-7 py-6 shadow-sm mb-10">
          <div className="report-body">
            <ReactMarkdown>{report.synthesized}</ReactMarkdown>
          </div>
        </div>

        {/* Agent sources */}
        <div>
          <p className="text-xs text-[#bbb] font-mono uppercase tracking-widest mb-3">
            Agent sources
          </p>
          <div className="space-y-3">
            {agents.map((agent) => (
              <details key={agent.label} className="rounded-xl border border-[#e8e6e1] bg-white shadow-sm">
                <summary className="flex items-center gap-2.5 px-4 py-3 cursor-pointer select-none hover:bg-[#fafaf9] transition-colors rounded-xl">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: agent.accent }}
                  />
                  <span className="text-sm font-medium text-[#333]">{agent.label}</span>
                </summary>
                <div className="px-4 pb-4 border-t border-[#f0eeeb]">
                  <div className="text-sm text-[#555] leading-relaxed whitespace-pre-wrap pt-3">
                    {agent.content}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Share */}
        <div className="mt-10 pt-8 border-t border-[#e8e6e1]">
          <ShareButton />
        </div>
      </div>
    </main>
  );
}

