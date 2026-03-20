/*
 * Home.tsx - 前台客户端首页
 * 访问 seealso.online/ 时展示此页面
 * 可根据实际业务需求替换为真实的前台界面
 */
export default function Home() {
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
        {/* Logo / Icon */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 2rem",
            fontSize: "2rem",
          }}
        >
          🎬
        </div>

        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            marginBottom: "1rem",
            background: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          直播切片大师
        </h1>

        <p
          style={{
            fontSize: "1.125rem",
            color: "#94a3b8",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
          }}
        >
          智能直播内容切片工具，自动识别精彩片段，一键生成短视频素材。
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
              transition: "opacity 0.2s",
            }}
          >
            立即使用
          </a>
          <a
            href="/admin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#cbd5e1",
              fontWeight: 500,
              fontSize: "0.95rem",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            管理后台
          </a>
        </div>
      </div>
    </div>
  );
}
