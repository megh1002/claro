"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const RATINGS = [
  { key: "great", label: "Great call", color: "#2dd4bf" },
  { key: "mixed", label: "Mixed", color: "#e0a83a" },
  { key: "regret", label: "Regret it", color: "#e85a7a" },
];

export function OutcomeLogger({
  slug,
  initialRating,
  initialOutcome,
  loggedAt,
}: {
  slug: string;
  initialRating: string | null;
  initialOutcome: string | null;
  loggedAt: string | null;
}) {
  const [rating, setRating] = useState<string | null>(initialRating);
  const [outcome, setOutcome] = useState(initialOutcome ?? "");
  const [saved, setSaved] = useState(!!initialRating);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!rating) return;
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("reports")
      .update({
        outcome: outcome.trim() || null,
        outcome_rating: rating,
        outcome_logged_at: new Date().toISOString(),
      })
      .eq("slug", slug);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setSaved(true);
    setEditing(false);
  }

  const current = RATINGS.find((r) => r.key === rating);

  if (saved && !editing) {
    return (
      <div style={{ background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)", border: "1px solid #1c3942", borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: outcome ? 10 : 0 }}>
          <span style={{ fontSize: 10, color: "#5e7488", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>how it turned out</span>
          {current && (
            <span style={{ fontSize: 11, fontFamily: "monospace", color: current.color, border: `1px solid ${current.color}40`, padding: "2px 10px", borderRadius: 99 }}>
              {current.label}
            </span>
          )}
          <button onClick={() => setEditing(true)} style={{ marginLeft: "auto", fontSize: 11, color: "#3e5266", background: "none", border: "none", cursor: "pointer" }}>edit</button>
        </div>
        {outcome && <p style={{ fontSize: 13, color: "#9fb4c8", lineHeight: 1.6 }}>{outcome}</p>}
        {loggedAt && (
          <p style={{ fontSize: 10, color: "#3e5266", fontFamily: "monospace", marginTop: 8 }}>
            logged {new Date(loggedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)", border: "1px solid #2a4d57", borderRadius: 14, padding: "20px 22px" }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: "#e8eef4", marginBottom: 4 }}>How did it turn out?</p>
      <p style={{ fontSize: 12, color: "#7d93a8", marginBottom: 16, lineHeight: 1.5 }}>
        Come back after the decision plays out. Logging the outcome is how Claro learns your patterns over time.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {RATINGS.map((r) => (
          <button
            key={r.key}
            onClick={() => setRating(r.key)}
            style={{ flex: 1, padding: "10px", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer", background: rating === r.key ? `${r.color}1e` : "#0a2026", border: rating === r.key ? `1px solid ${r.color}` : "1px solid #244650", color: rating === r.key ? r.color : "#7d93a8" }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        placeholder="What actually happened? (optional)"
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        style={{ width: "100%", background: "#0a2026", border: "1px solid #244650", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#d4e0ec", outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12 }}
      />
      {error && <p style={{ fontSize: 12, color: "#f08090", marginBottom: 10 }}>{error}</p>}
      <button
        onClick={save}
        disabled={!rating || saving}
        style={{ width: "100%", padding: "12px", background: "#2f6fe0", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: !rating || saving ? 0.5 : 1 }}
      >
        {saving ? "Saving..." : "Log outcome"}
      </button>
    </div>
  );
}
