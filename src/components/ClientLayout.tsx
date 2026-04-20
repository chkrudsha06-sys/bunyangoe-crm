"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, CRMUser, validateSession, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Truck, X, CheckCheck } from "lucide-react";

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
      className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 flex gap-3 relative overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors"
      style={{ animation: "slideInRight 0.35s cubic-bezier(0.16,1,0.3,1)" }}
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

  // 이미 알고 있는 알림 ID 집합 — 중복 토스트 방지
  const knownIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const u = getCurrentUser();
    if (!u && pathname !== "/login") router.push("/login");
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

  // ── 세션 유효성 검증 (5초마다) ──
  useEffect(() => {
    if (!user || pathname === "/login") return;
    const checkSession = async () => {
      const valid = await validateSession();
      if (!valid) {
        logout();
        alert("다른 기기에서 로그인되어 자동 로그아웃됩니다.");
        router.push("/login");
      }
    };
    const sessionTimer = setInterval(checkSession, 5000);
    return () => clearInterval(sessionTimer);
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

    return () => {
      supabase.removeChannel(channel);
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

  if (pathname === "/login") return <>{children}</>;
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
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* 토스트 팝업 (우측 하단) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toastQueue.slice(0, 3).map(n => (
          <div key={n.id} className="pointer-events-auto">
            <NotifToast notif={n} onClose={() => closeToast(n.id)}/>
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
