"use client";

export function ShareButton() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 12, color: "#3d2030" }}>Share this report</span>
      <button
        onClick={() => navigator.clipboard.writeText(window.location.href)}
        style={{ padding: "8px 16px", background: "#8b1a3a", color: "#f0e0e5", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
      >
        Copy link
      </button>
    </div>
  );
}
