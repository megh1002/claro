"use client";

export function ShareButton() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 12, color: "#3e5266" }}>Share this verdict</span>
      <button
        onClick={() => navigator.clipboard.writeText(window.location.href)}
        style={{ padding: "8px 16px", background: "#2f6fe0", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
      >
        Copy link
      </button>
    </div>
  );
}
