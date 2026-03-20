/*
 * App.tsx - 直播切片大师管理后台
 * Design: 极简主义企业后台 - 深色 GitHub 风格
 * Routes: /admin/login (公开) | /admin /admin/users /admin/api-config /admin/settings (需登录)
 *
 * 使用 wouter 的 Router base="/admin" 选项，所有路由路径自动加上 /admin 前缀：
 *   <Route path="/login"> 实际匹配 /admin/login
 *   <Route path="/"> 实际匹配 /admin
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAdminAuth } from "./hooks/useAdminAuth";
import AdminLayout from "./components/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import ApiConfig from "./pages/ApiConfig";
import Settings from "./pages/Settings";
import R2Storage from "./pages/R2Storage";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAdminAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          加载中...
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <AdminLayout>
      <Component />
    </AdminLayout>
  );
}

function LoginRoute() {
  const { user, loading } = useAdminAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return null;

  return <Login onSuccess={() => navigate("/")} />;
}

function AppRouter() {
  return (
    // base="/admin" 让所有 <Route path="..."> 都相对于 /admin 匹配
    // 例如 path="/login" 实际匹配浏览器地址 /admin/login
    // path="/" 实际匹配 /admin 或 /admin/
    <Router base="/admin">
      <Switch>
        <Route path="/login" component={LoginRoute} />
        <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
        <Route path="/api-config" component={() => <ProtectedRoute component={ApiConfig} />} />
        <Route path="/r2-storage" component={() => <ProtectedRoute component={R2Storage} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
