"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { Logo } from "../Logo";
import { Footer } from "../Footer";

type Row = {
  slug: string;
  topic: string;
  synthesized: string | null;
  created_at: string;
  outcome_rating: string | null;
};

function parseConfidence(text: string | null): number | null {
  if (!text) return null;
  const m = text.match(/Confidence:\s*\*{0,2}\s*(\d{1,3})/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 100 ? n : null;
}

function callHeadline(text: string | null): string {
  if (!text) return "";
  const cleaned = text
    .replace(/^.*confidence:.*$/im, "")
    .replace(/\*\*\s*The Call:\s*\*\*\s*/i, "")
    .replace(/^\s*The Call:\s*/i, "")
    .trim();
  const firstLine = cleaned.split("\n").find((l) => l.trim().length > 0) ?? "";
  return firstLine.replace(/\*\*/g, "").trim();
}

const OUTCOME_LABEL: Record<string, { label: string; color: string }> = {
  great: { label: "Great call", color: "#2dd4bf" },
  mixed: { label: "Mixed", color: "#e0a83a" },
  regret: { label: "Regret it", color: "#e85a7a" },
};

export default function JournalPage() {
  const { user, loading: userLoading } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) { setLoading(false); return; }
    supabase
      .from("reports")
      .select("slug, topic, synthesized, created_at, outcome_rating")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      });
  }, [user, userLoading]);

  return (
    <main style={{ background: "transparent", minHeight: "100vh", color: "#e8eef4" }}>
      <nav style={{ borderBottom: "1px solid #1c3942", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20, background: "rgba(10,32,38,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <Logo />
        <a href="/decide" style={{ fontSize: 11, color: "#3e5266", textDecoration: "none" }}>+ new decision</a>
      </nav>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 28px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 10, color: "#5e7488", letterSpacing: "0.14em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 12 }}>
            your decision journal
          </p>
          <h1 style={{ fontSize: 34, fontWeight: 500, letterSpacing: -1, color: "#e8eef4", marginBottom: 8 }}>
            Every call you&apos;ve made.
          </h1>
          <p style={{ fontSize: 14, color: "#7d93a8", lineHeight: 1.6 }}>
            The reasoning at the time, the verdict, and how it turned out — all in one place.
          </p>
        </div>

        {userLoading || loading ? (
          <p style={{ fontSize: 13, color: "#5e7488" }}>Loading...</p>
        ) : !user ? (
          <div style={{ border: "1px solid #1c3942", borderRadius: 14, padding: "40px 28px", textAlign: "center", background: "#0e2027" }}>
            <p style={{ fontSize: 14, color: "#7d93a8", marginBottom: 16 }}>Log in to see your decision journal.</p>
            <a href="/login" style={{ display: "inline-block", padding: "10px 18px", background: "#2f6fe0", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              Log in →
            </a>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ border: "1px solid #1c3942", borderRadius: 14, padding: "40px 28px", textAlign: "center", background: "#0e2027" }}>
            <p style={{ fontSize: 14, color: "#5e7488", marginBottom: 16 }}>No decisions logged yet.</p>
            <a href="/decide" style={{ display: "inline-block", padding: "10px 18px", background: "#2f6fe0", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              Make your first call →
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((d) => {
              const confidence = parseConfidence(d.synthesized);
              const headline = callHeadline(d.synthesized);
              const outcome = d.outcome_rating ? OUTCOME_LABEL[d.outcome_rating] : null;
              return (
                <a key={d.slug} href={`/verdict/${d.slug}`} style={{ display: "block", textDecoration: "none", border: "1px solid #1c3942", borderRadius: 14, padding: "18px 20px", background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace", letterSpacing: "0.06em" }}>
                      {new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {outcome && (
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: outcome.color, border: `1px solid ${outcome.color}40`, padding: "2px 9px", borderRadius: 99 }}>
                        {outcome.label}
                      </span>
                    )}
                    {confidence !== null && (
                      <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "monospace", color: "#5fe3d0", background: "#0a2a2a", border: "1px solid #18484a", padding: "2px 9px", borderRadius: 99 }}>
                        {confidence}% confident
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: "#d4e0ec", lineHeight: 1.5, marginBottom: 8 }}>{d.topic}</p>
                  {headline && (
                    <p style={{ fontSize: 12, color: "#7d93a8", lineHeight: 1.5, display: "flex", gap: 7 }}>
                      <span style={{ color: "#2dd4bf", flexShrink: 0 }}>→</span>
                      {headline}
                    </p>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
