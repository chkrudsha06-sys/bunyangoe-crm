"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, CRMUser } from "@/lib/auth";
import { Clock, ChevronDown, Award, Target, Calendar, CreditCard, Zap, TrendingUp, Users } from "lucide-react";

interface DashStats {
  contract: number; reservation: number;
  hotProspect: number; meetingProspect: number; linkedProspect: number;
  upcomingMeetings: number;
  membershipFeeCount: number; membershipFeeAmount: number;
  monthlyFeeCount: number; monthlyFeeAmount: number;
  hightargetWanpan: number; hightargetBunyang: number;
  totalAdRevenue: number;
}
const EMPTY: DashStats = {
  contract: 0, reservation: 0, hotProspect: 0, meetingProspect: 0, linkedProspect: 0,
  upcomingMeetings: 0, membershipFeeCount: 0, membershipFeeAmount: 0,
  monthlyFeeCount: 0, monthlyFeeAmount: 0, hightargetWanpan: 0, hightargetBunyang: 0, totalAdRevenue: 0,
};

function formatWon(n: number) {
  if (!n) return "0원";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`;
  if (n >= 10000000) return `${(n / 10000000).toFixed(0)}천만원`;
  if (n >= 10000) return `${Math.floor(n / 10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}

async function fetchStats(user: CRMUser, startDate: string, endDate: string, isTotal: boolean): Promise<DashStats> {
  const isExec = user.role === "exec";
  const today = new Date().toISOString().split("T")[0];

  let cQ = supabase.from("contacts").select("meeting_result,tm_sensitivity,meeting_date");
  if (isExec) cQ = cQ.eq("assigned_to", user.name);
  if (!isTotal) cQ = cQ.gte("created_at", startDate).lte("created_at", endDate + "T23:59:59");
  const { data: c = [] } = await cQ;

  let aQ = supabase.from("ad_executions").select("execution_amount,channel,contract_route");
  if (isExec) aQ = aQ.eq("team_member", user.name);
  if (!isTotal) aQ = aQ.gte("payment_date", startDate).lte("payment_date", endDate);
  const { data: a = [] } = await aQ;

  let mQ = supabase.from("contacts").select("id").gte("meeting_date", today);
  if (isExec) mQ = mQ.eq("assigned_to", user.name);
  const { data: meetings = [] } = await mQ;

  const contracted = (c || []).filter((x: any) => x.meeting_result === "계약완료");

  return {
    contract: contracted.length,
    reservation: (c || []).filter((x: any) => x.meeting_result === "예약완료").length,
    hotProspect: (c || []).filter((x: any) => x.tm_sensitivity === "즉가입가망").length,
    meetingProspect: (c || []).filter((x: any) => x.tm_sensitivity === "미팅예정가망").length,
    linkedProspect: (c || []).filter((x: any) => x.tm_sensitivity === "연계매출가망").length,
    upcomingMeetings: (meetings || []).length,
    membershipFeeCount: contracted.length,
    membershipFeeAmount: contracted.length * 500000,
    monthlyFeeCount: contracted.length,
    monthlyFeeAmount: contracted.length * 100000,
    hightargetWanpan: (a || []).filter((x: any) => x.channel === "하이타겟" && x.contract_route === "완판트럭")
      .reduce((s: number, x: any) => s + (x.execution_amount || 0), 0),
    hightargetBunyang: (a || []).filter((x: any) => x.channel === "하이타겟" && x.contract_route === "분양회")
      .reduce((s: number, x: any) => s + (x.execution_amount || 0), 0),
    totalAdRevenue: (a || []).reduce((s: number, x: any) => s + (x.execution_amount || 0), 0),
  };
}

// ── 패널 ──
function Panel({ title, accent, stats, loading }: {
  title: string; accent: string; stats: DashStats; loading: boolean;
}) {
  const totalJoin = stats.contract + stats.reservation;
  const totalProspect = stats.hotProspect + stats.meetingProspect + stats.linkedProspect;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* 패널 타이틀 */}
      <div className={`px-5 py-3 border-b border-slate-100 flex items-center gap-2`}>
        <div className={`w-2 h-2 rounded-full ${accent}`} />
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-4 grid grid-cols-4 gap-3">

          {/* 분양회 입회수 */}
          <div className="col-span-1 bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Award size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">분양회 입회수</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{totalJoin}<span className="text-sm font-normal text-slate-400 ml-1">건</span></p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="bg-white rounded-lg px-2 py-1.5 text-center border border-amber-100">
                <p className="text-[10px] text-emerald-600 font-semibold">계약완료</p>
                <p className="text-lg font-black text-slate-800">{stats.contract}</p>
              </div>
              <div className="bg-white rounded-lg px-2 py-1.5 text-center border border-amber-100">
                <p className="text-[10px] text-blue-600 font-semibold">예약완료</p>
                <p className="text-lg font-black text-slate-800">{stats.reservation}</p>
              </div>
            </div>
          </div>

          {/* 가망고객 */}
          <div className="col-span-1 bg-violet-50 rounded-xl p-3 border border-violet-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Target size={13} className="text-violet-500" />
              <span className="text-xs font-semibold text-violet-700">가망고객</span>
            </div>
            <p className="text-3xl font-black text-slate-800">{totalProspect}<span className="text-sm font-normal text-slate-400 ml-1">명</span></p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1 border border-violet-100">
                <span className="text-[10px] text-red-500 font-semibold">즉가입가망</span>
                <span className="text-sm font-black text-slate-800">{stats.hotProspect}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1 border border-violet-100">
                <span className="text-[10px] text-amber-600 font-semibold">미팅예정가망</span>
                <span className="text-sm font-black text-slate-800">{stats.meetingProspect}</span>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1 border border-violet-100">
                <span className="text-[10px] text-slate-500 font-semibold">연계매출가망</span>
                <span className="text-sm font-black text-slate-800">{stats.linkedProspect}</span>
              </div>
            </div>
          </div>

          {/* 미팅예정 + 입회비 + 월회비 */}
          <div className="col-span-1 flex flex-col gap-2">
            {/* 미팅예정 */}
            <div className="bg-cyan-50 rounded-xl p-3 border border-cyan-100 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={13} className="text-cyan-500" />
                <span className="text-xs font-semibold text-cyan-700">미팅예정</span>
              </div>
              <p className="text-2xl font-black text-slate-800">{stats.upcomingMeetings}<span className="text-xs font-normal text-slate-400 ml-1">건</span></p>
            </div>
            {/* 입회비 */}
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard size={13} className="text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">입회비</span>
              </div>
              <p className="text-lg font-black text-slate-800">{stats.membershipFeeCount}<span className="text-xs font-normal text-slate-400 ml-1">건</span></p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">{formatWon(stats.membershipFeeAmount)}</p>
            </div>
            {/* 월회비 */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Users size={13} className="text-blue-500" />
                <span className="text-xs font-semibold text-blue-700">월회비</span>
              </div>
              <p className="text-lg font-black text-slate-800">{stats.monthlyFeeCount}<span className="text-xs font-normal text-slate-400 ml-1">건</span></p>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">{formatWon(stats.monthlyFeeAmount)}</p>
            </div>
          </div>

          {/* 연계매출 + 총매출 */}
          <div className="col-span-1 flex flex-col gap-2">
            {/* 연계매출 하이타겟 */}
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 flex-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={13} className="text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700">연계매출 (하이타겟)</span>
              </div>
              <p className="text-lg font-black text-slate-800">{formatWon(stats.hightargetWanpan + stats.hightargetBunyang)}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1 border border-indigo-100">
                  <span className="text-[10px] text-indigo-500 font-semibold">완판트럭</span>
                  <span className="text-xs font-bold text-slate-700">{formatWon(stats.hightargetWanpan)}</span>
                </div>
                <div className="flex justify-between items-center bg-white rounded-lg px-2 py-1 border border-indigo-100">
                  <span className="text-[10px] text-blue-500 font-semibold">분양회</span>
                  <span className="text-xs font-bold text-slate-700">{formatWon(stats.hightargetBunyang)}</span>
                </div>
              </div>
            </div>
            {/* 총매출 */}
            <div className="bg-slate-800 rounded-xl p-3 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={13} className="text-white/60" />
                <span className="text-xs font-semibold text-white/60">광고특전매출 총매출</span>
              </div>
              <p className="text-xl font-black text-white mt-1">{formatWon(stats.totalAdRevenue)}</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── 메인 ──
export default function DashboardPage() {
  const [user, setUser] = useState<CRMUser | null>(null);
  const [monthly, setMonthly] = useState<DashStats>(EMPTY);
  const [total, setTotal] = useState<DashStats>(EMPTY);
  const [loadingM, setLoadingM] = useState(true);
  const [loadingT, setLoadingT] = useState(true);
  const [now, setNow] = useState(new Date());

  // 기간 필터
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [preset, setPreset] = useState<"이번 달" | "지난 달" | "직접 설정">("이번 달");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setUser(getCurrentUser()); }, []);

  const loadData = () => {
    if (!user) return;
    setLoadingM(true); setLoadingT(true);
    fetchStats(user, startDate, endDate, false).then(d => { setMonthly(d); setLoadingM(false); });
    fetchStats(user, startDate, endDate, true).then(d => { setTotal(d); setLoadingT(false); });
  };

  useEffect(() => { loadData(); }, [user, startDate, endDate]);

  const applyPreset = (p: "이번 달" | "지난 달") => {
    const n = new Date();
    if (p === "이번 달") {
      setStartDate(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0]);
      setEndDate(new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0]);
    } else {
      setStartDate(new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().split("T")[0]);
      setEndDate(new Date(n.getFullYear(), n.getMonth(), 0).toISOString().split("T")[0]);
    }
    setPreset(p);
  };

  const isExec = user?.role === "exec";
  const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800">
              대외협력팀{" "}
              {isExec
                ? <span className="text-blue-600">{user?.name} {user?.title}</span>
                : <span className="text-slate-600">종합</span>
              }{" "}대시보드
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock size={12} className="text-blue-400" />
              <span className="text-sm text-slate-500">{dateStr}</span>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-mono font-bold text-blue-600 tabular-nums">{timeStr}</span>
            </div>
          </div>

          {/* 기간 필터 */}
          <div className="flex items-center gap-2">
            {/* 프리셋 */}
            <div className="flex gap-1">
              {(["이번 달", "지난 달"] as const).map((p) => (
                <button key={p} onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    preset === p ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >{p}</button>
              ))}
            </div>
            {/* 날짜 직접 입력 */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <input type="date" value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset("직접 설정"); }}
                className="text-xs text-slate-700 bg-transparent border-none outline-none" />
              <span className="text-slate-300 text-xs">—</span>
              <input type="date" value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset("직접 설정"); }}
                className="text-xs text-slate-700 bg-transparent border-none outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 대시보드 본문 */}
      <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">
        <Panel
          title={`${startDate} ~ ${endDate} 기간 대시보드`}
          accent="bg-blue-500"
          stats={monthly}
          loading={loadingM}
        />
        <Panel
          title="총 누적 대시보드"
          accent="bg-slate-400"
          stats={total}
          loading={loadingT}
        />
      </div>
    </div>
  );
}
