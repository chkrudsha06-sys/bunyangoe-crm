"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CRMUser, logout } from "@/lib/auth";
import { ChevronRight, LogOut } from "lucide-react";

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
  { href: "/", label: "대시보드", emoji: "📊" },
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

const ADMIN_EXTRA = [
  { href: "/reports", label: "팀 성과 분석", emoji: "📈" },
  { href: "/kpi-settings", label: "KPI 설정", emoji: "🎯" },
  { href: "/incentives", label: "인센티브 관리", emoji: "🏅" },
];

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

  const NavItem = ({ href, label, emoji }: { href: string; label: string; emoji: string }) => {
    const active = pathname === href;
    return (
      <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group"
        style={{
          background: active ? "var(--sidebar-active)" : "transparent",
          color: active ? "var(--text)" : "var(--text-muted)",
          fontWeight: active ? 700 : 400,
          borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
        }}
        onMouseEnter={e=>{if(!active)(e.currentTarget as HTMLElement).style.background="var(--sidebar-hover)";}}
        onMouseLeave={e=>{if(!active)(e.currentTarget as HTMLElement).style.background="transparent";}}>
        <span style={{fontSize:17,width:22,textAlign:"center"}}>{emoji}</span>
        <span className="flex-1">{label}</span>
        {active && <ChevronRight size={12} style={{color:"var(--primary)"}} />}
      </Link>
    );
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col" style={{background:"var(--sidebar-bg)",borderRight:"1px solid var(--border)"}}>
      {/* 로고 */}
      <div className="px-4 py-4" style={{borderBottom:"1px solid var(--border)"}}>
        <div className="flex items-center gap-2.5">
          <Image src="/icon-logo.png" alt="로고" width={36} height={36} style={{ objectFit: "contain", flexShrink: 0 }} />
          <div>
            <p className="font-bold text-sm leading-tight" style={{color:"var(--text)"}}>분양회 CRM</p>
            <p className="text-xs" style={{color:"var(--text-subtle)"}}>광고인㈜ 대외협력팀</p>
          </div>
        </div>
      </div>

      {/* 유저 정보 */}
      <div className="px-4 py-3" style={{borderBottom:"1px solid var(--border)"}}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{background:"var(--primary-bg)",color:"var(--primary)"}}>
            {user.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold leading-tight" style={{color:"var(--text)"}}>{user.name}</p>
              <span className="text-xs font-medium" style={{color:"var(--text-muted)"}}>{user.title}</span>
            </div>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
              style={{background:"var(--primary-bg)",color:"var(--primary)"}}>
              {roleStyle.label}
            </span>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <div className="px-1 pb-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{color:"var(--text-subtle)"}}>■ 실행파트</div>
        {EXEC_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        <div className="my-2" style={{borderTop:"1px solid var(--border)"}} />
        <div className="px-1 pb-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{color:"var(--text-subtle)"}}>■ 운영파트</div>
        {OPS_MENUS.map((m) => <NavItem key={m.href} {...m} />)}

        {isAdmin && (
          <>
            <div className="my-2" style={{borderTop:"1px solid var(--border)"}} />
            <div className="px-1 pb-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{color:"var(--accent-gold)"}}>★ 관리자 전용</div>
            {ADMIN_EXTRA.map((m) => <NavItem key={m.href} {...m} />)}
          </>
        )}
      </nav>

      {/* 로그아웃 */}
      <div className="px-3 pb-4">
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs rounded-xl transition-colors"
          style={{color:"var(--text-subtle)"}}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="var(--error)"}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="var(--text-subtle)"}>
          <LogOut size={14} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
