export function Logo() {
  return (
    <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="#2dd4bf" strokeWidth="1.3" opacity="0.3" />
        <circle cx="12" cy="12" r="6.3" stroke="#3b9cff" strokeWidth="1.3" opacity="0.6" />
        <circle cx="12" cy="12" r="2.4" fill="#5fe3d0" />
      </svg>
      <span style={{ fontSize: 17, fontWeight: 500, color: "#e8eef4", letterSpacing: -0.3 }}>
        cla<span style={{ color: "#3b9cff" }}>r</span>o
      </span>
    </a>
  );
}
