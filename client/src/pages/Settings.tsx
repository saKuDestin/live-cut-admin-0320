/*
 * Settings - 系统设置页
 * Design: 极简主义企业后台 - 个人信息修改、安全设置
 */
import { useState } from "react";
import { User, Lock, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { adminFetch } from "@/lib/adminApi";

export default function Settings() {
  const { user, refresh } = useAdminAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await adminFetch(`/api/admin/users/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "保存失败"); return; }
      toast.success("个人信息已更新");
      refresh();
    } finally { setSavingProfile(false); }
  };

  const savePassword = async () => {
    if (!newPwd) { toast.error("请输入新密码"); return; }
    if (newPwd.length < 6) { toast.error("密码至少 6 位"); return; }
    if (newPwd !== confirmPwd) { toast.error("两次密码不一致"); return; }
    setSavingPwd(true);
    try {
      const res = await adminFetch(`/api/admin/users/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "修改失败"); return; }
      toast.success("密码已修改");
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
    } finally { setSavingPwd(false); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-lg font-semibold text-foreground">系统设置</h1>
        <p className="text-sm text-muted-foreground mt-0.5">管理您的账号信息和安全设置</p>
      </div>

      {/* 个人信息 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">个人信息</h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">用户名（不可修改）</Label>
            <Input value={user?.username || ""} disabled className="h-8 text-sm bg-secondary opacity-60 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">显示名称</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="您的姓名" className="h-8 text-sm bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">邮箱地址</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" className="h-8 text-sm bg-background" />
          </div>
          <Button size="sm" onClick={saveProfile} disabled={savingProfile} className="h-8 text-xs bg-primary text-primary-foreground hover:opacity-90 gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {savingProfile ? "保存中..." : "保存信息"}
          </Button>
        </div>
      </div>

      {/* 修改密码 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Lock className="w-4 h-4 text-yellow-400" />
          <h2 className="text-sm font-medium text-foreground">修改密码</h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">新密码（至少 6 位）</Label>
            <div className="relative">
              <Input type={showNew ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="输入新密码" className="h-8 text-sm bg-background pr-8" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">确认新密码</Label>
            <div className="relative">
              <Input type={showOld ? "text" : "password"} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="再次输入新密码" className="h-8 text-sm bg-background pr-8" />
              <button type="button" onClick={() => setShowOld(!showOld)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <Button size="sm" onClick={savePassword} disabled={savingPwd} className="h-8 text-xs bg-primary text-primary-foreground hover:opacity-90 gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            {savingPwd ? "修改中..." : "修改密码"}
          </Button>
        </div>
      </div>
    </div>
  );
}
