import { Footer } from "./Footer";

export default function WelcomePage() {
  return (
    <main style={{ background: "transparent", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 28px", textAlign: "center" }}>
        {/* Symbol */}
        <div className="animate-breathe" style={{ marginBottom: 28 }}>
          <svg width="68" height="68" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" stroke="#2dd4bf" strokeWidth="0.9" opacity="0.22" />
            <circle cx="12" cy="12" r="7.5" stroke="#3b9cff" strokeWidth="1" opacity="0.45" />
            <circle cx="12" cy="12" r="4.3" stroke="#5fe3d0" strokeWidth="1.1" opacity="0.7" />
            <circle cx="12" cy="12" r="1.8" fill="#5fe3d0" />
          </svg>
        </div>

        {/* Wordmark */}
        <h1 style={{ fontSize: 64, fontWeight: 500, letterSpacing: -3, color: "#e8eef4", lineHeight: 1, marginBottom: 18 }}>
          cla<span style={{ color: "#3b9cff" }}>r</span>o
        </h1>

        <p style={{ fontSize: 18, color: "#d4e0ec", fontWeight: 500, marginBottom: 8, letterSpacing: -0.3 }}>
          Make the call you won&apos;t regret.
        </p>
        <p style={{ fontSize: 14, color: "#7d93a8", lineHeight: 1.6, maxWidth: 380, marginBottom: 36 }}>
          Five AI agents debate your decision from every angle — then hand you a verdict you can trust.
        </p>

        {/* Primary CTA */}
        <a
          href="/decide"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 34px", background: "#2f6fe0", color: "#fff", borderRadius: 12, fontSize: 15, fontWeight: 500, textDecoration: "none", marginBottom: 32 }}
        >
          Start a decision →
        </a>

        {/* Side-by-side options */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 440 }}>
          <a
            href="/login"
            style={{ flex: "1 1 180px", textDecoration: "none", background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)", border: "1px solid #244650", borderRadius: 14, padding: "20px 18px", textAlign: "left" }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: "#2f6fe01e", color: "#5ba3e8", marginBottom: 10 }}>→</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#e8eef4", marginBottom: 4 }}>Log in</div>
            <div style={{ fontSize: 12, color: "#7d93a8", lineHeight: 1.5 }}>Save your decisions and track how they turn out.</div>
          </a>
          <a
            href="/journal"
            style={{ flex: "1 1 180px", textDecoration: "none", background: "rgba(16,41,49,0.42)", backdropFilter: "blur(10px) saturate(1.1)", WebkitBackdropFilter: "blur(10px) saturate(1.1)", border: "1px solid #244650", borderRadius: 14, padding: "20px 18px", textAlign: "left" }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: "#2dd4bf1e", color: "#2dd4bf", marginBottom: 10 }}>≡</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#e8eef4", marginBottom: 4 }}>The journal</div>
            <div style={{ fontSize: 12, color: "#7d93a8", lineHeight: 1.5 }}>Revisit every call you&apos;ve made, with outcomes.</div>
          </a>
        </div>
      </div>

      <Footer />
    </main>
  );
}
