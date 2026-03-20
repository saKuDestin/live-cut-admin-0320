/*
 * Users - 用户管理页
 * Design: 极简主义企业后台 - 表格 + 内联操作 + 弹窗编辑
 */
import { useEffect, useState } from "react";
import {
  Plus, Search, Edit2, Trash2, RefreshCw, Shield, User, X, Eye, EyeOff
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
  role: string; loginMethod?: string; createdAt: string;
  lastSignedIn: string; jobCount: number;
}

function formatDate(d: string) {
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

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">用户管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">管理平台用户账号与权限</p>
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
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">任务数</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">注册时间</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">最后登录</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-xs">加载中...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-xs">
                  {search ? "未找到匹配用户" : "暂无用户"}
                </td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">{(u.name || u.username)?.slice(0, 1)?.toUpperCase()}</span>
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
                      <span className="status-badge text-yellow-400 bg-yellow-400/10 gap-1">
                        <Shield className="w-3 h-3" /> 管理员
                      </span>
                    ) : (
                      <span className="status-badge text-blue-400 bg-blue-400/10 gap-1">
                        <User className="w-3 h-3" /> 普通用户
                      </span>
                    )}
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
        <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
          共 {filtered.length} 个用户{search && ` (筛选自 ${users.length} 个)`}
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
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">邮箱</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="user@example.com" className="h-8 text-sm bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">角色权限</Label>
              <Select value={formData.role} onValueChange={v => setFormData(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-8 text-sm bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="h-8 text-xs">取消</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving} className="h-8 text-xs bg-primary text-primary-foreground hover:opacity-90">
              {saving ? "创建中..." : "创建用户"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户弹窗 */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">编辑用户 <span className="text-muted-foreground font-mono">@{editUser?.username}</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">显示名称</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="显示名称" className="h-8 text-sm bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">邮箱</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="user@example.com" className="h-8 text-sm bg-background" />
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
              <Label className="text-xs text-muted-foreground">角色权限</Label>
              <Select value={formData.role} onValueChange={v => setFormData(p => ({ ...p, role: v }))}>
                <SelectTrigger className="h-8 text-sm bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditUser(null)} className="h-8 text-xs">取消</Button>
            <Button size="sm" onClick={handleEdit} disabled={saving} className="h-8 text-xs bg-primary text-primary-foreground hover:opacity-90">
              {saving ? "保存中..." : "保存更改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">确认删除用户？</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              将永久删除用户 <span className="text-foreground font-mono">@{deleteUser?.username}</span>，此操作不可撤销。
              该用户的所有任务数据将保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-8 text-xs bg-destructive text-destructive-foreground hover:opacity-90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
