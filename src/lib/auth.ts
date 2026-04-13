// src/lib/auth.ts
// 간단한 localStorage 기반 인증

export interface CRMUser {
  name: string;
  role: "admin" | "member";
  adminTitle?: string;
}

// 관리자 계정 (비밀번호는 추후 변경 가능)
export const ADMIN_ACCOUNTS = [
  { name: "김정후 본부장", id: "junghu", password: "Bunyang2026!", title: "본부장" },
  { name: "김창완 팀장", id: "changwan", password: "Bunyang2026!", title: "팀장" },
  { name: "최웅 파트장", id: "chooung", password: "Bunyang2026!", title: "파트장" },
];

export const TEAM_MEMBERS = ["조계현", "이세호", "기여운", "최연전"] as const;
export const TEAM_MEMBER_ROLES: Record<string, string> = {
  조계현: "메인",
  이세호: "어쏘",
  기여운: "어쏘",
  최연전: "CX",
};

export function loginAdmin(id: string, password: string): CRMUser | null {
  const account = ADMIN_ACCOUNTS.find((a) => a.id === id && a.password === password);
  if (!account) return null;
  const user: CRMUser = { name: account.name, role: "admin", adminTitle: account.title };
  if (typeof window !== "undefined") {
    localStorage.setItem("crm_user", JSON.stringify(user));
  }
  return user;
}

export function loginMember(name: string): CRMUser {
  const user: CRMUser = { name, role: "member" };
  if (typeof window !== "undefined") {
    localStorage.setItem("crm_user", JSON.stringify(user));
  }
  return user;
}

export function getCurrentUser(): CRMUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("crm_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CRMUser;
  } catch {
    return null;
  }
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("crm_user");
  }
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === "admin";
}
