/*
 * Dashboard - 管理后台仪表盘
 * Design: 极简主义企业后台 - 统计卡片 + 最近任务表格
 */
import { useEffect, useState } from "react";
import { Users, Briefcase, Zap, Film, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/adminApi";

interface Stats {
  userCount: number;
  jobCount: number;
  activeJobs: number;
  clipCount: number;
  recentJobs: Array<{
    id: number; title: string; status: string; progress: number;
    createdAt: string; userName: string; username: string;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  uploading: { label: "上传中", color: "text-blue-400 bg-blue-400/10" },
  transcribing: { label: "转录中", color: "text-yellow-400 bg-yellow-400/10" },
  analyzing: { label: "分析中", color: "text-yellow-400 bg-yellow-400/10" },
  clipping: { label: "切片中", color: "text-orange-400 bg-orange-400/10" },
  deduplicating: { label: "去重中", color: "text-orange-400 bg-orange-400/10" },
  generating_copy: { label: "生成文案", color: "text-purple-400 bg-purple-400/10" },
  completed: { label: "已完成", color: "text-green-400 bg-green-400/10" },
  failed: { label: "失败", color: "text-red-400 bg-red-400/10" },
  paused: { label: "已暂停", color: "text-gray-400 bg-gray-400/10" },
  cancelled: { label: "已取消", color: "text-gray-500 bg-gray-500/10" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = [
    { label: "注册用户", value: stats?.userCount ?? "-", icon: <Users className="w-4 h-4" />, color: "text-blue-400" },
    { label: "总任务数", value: stats?.jobCount ?? "-", icon: <Briefcase className="w-4 h-4" />, color: "text-purple-400" },
    { label: "处理中", value: stats?.activeJobs ?? "-", icon: <Zap className="w-4 h-4" />, color: "text-yellow-400" },
    { label: "已生成切片", value: stats?.clipCount ?? "-", icon: <Film className="w-4 h-4" />, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-0.5">平台运营数据概览</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-1.5 h-8 text-xs">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{card.label}</span>
              <span className={cn("opacity-70", card.color)}>{card.icon}</span>
            </div>
            <div className="text-2xl font-semibold text-foreground font-mono">
              {loading ? <span className="text-muted-foreground text-lg">—</span> : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* 最近任务 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">最近任务</h2>
          <span className="text-xs text-muted-foreground">最近 10 条</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-12">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">任务标题</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">用户</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">状态</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">进度</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">加载中...</td></tr>
              ) : !stats?.recentJobs?.length ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">暂无任务数据</td></tr>
              ) : stats.recentJobs.map((job) => {
                const s = STATUS_LABELS[job.status] || { label: job.status, color: "text-gray-400 bg-gray-400/10" };
                return (
                  <tr key={job.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{job.id}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-48 truncate">{job.title || "未命名任务"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      <span>{job.userName || "—"}</span>
                      {job.username && <span className="ml-1 opacity-50">@{job.username}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("status-badge", s.color)}>{s.label}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{formatDate(job.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
