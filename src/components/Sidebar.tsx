"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CRMUser, logout } from "@/lib/auth";
import {
  LayoutDashboard, Users, Kanban, BarChart3,
  CalendarDays, Truck, Shield, Award,
  CreditCard, LogOut, ChevronRight, FileText, Target, Moon, Sun,
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
}

const EXEC_MENUS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/contacts", label: "고객 DB", icon: Users },
  { href: "/pipeline", label: "파이프라인", icon: Kanban },
  { href: "/vip-members", label: "분양회 입회자", icon: Award },
  { href: "/wanpan-truck", label: "완판트럭", icon: Truck },
  { href: "/calendar", label: "운영캘린더", icon: CalendarDays },
];

const OPS_MENUS = [
  { href: "/member-manage", label: "분양회 회원관리", icon: Shield },
  { href: "/sales", label: "통합매출관리", icon: CreditCard },
  { href: "/rewards", label: "리워드 관리", icon: BarChart3 },
  { href: "/customer-incentives", label: "인센티브 관리", icon: Award },
  { href: "/quotes", label: "견적서", icon: FileText },
];

const ADMIN_EXTRA = [
  { href: "/reports",       label: "팀 성과 분석", icon: BarChart3 },
  { href: "/kpi-settings",  label: "KPI 설정",    icon: Target },
  { href: "/incentives",     label: "인센티브 관리", icon: Award },
];

// 역할 배지 스타일
const ROLE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  admin: { bg: "bg-amber-100", text: "text-amber-700", label: "관리자" },
  exec:  { bg: "bg-blue-100",  text: "text-blue-700",  label: "실행파트" },
  ops:   { bg: "bg-emerald-100", text: "text-emerald-700", label: "운영파트" },
};

export default function Sidebar({ user, unreadCount=0, notifications=[], showPanel=false, onBellClick, onPanelClose, onMarkAll }: SidebarProps) {
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

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const active = pathname === href;
    return (
      <Link href={href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group"
        style={{
          background: active ? "var(--sidebar-active-bg)" : "transparent",
          color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
          fontWeight: active ? 600 : 400,
          border: active ? "1px solid var(--border)" : "1px solid transparent",
        }}
        onMouseEnter={e=>{if(!active)(e.currentTarget as HTMLElement).style.background="var(--sidebar-hover)";}}
        onMouseLeave={e=>{if(!active)(e.currentTarget as HTMLElement).style.background="transparent";}}>
        <Icon size={15} style={{color: active ? "var(--info)" : "var(--sidebar-text)"}} />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight size={12} style={{color:"var(--info)"}} />}
      </Link>
    );
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col transition-colors duration-300" style={{background:"var(--sidebar-bg)",borderRight:"1px solid var(--sidebar-border)"}}>
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

      {/* 유저 정보 - 이름 + 직급 표시 */}
      <div className="px-4 py-3" style={{borderBottom:"1px solid var(--sidebar-border)"}}>
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
    </aside>
  );
}
