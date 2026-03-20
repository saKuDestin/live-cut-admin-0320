export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#f1f5f9",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "6rem", fontWeight: 700, color: "#334155", margin: 0 }}>404</h1>
      <p style={{ fontSize: "1.25rem", color: "#64748b", marginBottom: "2rem" }}>页面不存在</p>
      <a
        href="/"
        style={{
          padding: "0.625rem 1.5rem",
          borderRadius: "8px",
          background: "#6366f1",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        返回首页
      </a>
    </div>
  );
}
