"use client";

import { logout, type CRMUser } from "@/lib/auth";
import {
  Archive,
  Bell,
  Broadcast,
  Buildings,
  CalendarDots,
  CaretRight,
  ChartLineUp,
  ChatCircleText,
  ClockCounterClockwise,
  Crown,
  FileText,
  Gauge,
  GearSix,
  GitBranch,
  IdentificationCard,
  Medal,
  Moon,
  NotePencil,
  Robot,
  SignOut,
  Sparkle,
  SquaresFour,
  Sun,
  Target,
  Trophy,
  Truck,
  UserCircleGear,
  UsersThree,
  X,
  type Icon,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface NotificationItem {
  id: number;
  message: string | null;
  created_at: string;
  is_read: boolean;
  assignee_name?: string;
  title?: string;
  source_type?: string;
  source_id?: number | null;
}

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

type MenuItem = {
  href: string;
  label: string;
  icon: Icon;
};

const EXEC_MENUS: MenuItem[] = [
  { href: "/", label: "대시보드", icon: SquaresFour },
  { href: "/customer-register", label: "고객등록", icon: IdentificationCard },
  { href: "/customer-journey", label: "고객여정", icon: Sparkle },
  { href: "/tasks", label: "업무전달", icon: ChatCircleText },
  { href: "/contacts", label: "고객 DB", icon: UsersThree },
  { href: "/pipeline", label: "파이프라인", icon: GitBranch },
  { href: "/vip-members", label: "분양회 입회자", icon: Crown },
  { href: "/wanpan-truck", label: "완판트럭", icon: Truck },
  { href: "/calendar", label: "운영캘린더", icon: CalendarDots },
  { href: "/memo", label: "메모장", icon: NotePencil },
];

const OPS_MENUS: MenuItem[] = [
  { href: "/member-manage", label: "분양회 회원관리", icon: UserCircleGear },
  { href: "/content-manage", label: "회원 컨텐츠 관리", icon: Sparkle },
  { href: "/member-timeline", label: "회원 타임라인", icon: ClockCounterClockwise },
  { href: "/sales", label: "통합매출관리", icon: ChartLineUp },
  { href: "/rewards", label: "리워드 관리", icon: Trophy },
  { href: "/customer-incentives", label: "인센티브 관리", icon: Medal },
  { href: "/quotes", label: "견적서", icon: FileText },
];

const INFO_MENUS: MenuItem[] = [
  { href: "/new-sites", label: "신규현장", icon: Buildings },
  { href: "/ad-sites", label: "광고 현운예지", icon: Broadcast },
  { href: "/ad-history", label: "광고내역기록", icon: Archive },
];

const ADMIN_MENUS: MenuItem[] = [
  { href: "/reports", label: "팀 성과 분석", icon: Target },
  { href: "/kpi-settings", label: "KPI 설정", icon: Gauge },
  { href: "/incentives", label: "인센티브 관리", icon: Medal },
  { href: "/account-manage", label: "계정관리", icon: GearSix },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  exec: "실행파트",
  ops: "운영파트",
  ad: "광고사업부",
  shared: "공용",
};

function initials(name: string) {
  return name?.slice(0, 1) || "U";
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 pb-2 pt-4 text-[11px] font-[800] uppercase tracking-[0.12em]"
      style={{ color: "var(--text-faint)" }}
    >
      {children}
    </div>
  );
}

export default function Sidebar({
  user,
  unreadCount = 0,
  notifications = [],
  showPanel = false,
  onBellClick,
  onPanelClose,
  onMarkAll,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "admin";
  const roleLabel = ROLE_LABEL[user.role] || ROLE_LABEL.exec;

  const [darkMode, setDarkMode] = useState(true);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("crm_dark_mode");

    if (saved === "false") {
      setDarkMode(false);
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      setDarkMode(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  useEffect(() => {
    if (!showPanel) return;

    const handler = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        onPanelClose?.();
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPanel, onPanelClose]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);

    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }

    localStorage.setItem("crm_dark_mode", String(next));
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const goNotification = (notification: NotificationItem) => {
    if (notification.source_type === "업무전달") {
      router.push("/tasks");
    } else if (notification.source_type === "완판트럭") {
      router.push("/wanpan-truck");
    }

    onPanelClose?.();
    onMobileClose?.();
  };

  const NavItem = ({ href, label, icon: IconComponent }: MenuItem) => {
    const active = isActivePath(pathname, href);

    return (
      <Link
        href={href}
        onClick={() => onMobileClose?.()}
        className="group flex h-10 items-center gap-3 rounded-[12px] px-3 text-[14px] font-[720] tracking-[-0.026em] transition-all"
        style={{
          background: active ? "var(--accent-subtle)" : "transparent",
          border: active ? "1px solid var(--accent-border)" : "1px solid transparent",
          color: active ? "var(--text)" : "var(--text-subtle)",
        }}
        onMouseEnter={(event) => {
          if (!active) event.currentTarget.style.background = "var(--surface-hover)";
        }}
        onMouseLeave={(event) => {
          if (!active) event.currentTarget.style.background = "transparent";
        }}
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] transition-colors"
          style={{
            background: active ? "var(--accent-bg)" : "transparent",
            color: active ? "var(--accent-text)" : "var(--text-faint)",
          }}
        >
          <IconComponent size={19} weight={active ? "duotone" : "regular"} />
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {active && <CaretRight size={15} weight="bold" style={{ color: "var(--accent-text)" }} />}
      </Link>
    );
  };

  const NotificationPanel = () => (
    <div
      className="absolute left-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-[18px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-2)",
        boxShadow: "var(--shadow-xl)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <Bell size={15} weight="duotone" style={{ color: "var(--accent-text)" }} />
          <span className="text-[13px] font-[760] tracking-[-0.025em]" style={{ color: "var(--text)" }}>
            알림
          </span>
          {unreadCount > 0 && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: "var(--danger)" }}>
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAll}
              className="rounded-[8px] px-2 py-1 text-[11px] font-bold"
              style={{ color: "var(--accent-text)" }}
            >
              전체 읽음
            </button>
          )}
          <button
            type="button"
            onClick={onPanelClose}
            className="flex h-7 w-7 items-center justify-center rounded-[8px]"
            style={{ color: "var(--text-faint)" }}
          >
            <X size={15} weight="bold" />
          </button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-11">
            <Bell size={26} weight="duotone" style={{ color: "var(--text-disabled)" }} />
            <p className="text-[12px] font-semibold" style={{ color: "var(--text-faint)" }}>
              알림이 없습니다
            </p>
          </div>
        ) : (
          notifications.slice(0, 20).map((notification) => {
            const isTask = notification.source_type === "업무전달";
            const isWanpan = notification.source_type === "완판트럭";
            const color = isTask ? "var(--purple-text)" : isWanpan ? "var(--warning-text)" : "var(--info-text)";
            const bg = isTask ? "var(--purple-bg)" : isWanpan ? "var(--warning-bg)" : "var(--info-bg)";
            const border = isTask ? "var(--purple-border)" : isWanpan ? "var(--warning-border)" : "var(--info-border)";

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => goNotification(notification)}
                className="flex w-full gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background: notification.is_read ? "transparent" : "var(--surface-selected)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: bg, border: `1px solid ${border}`, color }}
                >
                  {isTask ? (
                    <ChatCircleText size={15} weight="duotone" />
                  ) : isWanpan ? (
                    <Truck size={15} weight="duotone" />
                  ) : (
                    <Bell size={15} weight="duotone" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="line-clamp-1 text-[12px] font-[740] tracking-[-0.02em]"
                      style={{ color: notification.is_read ? "var(--text-subtle)" : "var(--text)" }}
                    >
                      {notification.title || notification.source_type}
                    </span>
                    {!notification.is_read && (
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "var(--danger)" }} />
                    )}
                  </span>

                  {notification.message && (
                    <span className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed" style={{ color: "var(--text-subtle)" }}>
                      {notification.message}
                    </span>
                  )}

                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="crm-tiny">
                      {new Date(notification.created_at).toLocaleString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: bg, color, border: `1px solid ${border}` }}
                    >
                      {notification.source_type}
                    </span>
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const SidebarInner = () => (
    <div className="flex h-full w-full flex-col overflow-hidden" style={{ background: "var(--surface)" }}>
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[15px]"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <Image src="/icon-logo.png" alt="로고" width={34} height={34} style={{ objectFit: "contain" }} />
          </div>

          <div className="min-w-0">
            <p className="line-clamp-1 text-[16px] font-[820] tracking-[-0.05em]" style={{ color: "var(--text-strong)" }}>
              분양회 CRM
            </p>
            <p className="crm-tiny mt-0.5">광고인㈜ 대외협력팀</p>
          </div>
        </div>
      </div>

      <div className="relative px-5 py-4" ref={bellRef} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2.5">
          <div className="crm-avatar" style={{ background: "linear-gradient(135deg,#8b7cf6,#60a5fa)" }}>
            {initials(user.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="line-clamp-1 text-[15px] font-[800] tracking-[-0.035em]" style={{ color: "var(--text)" }}>
                {user.name}
              </p>
              <span className="line-clamp-1 text-[12px] font-semibold" style={{ color: "var(--text-faint)" }}>
                {user.title}
              </span>
            </div>
            <span
              className="mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{
                background: "var(--accent-subtle)",
                border: "1px solid var(--accent-border)",
                color: "var(--accent-text)",
              }}
            >
              {roleLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onBellClick}
            className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px]"
            style={{
              background: showPanel ? "var(--accent-subtle)" : "var(--surface-2)",
              border: `1px solid ${showPanel ? "var(--accent-border)" : "var(--border)"}`,
              color: unreadCount > 0 ? "var(--warning-text)" : "var(--text-subtle)",
            }}
            aria-label="알림"
          >
            <Bell size={17} weight={showPanel || unreadCount > 0 ? "duotone" : "regular"} />
            {unreadCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: "var(--danger)" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showPanel && <NotificationPanel />}
        </div>
      </div>

      <nav className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarGutter: "stable" }}>
        <SectionTitle>Execution</SectionTitle>
        <div className="space-y-1">{EXEC_MENUS.map((menu) => <NavItem key={menu.href} {...menu} />)}</div>

        <div className="my-3" style={{ borderTop: "1px solid var(--border-subtle)" }} />
        <SectionTitle>Operation</SectionTitle>
        <div className="space-y-1">{OPS_MENUS.map((menu) => <NavItem key={menu.href} {...menu} />)}</div>

        <div className="my-3" style={{ borderTop: "1px solid var(--border-subtle)" }} />
        <SectionTitle>Information</SectionTitle>
        <div className="space-y-1">{INFO_MENUS.map((menu) => <NavItem key={menu.href} {...menu} />)}</div>

        <div className="my-3" style={{ borderTop: "1px solid var(--border-subtle)" }} />
        <SectionTitle>AI</SectionTitle>
        <div className="space-y-1">
          <NavItem href="/ai-assistant" label="AI 어시스턴트" icon={Robot} />
        </div>

        {isAdmin && (
          <>
            <div className="my-3" style={{ borderTop: "1px solid var(--border-subtle)" }} />
            <SectionTitle>Admin</SectionTitle>
            <div className="space-y-1">{ADMIN_MENUS.map((menu) => <NavItem key={menu.href} {...menu} />)}</div>
          </>
        )}
      </nav>

      <div className="space-y-1.5 px-4 pb-5 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <button
          type="button"
          onClick={toggleDark}
          className="flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-[14px] font-[720] transition-colors"
          style={{ color: "var(--text-subtle)" }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-[9px]"
            style={{ color: darkMode ? "var(--warning-text)" : "var(--accent-text)" }}
          >
            {darkMode ? <Sun size={17} weight="duotone" /> : <Moon size={17} weight="duotone" />}
          </span>
          {darkMode ? "라이트 모드" : "다크 모드"}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-[14px] font-[720] transition-colors"
          style={{ color: "var(--text-subtle)" }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ color: "var(--danger-text)" }}>
            <SignOut size={17} weight="regular" />
          </span>
          로그아웃
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="hidden w-[296px] flex-shrink-0 overflow-hidden md:flex"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border-subtle)",
          boxShadow: "inset -1px 0 0 rgba(255,255,255,0.015)",
        }}
      >
        <SidebarInner />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 w-full"
            style={{ background: "var(--overlay)", backdropFilter: "blur(4px)" }}
            onClick={onMobileClose}
            aria-label="메뉴 닫기"
          />

          <div
            className="absolute bottom-0 left-0 top-0 w-[320px] overflow-hidden"
            style={{
              background: "var(--surface)",
              borderRight: "1px solid var(--border-2)",
              boxShadow: "var(--shadow-xl)",
              animation: "drawerIn 220ms var(--ease-soft) both",
            }}
          >
            <SidebarInner />
          </div>
        </div>
      )}

      <style>{`
        @keyframes drawerIn {
          from {
            transform: translateX(-28px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
