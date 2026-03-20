/*
 * App.tsx - 直播切片大师管理后台
 * Design: 极简主义企业后台 - 深色 GitHub 风格
 * Routes: /login (公开) | / /users /api-config /settings (需登录)
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginRoute} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
      <Route path="/api-config" component={() => <ProtectedRoute component={ApiConfig} />} />
      <Route path="/r2-storage" component={() => <ProtectedRoute component={R2Storage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
