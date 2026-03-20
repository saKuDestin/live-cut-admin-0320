/**
 * 管理后台统一 API 工具
 *
 * 通过 VITE_ADMIN_API_URL 环境变量支持跨域部署：
 * - 生产环境：设置为后端服务地址，例如 https://api.seealso.online
 * - 开发环境：留空，使用相对路径（由 Vite dev server 代理到 localhost:3002）
 */

/**
 * 返回管理后台 API 的 base URL。
 * 去除末尾斜杠，保持路径拼接一致性。
 */
export function getAdminApiBase(): string {
  const apiUrl = import.meta.env.VITE_ADMIN_API_URL;
  return apiUrl ? (apiUrl as string).replace(/\/+$/, "") : "";
}

/**
 * 统一的管理后台 fetch 封装。
 * 自动拼接 API base URL，并始终携带 credentials: "include"（用于 cookie 认证）。
 *
 * @param path  API 路径，必须以 / 开头，例如 "/api/admin/me"
 * @param init  原生 fetch RequestInit 选项（可选）
 */
export function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${getAdminApiBase()}${path}`;
  return fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers ?? {}),
    },
  });
}
