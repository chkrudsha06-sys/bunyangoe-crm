"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, CRMUser } from "@/lib/auth";
import {
  Users, Award, Calendar, TrendingUp,
  Target, CreditCard, BarChart3, Zap,
  Clock, ChevronRight,
} from "lucide-react";

// ── 타입 ──
interface DashStats {
  // 분양회 입회
  contract: number;
  reservation: number;
  // 가망고객
  hotProspect: number;
  meetingProspect: number;
  linkedProspect: number;
  // 미팅예정
  upcomingMeetings: number;
  // 매출
  membershipFeeCount: number;
  membershipFeeAmount: number;
  monthlyFeeCount: number;
  monthlyFeeAmount: number;
  hightargetWanpan: number;
  hightargetBunyang: number;
  totalAdRevenue: number;
}

const EMPTY: DashStats = {
  contract: 0, reservation: 0,
  hotProspect: 0, meetingProspect: 0, linkedProspect: 0,
  upcomingMeetings: 0,
  membershipFeeCount: 0, membershipFeeAmount: 0,
  monthlyFeeCount: 0, monthlyFeeAmount: 0,
  hightargetWanpan: 0, hightargetBunyang: 0,
  totalAdRevenue: 0,
};

function formatWon(n: number) {
  if (!n) return "0원";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.floor(n / 10000)}만원`;
  return `${n.toLocaleString()}원`;
}

async function fetchStats(user: CRMUser, isMonthly: boolean): Promise<DashStats> {
  const isExec = user.role === "exec";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  // contacts 쿼리
  let contactQ = supabase.from("contacts").select("meeting_result, tm_sensitivity, meeting_date, contract_date");
  if (isExec) contactQ = contactQ.eq("assigned_to", user.name);
  if (isMonthly) {
    contactQ = contactQ.gte("created_at", monthStart).lte("created_at", monthEnd + "T23:59:59");
  }
  const { data: contacts } = await contactQ;
  const c = contacts || [];

  // ad_executions 쿼리
  let adQ = supabase.from("ad_executions").select("execution_amount, channel, contract_route, payment_date");
  if (isExec) adQ = adQ.eq("team_member", user.name);
  if (isMonthly) {
    adQ = adQ.gte("payment_date", monthStart).lte("payment_date", monthEnd);
  }
  const { data: ads } = await adQ;
  const a = ads || [];

  // rewards 쿼리 (입회비/월회비)
  let rwQ = supabase.from("rewards").select("accumulated_reward, quarter, is_paid");
  const { data: rewards } = await rwQ;
  const rw = rewards || [];

  // 미팅예정 (오늘 이후)
  let meetQ = supabase.from("contacts").select("id").gte("meeting_date", today);
  if (isExec) meetQ = meetQ.eq("assigned_to", user.name);
  const { data: meetings } = await meetQ;

  return {
    contract: c.filter((x: any) => x.meeting_result === "계약완료").length,
    reservation: c.filter((x: any) => x.meeting_result === "예약완료").length,
    hotProspect: c.filter((x: any) => x.tm_sensitivity === "즉가입가망").length,
    meetingProspect: c.filter((x: any) => x.tm_sensitivity === "미팅예정가망").length,
    linkedProspect: c.filter((x: any) => x.tm_sensitivity === "연계매출가망").length,
    upcomingMeetings: (meetings || []).length,
    membershipFeeCount: c.filter((x: any) => x.meeting_result === "계약완료").length,
    membershipFeeAmount: c.filter((x: any) => x.meeting_result === "계약완료").length * 500000,
    monthlyFeeCount: c.filter((x: any) => x.meeting_result === "계약완료").length,
    monthlyFeeAmount: c.filter((x: any) => x.meeting_result === "계약완료").length * 100000,
    hightargetWanpan: a.filter((x: any) => x.channel === "하이타겟" && x.contract_route === "완판트럭")
      .reduce((s: number, x: any) => s + (x.execution_amount || 0), 0),
    hightargetBunyang: a.filter((x: any) => x.channel === "하이타겟" && x.contract_route === "분양회")
      .reduce((s: number, x: any) => s + (x.execution_amount || 0), 0),
    totalAdRevenue: a.reduce((s: number, x: any) => s + (x.execution_amount || 0), 0),
  };
}

// ── 카드 컴포넌트 ──
function StatCard({
  icon: Icon, label, value, sub, color, children
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; children?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <ChevronRight size={14} className="text-slate-300" />
      </div>
      <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {children}
    </div>
  );
}

function SubRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-700">{value}</span>
    </div>
  );
}

// ── 대시보드 패널 ──
function DashPanel({ title, stats, loading }: { title: string; stats: DashStats; loading: boolean }) {
  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalJoin = stats.contract + stats.reservation;
  const totalProspect = stats.hotProspect + stats.meetingProspect + stats.linkedProspect;

  return (
    <div className="flex-1 min-w-0">
      {/* 패널 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-blue-500 rounded-full" />
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{title}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 분양회 입회수 */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Award size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">분양회 입회수</p>
              <p className="text-2xl font-black text-slate-800 leading-tight">{totalJoin}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-semibold mb-0.5">계약완료</p>
              <p className="text-xl font-black text-emerald-700">{stats.contract}<span className="text-xs font-normal ml-0.5">건</span></p>
            </div>
            <div className="bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
              <p className="text-xs text-blue-600 font-semibold mb-0.5">예약완료</p>
              <p className="text-xl font-black text-blue-700">{stats.reservation}<span className="text-xs font-normal ml-0.5">건</span></p>
            </div>
          </div>
        </div>

        {/* 가망고객 */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Target size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">가망고객</p>
              <p className="text-2xl font-black text-slate-800 leading-tight">{totalProspect}<span className="text-sm font-normal text-slate-400 ml-1">명</span></p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-red-50 rounded-xl px-2 py-2 border border-red-100 text-center">
              <p className="text-[10px] text-red-500 font-semibold mb-0.5">즉가입가망</p>
              <p className="text-lg font-black text-red-600">{stats.hotProspect}</p>
            </div>
            <div className="bg-amber-50 rounded-xl px-2 py-2 border border-amber-100 text-center">
              <p className="text-[10px] text-amber-600 font-semibold mb-0.5">미팅예정가망</p>
              <p className="text-lg font-black text-amber-700">{stats.meetingProspect}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-2 py-2 border border-slate-100 text-center">
              <p className="text-[10px] text-slate-500 font-semibold mb-0.5">연계매출가망</p>
              <p className="text-lg font-black text-slate-700">{stats.linkedProspect}</p>
            </div>
          </div>
        </div>

        {/* 미팅예정 */}
        <StatCard icon={Calendar} label="미팅예정" value={stats.upcomingMeetings} sub="건" color="bg-gradient-to-br from-cyan-500 to-blue-600">
        </StatCard>

        {/* 입회비 */}
        <StatCard icon={CreditCard} label="입회비" value={`${stats.membershipFeeCount}건`} color="bg-gradient-to-br from-emerald-500 to-teal-600">
          <SubRow label="금액" value={formatWon(stats.membershipFeeAmount)} />
        </StatCard>

        {/* 월회비 */}
        <StatCard icon={Users} label="월회비" value={`${stats.monthlyFeeCount}건`} color="bg-gradient-to-br from-blue-500 to-indigo-600">
          <SubRow label="금액" value={formatWon(stats.monthlyFeeAmount)} />
        </StatCard>

        {/* 연계매출 하이타겟 */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">연계매출 (하이타겟)</p>
              <p className="text-2xl font-black text-slate-800 leading-tight">{formatWon(stats.hightargetWanpan + stats.hightargetBunyang)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
              <p className="text-xs text-blue-600 font-semibold mb-0.5">완판트럭</p>
              <p className="text-base font-black text-blue-800">{formatWon(stats.hightargetWanpan)}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-100">
              <p className="text-xs text-indigo-600 font-semibold mb-0.5">분양회</p>
              <p className="text-base font-black text-indigo-800">{formatWon(stats.hightargetBunyang)}</p>
            </div>
          </div>
        </div>

        {/* 광고특전매출 총매출 */}
        <div className="col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <p className="text-xs text-white/60 font-medium">광고특전매출 총매출</p>
          </div>
          <p className="text-3xl font-black text-white">{formatWon(stats.totalAdRevenue)}</p>
        </div>
      </div>
    </div>
  );
}

// ── 메인 대시보드 ──
export default function DashboardPage() {
  const [user, setUser] = useState<CRMUser | null>(null);
  const [monthly, setMonthly] = useState<DashStats>(EMPTY);
  const [total, setTotal] = useState<DashStats>(EMPTY);
  const [loadingM, setLoadingM] = useState(true);
  const [loadingT, setLoadingT] = useState(true);
  const [now, setNow] = useState(new Date());

  // 실시간 시계
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 유저 로드
  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
  }, []);

  // 데이터 로드
  useEffect(() => {
    if (!user) return;
    setLoadingM(true); setLoadingT(true);
    fetchStats(user, true).then(d => { setMonthly(d); setLoadingM(false); });
    fetchStats(user, false).then(d => { setTotal(d); setLoadingT(false); });
  }, [user]);

  // 날짜/시간 포맷
  const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  const isExec = user?.role === "exec";
  const headerName = isExec ? `${user?.name} ${user?.title}` : "종합";

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">
              대외협력팀{" "}
              <span className="text-blue-600">{headerName}</span>
              {" "}대시보드
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock size={13} className="text-blue-400" />
                <span className="text-sm font-medium">{dateStr}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-sm font-mono font-bold text-blue-600 tabular-nums">{timeStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            실시간 데이터
          </div>
        </div>
      </div>

      {/* 대시보드 본문 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 min-h-full">
          {/* 왼쪽: 월간 */}
          <div className="flex-1 min-w-0 bg-blue-50/50 rounded-2xl border border-blue-100 p-4">
            <DashPanel
              title={`${now.getMonth() + 1}월 월간 대시보드`}
              stats={monthly}
              loading={loadingM}
            />
          </div>

          {/* 구분선 */}
          <div className="w-px bg-slate-200 self-stretch" />

          {/* 오른쪽: 총누적 */}
          <div className="flex-1 min-w-0 bg-slate-50/50 rounded-2xl border border-slate-200 p-4">
            <DashPanel
              title="총 누적 대시보드"
              stats={total}
              loading={loadingT}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
