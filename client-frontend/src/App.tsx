/*
 * App.tsx - 直播切片大师前台客户端
 * 根路径 / 展示此页面
 *
 * 路由说明：
 *   /      → 首页
 *   /app   → 应用入口（占位，可替换为实际业务页面）
 *   其余   → 404
 *
 * 注意：不设置 Router base，让 wouter 直接匹配浏览器完整路径。
 * 后端已配置 SPA fallback，所有非 /admin、非 /api 路径均返回此 index.html。
 */
import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Switch>
      {/* 首页 */}
      <Route path="/" component={Home} />
      {/* /app 路由：目前重定向到首页，后续替换为实际应用入口 */}
      <Route path="/app" component={Home} />
      {/* 兜底 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
