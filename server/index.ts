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
// Render 等平台通过 PORT 环境变量动态分配端口，必须优先读取
const STARTUP_ADMIN_PORT = process.env.PORT || process.env.ADMIN_PORT || "3002";

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

// 单域名方案：管理後台挂载在 seealso.online/admin 下，同源请求无需 CORS
// 保留此列表以支持未来扩展（如本地开发、预览环境等）
const ADMIN_ALLOWED_ORIGINS = [
  "https://seealso.online",
  "https://www.seealso.online",
  ...(process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean),
];

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ===== CORS 跨域配置 =====
  // 允许 www.seealso.online（前端用户界面）和 www.seealso.me（管理后台）跨域访问
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [...new Set(ADMIN_ALLOWED_ORIGINS)];

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Cookie"
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      res.setHeader("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  // 简单 cookie 解析
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || "";
    req.cookies = Object.fromEntries(cookieHeader.split(";").map(c => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    }));
    next();
  });

  // ==================== 静态文件服务（双路径分发）====================
  //
  // 路由策略：
  //   /          → dist/client  （前台客户端）
  //   /admin     → dist/admin   （后台管理端）
  //   /api/admin → API 路由（不走静态文件）
  //
  // 路径探测辅助函数：优先用 process.cwd()，兜底用 __dirname
  function resolveDistPath(subDir: string): string {
    const candidates = [
      path.join(process.cwd(), "dist", subDir),          // 最可靠：cwd 始终是项目根
      path.join(__dirname, subDir),                       // esbuild 打包后：__dirname=dist
      path.join(__dirname, "..", "dist", subDir),        // tsx 运行：__dirname=server
      path.join(__dirname, "..", "..", "dist", subDir), // 其他层级尝试
    ];
    return candidates.find(p => fs.existsSync(p)) || candidates[0];
  }

  const adminStaticPath = resolveDistPath("admin");
  const clientStaticPath = resolveDistPath("client");

  // 输出完整绝对路径，方便 Render 日志排查
  console.log(`[DEBUG] ====== 静态文件服务启动（双路径分发）======`);
  console.log(`[DEBUG] NODE_ENV          = ${process.env.NODE_ENV}`);
  console.log(`[DEBUG] __dirname         = ${__dirname}`);
  console.log(`[DEBUG] process.cwd()     = ${process.cwd()}`);
  console.log(`[DEBUG] adminStaticPath   = ${adminStaticPath}  exists=${fs.existsSync(adminStaticPath)}`);
  console.log(`[DEBUG] clientStaticPath  = ${clientStaticPath}  exists=${fs.existsSync(clientStaticPath)}`);

  if (!fs.existsSync(adminStaticPath)) {
    console.error(`[DEBUG] ❌ Admin build NOT found: ${adminStaticPath}`);
    console.error(`[DEBUG]    → Build Command 应为: pnpm install && pnpm build`);
  } else {
    console.log(`[DEBUG] ✅ Admin static: ${adminStaticPath}`);
  }
  if (!fs.existsSync(clientStaticPath)) {
    console.error(`[DEBUG] ❌ Client build NOT found: ${clientStaticPath}`);
  } else {
    console.log(`[DEBUG] ✅ Client static: ${clientStaticPath}`);
  }

  // 后台管理端静态资源：/admin/assets/* 等
  // 必须在 API 路由之前注册，防止被全捕获路由拦截
  app.use("/admin", express.static(adminStaticPath, { maxAge: "1d" }));

  // 前台客户端静态资源：/assets/* 等（根路径下）
  app.use("/", express.static(clientStaticPath, { maxAge: "1d" }));

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
      // 跨域部署时，sameSite 必须为 "none" 并配合 secure: true，才能在跨域请求中携带 cookie
      const isSecure = req.protocol === "https" ||
        (Array.isArray(req.headers["x-forwarded-proto"])
          ? req.headers["x-forwarded-proto"][0]
          : req.headers["x-forwarded-proto"]) === "https";
      res.cookie("admin_token", token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: isSecure ? "none" : "lax",
        secure: isSecure,
      });
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
      GROQ_API_KEY: config.GROQ_API_KEY ? masked(config.GROQ_API_KEY) : "",
      GROQ_API_KEY_SET: !!config.GROQ_API_KEY,
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
      const ALLOWED_KEYS = ["DEEPSEEK_API_KEY", "GROQ_API_KEY", "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_ENDPOINT"];
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

  // ==================== R2 存储生命周期策略接口 ====================

  // 读取 .env 中的 R2/S3 配置
  function getR2ConfigFromEnv(): Record<string, string> {
    const envPath = MAIN_PROJECT_ENV;
    const config: Record<string, string> = {};
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      content.split("\n").forEach(line => {
        const match = line.match(/^([A-Z_]+)=(.*)$/);
        if (match) config[match[1]] = match[2];
      });
    }
    return config;
  }

  // 辅助：XML 转义
  function escapeXml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }

  // 辅助：解析生命周期 XML
  function parseLifecycleXml(xml: string): Array<{ id: string; prefix: string; expirationDays: number; enabled: boolean }> {
    const rules: Array<{ id: string; prefix: string; expirationDays: number; enabled: boolean }> = [];
    const ruleMatches = [...xml.matchAll(/<Rule>([\s\S]*?)<\/Rule>/g)];
    for (const match of ruleMatches) {
      const ruleXml = match[1];
      const id = ruleXml.match(/<ID>(.*?)<\/ID>/)?.[1] || "";
      const status = ruleXml.match(/<Status>(.*?)<\/Status>/)?.[1] || "Disabled";
      const prefix = ruleXml.match(/<Prefix>(.*?)<\/Prefix>/)?.[1] || "";
      const days = parseInt(ruleXml.match(/<Days>(\d+)<\/Days>/)?.[1] || "0");
      rules.push({ id, prefix, expirationDays: days, enabled: status === "Enabled" });
    }
    return rules;
  }

  // 辅助：AWS Signature V4 签名（用于 R2/S3 API）
  async function signR2Request(params: {
    method: string; endpoint: string; bucket: string; path: string;
    body: string; accessKey: string; secretKey: string; contentType: string;
    region: string;
  }): Promise<Record<string, string>> {
    const { createHmac, createHash } = await import("crypto");
    const { method, endpoint, bucket, path: reqPath, body, accessKey, secretKey, contentType, region } = params;
    const endpointUrl = new URL(endpoint);
    const host = endpointUrl.hostname;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.(\d{3})/g, (m) => m === "." + m.slice(1) ? "" : "").replace(/[:-]/g, "").slice(0, 15) + "Z";
    const isoNow = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const amzDateFmt = isoNow.slice(0, 8) + "T" + isoNow.slice(8, 14) + "Z";
    const dateStamp = isoNow.slice(0, 8);
    const bodyHash = createHash("sha256").update(body).digest("hex");
    const canonicalUri = `/${bucket}${reqPath.split("?")[0]}`;
    const canonicalQueryString = reqPath.includes("?") ? reqPath.split("?")[1] : "";
    const headerMap: Record<string, string> = { "host": host, "x-amz-date": amzDateFmt, "x-amz-content-sha256": bodyHash };
    if (contentType) headerMap["content-type"] = contentType;
    const sortedKeys = Object.keys(headerMap).sort();
    const canonicalHeaders = sortedKeys.map(k => `${k}:${headerMap[k]}\n`).join("");
    const signedHeadersStr = sortedKeys.join(";");
    const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeadersStr, bodyHash].join("\n");
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDateFmt, credentialScope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
    const kDate = createHmac("sha256", "AWS4" + secretKey).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;
    return { ...headerMap, "Authorization": authHeader };
  }

  // GET /api/admin/r2/lifecycle - 获取当前生命周期策略
  app.get("/api/admin/r2/lifecycle", authMiddleware, async (_req, res) => {
    try {
      const config = getR2ConfigFromEnv();
      const endpoint = config.S3_ENDPOINT || "";
      const accessKey = config.S3_ACCESS_KEY || "";
      const secretKey = config.S3_SECRET_KEY || "";
      const bucket = config.S3_BUCKET || "";
      const region = config.S3_REGION || "auto";

      if (!endpoint || !accessKey || !secretKey || !bucket) {
        res.status(503).json({
          configured: false,
          rules: [],
          error: "R2 配置不完整，请先在 API 配置页面设置 S3_ENDPOINT、S3_ACCESS_KEY、S3_SECRET_KEY、S3_BUCKET"
        });
        return;
      }

      const headers = await signR2Request({
        method: "GET", endpoint, bucket, path: "/?lifecycle",
        body: "", accessKey, secretKey, contentType: "", region,
      });

      const url = `${endpoint.replace(/\/+$/, "")}/${bucket}/?lifecycle`;
      const response = await fetch(url, { method: "GET", headers: headers as any });

      if (response.status === 404 || response.status === 204) {
        res.json({ configured: true, rules: [], lastChecked: new Date().toISOString() });
        return;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        // NoSuchLifecycleConfiguration 是正常的「未配置」状态
        if (errText.includes("NoSuchLifecycleConfiguration")) {
          res.json({ configured: true, rules: [], lastChecked: new Date().toISOString() });
          return;
        }
        res.status(response.status).json({ error: `获取生命周期策略失败: ${errText}` });
        return;
      }

      const xml = await response.text();
      const rules = parseLifecycleXml(xml);
      res.json({ configured: true, rules, lastChecked: new Date().toISOString() });
    } catch (err: any) {
      console.error("[R2 Lifecycle GET]", err);
      res.status(500).json({ error: err.message || "获取生命周期策略失败" });
    }
  });

  // POST /api/admin/r2/lifecycle - 设置生命周期策略
  app.post("/api/admin/r2/lifecycle", authMiddleware, async (req, res) => {
    try {
      const { rules } = req.body as {
        rules: Array<{ id: string; prefix: string; expirationDays: number; enabled: boolean; description?: string }>
      };

      if (!Array.isArray(rules) || rules.length === 0) {
        res.status(400).json({ error: "请提供至少一条生命周期规则" });
        return;
      }

      const config = getR2ConfigFromEnv();
      const endpoint = config.S3_ENDPOINT || "";
      const accessKey = config.S3_ACCESS_KEY || "";
      const secretKey = config.S3_SECRET_KEY || "";
      const bucket = config.S3_BUCKET || "";
      const region = config.S3_REGION || "auto";

      if (!endpoint || !accessKey || !secretKey || !bucket) {
        res.status(503).json({
          error: "R2 配置不完整，请先在 API 配置页面设置 S3_ENDPOINT、S3_ACCESS_KEY、S3_SECRET_KEY、S3_BUCKET"
        });
        return;
      }

      // 构建 S3 XML 格式的生命周期配置
      const xmlRules = rules.map(rule => `
  <Rule>
    <ID>${escapeXml(rule.id)}</ID>
    <Status>${rule.enabled ? "Enabled" : "Disabled"}</Status>
    <Filter>
      <Prefix>${escapeXml(rule.prefix)}</Prefix>
    </Filter>
    <Expiration>
      <Days>${rule.expirationDays}</Days>
    </Expiration>
  </Rule>`).join("");

      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>\n<LifecycleConfiguration>${xmlRules}\n</LifecycleConfiguration>`;

      const headers = await signR2Request({
        method: "PUT", endpoint, bucket, path: "/?lifecycle",
        body: xmlBody, accessKey, secretKey, contentType: "application/xml", region,
      });

      const url = `${endpoint.replace(/\/+$/, "")}/${bucket}/?lifecycle`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { ...headers as any, "Content-Type": "application/xml" },
        body: xmlBody,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        res.status(response.status).json({ error: `设置生命周期策略失败 (${response.status}): ${errText}` });
        return;
      }

      console.log(`[R2 Lifecycle] 已成功为 Bucket "${bucket}" 设置 ${rules.length} 条生命周期规则`);
      res.json({
        success: true,
        message: `已成功为 Bucket "${bucket}" 设置 ${rules.length} 条生命周期规则：切片视频 3 天后自动过期，原始视频 1 天后兜底清理`,
      });
    } catch (err: any) {
      console.error("[R2 Lifecycle POST]", err);
      res.status(500).json({ error: err.message || "设置生命周期策略失败" });
    }
  });

  // ==================== SPA Fallback（双路径分发）====================
  //
  // 分发规则：
  //   /api/*        → 不处理（上方 API 路由已处理，这里不会到达）
  //   /admin 及子路径 → dist/admin/index.html（后台管理端 SPA）
  //   其余所有路径 → dist/client/index.html（前台客户端 SPA）
  //
  // 注意：未登录访问 /admin 时，React 路由（wouter base="/admin"）会自动跳转到 /admin/login

  app.get("*", (req, res) => {
    const reqPath = req.path;

    // API 请求不走 SPA fallback（正常情况下上方已处理，这里仅保险）
    if (reqPath.startsWith("/api/")) {
      res.status(404).json({ error: "API route not found" });
      return;
    }

    // /admin 及其子路径 → 后台管理端 SPA
    if (reqPath === "/admin" || reqPath.startsWith("/admin/")) {
      const indexFile = path.join(adminStaticPath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(503).send([
          "<!DOCTYPE html><html><head><title>Admin Not Built</title></head><body>",
          "<h2>⚠️ Admin panel not built</h2>",
          "<p>The admin frontend assets are missing. Please run: <code>pnpm build</code></p>",
          `<p>Expected path: <code>${adminStaticPath}</code></p>`,
          "<hr><h3>Render 修复步骤：</h3><ol>",
          "<li>进入 Render Dashboard → Web Service → Settings</li>",
          "<li><strong>Build Command</strong>：<code>pnpm install && pnpm build</code></li>",
          "<li><strong>Start Command</strong>：<code>pnpm start</code></li>",
          "<li>点击 Manual Deploy → Deploy latest commit</li>",
          "</ol></body></html>",
        ].join(""));
      }
      return;
    }

    // 其余所有路径 → 前台客户端 SPA
    const indexFile = path.join(clientStaticPath, "index.html");
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.status(503).send([
        "<!DOCTYPE html><html><head><title>Client Not Built</title></head><body>",
        "<h2>⚠️ Client frontend not built</h2>",
        "<p>The client frontend assets are missing. Please run: <code>pnpm build</code></p>",
        `<p>Expected path: <code>${clientStaticPath}</code></p>`,
        "<hr><h3>Render 修复步骤：</h3><ol>",
        "<li>进入 Render Dashboard → Web Service → Settings</li>",
        "<li><strong>Build Command</strong>：<code>pnpm install && pnpm build</code></li>",
        "<li><strong>Start Command</strong>：<code>pnpm start</code></li>",
        "<li>点击 Manual Deploy → Deploy latest commit</li>",
        "</ol></body></html>",
      ].join(""));
    }
  });

  // 统一使用 process.env.PORT（Render 动态注入），兜底 ADMIN_PORT，最后默认 3002
  const port = parseInt(process.env.PORT || process.env.ADMIN_PORT || "3002");
  server.listen(port, "0.0.0.0", () => {
    console.log(`[admin] ✅ Server running on http://0.0.0.0:${port}/`);
    console.log(`[admin]    PORT env=${process.env.PORT}, ADMIN_PORT env=${process.env.ADMIN_PORT}`);
  });
}

startServer().catch(console.error);
