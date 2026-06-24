import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #1c3942", padding: "28px", marginTop: 48 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <Logo />
        <span style={{ fontSize: 12, color: "#5e7488" }}>Decisions, made with clarity.</span>
        <span style={{ fontSize: 11, color: "#3e5266", fontFamily: "monospace" }}>© 2026 Claro</span>
      </div>
    </footer>
  );
}
