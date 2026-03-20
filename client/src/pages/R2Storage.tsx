/*
 * R2Storage - R2 存储管理页
 * Design: 极简主义企业后台 - R2 生命周期策略配置 + 存储优化说明
 */
import { useEffect, useState } from "react";
import {
  HardDrive, RefreshCw, CheckCircle2, AlertCircle, Trash2,
  Clock, Shield, Info, Play, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/adminApi";

interface LifecycleStatus {
  configured: boolean;
  rules: Array<{
    id: string;
    prefix: string;
    expirationDays: number;
    enabled: boolean;
  }>;
  lastChecked?: string;
}

interface StorageOptimizationStatus {
  autoDeleteEnabled: boolean;
  lifecycleConfigured: boolean;
  estimatedSavings: string;
}

// 预设的生命周期规则
const PRESET_LIFECYCLE_RULES = [
  {
    id: "clips-3day-expiry",
    prefix: "jobs/",
    expirationDays: 3,
    enabled: true,
    description: "切片短视频 3 天后自动过期删除",
    detail: "匹配路径前缀 jobs/，覆盖所有切片视频和字幕文件",
  },
  {
    id: "uploads-1day-expiry",
    prefix: "uploads/",
    expirationDays: 1,
    enabled: true,
    description: "原始上传视频 1 天后自动过期删除（兜底保障）",
    detail: "匹配路径前缀 uploads/，作为自动删除逻辑的兜底保障",
  },
];

export default function R2Storage() {
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showRuleDetail, setShowRuleDetail] = useState(false);

  const fetchLifecycleStatus = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/r2/lifecycle");
      if (res.ok) {
        const data = await res.json();
        setLifecycleStatus(data);
      } else {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        // 未配置 R2 凭据时显示提示，不报错
        if (res.status === 503) {
          setLifecycleStatus({ configured: false, rules: [] });
        } else {
          toast.error(err.error || "获取生命周期状态失败");
        }
      }
    } catch {
      setLifecycleStatus({ configured: false, rules: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLifecycleStatus();
  }, []);

  const applyLifecyclePolicy = async () => {
    setApplying(true);
    try {
      const res = await adminFetch("/api/admin/r2/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: PRESET_LIFECYCLE_RULES }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "设置生命周期策略失败");
        return;
      }
      toast.success(data.message || "生命周期策略已成功应用");
      await fetchLifecycleStatus();
    } catch (err: any) {
      toast.error(err.message || "操作失败，请检查 R2 配置");
    } finally {
      setApplying(false);
    }
  };

  const optimizationStatus: StorageOptimizationStatus = {
    autoDeleteEnabled: true, // 代码层面已实现
    lifecycleConfigured: (lifecycleStatus?.rules?.length ?? 0) > 0,
    estimatedSavings: "保持在 10GB 免费额度内",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">R2 存储管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">配置 Cloudflare R2 生命周期策略，优化存储空间使用</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLifecycleStatus}
          disabled={loading}
          className="gap-1.5 h-8 text-xs"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* 存储优化状态总览 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <h2 className="text-sm font-medium text-foreground">存储优化状态</h2>
          <span className="text-xs text-muted-foreground ml-auto">目标：维持在 10GB 免费额度内</span>
        </div>
        <div className="px-4 py-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* 自动删除原始视频 */}
          <div className="flex items-start gap-3 p-3 rounded-md bg-secondary/50">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              optimizationStatus.autoDeleteEnabled ? "bg-green-400/10" : "bg-yellow-400/10"
            )}>
              <Trash2 className={cn(
                "w-4 h-4",
                optimizationStatus.autoDeleteEnabled ? "text-green-400" : "text-yellow-400"
              )} />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">切片完成后删除原始视频</div>
              <div className={cn(
                "text-xs mt-0.5 flex items-center gap-1",
                optimizationStatus.autoDeleteEnabled ? "text-green-400" : "text-yellow-400"
              )}>
                {optimizationStatus.autoDeleteEnabled
                  ? <><CheckCircle2 className="w-3 h-3" />已启用</>
                  : <><AlertCircle className="w-3 h-3" />未启用</>
                }
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                任务完成后立即调用 API 删除 R2 中的原始长视频
              </p>
            </div>
          </div>

          {/* 生命周期策略 */}
          <div className="flex items-start gap-3 p-3 rounded-md bg-secondary/50">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              optimizationStatus.lifecycleConfigured ? "bg-green-400/10" : "bg-yellow-400/10"
            )}>
              <Clock className={cn(
                "w-4 h-4",
                optimizationStatus.lifecycleConfigured ? "text-green-400" : "text-yellow-400"
              )} />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">切片视频 3 天自动过期</div>
              <div className={cn(
                "text-xs mt-0.5 flex items-center gap-1",
                optimizationStatus.lifecycleConfigured ? "text-green-400" : "text-yellow-400"
              )}>
                {loading
                  ? <><Loader2 className="w-3 h-3 animate-spin" />检查中...</>
                  : optimizationStatus.lifecycleConfigured
                    ? <><CheckCircle2 className="w-3 h-3" />已配置</>
                    : <><AlertCircle className="w-3 h-3" />未配置</>
                }
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                R2 Bucket 生命周期策略，切片文件 3 天后自动删除
              </p>
            </div>
          </div>

          {/* 预期效果 */}
          <div className="flex items-start gap-3 p-3 rounded-md bg-secondary/50">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
              <HardDrive className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">预期存储效果</div>
              <div className="text-xs mt-0.5 text-primary flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />{optimizationStatus.estimatedSavings}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                双重保障确保存储空间始终在免费额度内
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 生命周期策略配置 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-medium text-foreground">Bucket 生命周期策略</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            通过 S3 兼容 API 设置 R2 对象过期规则
          </span>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* 当前状态 */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在检查当前生命周期策略...
            </div>
          ) : lifecycleStatus?.rules && lifecycleStatus.rules.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-green-400 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>当前已配置 {lifecycleStatus.rules.length} 条生命周期规则</span>
              </div>
              {lifecycleStatus.rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-secondary/50 border border-border/50">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    rule.enabled ? "bg-green-400" : "bg-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-foreground">{rule.id}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      前缀: <code className="bg-secondary px-1 rounded">{rule.prefix || "（所有对象）"}</code>
                      &nbsp;·&nbsp;
                      {rule.expirationDays} 天后过期
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    rule.enabled
                      ? "bg-green-400/10 text-green-400"
                      : "bg-secondary text-muted-foreground"
                  )}>
                    {rule.enabled ? "启用" : "禁用"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-2 text-xs text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/20 rounded-md px-3 py-3">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                当前 R2 Bucket 尚未配置生命周期策略。建议立即应用预设策略，确保切片视频在 3 天后自动清理，避免存储超额。
              </span>
            </div>
          )}

          {/* 预设规则说明 */}
          <div className="border border-border/50 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRuleDetail(!showRuleDetail)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                查看将要应用的预设规则详情
              </span>
              {showRuleDetail
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />
              }
            </button>
            {showRuleDetail && (
              <div className="border-t border-border/50 px-3 py-3 space-y-3 bg-secondary/20">
                {PRESET_LIFECYCLE_RULES.map((rule, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-xs font-medium text-foreground">{rule.description}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-3.5">{rule.detail}</p>
                    <div className="pl-3.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>规则 ID: <code className="font-mono bg-secondary px-1 rounded">{rule.id}</code></span>
                      <span>过期天数: <code className="font-mono bg-secondary px-1 rounded">{rule.expirationDays}d</code></span>
                      <span>前缀: <code className="font-mono bg-secondary px-1 rounded">{rule.prefix}</code></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              size="sm"
              onClick={applyLifecyclePolicy}
              disabled={applying || loading}
              className="h-8 text-xs bg-primary text-primary-foreground hover:opacity-90 gap-1.5"
            >
              {applying
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />应用中...</>
                : <><Play className="w-3.5 h-3.5" />应用预设生命周期策略</>
              }
            </Button>
            <span className="text-xs text-muted-foreground">
              将覆盖 Bucket 现有的生命周期配置
            </span>
          </div>
        </div>
      </div>

      {/* 工作原理说明 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">存储优化工作原理</h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 第一道防线 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <span className="text-xs font-medium text-foreground">第一道防线：代码层自动删除</span>
              </div>
              <div className="pl-7 text-xs text-muted-foreground space-y-1.5">
                <p>当一个长视频的所有切片任务处理完成后，系统会立即调用 R2 Delete API，删除 <code className="bg-secondary px-1 rounded font-mono">uploads/</code> 路径下的原始长视频文件。</p>
                <p className="text-green-400/80">效果：原始视频在任务完成后几秒内即被删除，释放最大量存储空间。</p>
              </div>
            </div>

            {/* 第二道防线 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-400">2</span>
                </div>
                <span className="text-xs font-medium text-foreground">第二道防线：Bucket 生命周期策略</span>
              </div>
              <div className="pl-7 text-xs text-muted-foreground space-y-1.5">
                <p>R2 Bucket 级别的生命周期策略作为兜底保障：<code className="bg-secondary px-1 rounded font-mono">jobs/</code> 路径下的切片视频在 <strong className="text-foreground">3 天</strong>后自动过期，<code className="bg-secondary px-1 rounded font-mono">uploads/</code> 路径下的原始视频在 <strong className="text-foreground">1 天</strong>后兜底清理。</p>
                <p className="text-blue-400/80">效果：即使代码层删除失败，Bucket 策略也能确保文件最终被清理。</p>
              </div>
            </div>
          </div>

          <div className="bg-secondary/50 rounded-md px-3 py-2.5 text-xs text-muted-foreground">
            <strong className="text-foreground">注意：</strong>
            生命周期策略需要在 <strong className="text-foreground">API 配置</strong> 页面正确设置 S3_ENDPOINT、S3_ACCESS_KEY、S3_SECRET_KEY、S3_BUCKET 后才能生效。
            Cloudflare R2 的 S3 兼容 API Endpoint 格式为：
            <code className="font-mono bg-secondary px-1 rounded ml-1">https://&lt;accountId&gt;.r2.cloudflarestorage.com</code>
          </div>
        </div>
      </div>
    </div>
  );
}
