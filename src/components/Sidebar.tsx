"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CRMUser, logout, TEAM_MEMBER_ROLES } from "@/lib/auth";
import {
  LayoutDashboard, Users, Kanban, BarChart3,
  CalendarDays, Truck, Shield, Award,
  CreditCard, LogOut, ChevronRight,
  Building2,
} from "lucide-react";

interface SidebarProps { user: CRMUser; }

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
];

const ADMIN_EXTRA = [
  { href: "/reports", label: "팀 성과 분석", icon: BarChart3 },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "admin";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const active = pathname === href;
    return (
      <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
        active
          ? "bg-blue-50 text-blue-700 font-semibold border border-blue-100"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
          <div className="w-8 h-8 bg-gradient-to-br from-[#0B1629] to-[#1E3A8A] rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-[#C9A84C] font-bold text-sm">분</span>
          </div>
          <div>
            <p className="text-slate-800 font-bold text-sm leading-tight">분양회 CRM</p>
            <p className="text-slate-400 text-xs">광고인㈜ 대외협력팀</p>
          </div>
        </div>
      </div>

      {/* 유저 정보 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            isAdmin ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
          }`}>
            {user.name[0]}
          </div>
          <div>
            <p className="text-slate-800 text-xs font-semibold leading-tight">{user.name}</p>
            <p className={`text-xs ${isAdmin ? "text-amber-600" : "text-slate-400"}`}>
              {isAdmin ? "관리자" : TEAM_MEMBER_ROLES[user.name] || "담당자"}
            </p>
          </div>
          {isAdmin && (
            <span className="ml-auto text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100 font-medium">
              관리
            </span>
          )}
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {/* 실행파트 */}
        <div className="section-header px-1 pt-0 pb-1.5 text-slate-400 text-[10px] font-semibold tracking-widest uppercase">
          ■ 실행파트
        </div>
        {EXEC_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        {/* 구분선 */}
        <div className="my-2 border-t border-slate-100" />

        {/* 운영파트 */}
        <div className="px-1 pb-1.5 text-slate-400 text-[10px] font-semibold tracking-widest uppercase">
          ■ 운영파트
        </div>
        {OPS_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        {/* 관리자 전용 */}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-amber-100" />
            <div className="px-1 pb-1.5 text-amber-500 text-[10px] font-semibold tracking-widest uppercase">
              ★ 관리자 전용
            </div>
            {ADMIN_EXTRA.map((m) => <NavItem key={m.href} {...m} />)}
          </>
        )}
      </nav>

      {/* 목표 미니 위젯 */}
      <div className="px-3 pb-2">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <p className="text-slate-400 text-xs mb-1.5">4월 분양회 입회 목표</p>
          <div className="flex items-end justify-between">
            <span className="text-[#C9A84C] font-bold text-lg">2</span>
            <span className="text-slate-400 text-xs">/ 16명</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: "12.5%" }} />
          </div>
        </div>
      </div>

      {/* 로그아웃 */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={13} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
