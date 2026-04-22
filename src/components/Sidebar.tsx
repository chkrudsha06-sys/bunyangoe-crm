"use client";

import { useState, useEffect, useRef } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CRMUser, logout } from "@/lib/auth";
import {
  LayoutDashboard, Users, Kanban, BarChart3,
  CalendarDays, Truck, Shield, Award,
  CreditCard, LogOut, ChevronRight, FileText, Target, Moon, Sun,
  Bell, CheckCheck, X, Send, Clock, MessageCircle,
} from "lucide-react";

interface NotificationItem { id: number; message: string | null; created_at: string; is_read: boolean; assignee_name?: string; title?: string; source_type?: string; source_id?: number | null; }
interface SidebarProps {
  user: CRMUser;
  unreadCount?: number;
  notifications?: NotificationItem[];
  showPanel?: boolean;
  onBellClick?: () => void;
  onPanelClose?: () => void;
  onMarkAll?: () => Promise<void>;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const EXEC_MENUS = [
  { href: "/", label: "대시보드", emoji: "📊" },
  { href: "/tasks", label: "업무전달", emoji: "📬" },
  { href: "/contacts", label: "고객 DB", emoji: "👥" },
  { href: "/pipeline", label: "파이프라인", emoji: "🔄" },
  { href: "/vip-members", label: "분양회 입회자", emoji: "⭐" },
  { href: "/wanpan-truck", label: "완판트럭", emoji: "🚚" },
  { href: "/calendar", label: "운영캘린더", emoji: "📅" },
];

const OPS_MENUS = [
  { href: "/member-manage", label: "분양회 회원관리", emoji: "🛡️" },
  { href: "/sales", label: "통합매출관리", emoji: "💳" },
  { href: "/rewards", label: "리워드 관리", emoji: "💎" },
  { href: "/customer-incentives", label: "인센티브 관리", emoji: "🏆" },
  { href: "/quotes", label: "견적서", emoji: "📄" },
];

const INFO_MENUS = [
  { href: "/new-sites", label: "신규현장", emoji: "🏗️" },
];

const ADMIN_EXTRA = [
  { href: "/reports",       label: "팀 성과 분석", emoji: "📈" },
  { href: "/kpi-settings",  label: "KPI 설정",    emoji: "🎯" },
  { href: "/incentives",     label: "인센티브 관리", emoji: "🏅" },
];

// 역할 배지 스타일
const ROLE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: "bg-amber-100", text: "text-amber-700", label: "관리자" },
  exec:  { bg: "bg-blue-100",  text: "text-blue-700",  label: "실행파트" },
  ops:   { bg: "bg-emerald-100", text: "text-emerald-700", label: "운영파트" },
};

export default function Sidebar({ user, unreadCount=0, notifications=[], showPanel=false, onBellClick, onPanelClose, onMarkAll, mobileOpen=false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "admin";
  const roleStyle = ROLE_STYLE[user.role] || ROLE_STYLE.exec;

  // 다크모드
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("crm_dark_mode");
    if (saved === "false") { setDarkMode(false); document.documentElement.removeAttribute("data-theme"); }
    else { setDarkMode(true); document.documentElement.setAttribute("data-theme","dark"); }
  }, []);
  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) { document.documentElement.setAttribute("data-theme","dark"); }
    else { document.documentElement.removeAttribute("data-theme"); }
    localStorage.setItem("crm_dark_mode", String(next));
  };

  const handleLogout = () => { logout(); router.push("/login"); };

  // 알림 패널 외부 클릭 감지
  const bellRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        onPanelClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPanel, onPanelClose]);

  const NavItem = ({ href, label, emoji }: { href: string; label: string; emoji: string }) => {
    const active = pathname === href;
    return (
      <Link href={href} onClick={() => onMobileClose?.()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group"
        style={{
          background: active ? "var(--sidebar-active-bg)" : "transparent",
          color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
          fontWeight: active ? 600 : 400,
          border: active ? "1px solid var(--border)" : "1px solid transparent",
        }}
        onMouseEnter={e=>{if(!active)(e.currentTarget as HTMLElement).style.background="var(--sidebar-hover)";}}
        onMouseLeave={e=>{if(!active)(e.currentTarget as HTMLElement).style.background="transparent";}}>
        <span style={{fontSize:16,width:20,textAlign:"center"}}>{emoji}</span>
        <span className="flex-1">{label}</span>
        {active && <ChevronRight size={12} style={{color:"var(--info)"}} />}
      </Link>
    );
  };

  const SidebarInner = () => (
    <div className="flex flex-col h-full" style={{background:"var(--sidebar-bg)"}}>
      {/* 로고 */}
      <div className="px-4 py-4" style={{borderBottom:"1px solid var(--sidebar-border)"}}>
        <div className="flex items-center gap-2.5">
          <Image src="/icon-logo.png" alt="로고" width={36} height={36} style={{ objectFit: "contain", flexShrink: 0 }} />
          <div>
            <p className="font-bold text-sm leading-tight" style={{color:"var(--text)"}}>분양회 CRM</p>
            <p className="text-xs" style={{color:"var(--text-subtle)"}}>광고인㈜ 대외협력팀</p>
          </div>
        </div>
      </div>

      {/* 유저 정보 + 알림 벨 */}
      <div className="px-4 py-3 relative" style={{borderBottom:"1px solid var(--sidebar-border)"}}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${roleStyle.bg} ${roleStyle.text}`}>
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold leading-tight" style={{color:"var(--text)"}}>{user.name}</p>
              <span className="text-xs font-medium" style={{color:"var(--text-muted)"}}>{user.title}</span>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${roleStyle.bg} ${roleStyle.text}`}>
              {roleStyle.label}
            </span>
          </div>
          {/* 🔔 알림 벨 */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={onBellClick}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{color: unreadCount > 0 ? "var(--warning)" : "var(--text-muted)", background: showPanel ? "var(--sidebar-active-bg)" : "transparent"}}
            >
              <Bell size={18} className={unreadCount > 0 ? "animate-wiggle" : ""} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* 알림 드롭다운 패널 */}
            {showPanel && (
              <div
                className="absolute left-0 top-full mt-2 w-80 max-h-96 rounded-xl shadow-2xl overflow-hidden z-50"
                style={{background:"var(--surface)", border:"1px solid var(--border)"}}
              >
                {/* 패널 헤더 */}
                <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:"1px solid var(--border)"}}>
                  <div className="flex items-center gap-2">
                    <Bell size={14} style={{color:"var(--info)"}} />
                    <span className="text-sm font-bold" style={{color:"var(--text)"}}>알림</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">{unreadCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button onClick={onMarkAll} className="text-[11px] font-semibold px-2 py-1 rounded-md transition-colors" style={{color:"var(--info)"}}>
                        전체 읽음
                      </button>
                    )}
                    <button onClick={onPanelClose} className="w-6 h-6 flex items-center justify-center rounded-md transition-colors" style={{color:"var(--text-muted)"}}>
                      <X size={14}/>
                    </button>
                  </div>
                </div>

                {/* 알림 리스트 */}
                <div className="overflow-y-auto max-h-80 divide-y" style={{borderColor:"var(--border)"}}>
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Bell size={24} style={{color:"var(--text-muted)", opacity:0.4}} />
                      <p className="text-xs" style={{color:"var(--text-muted)"}}>알림이 없습니다</p>
                    </div>
                  ) : (
                    notifications.slice(0, 20).map(n => {
                      const isTask = n.source_type === "업무전달";
                      const isWanpan = n.source_type === "완판트럭";
                      return (
                        <div
                          key={n.id}
                          className="flex gap-3 px-4 py-3 transition-colors cursor-pointer"
                          style={{background: n.is_read ? "transparent" : "var(--sidebar-active-bg)"}}
                          onClick={() => {
                            if (isTask) router.push("/tasks");
                            else if (isWanpan) router.push("/wanpan-truck");
                            onPanelClose?.();
                          }}
                        >
                          {/* 아이콘 */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isTask ? "bg-violet-100" : isWanpan ? "bg-amber-100" : "bg-blue-100"
                          }`}>
                            {isTask ? <Send size={14} className="text-violet-600"/> :
                             isWanpan ? <Truck size={14} className="text-amber-600"/> :
                             <MessageCircle size={14} className="text-blue-600"/>}
                          </div>
                          {/* 내용 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate" style={{color: n.is_read ? "var(--text-muted)" : "var(--text)"}}>
                                {n.title || n.source_type}
                              </span>
                              {!n.is_read && <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"/>}
                            </div>
                            {n.message && (
                              <p className="text-[11px] mt-0.5 line-clamp-2 leading-relaxed" style={{color:"var(--text-muted)"}}>
                                {n.message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px]" style={{color:"var(--text-subtle)"}}>
                                {new Date(n.created_at).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                isTask ? "bg-violet-50 text-violet-600" : isWanpan ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                              }`}>
                                {n.source_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {/* 실행파트 - 전체 공개 */}
        <div className="px-1 pb-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{color:"var(--sidebar-section)"}}>■ 실행파트</div>
        {EXEC_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        {/* 운영파트 - 전체 공개 */}
        <div className="my-2" style={{borderTop:"1px solid var(--sidebar-border)"}} />
        <div className="px-1 pb-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{color:"var(--sidebar-section)"}}>■ 운영파트</div>
        {OPS_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        {/* 정보제공 - 전체 공개 */}
        <div className="my-2" style={{borderTop:"1px solid var(--sidebar-border)"}} />
        <div className="px-1 pb-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{color:"var(--sidebar-section)"}}>■ 정보제공</div>
        {INFO_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        {/* 관리자 전용 */}
        {isAdmin && (
          <>
            <div className="my-2" style={{borderTop:"1px solid var(--sidebar-border)"}} />
            <div className="px-1 pb-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{color:"var(--warning)"}}>★ 관리자 전용</div>
            {ADMIN_EXTRA.map((m) => <NavItem key={m.href} {...m} />)}
          </>
        )}
      </nav>

      {/* 다크모드 + 로그아웃 */}
      <div className="px-3 pb-4 space-y-1">
        <button onClick={toggleDark} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors" style={{color:"var(--sidebar-text)"}}>
          {darkMode ? <Sun size={13} className="text-amber-500"/> : <Moon size={13}/>}
          <span>{darkMode ? "라이트 모드" : "다크 모드"}</span>
        </button>
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors hover:text-red-400" style={{color:"var(--sidebar-text)"}}>
          <LogOut size={13} />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* PC 사이드바 */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col transition-colors duration-300" style={{background:"var(--sidebar-bg)",borderRight:"1px solid var(--sidebar-border)"}}>
        <SidebarInner/>
      </aside>

      {/* 모바일 드로어 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose}/>
          <div className="absolute left-0 top-0 bottom-0 w-64 shadow-2xl overflow-hidden" style={{background:"var(--sidebar-bg)",animation:"slideDrawer 0.25s ease-out"}}>
            <div className="absolute top-3 right-3 z-10">
              <button onClick={onMobileClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{color:"var(--text-muted)"}}>
                <X size={18}/>
              </button>
            </div>
            <div className="h-full overflow-y-auto">
              <SidebarInner/>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDrawer {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
