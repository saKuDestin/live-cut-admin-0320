/*
 * App.tsx - 直播切片大师前台客户端
 * 根路径 / 展示此页面
 *
 * 路由说明：
 *   /      → 首页（Home）
 *   /app   → 前台应用功能入口（AppPage）
 *   其余   → 404（NotFound）
 *
 * 不设置 Router base，让 wouter 直接匹配浏览器完整路径。
 * 后端已配置 SPA fallback，所有非 /admin、非 /api 路径均返回此 index.html。
 */
import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import AppPage from "./pages/AppPage";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Switch>
      {/* 首页 */}
      <Route path="/" component={Home} />
      {/* 前台应用功能入口 */}
      <Route path="/app" component={AppPage} />
      {/* 兜底 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
