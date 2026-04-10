"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  BarChart3,
  CalendarDays,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/contacts", label: "전체 고객", icon: Users },
  { href: "/pipeline", label: "파이프라인", icon: Kanban },
  { href: "/calendar", label: "미팅 캘린더", icon: CalendarDays },
  { href: "/reports", label: "성과 분석", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-brand-navy-light border-r border-brand-border flex flex-col">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-gold rounded flex items-center justify-center">
            <span className="text-brand-navy font-bold text-xs">분</span>
          </div>
          <div>
            <p className="text-brand-text font-bold text-sm leading-tight">분양회 CRM</p>
            <p className="text-brand-muted text-xs">대외협력팀</p>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                isActive
                  ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                  : "text-brand-muted hover:text-brand-text hover:bg-brand-surface"
              }`}
            >
              <Icon size={16} className={isActive ? "text-brand-gold" : ""} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={12} className="text-brand-gold" />}
            </Link>
          );
        })}
      </nav>

      {/* 목표 현황 미니 위젯 */}
      <div className="px-3 pb-4">
        <div className="bg-brand-surface border border-brand-border rounded-lg p-3">
          <p className="text-brand-muted text-xs mb-2">4월 분양회 입회 목표</p>
          <div className="flex items-end justify-between">
            <span className="text-brand-gold font-bold text-lg">2</span>
            <span className="text-brand-muted text-xs">/ 16명</span>
          </div>
          <div className="mt-2 h-1.5 bg-brand-border rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-gold rounded-full transition-all"
              style={{ width: "12.5%" }}
            />
          </div>
          <p className="text-brand-muted text-xs mt-1">달성률 12.5%</p>
        </div>
      </div>

      {/* 회사 브랜드 */}
      <div className="px-5 py-3 border-t border-brand-border">
        <p className="text-brand-muted text-xs">광고인㈜ · 분양의신</p>
      </div>
    </aside>
  );
}
