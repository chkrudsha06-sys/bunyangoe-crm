"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, CRMUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Truck, X, Bell, CheckCheck } from "lucide-react";

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

// ─── 알림 팝업 카드 ──────────────────────────────────────────
function NotifToast({ notif, onClose }: {
  notif: Notification;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 12000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="animate-slide-in-right bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-80 flex gap-3 relative overflow-hidden">
      {/* 왼쪽 액센트 바 */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl"/>
      {/* 아이콘 */}
      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <Truck size={16} className="text-amber-600"/>
      </div>
      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold text-slate-800 leading-snug">{notif.title}</p>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 flex-shrink-0 mt-0.5">
            <X size={13}/>
          </button>
        </div>
        {notif.message && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.message}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-400">
            {new Date(notif.created_at).toLocaleString("ko-KR", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" })}
          </span>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{notif.source_type}</span>
        </div>
      </div>
    </div>
  );
}

// ─── 알림 목록 패널 ──────────────────────────────────────────
function NotifPanel({ notifications, onMarkAll, onClose }: {
  notifications: Notification[];
  onMarkAll: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-bold text-slate-800">알림</span>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button onClick={onMarkAll}
              className="text-[10px] text-blue-600 flex items-center gap-1 hover:text-blue-700">
              <CheckCheck size={11}/>모두 읽음
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Bell size={24} className="mb-2 opacity-30"/>
            <p className="text-xs">새 알림이 없습니다</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.is_read ? "bg-blue-50/30" : ""}`}>
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Truck size={12} className="text-amber-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">{n.title}</p>
                  {n.message && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString("ko-KR", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"/>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CRMUser | null>(null);
  const [checked, setChecked] = useState(false);

  // 알림 상태
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u && pathname !== "/login") {
      router.push("/login");
    } else {
      setUser(u);
      setChecked(true);
    }
  }, [pathname, router]);

  // 알림 불러오기
  const fetchNotifications = useCallback(async (userName: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("assignee_name", userName)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifications(data as Notification[]);
  }, []);

  // Supabase Realtime 구독
  useEffect(() => {
    if (!user || pathname === "/login") return;
    fetchNotifications(user.name);

    const channel = supabase
      .channel(`notif-${user.name}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `assignee_name=eq.${user.name}`,
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev]);
        // 토스트 팝업 큐에 추가
        setToastQueue(prev => [...prev, newNotif]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, pathname, fetchNotifications]);

  // 모두 읽음 처리
  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("assignee_name", user.name)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  // 토스트 닫기
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
      <Sidebar user={user}/>
      <main className="flex-1 overflow-auto relative">
        {children}

        {/* 알림 벨 버튼 (우측 상단 고정) */}
        <div className="fixed top-4 right-4 z-40">
          <div className="relative">
            <button
              onClick={() => setShowPanel(v => !v)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-colors ${
                showPanel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Bell size={16}/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showPanel && (
              <NotifPanel
                notifications={notifications}
                onMarkAll={markAllRead}
                onClose={() => setShowPanel(false)}
              />
            )}
          </div>
        </div>

        {/* 토스트 팝업 스택 (우측 하단) */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
          {toastQueue.slice(0, 3).map(n => (
            <div key={n.id} className="pointer-events-auto">
              <NotifToast
                notif={n}
                onClose={() => closeToast(n.id)}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
