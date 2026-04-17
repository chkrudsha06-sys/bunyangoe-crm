"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CRMUser, logout } from "@/lib/auth";
import {
  LayoutDashboard, Users, Kanban, BarChart3,
  CalendarDays, Truck, Shield, Award,
  CreditCard, LogOut, ChevronRight, FileText, Target,
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
  { href: "/quotes", label: "견적서", icon: FileText },
];

const ADMIN_EXTRA = [
  { href: "/reports",       label: "팀 성과 분석", icon: BarChart3 },
  { href: "/kpi-settings",  label: "KPI 설정",    icon: Target },
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

  const handleLogout = () => { logout(); router.push("/login"); };

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const active = pathname === href;
    return (
      <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
        active ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}>
        <Icon size={15} className={active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight size={12} className="text-blue-400" />}
      </Link>
    );
  };

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm">
      {/* 로고 */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <Image src="/icon-logo.png" alt="로고" width={36} height={36} style={{ objectFit: "contain", flexShrink: 0 }} />
          <div>
            <p className="text-slate-800 font-bold text-sm leading-tight">분양회 CRM</p>
            <p className="text-slate-400 text-xs">광고인㈜ 대외협력팀</p>
          </div>
        </div>
      </div>

      {/* 유저 정보 - 이름 + 직급 표시 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
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
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {/* 실행파트 - 전체 공개 */}
        <div className="px-1 pb-1.5 text-slate-400 text-[10px] font-semibold tracking-widest uppercase">■ 실행파트</div>
        {EXEC_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        {/* 운영파트 - 전체 공개 */}
        <div className="my-2 border-t border-slate-100" />
        <div className="px-1 pb-1.5 text-slate-400 text-[10px] font-semibold tracking-widest uppercase">■ 운영파트</div>
        {OPS_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        {/* 관리자 전용 */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-amber-100" />
            <div className="px-1 pb-1.5 text-amber-500 text-[10px] font-semibold tracking-widest uppercase">★ 관리자 전용</div>
            {ADMIN_EXTRA.map((m) => <NavItem key={m.href} {...m} />)}
          </>
        )}
      </nav>

      {/* 로그아웃 */}
      <div className="px-3 pb-4">
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut size={13} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
