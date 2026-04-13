"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, CRMUser } from "@/lib/auth";
import { Clock } from "lucide-react";

interface Stats {
  totalRevenue: number;
  joinCount: number;
  contractCount: number;
  reservationCount: number;
  prospectCount: number;
  meetingCount: number;
  linkedRevenue: number;
  membershipFeeAmt: number;
  monthlyFeeAmt: number;
}
const EMPTY: Stats = {
  totalRevenue: 0, joinCount: 0, contractCount: 0, reservationCount: 0,
  prospectCount: 0, meetingCount: 0, linkedRevenue: 0,
  membershipFeeAmt: 0, monthlyFeeAmt: 0,
};

function formatWon(n: number) {
  if (!n) return "0원";
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`;
  if (n >= 10000000) return `${Math.floor(n / 10000000).toLocaleString()}천만원`;
  if (n >= 10000) return `${Math.floor(n / 10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}
function fmt(n: number, unit = "건") { return `${n.toLocaleString()} ${unit}`; }

async function fetchStats(user: CRMUser, start: string, end: string): Promise<Stats> {
  const isExec = user.role === "exec";
  const today = new Date().toISOString().split("T")[0];

  let cQ = supabase.from("contacts").select("meeting_result,tm_sensitivity,meeting_date")
    .gte("created_at", start).lte("created_at", end + "T23:59:59");
  if (isExec) cQ = cQ.eq("assigned_to", user.name);
  const { data: c = [] } = await cQ;

  let aQ = supabase.from("ad_executions").select("execution_amount,channel,contract_route")
    .gte("payment_date", start).lte("payment_date", end);
  if (isExec) aQ = aQ.eq("team_member", user.name);
  const { data: a = [] } = await aQ;

  let mQ = supabase.from("contacts").select("id").gte("meeting_date", today);
  if (isExec) mQ = mQ.eq("assigned_to", user.name);
  const { data: m = [] } = await mQ;

  const cont = (c||[]).filter((x:any) => x.meeting_result === "계약완료");
  const htRev = (a||[]).filter((x:any) => x.channel === "하이타겟")
    .reduce((s:number, x:any) => s + (x.execution_amount||0), 0);

  return {
    totalRevenue: (a||[]).reduce((s:number, x:any) => s + (x.execution_amount||0), 0),
    joinCount: (c||[]).filter((x:any) => ["계약완료","예약완료"].includes(x.meeting_result)).length,
    contractCount: cont.length,
    reservationCount: (c||[]).filter((x:any) => x.meeting_result === "예약완료").length,
    prospectCount: (c||[]).filter((x:any) => ["즉가입가망","미팅예정가망","연계매출가망"].includes(x.tm_sensitivity||"")).length,
    meetingCount: (m||[]).length,
    linkedRevenue: htRev,
    membershipFeeAmt: cont.length * 500000,
    monthlyFeeAmt: cont.length * 100000,
  };
}

async function fetchTotal(user: CRMUser): Promise<Stats> {
  const isExec = user.role === "exec";
  const today = new Date().toISOString().split("T")[0];

  let cQ = supabase.from("contacts").select("meeting_result,tm_sensitivity");
  if (isExec) cQ = cQ.eq("assigned_to", user.name);
  const { data: c = [] } = await cQ;

  let aQ = supabase.from("ad_executions").select("execution_amount,channel,contract_route");
  if (isExec) aQ = aQ.eq("team_member", user.name);
  const { data: a = [] } = await aQ;

  const cont = (c||[]).filter((x:any) => x.meeting_result === "계약완료");
  const htRev = (a||[]).filter((x:any) => x.channel === "하이타겟")
    .reduce((s:number, x:any) => s + (x.execution_amount||0), 0);

  return {
    totalRevenue: (a||[]).reduce((s:number, x:any) => s + (x.execution_amount||0), 0),
    joinCount: (c||[]).filter((x:any) => ["계약완료","예약완료"].includes(x.meeting_result)).length,
    contractCount: cont.length,
    reservationCount: (c||[]).filter((x:any) => x.meeting_result === "예약완료").length,
    prospectCount: (c||[]).filter((x:any) => ["즉가입가망","미팅예정가망","연계매출가망"].includes(x.tm_sensitivity||"")).length,
    meetingCount: 0,
    linkedRevenue: htRev,
    membershipFeeAmt: cont.length * 500000,
    monthlyFeeAmt: cont.length * 100000,
  };
}

// ── 메트릭 카드 ──
interface CardDef {
  label: string;
  icon: string;
  iconBg: string;
  getValue: (s: Stats) => string;
  getTotalLabel?: (s: Stats) => string;
  subs?: { label: string; getValue: (s: Stats) => string; color: string }[];
}

const CARDS: CardDef[] = [
  {
    label: "총 매출",
    icon: "💰",
    iconBg: "bg-blue-100",
    getValue: (s) => formatWon(s.totalRevenue),
    getTotalLabel: (s) => `누적 ${formatWon(s.totalRevenue)}`,
  },
  {
    label: "분양회 입회수",
    icon: "🏆",
    iconBg: "bg-amber-100",
    getValue: (s) => fmt(s.joinCount),
    getTotalLabel: (s) => `누적 ${fmt(s.joinCount)}`,
    subs: [
      { label: "계약완료", getValue: (s) => fmt(s.contractCount), color: "text-emerald-600" },
      { label: "예약완료", getValue: (s) => fmt(s.reservationCount), color: "text-blue-600" },
    ],
  },
  {
    label: "가망고객",
    icon: "🎯",
    iconBg: "bg-violet-100",
    getValue: (s) => fmt(s.prospectCount, "명"),
    getTotalLabel: (s) => `누적 ${fmt(s.prospectCount, "명")}`,
  },
  {
    label: "미팅예정",
    icon: "📅",
    iconBg: "bg-cyan-100",
    getValue: (s) => fmt(s.meetingCount),
    getTotalLabel: (_) => "오늘 기준 예정",
  },
  {
    label: "입회비",
    icon: "💳",
    iconBg: "bg-emerald-100",
    getValue: (s) => formatWon(s.membershipFeeAmt),
    getTotalLabel: (s) => `누적 ${formatWon(s.membershipFeeAmt)}`,
  },
  {
    label: "월회비",
    icon: "🔄",
    iconBg: "bg-sky-100",
    getValue: (s) => formatWon(s.monthlyFeeAmt),
    getTotalLabel: (s) => `누적 ${formatWon(s.monthlyFeeAmt)}`,
  },
  {
    label: "연계매출 (하이타겟)",
    icon: "⚡",
    iconBg: "bg-indigo-100",
    getValue: (s) => formatWon(s.linkedRevenue),
    getTotalLabel: (s) => `누적 ${formatWon(s.linkedRevenue)}`,
  },
];

function MetricCard({ card, current, total }: { card: CardDef; current: Stats; total: Stats }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex-1 min-w-0 hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center text-lg mb-3`}>
        {card.icon}
      </div>
      <p className="text-xs text-slate-400 font-medium mb-1">{card.label}</p>
      <p className="text-2xl font-black text-slate-800 leading-tight">{card.getValue(current)}</p>
      {card.subs && (
        <div className="flex gap-3 mt-1.5">
          {card.subs.map(s => (
            <span key={s.label} className={`text-xs font-semibold ${s.color}`}>
              {s.label} {s.getValue(current)}
            </span>
          ))}
        </div>
      )}
      {card.getTotalLabel && (
        <p className="text-xs text-slate-400 mt-2 border-t border-slate-50 pt-2">
          {card.getTotalLabel(total)}
        </p>
      )}
    </div>
  );
}

// ── 메인 ──
export default function DashboardPage() {
  const [user, setUser] = useState<CRMUser | null>(null);
  const [current, setCurrent] = useState<Stats>(EMPTY);
  const [total, setTotal] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const getMonthRange = (offset = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    const s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    return { s, e };
  };

  const [startDate, setStartDate] = useState(getMonthRange().s);
  const [endDate, setEndDate] = useState(getMonthRange().e);
  const [preset, setPreset] = useState("이번 달");

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setUser(getCurrentUser()); }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchStats(user, startDate, endDate), fetchTotal(user)]).then(([c, t]) => {
      setCurrent(c); setTotal(t); setLoading(false);
    });
  }, [user, startDate, endDate]);

  const applyPreset = (p: string, offset: number) => {
    const { s, e } = getMonthRange(offset);
    setStartDate(s); setEndDate(e); setPreset(p);
  };

  const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  const isExec = user?.role === "exec";
  const periodLabel = `${startDate.replace(/-/g, ".")} ~ ${endDate.replace(/-/g, ".")}`;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-800">
              대외협력팀{" "}
              {isExec
                ? <span className="text-blue-600">{user?.name} {user?.title}</span>
                : <span className="text-slate-500">종합</span>
              }{" "}대시보드
            </h1>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock size={12} className="text-blue-400" />
              <span className="text-xs">{dateStr}</span>
              <span className="text-xs font-mono font-bold text-blue-500 tabular-nums">{timeStr}</span>
            </div>
          </div>

          {/* 기간 필터 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <input type="date" value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset("직접 설정"); }}
                className="text-xs text-slate-600 bg-transparent outline-none" />
              <span className="text-slate-300 text-xs px-1">—</span>
              <input type="date" value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset("직접 설정"); }}
                className="text-xs text-slate-600 bg-transparent outline-none" />
            </div>
            <div className="flex gap-1">
              {[["이번 달", 0], ["지난 달", -1]].map(([label, offset]) => (
                <button key={label as string}
                  onClick={() => applyPreset(label as string, offset as number)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                    preset === label ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto p-5 space-y-4">

        {/* 당월 섹션 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 className="text-sm font-bold text-slate-700">당월 현황</h2>
              <span className="text-xs text-slate-400 font-medium">{periodLabel}</span>
            </div>
            {loading && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
          </div>
          <div className="p-4 flex gap-3 overflow-x-auto">
            {CARDS.map((card) => (
              <MetricCard key={card.label} card={card} current={current} total={total} />
            ))}
          </div>
        </div>

        {/* 누적 섹션 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <h2 className="text-sm font-bold text-slate-700">총 누적 현황</h2>
          </div>
          <div className="p-4 flex gap-3 overflow-x-auto">
            {CARDS.map((card) => (
              <div key={card.label} className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex-1 min-w-0">
                <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center text-base mb-2`}>
                  {card.icon}
                </div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">{card.label}</p>
                <p className="text-xl font-black text-slate-700">{card.getValue(total)}</p>
                {card.subs && (
                  <div className="flex gap-2 mt-1">
                    {card.subs.map(s => (
                      <span key={s.label} className={`text-xs font-semibold ${s.color}`}>
                        {s.label} {s.getValue(total)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
