"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CRMUser, logout } from "@/lib/auth";
import {
  LayoutDashboard, Users, Kanban, BarChart3,
  CalendarDays, Truck, Shield, Award,
  CreditCard, LogOut, ChevronRight, Bell,
} from "lucide-react";

interface Notification {
  id: number; assignee_name: string; title: string;
  message: string | null; source_type: string;
  source_id: number | null; is_read: boolean; created_at: string;
}


// ─── 알림 패널 (Sidebar 내장) ──────────────────────────────
function NotifPanel({ notifications, onMarkAll, onClose }: {
  notifications: Notification[];
  onMarkAll: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-full top-0 ml-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-bold text-slate-800">알림</span>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button onClick={onMarkAll} className="text-[10px] text-blue-600 flex items-center gap-1 hover:text-blue-700">
              모두 읽음
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <p className="text-xs">새 알림이 없습니다</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${!n.is_read ? "bg-blue-50/30" : ""}`}>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-600 text-xs">🚛</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800">{n.title}</p>
                {n.message && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>}
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(n.created_at).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                </p>
              </div>
              {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"/>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SidebarProps {
  user: CRMUser;
  unreadCount?: number;
  notifications?: Notification[];
  showPanel?: boolean;
  onBellClick?: () => void;
  onPanelClose?: () => void;
  onMarkAll?: () => void;
}

const EXEC_MENUS = [
  { href: "/",            label: "대시보드",    icon: LayoutDashboard },
  { href: "/contacts",    label: "고객 DB",     icon: Users },
  { href: "/pipeline",    label: "파이프라인",   icon: Kanban },
  { href: "/vip-members", label: "분양회 입회자", icon: Award },
  { href: "/wanpan-truck",label: "완판트럭",     icon: Truck },
  { href: "/calendar",    label: "운영캘린더",   icon: CalendarDays },
];

const OPS_MENUS = [
  { href: "/member-manage", label: "분양회 회원관리", icon: Shield },
  { href: "/sales",         label: "통합매출관리",    icon: CreditCard },
  { href: "/rewards",       label: "리워드 관리",     icon: BarChart3 },
];

const ADMIN_EXTRA = [
  { href: "/reports", label: "팀 성과 분석", icon: BarChart3 },
];

const ROLE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: "bg-amber-100",   text: "text-amber-700",   label: "관리자" },
  exec:  { bg: "bg-blue-100",    text: "text-blue-700",    label: "실행파트" },
  ops:   { bg: "bg-emerald-100", text: "text-emerald-700", label: "운영파트" },
};

export default function Sidebar({
  user,
  unreadCount = 0,
  notifications = [],
  showPanel = false,
  onBellClick,
  onPanelClose,
  onMarkAll,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "admin";
  const roleStyle = ROLE_STYLE[user.role] || ROLE_STYLE.exec;

  const handleLogout = () => { logout(); router.push("/login"); };

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const active = pathname === href;
    return (
      <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
        active ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
               : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}>
        <Icon size={15} className={active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}/>
        <span className="flex-1">{label}</span>
        {active && <ChevronRight size={12} className="text-blue-400"/>}
      </Link>
    );
  };

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm">
      {/* 로고 */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Image src="/icon-logo.png" alt="로고" width={36} height={36} style={{ objectFit:"contain", flexShrink:0, mixBlendMode:"screen" as const }}/>
          <div>
            <p className="text-slate-800 font-bold text-sm leading-tight">분양회 CRM</p>
            <p className="text-slate-400 text-xs">광고인㈜ 대외협력팀</p>
          </div>
        </div>
      </div>

      {/* 유저 정보 + 알림 벨 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${roleStyle.bg} ${roleStyle.text}`}>
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-slate-800 text-sm font-bold leading-tight">{user.name}</p>
              <span className="text-xs text-slate-500 font-medium">{user.title}</span>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
              {roleStyle.label}
            </span>
          </div>

          {/* 알림 벨 — 사이드바 유저 영역 우측 */}
          <div className="relative flex-shrink-0">
            <button
              onClick={onBellClick}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                showPanel
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
              }`}
              title="알림"
            >
              <Bell size={14}/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* 알림 패널 — 사이드바 위쪽으로 열림 */}
            {showPanel && onPanelClose && onMarkAll && (
              <NotifPanel
                notifications={notifications}
                onMarkAll={onMarkAll}
                onClose={onPanelClose}
              />
            )}
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <div className="px-1 pb-1.5 text-slate-400 text-[10px] font-semibold tracking-widest uppercase">■ 실행파트</div>
        {EXEC_MENUS.map(m => <NavItem key={m.href} {...m}/>)}

        <div className="my-2 border-t border-slate-100"/>
        <div className="px-1 pb-1.5 text-slate-400 text-[10px] font-semibold tracking-widest uppercase">■ 운영파트</div>
        {OPS_MENUS.map(m => <NavItem key={m.href} {...m}/>)}

        {isAdmin && (
          <>
            <div className="my-2 border-t border-amber-100"/>
            <div className="px-1 pb-1.5 text-amber-500 text-[10px] font-semibold tracking-widest uppercase">★ 관리자 전용</div>
            {ADMIN_EXTRA.map(m => <NavItem key={m.href} {...m}/>)}
          </>
        )}
      </nav>

      {/* 로그아웃 */}
      <div className="px-3 pb-4">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={13}/>
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
