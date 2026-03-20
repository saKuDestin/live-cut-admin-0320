/*
 * AdminLayout - 管理后台主布局
 * Design: 极简主义企业后台 - 固定侧边栏 + 顶部栏 + 内容区
 * 侧边栏活跃项左侧 3px 绿色竖线指示器
 */
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Settings, LogOut, Scissors, Key, ChevronRight, HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "仪表盘", icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/users", label: "用户管理", icon: <Users className="w-4 h-4" /> },
  { href: "/api-config", label: "API 配置", icon: <Key className="w-4 h-4" /> },
  { href: "/r2-storage", label: "R2 存储管理", icon: <HardDrive className="w-4 h-4" /> },
  { href: "/settings", label: "系统设置", icon: <Settings className="w-4 h-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAdminAuth();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Scissors className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground leading-none">直播切片大师</div>
            <div className="text-xs text-muted-foreground mt-0.5">管理后台</div>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors relative",
                    isActive
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                  )}
                  {item.icon}
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 底部用户信息 */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">
                {user?.name?.slice(0, 1) || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{user?.name || "管理员"}</div>
              <div className="text-xs text-muted-foreground truncate">@{user?.username}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={logout}
              title="退出登录"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-foreground font-medium">
              {NAV_ITEMS.find(i => i.href === "/" ? location === "/" : location.startsWith(i.href))?.label || "管理后台"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <span>前往功能网站</span>
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </header>

        {/* 内容区 */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
