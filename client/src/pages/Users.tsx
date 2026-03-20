/*
 * Users - 用户管理页
 * Design: 极简主义企业后台 - 表格 + 内联操作 + 弹窗编辑 + 启用/禁用切换
 */
import { useEffect, useState } from "react";
import {
  Plus, Search, Edit2, Trash2, RefreshCw, Shield, User, X, Eye, EyeOff,
  ToggleLeft, ToggleRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserRow {
  id: number; username: string; name: string; email?: string;
  role: string; loginMethod?: string; isActive: number;
  createdAt: string; lastSignedIn: string; jobCount: number;
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

interface UserFormData {
  username: string; password: string; name: string; email: string; role: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ username: "", password: "", name: "", email: "", role: "user" });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (res.ok) setUsers(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setFormData({ username: "", password: "", name: "", email: "", role: "user" });
    setShowPwd(false);
    setShowCreate(true);
  };

  const openEdit = (u: UserRow) => {
    setFormData({ username: u.username, password: "", name: u.name || "", email: u.email || "", role: u.role });
    setShowPwd(false);
    setEditUser(u);
  };

  const handleCreate = async () => {
    if (!formData.username || !formData.password) { toast.error("用户名和密码为必填项"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "创建失败"); return; }
      toast.success(`用户 @${formData.username} 创建成功`);
      setShowCreate(false);
      fetchUsers();
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const payload: any = { name: formData.name, email: formData.email, role: formData.role };
      if (formData.password) payload.password = formData.password;
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "更新失败"); return; }
      toast.success("用户信息已更新");
      setEditUser(null);
      fetchUsers();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE", credentials: "include" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "删除失败"); return; }
    toast.success(`用户 @${deleteUser.username} 已删除`);
    setDeleteUser(null);
    fetchUsers();
  };

  const handleToggleActive = async (u: UserRow) => {
    setTogglingId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/toggle-active`, {
        method: "PATCH", credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "操作失败"); return; }
      const newStatus = data.isActive;
      toast.success(`用户 @${u.username} 已${newStatus ? "启用" : "禁用"}`);
      setUsers(prev => prev.map(item =>
        item.id === u.id ? { ...item, isActive: newStatus ? 1 : 0 } : item
      ));
    } finally { setTogglingId(null); }
  };

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理平台用户账号与权限，后台创建的账号可直接在前台登录使用</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-1.5 h-8 text-xs">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="w-3.5 h-3.5" />
            新建用户
          </Button>
        </div>
      </div>

      {/* 提示横幅 */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
        <Shield className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
        <span>
          在此创建的用户账号可直接在 <strong className="text-foreground">前台功能网站</strong> 使用用户名和密码登录。
          禁用账号后，该用户将无法登录前台，但历史数据保留。
        </span>
      </div>

      {/* 搜索栏 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="搜索用户名、姓名或邮箱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm bg-background"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 用户表格 */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">用户</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">邮箱</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">角色</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">状态</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">任务数</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">注册时间</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">最后登录</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs">加载中...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs">
                  {search ? "未找到匹配用户" : "暂无用户"}
                </td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className={cn(
                  "border-b border-border/50 hover:bg-accent/30 transition-colors",
                  !u.isActive && "opacity-60"
                )}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                        u.isActive ? "bg-primary/10" : "bg-muted"
                      )}>
                        <span className={cn(
                          "text-xs font-medium",
                          u.isActive ? "text-primary" : "text-muted-foreground"
                        )}>{(u.name || u.username)?.slice(0, 1)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-xs">{u.name || u.username}</div>
                        <div className="text-xs text-muted-foreground font-mono">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-4 py-3">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-yellow-400 bg-yellow-400/10">
                        <Shield className="w-3 h-3" /> 管理员
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-blue-400 bg-blue-400/10">
                        <User className="w-3 h-3" /> 普通用户
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={togglingId === u.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-all",
                        u.isActive
                          ? "text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20"
                          : "text-red-400 bg-red-400/10 hover:bg-red-400/20",
                        togglingId === u.id && "opacity-50 cursor-not-allowed"
                      )}
                      title={u.isActive ? "点击禁用此用户" : "点击启用此用户"}
                    >
                      {u.isActive ? (
                        <><ToggleRight className="w-3.5 h-3.5" /> 已启用</>
                      ) : (
                        <><ToggleLeft className="w-3.5 h-3.5" /> 已禁用</>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.jobCount}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(u.lastSignedIn)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(u)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteUser(u)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>共 {filtered.length} 个用户{search && ` (筛选自 ${users.length} 个)`}</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400">
              <ToggleRight className="w-3 h-3" />
              {users.filter(u => u.isActive).length} 已启用
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <ToggleLeft className="w-3 h-3" />
              {users.filter(u => !u.isActive).length} 已禁用
            </span>
          </span>
        </div>
      </div>

      {/* 创建用户弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">新建用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">用户名 *</Label>
                <Input value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                  placeholder="login_name" className="h-8 text-sm bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">显示名称</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="张三" className="h-8 text-sm bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">密码 *（至少 6 位）</Label>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  placeholder="设置登录密码" className="h-8 text-sm bg-background pr-8" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">邮箱</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="user@example.com" className="h-8 text-sm bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">角色</Label>
                <Select value={formData.role} onValueChange={v => setFormData(p => ({ ...p, role: v }))}>
                  <SelectTrigger className="h-8 text-sm bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">普通用户</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              创建后，用户可在前台使用此用户名和密码登录。
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowCreate(false)}>取消</Button>
            <Button size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:opacity-90" onClick={handleCreate} disabled={saving}>
              {saving ? "创建中..." : "创建用户"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户弹窗 */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">编辑用户 — @{editUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">显示名称</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="张三" className="h-8 text-sm bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">邮箱</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="user@example.com" className="h-8 text-sm bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">新密码（留空则不修改）</Label>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  placeholder="输入新密码" className="h-8 text-sm bg-background pr-8" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">角色</Label>
              <Select value={formData.role} onValueChange={v => setFormData(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-8 text-sm bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditUser(null)}>取消</Button>
            <Button size="sm" className="h-8 text-xs bg-primary text-primary-foreground hover:opacity-90" onClick={handleEdit} disabled={saving}>
              {saving ? "保存中..." : "保存更改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteUser} onOpenChange={v => !v && setDeleteUser(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">确认删除用户</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              将永久删除用户 <strong className="text-foreground">@{deleteUser?.username}</strong> 及其所有关联数据，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-8 text-xs">取消</AlertDialogCancel>
            <AlertDialogAction className="h-8 text-xs bg-destructive text-destructive-foreground hover:opacity-90" onClick={handleDelete}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
