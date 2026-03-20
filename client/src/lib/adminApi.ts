/**
 * 管理后台统一 API 工具
 *
 * 单域名部署方案（seealso.online）：
 * - 前台客户端：seealso.online/
 * - 管理后台：  seealso.online/admin
 * - API 接口：  seealso.online/api/admin/*
 *
 * 所有 API 请求使用相对路径，无需任何环境变量配置。
 * 严禁硬编码 localhost 或任何绝对地址。
 */

/**
 * 统一的管理后台 fetch 封装。
 * 使用纯相对路径，确保在任何部署环境下均可正常工作。
 *
 * @param path  API 路径，必须以 / 开头，例如 "/api/admin/me"
 * @param init  原生 fetch RequestInit 选项（可选）
 */
export function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  // 使用相对路径，浏览器自动拼接当前域名
  // 例如：在 https://seealso.online/admin 下，"/api/admin/login" → "https://seealso.online/api/admin/login"
  return fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * @deprecated 不再需要，保留仅为向后兼容
 */
export function getAdminApiBase(): string {
  return "";
}
