"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, CRMUser } from "@/lib/auth";
import { Clock, ChevronLeft, ChevronRight, Plus, X, Save, Trash2 } from "lucide-react";

// ── 타입 ──
interface Stats {
  totalRevenue: number;
  joinCount: number; contractCount: number; reservationCount: number;
  hotProspect: number; meetingProspect: number; linkedProspect: number;
  upcomingMeetings: number; meetingDone: number;
  membershipFeeAmt: number; membershipCount: number;
  monthlyFeeAmt: number; monthlyFeeCount: number;
  linkedRevenue: number; linkedCount: number;
}
// 누적용 별도 Stats (동일 구조 재활용)
const EMPTY: Stats = {
  totalRevenue:0, joinCount:0, contractCount:0, reservationCount:0,
  hotProspect:0, meetingProspect:0, linkedProspect:0,
  upcomingMeetings:0, meetingDone:0, membershipFeeAmt:0, membershipCount:0, monthlyFeeAmt:0, monthlyFeeCount:0, linkedRevenue:0, linkedCount:0,
};
interface MonthlyRevenue { month: string; hightarget: number; special: number; bunyanghoe: number; }
interface TodayEvent { id: number; name: string; phone: string | null; meeting_date: string; meeting_address: string | null; assigned_to: string; }
interface Notice { id: number; title: string; content: string | null; author: string; created_at: string; is_pinned: boolean; }
interface WorkRequest { id: number; title: string; content: string | null; author: string; assigned_to: string | null; status: string; created_at: string; }

function fw(n: number) {
  if (!n) return "0원";
  return n.toLocaleString() + "원";
}

async function fetchStats(user: CRMUser, start: string, end: string, isAll = false): Promise<Stats> {
  const isExec = user.role === "exec";
  const today  = new Date().toISOString().split("T")[0];
  const monthStart = start;
  const monthEnd   = end;

  let joinQ = supabase.from("contacts")
    .select("meeting_result,prospect_type,contract_date,reservation_date,meeting_date,assigned_to");
  if (isExec) joinQ = joinQ.eq("assigned_to", user.name);
  const { data: allContacts = [] } = await joinQ;

  const monthJoined = (allContacts||[]).filter((x:any) => {
    const d = x.meeting_result === "계약완료" ? x.contract_date : x.reservation_date;
    if (!d) return false;
    return !isAll && d >= monthStart && d <= monthEnd;
  });
  const allJoined = (allContacts||[]).filter((x:any) =>
    ["계약완료","예약완료"].includes(x.meeting_result||"")
  );

  const prospects = (allContacts||[]).filter((x:any) =>
    !["계약완료","예약완료"].includes(x.meeting_result||"")
  );

  const monthMeetings = (allContacts||[]).filter((x:any) => {
    if (["계약완료","예약완료"].includes(x.meeting_result||"")) return false;
    if (!x.meeting_date) return false;
    return !isAll && x.meeting_date >= monthStart && x.meeting_date <= monthEnd;
  });
  const totalMeetings = (allContacts||[]).filter((x:any) => x.meeting_date).length;

  let adQ = supabase.from("ad_executions")
    .select("execution_amount,vat_amount,channel,team_member,refund_amount,contract_route,payment_date");
  if (isExec) adQ = adQ.eq("team_member", user.name);
  const { data: allAd = [] } = await adQ;

  const effAmt = (x:any) => (x.vat_amount && x.vat_amount !== x.execution_amount) ? (x.vat_amount||0) : (x.execution_amount||0);

  const AD_CHANNELS = ["호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];
  const monthAd = (allAd||[]).filter((x:any) => {
    if (isAll) return false;
    return x.payment_date >= monthStart && x.payment_date <= monthEnd;
  });

  const monthAdSpecial = monthAd.filter((x:any) =>
    x.contract_route === "분양회" && AD_CHANNELS.includes(x.channel)
  );
  const totalRevenue = monthAdSpecial.reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  const membershipFeeAmt = monthAd
    .filter((x:any) => x.channel === "분양회 입회비")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);
  const monthlyFeeAmt = monthAd
    .filter((x:any) => x.channel === "분양회 월회비")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  const cumMembershipFee = (allAd||[])
    .filter((x:any) => x.channel === "분양회 입회비")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);
  const cumMonthlyFee = (allAd||[])
    .filter((x:any) => x.channel === "분양회 월회비")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  const linkedRevenue = monthAd
    .filter((x:any) => x.channel === "하이타겟")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  const cumLinkedRevenue = (allAd||[])
    .filter((x:any) => x.channel === "하이타겟")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  const cumTotalRevenue = (allAd||[])
    .filter((x:any) => x.contract_route === "분양회" && AD_CHANNELS.includes(x.channel))
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  const monthMeetingDone = (allContacts||[]).filter((x:any) => {
    if (!["계약완료","예약완료"].includes(x.meeting_result||"")) return false;
    if (!x.meeting_date) return false;
    return !isAll && x.meeting_date >= monthStart && x.meeting_date <= monthEnd;
  });
  const totalMeetingDone = (allContacts||[]).filter((x:any) =>
    ["계약완료","예약완료"].includes(x.meeting_result||"") && x.meeting_date
  ).length;

  const membershipCount = (isAll
    ? (allAd||[]).filter((x:any)=>x.channel==="분양회 입회비")
    : monthAd.filter((x:any)=>x.channel==="분양회 입회비")).length;
  const monthlyFeeCount = (isAll
    ? (allAd||[]).filter((x:any)=>x.channel==="분양회 월회비")
    : monthAd.filter((x:any)=>x.channel==="분양회 월회비")).length;

  const linkedCount = (isAll
    ? (allAd||[]).filter((x:any)=>x.channel==="하이타겟")
    : monthAd.filter((x:any)=>x.channel==="하이타겟")).length;

  return {
    totalRevenue: isAll ? cumTotalRevenue : totalRevenue,
    joinCount: isAll ? allJoined.length : monthJoined.length,
    contractCount: isAll
      ? allJoined.filter((x:any)=>x.meeting_result==="계약완료").length
      : monthJoined.filter((x:any)=>x.meeting_result==="계약완료").length,
    reservationCount: isAll
      ? allJoined.filter((x:any)=>x.meeting_result==="예약완료").length
      : monthJoined.filter((x:any)=>x.meeting_result==="예약완료").length,
    hotProspect: prospects.filter((x:any)=>x.prospect_type==="즉가입가망").length,
    meetingProspect: prospects.filter((x:any)=>x.prospect_type==="미팅예정가망").length,
    linkedProspect: prospects.filter((x:any)=>x.prospect_type==="연계매출가망").length,
    upcomingMeetings: isAll ? totalMeetings : monthMeetings.length,
    meetingDone: isAll ? totalMeetingDone : monthMeetingDone.length,
    membershipFeeAmt: isAll ? cumMembershipFee : membershipFeeAmt,
    membershipCount,
    monthlyFeeAmt: isAll ? cumMonthlyFee : monthlyFeeAmt,
    monthlyFeeCount,
    linkedRevenue: isAll ? cumLinkedRevenue : linkedRevenue,
    linkedCount,
  };
}

async function fetchMonthlyRevenue(user: CRMUser, year: number, month: number): Promise<MonthlyRevenue[]> {
  const isExec = user.role === "exec";
  const offsets = Array.from({length: 3}, (_, i) => i - 2);
  const months = offsets.map(offset => {
    const d = new Date(year, month - 1 + offset, 1);
    const s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
    const e = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split("T")[0];
    return { label: `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,"0")}`, s, e };
  });
  const results: MonthlyRevenue[] = [];
  for (const m of months) {
    let q = supabase.from("ad_executions").select("execution_amount,channel")
      .gte("payment_date", m.s).lte("payment_date", m.e);
    if (isExec) q = q.eq("team_member", user.name);
    const { data: a = [] } = await q;
    results.push({
      month: m.label,
      hightarget: (a||[]).filter((x:any)=>x.channel==="하이타겟").reduce((s:number,x:any)=>s+(x.execution_amount||0),0),
      special: (a||[]).filter((x:any)=>["호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"].includes(x.channel)).reduce((s:number,x:any)=>s+(x.execution_amount||0),0),
      bunyanghoe: (a||[]).filter((x:any)=>["분양회 입회비","분양회 월회비"].includes(x.channel)).reduce((s:number,x:any)=>s+(x.execution_amount||0),0),
    });
  }
  return results;
}

async function fetchTodayEvents(user: CRMUser, date: string): Promise<TodayEvent[]> {
  const isExec = user.role === "exec";
  let q = supabase.from("contacts").select("id,name,phone,meeting_date,meeting_address,assigned_to,prospect_type,meeting_result")
    .eq("meeting_date", date).order("meeting_date");
  if (isExec) q = q.eq("assigned_to", user.name);
  const { data = [] } = await q;
  return (data || []) as TodayEvent[];
}

// ── 카드 컴포넌트 ──
function DashCard({ icon, label, main, subs, cumLabel, prevValue, currentValue }: {
  icon: string; label: string; main: string;
  subs?: { label: string; value: string; color?: string }[];
  cumLabel: string;
  prevValue?: number; currentValue?: number;
}) {
  // 전월 대비 증감률 계산
  let growthRate: number | null = null;
  if (prevValue !== undefined && currentValue !== undefined && prevValue > 0) {
    growthRate = Math.round(((currentValue - prevValue) / prevValue) * 100);
  } else if (prevValue !== undefined && currentValue !== undefined && prevValue === 0 && currentValue > 0) {
    growthRate = 100;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col" style={{ minWidth: 180, flex: "1 1 0" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl bg-slate-50">{icon}</div>
        {growthRate !== null && (
          <div className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold ${
            growthRate > 0 ? "bg-emerald-50 text-emerald-600" : growthRate < 0 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400"
          }`}>
            {growthRate > 0 ? "▲" : growthRate < 0 ? "▼" : "─"}{Math.abs(growthRate)}%
          </div>
        )}
      </div>
      <p className="text-sm text-slate-400 font-semibold mb-1.5">{label}</p>
      <p className="text-3xl font-black text-slate-800 leading-tight">{main}</p>
      {subs && subs.length > 0 && (
        <div className="mt-2.5 space-y-1 flex-1">
          {subs.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap">{s.label}</span>
              <span className={`text-xs font-bold whitespace-nowrap ${s.color || "text-slate-600"}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {!subs && <div className="flex-1" />}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">누적 {cumLabel}</p>
        {prevValue !== undefined && <p className="text-[10px] text-slate-400">전월 {prevValue.toLocaleString()}</p>}
      </div>
    </div>
  );
}

// ── 바 차트 (색상: 특전=#F59E0B, 하이타겟=#6366F1, 분양회=#10B981) ──
function BarChart({ data }: { data: MonthlyRevenue[] }) {
  const max = Math.max(...data.flatMap(d => [d.special, d.hightarget, d.bunyanghoe]), 1);
  const bar = (v: number) => Math.max(6, Math.round((v / max) * 160));
  const BARS = [
    { key: "special",    color: "#F59E0B", label: "특전총매출" },
    { key: "hightarget", color: "#6366F1", label: "하이타겟" },
    { key: "bunyanghoe", color: "#10B981", label: "분양회" },
  ];

  const fmt = (v: number): string => {
    if (!v) return "";
    if (v >= 100_000_000) {
      const uk = v / 100_000_000;
      return uk % 1 === 0 ? `${uk}억` : `${uk.toFixed(1)}억`;
    }
    if (v >= 10_000) return `${Math.floor(v / 10_000).toLocaleString()}만`;
    return v.toLocaleString();
  };

  return (
    <div className="flex items-end justify-around gap-3 w-full h-full min-h-[200px] px-3 pt-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="flex items-end gap-1.5 w-full justify-center">
            {BARS.map(b => {
              const v = (d as any)[b.key] as number;
              return (
                <div key={b.key} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-black whitespace-nowrap" style={{color:b.color}}>{fmt(v)}</span>
                  <div className="rounded-t-md" style={{ width:"26px", height:`${bar(v)}px`, background:b.color, opacity: 0.9 }}/>
                </div>
              );
            })}
          </div>
          <span className="text-sm text-slate-600 font-bold whitespace-nowrap">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI 대시보드 위젯 ──────────────────────────────────────
interface KpiRow {
  recruit_count: number;
  bunyanghoe_revenue: number;
  linked_revenue: number;
  special_revenue: number;
  wanpan_truck_count: number;
  ad_operation_revenue: number;
}

function fmtMoney(v: number): string {
  if (!v || v === 0) return "0";
  if (v >= 100_000_000) {
    const uk = v / 100_000_000;
    return uk % 1 === 0 ? `${uk}억` : `${uk.toFixed(1)}억`;
  }
  if (v >= 10_000) {
    const man = Math.floor(v / 10_000);
    return `${man.toLocaleString()}만`;
  }
  return v.toLocaleString();
}

function KpiItem({ label, target, actual, unit, isMoney, accentColor }: {
  label: string; target: number; actual: number; unit: string; isMoney?: boolean; accentColor?: string;
}) {
  const rate = target > 0 ? Math.min(999, Math.round((actual / target) * 100)) : 0;
  const color = accentColor || (
    rate >= 100 ? "#10B981" :
    rate >= 80  ? "#3B82F6" :
    rate >= 50  ? "#F59E0B" :
                  "#94A3B8");
  const fmt = (v: number) => isMoney ? fmtMoney(v) : v.toLocaleString();
  return (
    <div className="px-3 py-2.5 rounded-xl border bg-slate-50 border-slate-200" style={accentColor ? {borderLeftWidth:"3px", borderLeftColor: accentColor} : {}}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold text-slate-800 truncate">{label}</span>
        <span className="text-base font-black flex-shrink-0 ml-2" style={{color}}>{rate}%</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-base font-black text-slate-800 font-mono">{fmt(actual)}</span>
        <span className="text-xs text-slate-400 font-semibold">/ {target > 0 ? fmt(target) : "-"}{unit}</span>
      </div>
      <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-100">
        <div className="h-full rounded-full transition-all" style={{width: `${Math.min(100, rate)}%`, background: color}}/>
      </div>
    </div>
  );
}

// ── 당월 KPI 달성치 계산에 사용할 상수 ──
const SPECIAL_CHANNELS = ["LMS", "호갱노노_채널톡", "호갱노노_단지마커", "호갱노노_기타", "호갱노노"];
const OPS_MAPPING: Record<string, string[]> = {
  "김재영": ["이세호", "기여운"],
  "최은정": ["조계현", "최연전"],
};

function effAmtKpi(e: { vat_amount: number | null; execution_amount: number | null }): number {
  if (e.vat_amount && e.vat_amount > 0) return e.vat_amount;
  return e.execution_amount || 0;
}

interface Actuals {
  teamRecruit: number;
  teamBunyanghoeRev: number;
  teamLinkedRev: number;
  teamSpecialRev: number;
  teamWanpan: number;
  myRecruit: number;
  myBunyanghoeRev: number;
  myLinkedRev: number;
  myAdOperationRev: number;
}

function DashboardKpiSummary({ user }: { user: CRMUser | null }) {
  const [team, setTeam] = useState<KpiRow | null>(null);
  const [mine, setMine] = useState<KpiRow | null>(null);
  const [wTeam, setWTeam] = useState<KpiRow | null>(null);
  const [wMine, setWMine] = useState<KpiRow | null>(null);
  const [actuals, setActuals] = useState<Actuals>({
    teamRecruit:0, teamBunyanghoeRev:0, teamLinkedRev:0,
    teamSpecialRev:0, teamWanpan:0,
    myRecruit:0, myBunyanghoeRev:0, myLinkedRev:0, myAdOperationRev:0,
  });
  const [wActuals, setWActuals] = useState<Actuals>({
    teamRecruit:0, teamBunyanghoeRev:0, teamLinkedRev:0,
    teamSpecialRev:0, teamWanpan:0,
    myRecruit:0, myBunyanghoeRev:0, myLinkedRev:0, myAdOperationRev:0,
  });
  const [loading, setLoading] = useState(true);
  const [kpiMode, setKpiMode] = useState<"monthly"|"weekly">("monthly");

  // 현재 주차 계산
  const getCurrentWeek = () => { const d = new Date().getDate(); return Math.min(Math.ceil(d / 7), 5); };
  const curWeek = getCurrentWeek();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStr = String(month).padStart(2,"0");
      const lastDay = new Date(year, month, 0).getDate();
      const monthStart = `${year}-${monthStr}-01`;
      const monthEnd = `${year}-${monthStr}-${String(lastDay).padStart(2,"0")}`;

      // 주간 날짜 범위
      const wStart = (curWeek - 1) * 7 + 1;
      const wEnd = Math.min(curWeek * 7, lastDay);
      const weekStart = `${year}-${monthStr}-${String(wStart).padStart(2,"0")}`;
      const weekEnd = `${year}-${monthStr}-${String(wEnd).padStart(2,"0")}`;

      // 월간 KPI 목표 로드
      const { data: t } = await supabase.from("kpi_settings").select("*")
        .eq("year",year).eq("month",month).eq("week",0).eq("scope","team").maybeSingle();
      setTeam(t as KpiRow | null);

      // 주간 KPI 목표 로드
      const { data: wt } = await supabase.from("kpi_settings").select("*")
        .eq("year",year).eq("month",month).eq("week",curWeek).eq("scope","team").maybeSingle();
      setWTeam(wt as KpiRow | null);

      if (user.role === "exec" || user.role === "ops") {
        const scope = user.role === "exec" ? "execution" : "operation";
        const { data: m } = await supabase.from("kpi_settings").select("*")
          .eq("year",year).eq("month",month).eq("week",0).eq("scope",scope).eq("target_name",user.name).maybeSingle();
        setMine(m as KpiRow | null);
        const { data: wm } = await supabase.from("kpi_settings").select("*")
          .eq("year",year).eq("month",month).eq("week",curWeek).eq("scope",scope).eq("target_name",user.name).maybeSingle();
        setWMine(wm as KpiRow | null);
      }

      // 전체 매출 데이터 로드 (당월)
      const { data: execRows = [] } = await supabase.from("ad_executions")
        .select("id,execution_amount,vat_amount,channel,contract_route,payment_date,team_member")
        .gte("payment_date", monthStart).lte("payment_date", monthEnd);
      const allExecs = (execRows || []) as any[];

      const { data: contactRows = [] } = await supabase.from("contacts")
        .select("id,assigned_to,meeting_result,contract_date,reservation_date")
        .in("meeting_result", ["계약완료","예약완료"]);
      const contacts = (contactRows || []) as any[];

      const todayStr = new Date().toISOString().split("T")[0];
      const { data: wanpanRows = [] } = await supabase.from("wanpan_trucks")
        .select("id,dispatch_date").gte("dispatch_date", monthStart).lte("dispatch_date", todayStr);

      // 계산 함수
      const calcActuals = (execs: any[], dateStart: string, dateEnd: string) => {
        const inRange = (c: any): boolean => {
          const date = c.meeting_result === "계약완료" ? c.contract_date : c.reservation_date;
          return date && date >= dateStart && date <= dateEnd;
        };
        const teamRecruit = contacts.filter(inRange).length;
        const teamBunyanghoeRev = execs.filter(e=>e.contract_route==="분양회").filter(e=>e.channel==="분양회 입회비"||e.channel==="분양회 월회비").reduce((s,e)=>s+effAmtKpi(e),0);
        const teamLinkedRev = execs.filter(e=>e.channel==="하이타겟").reduce((s,e)=>s+effAmtKpi(e),0);
        const teamSpecialRev = execs.filter(e=>e.contract_route==="분양회").filter(e=>SPECIAL_CHANNELS.includes(e.channel)).reduce((s,e)=>s+effAmtKpi(e),0);
        const teamWanpan = (wanpanRows||[]).filter((w:any)=>w.dispatch_date>=dateStart&&w.dispatch_date<=dateEnd).length;
        let myRecruit=0, myBunyanghoeRev=0, myLinkedRev=0, myAdOperationRev=0;
        if (user!.role === "exec") {
          myRecruit = contacts.filter(c=>c.assigned_to===user!.name).filter(inRange).length;
          myBunyanghoeRev = execs.filter(e=>e.team_member===user!.name).filter(e=>e.contract_route==="분양회").filter(e=>e.channel==="분양회 입회비"||e.channel==="분양회 월회비").reduce((s,e)=>s+effAmtKpi(e),0);
          myLinkedRev = execs.filter(e=>e.team_member===user!.name).filter(e=>e.channel==="하이타겟").reduce((s,e)=>s+effAmtKpi(e),0);
        }
        if (user!.role === "ops") {
          const targetMembers = OPS_MAPPING[user!.name] || [];
          myAdOperationRev = execs.filter(e=>targetMembers.includes(e.team_member)).filter(e=>e.contract_route==="분양회").filter(e=>SPECIAL_CHANNELS.includes(e.channel)).reduce((s,e)=>s+effAmtKpi(e),0);
        }
        return { teamRecruit, teamBunyanghoeRev, teamLinkedRev, teamSpecialRev, teamWanpan, myRecruit, myBunyanghoeRev, myLinkedRev, myAdOperationRev };
      };

      // 월간 실적
      setActuals(calcActuals(allExecs, monthStart, monthEnd));
      // 주간 실적
      const weekExecs = allExecs.filter(e => e.payment_date >= weekStart && e.payment_date <= weekEnd);
      setWActuals(calcActuals(weekExecs, weekStart, weekEnd));

      setLoading(false);
    };
    load();
  }, [user]);

  const isWeekly = kpiMode === "weekly";
  const tgt = isWeekly ? wTeam : team;
  const myTgt = isWeekly ? wMine : mine;
  const act = isWeekly ? wActuals : actuals;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-700">KPI</h3>
        <div className="flex items-center gap-1">
          <button onClick={()=>setKpiMode("monthly")}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors ${!isWeekly?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-400 border-slate-200"}`}>월간</button>
          <button onClick={()=>setKpiMode("weekly")}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors ${isWeekly?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-400 border-slate-200"}`}>{curWeek}주차</button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
          <div>
            <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-amber-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"/>
              <span className="text-base font-black text-amber-700 tracking-tight">대협팀 전체</span>
              <span className="text-xs text-slate-400 ml-auto">{isWeekly?`${curWeek}주차 목표`:"월간 목표"}</span>
            </div>
            <div className="text-xs font-bold text-slate-500 mb-2">주요 KPI</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <KpiItem label="분양회 모집"       target={tgt?.recruit_count       ?? 0} actual={act.teamRecruit}       unit="명" accentColor="#EC4899"/>
              <KpiItem label="분양회 매출(회비)"  target={tgt?.bunyanghoe_revenue  ?? 0} actual={act.teamBunyanghoeRev} unit="원" isMoney accentColor="#10B981"/>
              <KpiItem label="연계매출(하이타겟)" target={tgt?.linked_revenue      ?? 0} actual={act.teamLinkedRev}     unit="원" isMoney accentColor="#6366F1"/>
              <KpiItem label="특전매출"           target={tgt?.special_revenue     ?? 0} actual={act.teamSpecialRev}    unit="원" isMoney accentColor="#F59E0B"/>
            </div>
            <div className="text-xs font-bold text-slate-500 mb-2">부가 KPI</div>
            <div className="grid grid-cols-2 gap-2">
              <KpiItem label="완판트럭"           target={tgt?.wanpan_truck_count  ?? 0} actual={act.teamWanpan}        unit="건" accentColor="#8B5CF6"/>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-blue-200">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"/>
              <span className="text-base font-black text-blue-700 tracking-tight">내 목표</span>
              {user?.name && <span className="text-xs text-slate-400 font-semibold">({user.name})</span>}
              <span className="text-xs text-slate-400 ml-auto">{isWeekly?`${curWeek}주차`:"월간"}</span>
            </div>
            <div className="text-xs font-bold text-slate-500 mb-2">주요 KPI</div>

            {user?.role === "exec" ? (
              <div className="grid grid-cols-2 gap-2">
                <KpiItem label="분양회 모집"       target={myTgt?.recruit_count      ?? 0} actual={act.myRecruit}         unit="명" accentColor="#EC4899"/>
                <KpiItem label="분양회 매출(회비)"  target={myTgt?.bunyanghoe_revenue ?? 0} actual={act.myBunyanghoeRev}   unit="원" isMoney accentColor="#10B981"/>
                <KpiItem label="연계매출"          target={myTgt?.linked_revenue     ?? 0} actual={act.myLinkedRev}       unit="원" isMoney accentColor="#6366F1"/>
              </div>
            ) : user?.role === "ops" ? (
              <div className="grid grid-cols-2 gap-2">
                <KpiItem label="광고특전운영매출" target={myTgt?.ad_operation_revenue ?? 0} actual={act.myAdOperationRev} unit="원" isMoney accentColor="#F59E0B"/>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3 border-2 border-amber-200">
                  <span className="text-xl">👑</span>
                </div>
                <p className="text-sm text-slate-700 font-bold">관리자 계정</p>
                <p className="text-xs text-slate-400 mt-1">개인 KPI 없음</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 매출실적 추이 카드 (색상: 특전=#F59E0B, 하이타겟=#6366F1, 분양회=#10B981)
function RevenueTrendCard({ monthlyRev }: { monthlyRev: MonthlyRevenue[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col h-full" style={{minHeight:"200px"}}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-bold text-slate-700">매출실적 추이</h3>
          <span className="text-[10px] text-slate-400 font-semibold">최근 3개월</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <div style={{ display:"flex", alignItems:"center", gap:"4px" }}><div style={{ width:"8px", height:"8px", borderRadius:"2px", background:"#F59E0B" }}/><span>특전</span></div>
          <div style={{ display:"flex", alignItems:"center", gap:"4px" }}><div style={{ width:"8px", height:"8px", borderRadius:"2px", background:"#6366F1" }}/><span>하이타겟</span></div>
          <div style={{ display:"flex", alignItems:"center", gap:"4px" }}><div style={{ width:"8px", height:"8px", borderRadius:"2px", background:"#10B981" }}/><span>분양회</span></div>
        </div>
      </div>
      <div className="flex-1 flex items-end min-h-0">
        {monthlyRev.length > 0 ? <BarChart data={monthlyRev}/> : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">데이터 없음</div>
        )}
      </div>
    </div>
  );
}

// ── 이벤트 타입 ──
const EV_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  연차:   { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400" },
  반차:   { bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-400" },
  미팅:   { bg: "bg-blue-50",   text: "text-blue-600",   dot: "bg-blue-400" },
  기타:   { bg: "bg-slate-50",  text: "text-slate-500",  dot: "bg-slate-400" },
  미팅일정:   { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-400" },
};

interface CalEventItem {
  id: number;
  date: string;
  title: string;
  content: string | null;
  author: string;
  event_type: string;
}

// ── 업무요청 보드 ────────────────────────────────────────────
function WorkRequestBoard({ user }: { user: CRMUser | null }) {
  const [items, setItems]       = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title:"", content:"", assigned_to:"" });
  const [saving, setSaving]     = useState(false);
  const TEAM = ["조계현","이세호","기여운","최연전","김재영","최은정"];
  const STATUS_COLOR: Record<string,string> = {
    "요청": "bg-amber-50 text-amber-600 border-amber-200",
    "진행중": "bg-blue-50 text-blue-600 border-blue-200",
    "완료": "bg-emerald-50 text-emerald-600 border-emerald-200",
  };

  useEffect(() => { fetchItems(); }, []);
  const fetchItems = async () => {
    const { data } = await supabase.from("work_requests")
      .select("*").order("created_at",{ascending:false}).limit(10);
    setItems(data||[]);
  };
  const handleSubmit = async () => {
    if (!form.title) return alert("제목을 입력하세요.");
    setSaving(true);
    await supabase.from("work_requests").insert({
      title: form.title, content: form.content||null,
      assigned_to: form.assigned_to||null,
      author: user?.name||"", status:"요청",
    });
    setSaving(false); setShowForm(false);
    setForm({title:"",content:"",assigned_to:""});
    fetchItems();
  };
  const updateStatus = async (id:number, status:string) => {
    await supabase.from("work_requests").update({status}).eq("id",id);
    fetchItems();
  };
  const deleteItem = async (id:number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("work_requests").delete().eq("id",id);
    fetchItems();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col h-full" style={{minHeight:"200px"}}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-700">업무요청</h3>
        <button onClick={()=>setShowForm(v=>!v)}
          className="text-xs px-3 py-1.5 bg-[#1E3A8A] text-white rounded-lg hover:bg-blue-800 font-semibold">
          + 요청 작성
        </button>
      </div>
      {showForm && (
        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
            placeholder="요청 제목" className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
          <textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))}
            placeholder="상세 내용" rows={2}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none"/>
          <div className="flex gap-2">
            <select value={form.assigned_to} onChange={e=>setForm(p=>({...p,assigned_to:e.target.value}))}
              className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none">
              <option value="">담당자 선택</option>
              {TEAM.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold disabled:opacity-50">
              {saving?"저장중...":"등록"}
            </button>
            <button onClick={()=>setShowForm(false)}
              className="px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
          </div>
        </div>
      )}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0
          ? <p className="text-center py-8 text-slate-300 text-sm">등록된 업무요청이 없습니다</p>
          : items.map(item=>(
            <div key={item.id} className="flex items-start gap-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${STATUS_COLOR[item.status]||"bg-slate-50 text-slate-500 border-slate-200"}`}>{item.status}</span>
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                </div>
                {item.content && <p className="text-xs text-slate-500 truncate">{item.content}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">{item.author}</span>
                  {item.assigned_to && <span className="text-xs text-blue-500 font-medium">→ {item.assigned_to}</span>}
                  <span className="text-xs text-slate-300">{new Date(item.created_at).toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"})}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {item.status === "요청" && (
                  <button onClick={()=>updateStatus(item.id,"진행중")}
                    className="text-[10px] px-1.5 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100">진행</button>
                )}
                {item.status === "진행중" && (
                  <button onClick={()=>updateStatus(item.id,"완료")}
                    className="text-[10px] px-1.5 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-100">완료</button>
                )}
                <button onClick={()=>deleteItem(item.id)}
                  className="text-[10px] px-1.5 py-1 bg-red-50 text-red-400 rounded border border-red-200 hover:bg-red-100">삭제</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── 공지사항 보드 ────────────────────────────────────────────
function NoticeBoard({ user }: { user: CRMUser | null }) {
  const [items, setItems]       = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title:"", content:"", is_pinned:false });
  const [saving, setSaving]     = useState(false);
  const isAdmin = user?.role === "admin" || user?.role === "ops";

  useEffect(() => { fetchItems(); }, []);
  const fetchItems = async () => {
    const { data } = await supabase.from("notices")
      .select("*").order("is_pinned",{ascending:false}).order("created_at",{ascending:false}).limit(10);
    setItems(data||[]);
  };
  const handleSubmit = async () => {
    if (!form.title) return alert("제목을 입력하세요.");
    setSaving(true);
    await supabase.from("notices").insert({
      title: form.title, content: form.content||null,
      author: user?.name||"", is_pinned: form.is_pinned,
    });
    setSaving(false); setShowForm(false);
    setForm({title:"",content:"",is_pinned:false});
    fetchItems();
  };
  const deleteItem = async (id:number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("notices").delete().eq("id",id);
    fetchItems();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col h-full" style={{minHeight:"200px"}}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-700">공지사항</h3>
        {isAdmin && (
          <button onClick={()=>setShowForm(v=>!v)}
            className="text-xs px-3 py-1.5 bg-[#1E3A8A] text-white rounded-lg hover:bg-blue-800 font-semibold">
            + 공지 작성
          </button>
        )}
      </div>
      {showForm && (
        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
            placeholder="공지 제목" className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
          <textarea value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))}
            placeholder="공지 내용" rows={2}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 resize-none"/>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
              <input type="checkbox" checked={form.is_pinned} onChange={e=>setForm(p=>({...p,is_pinned:e.target.checked}))}
                className="w-3.5 h-3.5"/>
              📌 고정
            </label>
            <div className="flex gap-2 ml-auto">
              <button onClick={handleSubmit} disabled={saving}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold disabled:opacity-50">
                {saving?"저장중...":"등록"}
              </button>
              <button onClick={()=>setShowForm(false)}
                className="px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length === 0
          ? <p className="text-center py-8 text-slate-300 text-sm">등록된 공지가 없습니다</p>
          : items.map(item=>(
            <div key={item.id} className={`px-3 py-2.5 rounded-xl border ${item.is_pinned?"bg-amber-50 border-amber-200":"bg-slate-50 border-slate-100"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.is_pinned && <span className="text-[10px]">📌</span>}
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                  </div>
                  {item.content && <p className="text-xs text-slate-400 truncate">{item.content}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">{item.author}</span>
                    <span className="text-[10px] text-slate-300">{new Date(item.created_at).toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"})}</span>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={()=>deleteItem(item.id)}
                    className="text-[10px] px-1.5 py-1 bg-red-50 text-red-400 rounded border border-red-200 hover:bg-red-100 flex-shrink-0">삭제</button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── 캘린더 컴포넌트 ──
function DashCalendar({ user: userProp }: { user: CRMUser | null }) {
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [events, setEvents] = useState<CalEventItem[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [wanpans, setWanpans] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [form, setForm] = useState({ event_type: "미팅", content: "" });
  const [saving, setSaving] = useState(false);

  const getAuthorName = (): string => {
    try {
      const raw = localStorage.getItem("crm_user");
      if (raw) return JSON.parse(raw).name || "";
    } catch {}
    return userProp?.name || "";
  };

  const fetchCalData = useCallback(async () => {
    const authorName = getAuthorName();
    if (!authorName) return;
    const start = `${calYear}-${String(calMonth).padStart(2,"0")}-01`;
    const end = `${calYear}-${String(calMonth).padStart(2,"0")}-${new Date(calYear, calMonth, 0).getDate()}`;

    const { data: ev, error: evErr } = await supabase.from("calendar_events")
      .select("*").gte("date", start).lte("date", end).eq("author", authorName);
    if (evErr) console.error("calendar_events 오류:", evErr.message);
    setEvents((ev || []) as CalEventItem[]);

    const { data: mt } = await supabase.from("contacts")
      .select("id,name,meeting_date,assigned_to")
      .not("meeting_date","is",null).gte("meeting_date",start).lte("meeting_date",end)
      .eq("assigned_to", authorName);
    setMeetings(mt || []);

    const { data: wp } = await supabase.from("wanpan_trucks")
      .select("id,dispatch_date,location,staff_members")
      .not("dispatch_date","is",null).gte("dispatch_date",start).lte("dispatch_date",end);
    const wpFiltered = (wp || []).filter((w: any) => {
      try { return JSON.parse(w.staff_members || "[]").includes(authorName); } catch { return false; }
    });
    setWanpans(wpFiltered);
  }, [calYear, calMonth, userProp, refreshKey]);

  useEffect(() => { fetchCalData(); }, [fetchCalData]);

  const handleAdd = async () => {
    if (!selDate) { alert("날짜를 선택해주세요."); return; }
    const authorName = getAuthorName();
    if (!authorName) { alert("로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요."); return; }
    setSaving(true);
    const { error } = await supabase.from("calendar_events").insert({
      date: selDate, title: form.event_type, content: form.content || null,
      author: authorName, event_type: form.event_type,
    });
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    setShowAdd(false);
    setForm({ event_type: "미팅", content: "" });
    setRefreshKey(k => k + 1);
  };

  const handleDelete = async (id: number) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    setRefreshKey(k => k + 1);
  };

  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const today = new Date().toISOString().split("T")[0];
  const getDs = (d: number) => `${calYear}-${String(calMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const days = ["일","월","화","수","목","금","토"];

  const getItems = (d: number) => {
    const ds = getDs(d);
    return {
      ev: events.filter(e => e.date === ds),
      mt: meetings.filter(m => m.meeting_date?.startsWith(ds)),
      wp: wanpans.filter(w => w.dispatch_date?.startsWith(ds)),
    };
  };

  const selItems = selDate ? {
    ev: events.filter(e => e.date === selDate),
    mt: meetings.filter(m => m.meeting_date?.startsWith(selDate || "")),
    wp: wanpans.filter(w => w.dispatch_date?.startsWith(selDate || "")),
  } : { ev: [], mt: [], wp: [] };

  return (
    <>
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={()=>{ if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400"><ChevronLeft size={13}/></button>
          <span className="text-base font-bold text-slate-700">{calYear}년 {calMonth}월</span>
          <button onClick={()=>{ if(calMonth===12){setCalMonth(1);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400"><ChevronRight size={13}/></button>
        </div>
        <button onClick={()=>{ setSelDate(today); setShowAdd(true); }}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={11}/> 일정 추가
        </button>
      </div>

      <div className="grid grid-cols-7 border border-slate-200 divide-x divide-slate-200" style={{borderColor:"rgba(255,255,255,0.15)"}}>
        {days.map((d,i)=>(
          <div key={d} className={`text-center py-3 text-sm font-bold ${i===0?"text-red-400":i===6?"text-blue-400":"text-slate-400"}`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 border border-slate-200 divide-x divide-y divide-slate-200" style={{borderColor:"rgba(255,255,255,0.15)","--tw-divide-opacity":"1"} as any}>
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} className="min-h-[140px] bg-slate-50/30"/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const d = i+1; const ds = getDs(d);
          const {ev,mt,wp} = getItems(d);
          const isToday = ds===today; const dow=(firstDay+i)%7;
          const isSelected = selDate===ds && !showAdd;
          const total = ev.length+mt.length+wp.length;
          return (
            <div key={d}
              onClick={()=>{ setSelDate(ds); setShowDayPopup(true); setShowAdd(false); }}
              onDoubleClick={()=>{ setSelDate(ds); setShowAdd(true); setShowDayPopup(false); }}
              className={`min-h-[140px] p-1.5 cursor-pointer transition-colors ${isSelected?"bg-blue-50/60":"hover:bg-slate-50"}`}
              title="더블클릭: 일정 추가">
              <div className={`w-8 h-8 flex items-center justify-center rounded-full text-base font-bold mb-1 ${isToday?"bg-blue-600 text-white":dow===0?"text-red-400":dow===6?"text-blue-400":"text-slate-600"}`}>{d}</div>
              <div className="space-y-1">
                {wp.map(w=>(<div key={`w${w.id}`} className="text-xs px-2 py-1.5 rounded-lg truncate font-bold bg-amber-100 text-amber-700 border border-amber-200">🚚 완판트럭</div>))}
                {mt.slice(0,1).map(m=>(<div key={`m${m.id}`} className="text-xs px-2 py-1.5 rounded-lg truncate font-bold bg-violet-100 text-violet-700 border border-violet-200">미팅 - {m.assigned_to}</div>))}
                {ev.slice(0,2).map(e=>{
                  const c = EV_COLORS[e.event_type]||EV_COLORS["기타"];
                  return <div key={e.id} className={`text-xs px-2 py-1.5 rounded-lg truncate font-bold border ${c.bg} ${c.text} `}>{e.event_type}</div>;
                })}
                {total>3&&<p className="text-xs text-slate-400 pl-1 font-semibold">+{total-3}</p>}
              </div>
            </div>
          );
        })}
        {Array.from({length: (7 - (firstDay + daysInMonth) % 7) % 7}).map((_,i)=>(
          <div key={`t${i}`} className="min-h-[140px] bg-slate-50/30"/>
        ))}
      </div>
    </div>

    {showDayPopup && selDate && !showAdd && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.35)"}} onClick={()=>setShowDayPopup(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">
              {new Date(selDate+"T00:00:00").toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={()=>{setShowDayPopup(false);setShowAdd(true);}}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus size={12}/> 추가
              </button>
              <button onClick={()=>setShowDayPopup(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {selItems.wp.length===0 && selItems.mt.length===0 && selItems.ev.length===0 && (
              <p className="text-center py-6 text-slate-300 text-sm">일정이 없습니다</p>
            )}
            {selItems.wp.map(w=>(<div key={`w${w.id}`} className="rounded-xl p-3 bg-amber-50 border border-amber-100"><p className="text-xs font-bold text-amber-700 mb-1">🚚 완판트럭</p><p className="text-sm font-bold text-slate-800">{w.location||"-"}</p></div>))}
            {selItems.mt.map(m=>(<div key={`m${m.id}`} className="rounded-xl p-3 bg-violet-50 border border-violet-100"><p className="text-xs font-bold text-violet-700 mb-1">미팅일정</p><p className="text-sm font-bold text-slate-800">{m.name}</p></div>))}
            {selItems.ev.map(e=>{
              const c = EV_COLORS[e.event_type]||EV_COLORS["기타"];
              return (
                <div key={e.id} className={`rounded-xl p-3 border ${c.bg} border-slate-100`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${c.text}`}>{e.event_type}</span>
                    <button onClick={()=>{handleDelete(e.id);}} className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"><Trash2 size={13}/></button>
                  </div>
                  {e.content&&<p className="text-sm text-slate-600 leading-relaxed">{e.content}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {showAdd && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={()=>setShowAdd(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">일정 추가</h3>
            <button onClick={()=>setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">날짜</p>
              <input type="date" value={selDate||today} onChange={e=>setSelDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400"/>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">유형 선택</p>
              <div className="grid grid-cols-4 gap-2">
                {["연차","반차","미팅","기타"].map(t=>{
                  const c = EV_COLORS[t];
                  return (
                    <button key={t} onClick={()=>setForm((f: any)=>({...f,event_type:t}))}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors ${form.event_type===t?`${c.bg} ${c.text} border-current`:"bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">상세내용 <span className="text-slate-300">(선택)</span></p>
              <textarea value={form.content} onChange={e=>setForm((f: any)=>({...f,content:e.target.value}))}
                rows={3} placeholder="내용을 입력하세요"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none"/>
            </div>
          </div>
          <div className="flex gap-2 px-5 pb-5">
            <button onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Save size={13}/>{saving?"저장 중...":"저장"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}


// ── 메인 ──
export default function DashboardPage() {
  const [user, setUser] = useState<CRMUser|null>(null);
  const [current, setCurrent] = useState<Stats>(EMPTY);
  const [cumulative, setCumulative] = useState<Stats>(EMPTY);
  const [monthlyRev, setMonthlyRev] = useState<MonthlyRevenue[]>([]);
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);

  const initStart = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
  };
  const initEnd = () => new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);
  const [selMonth, setSelMonth] = useState(new Date().getMonth()+1);
  const [prevMonth, setPrevMonth] = useState<Stats>(EMPTY);

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{setUser(getCurrentUser());},[]);

  useEffect(()=>{
    if (!user) return;
    setLoading(true);
    // 전월 날짜 계산
    const sd = new Date(startDate);
    const prevStart = new Date(sd.getFullYear(), sd.getMonth()-1, 1);
    const prevEnd = new Date(sd.getFullYear(), sd.getMonth(), 0);
    const prevS = prevStart.toISOString().split("T")[0];
    const prevE = prevEnd.toISOString().split("T")[0];
    Promise.all([
      fetchStats(user, startDate, endDate, false),
      fetchStats(user, startDate, endDate, true),
      fetchStats(user, prevS, prevE, false),
      fetchMonthlyRevenue(user, new Date().getFullYear(), new Date().getMonth()+1),
      fetchTodayEvents(user, eventDate),
    ]).then(([c,cum,prev,rev,ev])=>{
      setCurrent(c); setCumulative(cum); setPrevMonth(prev); setMonthlyRev(rev); setTodayEvents(ev); setLoading(false);
    });
  },[user, startDate, endDate, eventDate]);

  const applyMonth = (m: number) => {
    setSelMonth(m);
    const y = new Date().getFullYear();
    const s = `${y}-${String(m).padStart(2,"0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const e = `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
    setStartDate(s); setEndDate(e);
  };

  const timeStr = now.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
  const dateStr = now.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  const isExec = user?.role === "exec";

  const CARDS = [
    { icon:"💰", label:"총매출(광고특전)", main: current.totalRevenue.toLocaleString()+"원", subs: undefined, cumLabel: cumulative.totalRevenue.toLocaleString()+"원", currentValue: current.totalRevenue, prevValue: prevMonth.totalRevenue },
    { icon:"⚡", label:"연계매출(하이타겟)", main: current.linkedRevenue.toLocaleString()+"원", subs: undefined, cumLabel: cumulative.linkedRevenue.toLocaleString()+"원", currentValue: current.linkedRevenue, prevValue: prevMonth.linkedRevenue },
    { icon:"💳", label:"분양회 입회비", main: current.membershipFeeAmt.toLocaleString()+"원", subs:[{label:"당월", value:`${current.membershipCount}건`, color:"text-slate-600"}], cumLabel: cumulative.membershipFeeAmt.toLocaleString()+"원", currentValue: current.membershipFeeAmt, prevValue: prevMonth.membershipFeeAmt },
    { icon:"🔄", label:"분양회 월회비", main: current.monthlyFeeAmt.toLocaleString()+"원", subs:[{label:"당월", value:`${current.monthlyFeeCount}건`, color:"text-slate-600"}], cumLabel: cumulative.monthlyFeeAmt.toLocaleString()+"원", currentValue: current.monthlyFeeAmt, prevValue: prevMonth.monthlyFeeAmt },
    { icon:"🎯", label:"가망고객", main:`${current.hotProspect+current.meetingProspect+current.linkedProspect}명`, subs:[{label:"즉가입가망", value:`${current.hotProspect}명`, color:"text-red-500"},{label:"미팅예정가망", value:`${current.meetingProspect}명`, color:"text-amber-500"},{label:"연계매출가망", value:`${current.linkedProspect}명`, color:"text-slate-500"}], cumLabel:`${cumulative.hotProspect+cumulative.meetingProspect+cumulative.linkedProspect}명`, currentValue: current.hotProspect+current.meetingProspect+current.linkedProspect, prevValue: prevMonth.hotProspect+prevMonth.meetingProspect+prevMonth.linkedProspect },
    { icon:"📅", label:"미팅", main:`${current.upcomingMeetings}건`, subs:[{label:"미팅예정", value:`${current.upcomingMeetings}건`, color:"text-blue-500"},{label:"미팅완료", value:`${current.meetingDone}건`, color:"text-emerald-500"}], cumLabel:`${cumulative.upcomingMeetings + cumulative.meetingDone}건`, currentValue: current.upcomingMeetings+current.meetingDone, prevValue: prevMonth.upcomingMeetings+prevMonth.meetingDone },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-xl font-black text-slate-800">
              📊 대외협력팀 {isExec ? <span className="text-blue-600">{user?.name} {user?.title}</span> : <span className="text-slate-500">종합</span>} 대시보드
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Clock size={13} className="text-blue-400"/>
              <span className="text-xs sm:text-sm font-semibold text-slate-500">{dateStr}</span>
              <b style={{ fontSize:"clamp(13px,2vw,16px)", fontFamily:"'Montserrat', 'Arial Black', sans-serif", fontWeight:900, color: isExec ? "#1D4ED8" : "#334155", fontVariantNumeric:"tabular-nums", letterSpacing:"0.04em", WebkitTextStroke:"0.3px currentColor" }}>{timeStr}</b>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={selMonth} onChange={e=>applyMonth(Number(e.target.value))}
              className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold outline-none cursor-pointer">
              {Array.from({length:12},(_,i)=>(<option key={i+1} value={i+1}>{i+1}월</option>))}
            </select>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2">
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                className="text-xs text-slate-600 bg-transparent outline-none w-[100px]"/>
              <span className="text-slate-300 text-xs">—</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                className="text-xs text-slate-600 bg-transparent outline-none w-[100px]"/>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#E2A83A", boxShadow:"0 0 8px rgba(226,168,58,0.6)" }}/>
              <h2 className="text-base font-bold text-slate-700">당월 현황</h2>
              <span className="text-sm text-slate-400">{startDate.replace(/-/g,".")} ~ {endDate.replace(/-/g,".")}</span>
            </div>
            {loading && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>}
          </div>
          <div className="p-5 flex gap-4 overflow-x-auto">
            {CARDS.map(card=>(<DashCard key={card.label} icon={card.icon} label={card.label} main={card.main} subs={card.subs} cumLabel={card.cumLabel} currentValue={card.currentValue} prevValue={card.prevValue}/>))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid grid-rows-3 gap-4">
            <RevenueTrendCard monthlyRev={monthlyRev}/>
            <WorkRequestBoard user={user}/>
            <NoticeBoard user={user}/>
          </div>
          <DashboardKpiSummary user={user}/>
        </div>

        <DashCalendar user={user} />
      </div>
    </div>
  );
}
