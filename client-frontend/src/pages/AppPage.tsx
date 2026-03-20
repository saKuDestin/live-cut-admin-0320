/*
 * AppPage.tsx - 前台应用功能主页
 * 访问 seealso.online/app 时展示此页面
 * 用户需要登录后才能使用切片功能
 */
import { Link } from "wouter";

export default function AppPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#f1f5f9",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "1.75rem",
          }}
        >
          ✂️
        </div>

        <h2
          style={{
            fontSize: "1.875rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            color: "#e2e8f0",
          }}
        >
          开始使用
        </h2>

        <p
          style={{
            fontSize: "1rem",
            color: "#94a3b8",
            lineHeight: 1.7,
            marginBottom: "2rem",
          }}
        >
          请使用您的账号登录，开始智能切片之旅。
          <br />
          如果您还没有账号，请联系管理员创建。
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
            🚧 前台用户功能正在建设中，敬请期待。
          </p>
        </div>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.5rem",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#cbd5e1",
            fontWeight: 500,
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}
