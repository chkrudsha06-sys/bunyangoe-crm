// src/lib/auth.ts
import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "exec" | "ops";

export interface CRMUser {
  name: string;
  title: string;
  role: UserRole;
  id: string;
  sessionToken?: string;
}

// 전체 계정 목록
export const ALL_ACCOUNTS = [
  // 관리자
  { id: "adperson1", password: "rlawjdgn123",   name: "김정후", title: "본부장", role: "admin" as UserRole },
  { id: "adperson2", password: "rlackddhks123", name: "김창완", title: "팀장",   role: "admin" as UserRole },
  { id: "adperson3", password: "chldnd123",     name: "최웅",   title: "파트장", role: "admin" as UserRole },
  // 실행파트
  { id: "adperson4", password: "whrPgus123",    name: "조계현", title: "어쏘",   role: "exec" as UserRole },
  { id: "adperson5", password: "dltpgh123",     name: "이세호", title: "어쏘",   role: "exec" as UserRole },
  { id: "adperson6", password: "rldudns123",    name: "기여운", title: "어쏘",   role: "exec" as UserRole },
  { id: "adperson7", password: "chlduswjs123",  name: "최연전", title: "CX",    role: "exec" as UserRole },
  // 운영파트
  { id: "adperson8", password: "rlawodud123",   name: "김재영", title: "어시",   role: "ops" as UserRole },
  { id: "adperson9", password: "chldmswjd123",  name: "최은정", title: "어시",   role: "ops" as UserRole },
];

export const TEAM_MEMBERS = ["조계현", "이세호", "기여운", "최연전"] as const;
export const TEAM_MEMBER_ROLES: Record<string, string> = {
  조계현: "어쏘", 이세호: "어쏘", 기여운: "어쏘", 최연전: "CX",
};

// 세션 토큰 생성
function generateToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}

export async function login(id: string, password: string): Promise<CRMUser | null> {
  const account = ALL_ACCOUNTS.find((a) => a.id === id && a.password === password);
  if (!account) return null;

  const token = generateToken();

  // DB에 세션 저장 (같은 user_id가 있으면 덮어쓰기 → 이전 세션 무효화)
  await supabase.from("sessions").upsert(
    { user_id: account.id, session_token: token, logged_in_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  const user: CRMUser = { name: account.name, title: account.title, role: account.role, id: account.id, sessionToken: token };
  if (typeof window !== "undefined") {
    localStorage.setItem("crm_user", JSON.stringify(user));
  }
  return user;
}

// 하위 호환
export async function loginAdmin(id: string, password: string): Promise<CRMUser | null> {
  return login(id, password);
}
export function loginMember(name: string): CRMUser {
  const found = ALL_ACCOUNTS.find((a) => a.name === name);
  const user: CRMUser = found
    ? { name: found.name, title: found.title, role: found.role, id: found.id }
    : { name, title: "", role: "exec", id: "" };
  if (typeof window !== "undefined") localStorage.setItem("crm_user", JSON.stringify(user));
  return user;
}

export function getCurrentUser(): CRMUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("crm_user");
  if (!raw) return null;
  try { return JSON.parse(raw) as CRMUser; } catch { return null; }
}

// 세션 유효성 검증
export async function validateSession(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user || !user.sessionToken || !user.id) return false;

  const { data } = await supabase.from("sessions")
    .select("session_token")
    .eq("user_id", user.id)
    .maybeSingle();

  // DB의 토큰과 로컬 토큰이 다르면 → 다른 기기에서 로그인한 것
  if (!data || data.session_token !== user.sessionToken) return false;
  return true;
}

export async function logoutWithSession(): Promise<void> {
  const user = getCurrentUser();
  if (user?.id) {
    await supabase.from("sessions").delete().eq("user_id", user.id);
  }
  if (typeof window !== "undefined") localStorage.removeItem("crm_user");
}

export function logout(): void {
  const user = getCurrentUser();
  if (user?.id) {
    supabase.from("sessions").delete().eq("user_id", user.id).then(() => {});
  }
  if (typeof window !== "undefined") localStorage.removeItem("crm_user");
}

export function isAdmin(): boolean {
  return getCurrentUser()?.role === "admin";
}
