import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 先保存关键的启动时参数，避免被 dotenv 覆盖
const STARTUP_ADMIN_PORT = process.env.ADMIN_PORT || "3002";

// 加载主项目的 .env 文件（不使用 override，只补充未设置的变量）
const MAIN_PROJECT_ENV = path.resolve(__dirname, "../../live-cut-test1/.env");
const envResult = dotenv.config({ path: MAIN_PROJECT_ENV });
if (envResult.error) {
  dotenv.config({ path: path.resolve(process.cwd(), "../live-cut-test1/.env") });
}

const ADMIN_JWT_SECRET = process.env.JWT_SECRET || "admin-secret-key-2024";

// 解析数据库连接 URL
function parseDbUrl(url: string) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error("Invalid DATABASE_URL: " + url);
  return { user: match[1], password: match[2], host: match[3], port: parseInt(match[4]), database: match[5] };
}

// 从 .env 文件中直接读取数据库配置，避免被系统环境变量干扰
function getDbUrlFromEnvFile(): string {
  try {
    const envPath = path.resolve(__dirname, "../../live-cut-test1/.env");
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  return "mysql://appuser:apppass123@localhost:3306/livestream_clipper";
}

let pool: mysql.Pool;
function getPool() {
  if (!pool) {
    const dbUrl = getDbUrlFromEnvFile();
    const cfg = parseDbUrl(dbUrl);
    pool = mysql.createPool({ ...cfg, waitForConnections: true, connectionLimit: 10 });
  }
  return pool;
}

// JWT 认证中间件
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies?.admin_token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "未授权" }); return; }
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as { userId: number; role: string };
    if (payload.role !== "admin") { res.status(403).json({ error: "权限不足" }); return; }
    (req as any).adminUser = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token 无效或已过期" });
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 简单 cookie 解析
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || "";
    req.cookies = Object.fromEntries(cookieHeader.split(";").map(c => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    }));
    next();
  });

  // ==================== 认证接口 ====================

  // 管理员登录
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body as { username: string; password: string };
      if (!username || !password) { res.status(400).json({ error: "请输入用户名和密码" }); return; }
      const db = getPool();
      const [rows] = await db.execute<mysql.RowDataPacket[]>(
        "SELECT id, username, name, role, passwordHash FROM users WHERE username = ? AND role = 'admin'",
        [username.trim()]
      );
      const user = rows[0];
      if (!user || !user.passwordHash) { res.status(401).json({ error: "用户名或密码错误" }); return; }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) { res.status(401).json({ error: "用户名或密码错误" }); return; }
      const token = jwt.sign({ userId: user.id, role: user.role, name: user.name }, ADMIN_JWT_SECRET, { expiresIn: "7d" });
      res.cookie("admin_token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "lax" });
      res.json({ success: true, token, user: { id: user.id, name: user.name, username: user.username, role: user.role } });
    } catch (err) {
      console.error("[Admin Login]", err);
      res.status(500).json({ error: "登录失败" });
    }
  });

  // 登出
  app.post("/api/admin/logout", (_req, res) => {
    res.clearCookie("admin_token");
    res.json({ success: true });
  });

  // 获取当前管理员信息
  app.get("/api/admin/me", authMiddleware, async (req, res) => {
    const { userId } = (req as any).adminUser;
    const db = getPool();
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      "SELECT id, username, name, role, email, createdAt FROM users WHERE id = ?", [userId]
    );
    res.json(rows[0] || null);
  });

  // ==================== 用户管理接口 ====================

  // 获取所有用户列表
  app.get("/api/admin/users", authMiddleware, async (_req, res) => {
    try {
      const db = getPool();
      const [rows] = await db.execute<mysql.RowDataPacket[]>(
        `SELECT u.id, u.username, u.name, u.email, u.role, u.loginMethod, u.isActive, u.createdAt, u.lastSignedIn,
          (SELECT COUNT(*) FROM jobs j WHERE j.userId = u.id) as jobCount
         FROM users u ORDER BY u.createdAt DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error("[Users List]", err);
      res.status(500).json({ error: "获取用户列表失败" });
    }
  });

  // 创建新用户
  app.post("/api/admin/users", authMiddleware, async (req, res) => {
    try {
      const { username, password, name, email, role } = req.body as {
        username: string; password: string; name?: string; email?: string; role?: string;
      };
      if (!username || !password) { res.status(400).json({ error: "用户名和密码为必填项" }); return; }
      if (password.length < 6) { res.status(400).json({ error: "密码至少 6 位" }); return; }
      const db = getPool();
      // 检查用户名是否已存在
      const [existing] = await db.execute<mysql.RowDataPacket[]>(
        "SELECT id FROM users WHERE username = ?", [username.trim()]
      );
      if ((existing as any[]).length > 0) { res.status(409).json({ error: "用户名已存在" }); return; }
      const passwordHash = await bcrypt.hash(password, 12);
      const openId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await db.execute(
        `INSERT INTO users (openId, username, passwordHash, name, email, role, loginMethod, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, ?, ?, 'local', NOW(), NOW(), NOW())`,
        [openId, username.trim(), passwordHash, name || username, email || null, role || "user"]
      );
      const [newUser] = await db.execute<mysql.RowDataPacket[]>(
        "SELECT id, username, name, email, role, createdAt FROM users WHERE username = ?", [username.trim()]
      );
      res.status(201).json(newUser[0]);
    } catch (err) {
      console.error("[Create User]", err);
      res.status(500).json({ error: "创建用户失败" });
    }
  });

  // 更新用户信息
  app.put("/api/admin/users/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, role, password } = req.body as {
        name?: string; email?: string; role?: string; password?: string;
      };
      const db = getPool();
      const updates: string[] = [];
      const values: any[] = [];
      if (name !== undefined) { updates.push("name = ?"); values.push(name); }
      if (email !== undefined) { updates.push("email = ?"); values.push(email || null); }
      if (role !== undefined) { updates.push("role = ?"); values.push(role); }
      if ((req.body as any).isActive !== undefined) { updates.push("isActive = ?"); values.push((req.body as any).isActive ? 1 : 0); }
      if (password) {
        if (password.length < 6) { res.status(400).json({ error: "密码至少 6 位" }); return; }
        const hash = await bcrypt.hash(password, 12);
        updates.push("passwordHash = ?"); values.push(hash);
      }
      if (updates.length === 0) { res.status(400).json({ error: "无更新内容" }); return; }
      updates.push("updatedAt = NOW()");
      values.push(parseInt(id));
      await db.execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
      const [updated] = await db.execute<mysql.RowDataPacket[]>(
        "SELECT id, username, name, email, role, createdAt, lastSignedIn FROM users WHERE id = ?", [parseInt(id)]
      );
      res.json(updated[0]);
    } catch (err) {
      console.error("[Update User]", err);
      res.status(500).json({ error: "更新用户失败" });
    }
  });

  // 切换用户启用/禁用状态
  app.patch("/api/admin/users/:id/toggle-active", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = (req as any).adminUser;
      if (parseInt(id) === userId) { res.status(400).json({ error: "不能禁用当前登录的管理员账号" }); return; }
      const db = getPool();
      const [rows] = await db.execute<mysql.RowDataPacket[]>("SELECT id, isActive FROM users WHERE id = ?", [parseInt(id)]);
      if ((rows as any[]).length === 0) { res.status(404).json({ error: "用户不存在" }); return; }
      const current = (rows as any[])[0].isActive;
      const newStatus = current ? 0 : 1;
      await db.execute("UPDATE users SET isActive = ?, updatedAt = NOW() WHERE id = ?", [newStatus, parseInt(id)]);
      res.json({ success: true, isActive: newStatus === 1 });
    } catch (err) {
      console.error("[Toggle Active]", err);
      res.status(500).json({ error: "操作失败" });
    }
  });

  // 删除用户
  app.delete("/api/admin/users/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = (req as any).adminUser;
      if (parseInt(id) === userId) { res.status(400).json({ error: "不能删除当前登录的管理员账号" }); return; }
      const db = getPool();
      await db.execute("DELETE FROM users WHERE id = ?", [parseInt(id)]);
      res.json({ success: true });
    } catch (err) {
      console.error("[Delete User]", err);
      res.status(500).json({ error: "删除用户失败" });
    }
  });

  // ==================== 统计数据接口 ====================

  app.get("/api/admin/stats", authMiddleware, async (_req, res) => {
    try {
      const db = getPool();
      const [[userCount]] = await db.execute<mysql.RowDataPacket[]>("SELECT COUNT(*) as count FROM users");
      const [[jobCount]] = await db.execute<mysql.RowDataPacket[]>("SELECT COUNT(*) as count FROM jobs");
      const [[activeJobs]] = await db.execute<mysql.RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM jobs WHERE status IN ('transcribing','analyzing','clipping','deduplicating','generating_copy')"
      );
      const [[clipCount]] = await db.execute<mysql.RowDataPacket[]>("SELECT COUNT(*) as count FROM clips WHERE status = 'completed'");
      const [recentJobs] = await db.execute<mysql.RowDataPacket[]>(
        `SELECT j.id, j.title, j.status, j.progress, j.createdAt, u.name as userName, u.username
         FROM jobs j LEFT JOIN users u ON j.userId = u.id
         ORDER BY j.createdAt DESC LIMIT 10`
      );
      res.json({
        userCount: (userCount as any).count,
        jobCount: (jobCount as any).count,
        activeJobs: (activeJobs as any).count,
        clipCount: (clipCount as any).count,
        recentJobs,
      });
    } catch (err) {
      console.error("[Stats]", err);
      res.status(500).json({ error: "获取统计数据失败" });
    }
  });

  // ==================== API 配置接口 ====================

  // 读取当前 API 配置（脱敏）
  app.get("/api/admin/api-config", authMiddleware, (_req, res) => {
    const envPath = MAIN_PROJECT_ENV;
    let config: Record<string, string> = {};
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach(line => {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match) config[match[1]] = match[2];
      });
    }
    // 脱敏处理
    const masked = (val: string) => val ? val.slice(0, 4) + "****" + val.slice(-4) : "";
    res.json({
      DEEPSEEK_API_KEY: config.DEEPSEEK_API_KEY ? masked(config.DEEPSEEK_API_KEY) : "",
      DEEPSEEK_API_KEY_SET: !!config.DEEPSEEK_API_KEY && config.DEEPSEEK_API_KEY !== "preview-key",
      DATABASE_URL: config.DATABASE_URL ? config.DATABASE_URL.replace(/:([^@]+)@/, ":****@") : "",
      S3_BUCKET: config.S3_BUCKET || "",
      S3_REGION: config.S3_REGION || "",
      S3_ACCESS_KEY: config.S3_ACCESS_KEY ? masked(config.S3_ACCESS_KEY) : "",
      S3_ACCESS_KEY_SET: !!config.S3_ACCESS_KEY,
      S3_SECRET_KEY: config.S3_SECRET_KEY ? masked(config.S3_SECRET_KEY) : "",
      S3_SECRET_KEY_SET: !!config.S3_SECRET_KEY,
      S3_ENDPOINT: config.S3_ENDPOINT || "",
    });
  });

  // 更新 API 配置
  app.post("/api/admin/api-config", authMiddleware, async (req, res) => {
    try {
      const { key, value } = req.body as { key: string; value: string };
      const ALLOWED_KEYS = ["DEEPSEEK_API_KEY", "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_ENDPOINT"];
      if (!ALLOWED_KEYS.includes(key)) { res.status(400).json({ error: "不允许修改该配置项" }); return; }
      const envPath = MAIN_PROJECT_ENV;
      let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      const lines = content.split("\n");
      const idx = lines.findIndex(l => l.startsWith(`${key}=`));
      if (idx >= 0) {
        lines[idx] = `${key}=${value}`;
      } else {
        lines.push(`${key}=${value}`);
      }
      fs.writeFileSync(envPath, lines.join("\n"));
      res.json({ success: true, message: `${key} 已更新，重启主服务后生效` });
    } catch (err) {
      console.error("[API Config]", err);
      res.status(500).json({ error: "更新配置失败" });
    }
  });

  // ==================== 静态文件服务 ====================

  const staticPath = process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = STARTUP_ADMIN_PORT;
  server.listen(port, () => {
    console.log(`[Admin] Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
