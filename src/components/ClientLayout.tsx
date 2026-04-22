"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, CRMUser, validateSession, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Truck, X, CheckCheck, Send, Bell } from "lucide-react";

const MOBILE_TITLES: Record<string,string> = {
  "/": "📊 대시보드", "/tasks": "📬 업무전달", "/contacts": "👥 고객 DB",
  "/pipeline": "🔄 파이프라인", "/vip-members": "⭐ 분양회 입회자",
  "/wanpan-truck": "🚚 완판트럭", "/calendar": "📅 운영캘린더",
  "/member-manage": "🛡️ 분양회 회원관리", "/sales": "💳 통합매출관리",
  "/rewards": "💎 리워드 관리", "/customer-incentives": "🏆 인센티브 관리",
  "/quotes": "📄 견적서", "/new-sites": "🏗️ 신규현장", "/ad-sites": "📡 광고 현운예지",
  "/reports": "📈 팀 성과 분석", "/kpi-settings": "🎯 KPI 설정",
  "/incentives": "🏅 인센티브 관리", "/account-manage": "🔐 계정관리",
};
function getMobileTitle(path: string) { return MOBILE_TITLES[path] || "분양회 CRM"; }

interface Notification {
  id: number;
  assignee_name: string;
  title: string;
  message: string | null;
  source_type: string;
  source_id: number | null;
  is_read: boolean;
  created_at: string;
}

function NotifToast({ notif, onClose }: { notif: Notification; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(onClose, 12000);
    return () => clearTimeout(t);
  }, [onClose]);

  const handleClick = () => {
    onClose();
    if (notif.source_type === "완판트럭") {
      router.push("/wanpan-truck");
    }
  };

  return (
    <div
      onClick={handleClick}
      className="rounded-2xl shadow-2xl p-4 w-80 flex gap-3 relative overflow-hidden cursor-pointer transition-colors"
      style={{background:"var(--surface)",border:"1px solid var(--border)",animation:"slideInRight 0.35s cubic-bezier(0.16,1,0.3,1)"}}
      title="클릭하면 완판트럭 페이지로 이동">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl"/>
      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <Truck size={16} className="text-amber-600"/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold text-slate-800 leading-snug">{notif.title}</p>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-300 hover:text-slate-500 flex-shrink-0"><X size={13}/></button>
        </div>
        {notif.message && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-400">
            {new Date(notif.created_at).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
          </span>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{notif.source_type}</span>
        </div>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CRMUser | null>(null);
  const [checked, setChecked] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [taskToasts, setTaskToasts] = useState<{id:number;requester:string;category:string;content:string}[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);

  // 이미 알고 있는 알림 ID 집합 — 중복 토스트 방지
  const knownIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const u = getCurrentUser();
    if (!u && pathname !== "/login" && !pathname.startsWith("/my") && !pathname.startsWith("/sites")) router.push("/login");
    else { setUser(u); setChecked(true); }
  }, [pathname, router]);

  // 새 알림 토스트 추가 (중복 방지)
  const pushNewToasts = useCallback((data: Notification[]) => {
    const fresh = data.filter(n => !n.is_read && !knownIds.current.has(n.id));
    if (fresh.length > 0) {
      fresh.forEach(n => knownIds.current.add(n.id));
      setToastQueue(prev => [...prev, ...fresh]);
    }
    // 전체 목록 업데이트
    setNotifications(data);
    // 기존에 알던 것도 knownIds에 추가 (초기화 시)
    data.forEach(n => knownIds.current.add(n.id));
  }, []);

  const fetchNotifications = useCallback(async (userName: string, showToast = false) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("assignee_name", userName)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error || !data) return;

    if (showToast) {
      pushNewToasts(data as Notification[]);
    } else {
      // 초기 로드 — 기존 알림 ID만 등록, 토스트 없음
      (data as Notification[]).forEach(n => knownIds.current.add(n.id));
      setNotifications(data as Notification[]);
    }
  }, [pushNewToasts]);

  // ── 세션 유효성 검증 (5분마다, 안정적) ──
  useEffect(() => {
    if (!user || pathname === "/login") return;
    let failCount = 0;
    const checkSession = async () => {
      try {
        const valid = await validateSession();
        if (!valid) {
          failCount++;
          // 연속 3회 실패 시에만 로그아웃 (네트워크 불안정 대응)
          if (failCount >= 3) {
            logout();
            alert("세션이 만료되었습니다. 다시 로그인해주세요.");
            router.push("/login");
          }
        } else {
          failCount = 0;
        }
      } catch {
        // 에러 시 무시 (로그아웃 안 함)
      }
    };
    // 첫 체크는 2분 후, 이후 5분 간격
    const initialTimer = setTimeout(() => {
      checkSession();
      const sessionTimer = setInterval(checkSession, 300000); // 5분
      return () => clearInterval(sessionTimer);
    }, 120000); // 2분 후 시작
    return () => clearTimeout(initialTimer);
  }, [user, pathname, router]);

  useEffect(() => {
    if (!user || pathname === "/login") return;

    // 초기 로드
    fetchNotifications(user.name, false);

    // ── Supabase Realtime 구독 ──
    const channel = supabase
      .channel(`notif-${user.name}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `assignee_name=eq.${user.name}`,
      }, (payload) => {
        const n = payload.new as Notification;
        if (!knownIds.current.has(n.id)) {
          knownIds.current.add(n.id);
          setNotifications(prev => [n, ...prev]);
          setToastQueue(prev => [...prev, n]);
        }
      })
      .subscribe((status) => {
        console.log("[Realtime] status:", status);
      });

    // ── 폴링 백업 (10초) — Realtime 미설정 환경 보완 ──
    const pollTimer = setInterval(() => {
      fetchNotifications(user.name, true);
    }, 10000);

    // ── Tasks Realtime 구독 ──
    const taskChannel = supabase
      .channel(`tasks-${user.name}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "tasks",
      }, (payload) => {
        const t = payload.new as any;
        if (t.assignee === user.name || (t.tagged && (t.tagged as string[]).includes(user.name))) {
          setTaskToasts(prev => [...prev, { id: t.id, requester: t.requester, category: t.category, content: t.content }]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(taskChannel);
      clearInterval(pollTimer);
    };
  }, [user, pathname, fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true })
      .eq("assignee_name", user.name).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const closeToast = async (notifId: number) => {
    setToastQueue(prev => prev.filter(n => n.id !== notifId));
    await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // 업무전달 토스트 자동 삭제 (12초)
  useEffect(() => {
    if (taskToasts.length === 0) return;
    const timers = taskToasts.map(t =>
      setTimeout(() => setTaskToasts(prev => prev.filter(x => x.id !== t.id)), 12000)
    );
    return () => timers.forEach(clearTimeout);
  }, [taskToasts]);

  if (pathname === "/login" || pathname.startsWith("/my") || pathname.startsWith("/sites")) return <>{children}</>;
  if (!checked || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-bg">
        <div className="w-8 h-8 border-2 border-brand-navy-2 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      <Sidebar
        user={user!}
        unreadCount={unreadCount}
        notifications={notifications}
        showPanel={showPanel}
        onBellClick={() => setShowPanel(v => !v)}
        onPanelClose={() => setShowPanel(false)}
        onMarkAll={markAllRead}
        mobileOpen={mobileMenu}
        onMobileClose={() => setMobileMenu(false)}
      />
      {/* 모바일 헤더 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3" style={{background:"var(--sidebar-bg)",borderBottom:"1px solid var(--sidebar-border)"}}>
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenu(true)} className="w-9 h-9 flex items-center justify-center rounded-lg" style={{color:"var(--text)"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="text-sm font-bold" style={{color:"var(--text)"}}>{getMobileTitle(pathname)}</span>
        </div>
        <div className="relative">
          <button onClick={() => setShowPanel(v => !v)} className="w-9 h-9 flex items-center justify-center rounded-lg" style={{color: unreadCount > 0 ? "var(--warning)" : "var(--text-muted)"}}>
            <Bell size={18}/>
            {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>
        </div>
      </div>
      <main className="flex-1 overflow-auto pt-[52px] md:pt-0">
        {children}
      </main>

      {/* 토스트 팝업 (우측 하단) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toastQueue.slice(0, 3).map(n => (
          <div key={n.id} className="pointer-events-auto">
            <NotifToast notif={n} onClose={() => closeToast(n.id)}/>
          </div>
        ))}
        {taskToasts.slice(0, 2).map(t => (
          <div key={`task-${t.id}`} className="pointer-events-auto">
            <div
              onClick={() => { setTaskToasts(prev => prev.filter(x => x.id !== t.id)); router.push("/tasks"); }}
              className="rounded-2xl shadow-2xl p-4 w-80 flex gap-3 relative overflow-hidden cursor-pointer"
              style={{background:"var(--surface)",border:"1px solid var(--border)",animation:"slideInRight 0.35s cubic-bezier(0.16,1,0.3,1)"}}>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-l-2xl"/>
              <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Send size={14} className="text-violet-600"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold leading-snug" style={{color:"var(--text)"}}>{t.requester}님의 업무 요청</p>
                  <button onClick={(e)=>{e.stopPropagation();setTaskToasts(prev=>prev.filter(x=>x.id!==t.id));}} className="text-slate-300 hover:text-slate-500 flex-shrink-0"><X size={13}/></button>
                </div>
                <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{color:"var(--text-muted)"}}>{t.category} — {t.content.slice(0, 60)}</p>
                <span className="inline-block mt-1.5 text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-semibold">업무전달</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
