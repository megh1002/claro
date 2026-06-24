"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Logo } from "../Logo";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/journal");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main style={{ background: "transparent", minHeight: "100vh", color: "#e8eef4" }}>
      <nav style={{ borderBottom: "1px solid #1c3942", padding: "14px 28px", position: "sticky", top: 0, zIndex: 20, background: "rgba(10,32,38,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <Logo />
      </nav>

      <div style={{ maxWidth: 380, margin: "0 auto", padding: "72px 28px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: -1, color: "#e8eef4", marginBottom: 8 }}>
          {mode === "login" ? "Welcome back." : "Start your journal."}
        </h1>
        <p style={{ fontSize: 13, color: "#7d93a8", lineHeight: 1.6, marginBottom: 28 }}>
          {mode === "login"
            ? "Log in to see every call you've made."
            : "Create an account so your decisions stay yours — privately saved and tracked over time."}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ background: "#102931", border: "1px solid #244650", borderRadius: 10, padding: "13px 16px", fontSize: 14, color: "#e8eef4", outline: "none" }}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ background: "#102931", border: "1px solid #244650", borderRadius: 10, padding: "13px 16px", fontSize: 14, color: "#e8eef4", outline: "none" }}
          />

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "#2a0a10", border: "1px solid #5a1520", color: "#f08090", fontSize: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: "13px", background: "#2f6fe0", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: loading ? 0.6 : 1, marginTop: 4 }}
          >
            {loading ? "..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          style={{ marginTop: 20, background: "none", border: "none", color: "#7d93a8", fontSize: 13, cursor: "pointer" }}
        >
          {mode === "login" ? "No account? Sign up →" : "Already have an account? Log in →"}
        </button>
      </div>
    </main>
  );
}
