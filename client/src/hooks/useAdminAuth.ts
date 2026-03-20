import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/adminApi";

export interface AdminUser {
  id: number;
  username: string;
  name: string;
  role: string;
  email?: string;
}

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const logout = useCallback(async () => {
    await adminFetch("/api/admin/logout", { method: "POST" });
    setUser(null);
  }, []);

  return { user, loading, logout, refresh: fetchMe };
}
