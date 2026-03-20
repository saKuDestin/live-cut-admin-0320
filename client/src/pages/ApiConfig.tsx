/*
 * ApiConfig - AI 大模型 API 配置页
 * Design: 极简主义企业后台 - 分组配置卡片，内联编辑
 */
import { useEffect, useState } from "react";
import { Key, Database, Cloud, Save, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/adminApi";

interface ApiConfigData {
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_API_KEY_SET: boolean;
  GROQ_API_KEY: string;
  GROQ_API_KEY_SET: boolean;
  DATABASE_URL: string;
  S3_BUCKET: string;
  S3_REGION: string;
  S3_ACCESS_KEY: string;
  S3_ACCESS_KEY_SET: boolean;
  S3_SECRET_KEY: string;
  S3_SECRET_KEY_SET: boolean;
  S3_ENDPOINT: string;
}

function ConfigField({
  label, configKey, value, placeholder, type = "text", isSet, hint,
  onSave,
}: {
  label: string; configKey: string; value: string; placeholder?: string;
  type?: string; isSet?: boolean; hint?: string;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [showVal, setShowVal] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = () => { setInputVal(""); setEditing(true); setShowVal(false); };
  const cancel = () => { setEditing(false); setInputVal(""); };

  const save = async () => {
    if (!inputVal.trim()) { toast.error("请输入有效值"); return; }
    setSaving(true);
    try {
      await onSave(configKey, inputVal.trim());
      setEditing(false);
      setInputVal("");
    } finally { setSaving(false); }
  };

  const isSensitive = type === "password";

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Label className="text-xs font-medium text-foreground">{label}</Label>
            {isSet !== undefined && (
              isSet
                ? <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="w-3 h-3" />已配置</span>
                : <span className="flex items-center gap-1 text-xs text-yellow-400"><AlertCircle className="w-3 h-3" />未配置</span>
            )}
          </div>
          {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
          {!editing ? (
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded truncate max-w-xs">
                {value || <span className="italic opacity-50">未设置</span>}
              </code>
              <Button variant="outline" size="sm" onClick={startEdit} className="h-6 text-xs px-2">
                {isSet ? "修改" : "设置"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <Input
                  type={isSensitive && !showVal ? "password" : "text"}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder={placeholder || `输入 ${label}`}
                  className="h-7 text-xs bg-background pr-8"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
                />
                {isSensitive && (
                  <button type="button" onClick={() => setShowVal(!showVal)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showVal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                )}
              </div>
              <Button size="sm" onClick={save} disabled={saving} className="h-7 text-xs px-2 bg-primary text-primary-foreground hover:opacity-90">
                <Save className="w-3 h-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={cancel} className="h-7 text-xs px-2">取消</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ApiConfig() {
  const [config, setConfig] = useState<ApiConfigData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/api-config");
      if (res.ok) setConfig(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async (key: string, value: string) => {
    const res = await adminFetch("/api/admin/api-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "保存失败"); throw new Error(data.error); }
    toast.success(data.message || "配置已保存");
    fetchConfig();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">API 配置</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理功能网站的 AI 模型和存储服务配置</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading} className="gap-1.5 h-8 text-xs">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      {/* 提示 */}
      <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-4 py-3 text-xs text-yellow-400/80 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>修改配置后需要重启功能网站服务才能生效。API Key 将以加密形式显示，实际值不会在界面中明文展示。</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">加载中...</div>
      ) : (
        <>
          {/* DeepSeek AI 配置 */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">DeepSeek AI 配置</h2>
              <span className="text-xs text-muted-foreground ml-auto">用于视频分析和文案生成</span>
            </div>
            <div className="px-4">
              <ConfigField
                label="DEEPSEEK_API_KEY"
                configKey="DEEPSEEK_API_KEY"
                value={config?.DEEPSEEK_API_KEY || ""}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                type="password"
                isSet={config?.DEEPSEEK_API_KEY_SET}
                hint="DeepSeek API 密钥，用于 LLM 产品分段和爆款文案生成。获取地址：platform.deepseek.com"
                onSave={handleSave}
              />
            </div>
          </div>

          {/* Groq 语音转录配置 */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Mic className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-medium text-foreground">Groq 语音转录配置</h2>
              <span className="text-xs text-muted-foreground ml-auto">用于视频音频转录（Whisper-large-v3）</span>
            </div>
            <div className="px-4">
              <ConfigField
                label="GROQ_API_KEY"
                configKey="GROQ_API_KEY"
                value={config?.GROQ_API_KEY || ""}
                placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
                type="password"
                isSet={config?.GROQ_API_KEY_SET}
                hint="Groq Cloud API 密钥，用于 Whisper-large-v3 语音转录，支持长音频自动分片。获取地址：console.groq.com/keys"
                onSave={handleSave}
              />
            </div>
          </div>

          {/* S3 对象存储配置 */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-medium text-foreground">S3 对象存储配置</h2>
              <span className="text-xs text-muted-foreground ml-auto">用于视频文件存储</span>
            </div>
            <div className="px-4">
              <ConfigField
                label="S3_BUCKET"
                configKey="S3_BUCKET"
                value={config?.S3_BUCKET || ""}
                placeholder="my-livestream-bucket"
                hint="S3 存储桶名称"
                onSave={handleSave}
              />
              <ConfigField
                label="S3_REGION"
                configKey="S3_REGION"
                value={config?.S3_REGION || ""}
                placeholder="ap-southeast-1"
                hint="存储桶所在区域，如 ap-southeast-1（新加坡）"
                onSave={handleSave}
              />
              <ConfigField
                label="S3_ENDPOINT"
                configKey="S3_ENDPOINT"
                value={config?.S3_ENDPOINT || ""}
                placeholder="https://s3.ap-southeast-1.amazonaws.com"
                hint="S3 兼容服务的 Endpoint（使用 AWS 可留空）"
                onSave={handleSave}
              />
              <ConfigField
                label="S3_ACCESS_KEY"
                configKey="S3_ACCESS_KEY"
                value={config?.S3_ACCESS_KEY || ""}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                type="password"
                isSet={config?.S3_ACCESS_KEY_SET}
                hint="S3 访问密钥 ID"
                onSave={handleSave}
              />
              <ConfigField
                label="S3_SECRET_KEY"
                configKey="S3_SECRET_KEY"
                value={config?.S3_SECRET_KEY || ""}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                type="password"
                isSet={config?.S3_SECRET_KEY_SET}
                hint="S3 访问密钥 Secret"
                onSave={handleSave}
              />
            </div>
          </div>

          {/* 数据库配置（只读） */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-medium text-foreground">数据库连接</h2>
              <span className="text-xs text-muted-foreground ml-auto">只读，请直接修改 .env 文件</span>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <code className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded truncate">
                  {config?.DATABASE_URL || "未配置"}
                </code>
              </div>
              <p className="text-xs text-muted-foreground mt-2">当前后台管理系统与功能网站共享同一数据库实例。</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
