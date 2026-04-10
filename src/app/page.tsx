import { supabase, TEAM_MEMBERS, MEMBER_ROLES, formatCurrency } from "@/lib/supabase";
import { Contact, MonthlyGoal } from "@/types";
import {
  Users,
  Phone,
  CalendarCheck,
  TrendingUp,
  CheckCircle,
  Clock,
  Target,
} from "lucide-react";

async function getDashboardData() {
  const now = new Date();
  const year = 2026;
  const month = 4;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: goals } = await supabase
    .from("monthly_goals")
    .select("*")
    .eq("year", year)
    .eq("month", month);

  return { contacts: (contacts as Contact[]) || [], goals: (goals as MonthlyGoal[]) || [] };
}

export default async function DashboardPage() {
  const { contacts, goals } = await getDashboardData();

  const totalContacts = contacts.length;
  const totalTm = contacts.filter((c) => c.has_tm).length;
  const prospects = contacts.filter((c) => c.prospect_type).length;
  const contracts = contacts.filter((c) => c.meeting_result === "계약완료").length;
  const reservations = contacts.filter((c) => c.meeting_result === "예약완료").length;
  const upcomingMeetings = contacts.filter(
    (c) =>
      c.meeting_date &&
      new Date(c.meeting_date) >= new Date() &&
      c.meeting_result !== "계약거부" &&
      c.meeting_result !== "미팅불발"
  ).length;

  // 팀원별 통계
  const memberStats = TEAM_MEMBERS.map((name) => {
    const myContacts = contacts.filter((c) => c.assigned_to === name);
    const goal = goals.find((g) => g.member_name === name);
    const myContracts = myContacts.filter((c) => c.meeting_result === "계약완료").length;
    const myReservations = myContacts.filter((c) => c.meeting_result === "예약완료").length;
    const myProspects = myContacts.filter((c) => c.prospect_type).length;
    const myTm = myContacts.filter((c) => c.has_tm).length;

    return {
      name,
      role: MEMBER_ROLES[name],
      totalContacts: myContacts.length,
      tm: myTm,
      prospects: myProspects,
      contracts: myContracts,
      reservations: myReservations,
      goal,
      contractRate: myTm > 0 ? ((myContracts / myTm) * 100).toFixed(1) : "0.0",
    };
  });

  // 최근 계약/예약
  const recentDeals = contacts
    .filter((c) => c.meeting_result === "계약완료" || c.meeting_result === "예약완료")
    .sort((a, b) =>
      new Date(b.updated_at || b.created_at).getTime() -
      new Date(a.updated_at || a.created_at).getTime()
    )
    .slice(0, 5);

  // 이번 주 미팅 예정
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const thisWeekMeetings = contacts
    .filter((c) => {
      if (!c.meeting_date) return false;
      const d = new Date(c.meeting_date);
      return d >= today && d <= weekEnd;
    })
    .sort((a, b) => new Date(a.meeting_date!).getTime() - new Date(b.meeting_date!).getTime())
    .slice(0, 8);

  const kpiCards = [
    { label: "전체 고객", value: totalContacts.toLocaleString(), icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "TM 완료", value: totalTm.toLocaleString(), icon: Phone, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "가망 고객", value: prospects.toLocaleString(), icon: Target, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "미팅 예정", value: upcomingMeetings.toLocaleString(), icon: CalendarCheck, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "계약 완료", value: contracts.toLocaleString(), icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "예약 완료", value: reservations.toLocaleString(), icon: Clock, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text">대협팀 월간 대시보드</h1>
          <p className="text-brand-muted text-sm mt-0.5">2026년 4월 · 분양회 VIP 100인 모집</p>
        </div>
        <div className="text-right">
          <p className="text-brand-gold font-bold text-2xl">{contracts + reservations}명</p>
          <p className="text-brand-muted text-xs">계약+예약 합산</p>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-brand-surface border border-brand-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-brand-muted text-xs">{label}</p>
              <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 팀원별 목표 달성 현황 */}
      <div>
        <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">
          팀원별 목표 달성 현황
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {memberStats.map((m) => {
            const targetContracts = m.goal?.target_contracts || 4;
            const rate = Math.min((m.contracts / targetContracts) * 100, 100);
            return (
              <div key={m.name} className="bg-brand-surface border border-brand-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-gold/20 rounded-full flex items-center justify-center">
                      <span className="text-brand-gold font-bold text-xs">{m.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-brand-text font-medium text-sm">{m.name}</p>
                      <p className="text-brand-muted text-xs">{m.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-brand-gold font-bold">
                      {m.contracts + m.reservations}
                      <span className="text-brand-muted font-normal text-xs">/{targetContracts}</span>
                    </p>
                    <p className="text-brand-muted text-xs">계약+예약</p>
                  </div>
                </div>

                {/* 진행바 */}
                <div className="h-1.5 bg-brand-border rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-brand-gold rounded-full transition-all"
                    style={{ width: `${rate}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-brand-text font-semibold text-sm">{m.tm}</p>
                    <p className="text-brand-muted text-xs">TM</p>
                  </div>
                  <div>
                    <p className="text-amber-400 font-semibold text-sm">{m.prospects}</p>
                    <p className="text-brand-muted text-xs">가망</p>
                  </div>
                  <div>
                    <p className="text-emerald-400 font-semibold text-sm">{m.contractRate}%</p>
                    <p className="text-brand-muted text-xs">전환율</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 2열 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 이번 주 미팅 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
            <CalendarCheck size={14} className="text-brand-gold" />
            향후 7일 미팅 예정
          </h2>
          {thisWeekMeetings.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-4">예정된 미팅이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {thisWeekMeetings.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-brand-border/50 last:border-0">
                  <div className="w-10 text-center">
                    <p className="text-brand-gold text-xs font-bold">
                      {new Date(c.meeting_date!).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-brand-text text-sm truncate">{c.name}</p>
                    <p className="text-brand-muted text-xs truncate">
                      {c.meeting_address || "장소 미정"} · {c.assigned_to}
                    </p>
                  </div>
                  {c.tm_sensitivity && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        c.tm_sensitivity === "상"
                          ? "bg-red-500/20 text-red-300"
                          : c.tm_sensitivity === "중"
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {c.tm_sensitivity}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 성과 */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-gold" />
            최근 계약 · 예약 현황
          </h2>
          {recentDeals.length === 0 ? (
            <p className="text-brand-muted text-sm text-center py-4">아직 실적이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {recentDeals.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-brand-border/50 last:border-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${
                      c.meeting_result === "계약완료"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }`}
                  >
                    {c.meeting_result}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-brand-text text-sm truncate">{c.name}</p>
                    <p className="text-brand-muted text-xs">{c.assigned_to} · {c.meeting_address}</p>
                  </div>
                  {c.contract_date && (
                    <p className="text-brand-muted text-xs flex-shrink-0">
                      {new Date(c.contract_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 팀 매출 요약 */}
          <div className="mt-4 pt-3 border-t border-brand-border">
            <p className="text-brand-muted text-xs mb-2">월 예상 매출 (회비 기준)</p>
            <p className="text-brand-gold font-bold text-lg">
              {formatCurrency((contracts + reservations) * 500000)}
            </p>
            <p className="text-brand-muted text-xs">목표 대비 {(((contracts + reservations) * 500000) / 80000000 * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
