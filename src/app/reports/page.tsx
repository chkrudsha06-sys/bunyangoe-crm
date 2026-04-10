import { supabase, TEAM_MEMBERS, MEMBER_ROLES, formatCurrency } from "@/lib/supabase";
import { Contact, MonthlyGoal } from "@/types";
import { TrendingUp, ArrowRight } from "lucide-react";

async function getReportsData() {
  const { data: contacts } = await supabase.from("contacts").select("*");
  const { data: goals } = await supabase
    .from("monthly_goals")
    .select("*")
    .eq("year", 2026)
    .eq("month", 4);
  return {
    contacts: (contacts as Contact[]) || [],
    goals: (goals as MonthlyGoal[]) || [],
  };
}

export default async function ReportsPage() {
  const { contacts, goals } = await getReportsData();

  // 팀 전체 퍼널
  const total = contacts.length;
  const withTm = contacts.filter((c) => c.has_tm).length;
  const withSensitivity = contacts.filter((c) => c.tm_sensitivity).length;
  const prospects = contacts.filter((c) => c.prospect_type).length;
  const meetingDone = contacts.filter(
    (c) =>
      c.meeting_result &&
      ["계약완료", "예약완료", "서류만수취", "미팅후가망관리", "계약거부", "미팅불발"].includes(c.meeting_result)
  ).length;
  const contracts = contacts.filter((c) => c.meeting_result === "계약완료").length;
  const reservations = contacts.filter((c) => c.meeting_result === "예약완료").length;

  const funnel = [
    { label: "전체 고객 DB", value: total, pct: 100 },
    { label: "TM 완료", value: withTm, pct: total > 0 ? (withTm / total) * 100 : 0 },
    { label: "감도 파악", value: withSensitivity, pct: total > 0 ? (withSensitivity / total) * 100 : 0 },
    { label: "가망 분류", value: prospects, pct: total > 0 ? (prospects / total) * 100 : 0 },
    { label: "미팅 완료", value: meetingDone, pct: total > 0 ? (meetingDone / total) * 100 : 0 },
    { label: "계약 + 예약", value: contracts + reservations, pct: total > 0 ? ((contracts + reservations) / total) * 100 : 0 },
  ];

  // 팀원별 상세
  const memberStats = TEAM_MEMBERS.map((name) => {
    const mc = contacts.filter((c) => c.assigned_to === name);
    const goal = goals.find((g) => g.member_name === name);
    const tmDone = mc.filter((c) => c.has_tm).length;
    const sensH = mc.filter((c) => c.tm_sensitivity === "상").length;
    const sensM = mc.filter((c) => c.tm_sensitivity === "중").length;
    const sensL = mc.filter((c) => c.tm_sensitivity === "하").length;
    const pp = mc.filter((c) => c.prospect_type).length;
    const ct = mc.filter((c) => c.meeting_result === "계약완료").length;
    const rv = mc.filter((c) => c.meeting_result === "예약완료").length;
    const dr = mc.filter((c) => c.meeting_result === "계약거부").length;
    const tmToContract = tmDone > 0 ? ((ct / tmDone) * 100).toFixed(2) : "0.00";
    const tmToProspect = tmDone > 0 ? ((pp / tmDone) * 100).toFixed(1) : "0.0";

    return { name, role: MEMBER_ROLES[name], total: mc.length, tmDone, sensH, sensM, sensL, pp, ct, rv, dr, tmToContract, tmToProspect, goal };
  });

  // 결과 분포
  const resultDist = [
    { label: "계약완료", count: contacts.filter((c) => c.meeting_result === "계약완료").length, color: "bg-emerald-500" },
    { label: "예약완료", count: contacts.filter((c) => c.meeting_result === "예약완료").length, color: "bg-blue-500" },
    { label: "서류만수취", count: contacts.filter((c) => c.meeting_result === "서류만수취").length, color: "bg-yellow-500" },
    { label: "미팅후가망관리", count: contacts.filter((c) => c.meeting_result === "미팅후가망관리").length, color: "bg-purple-500" },
    { label: "계약거부", count: contacts.filter((c) => c.meeting_result === "계약거부").length, color: "bg-red-500" },
    { label: "미팅불발", count: contacts.filter((c) => c.meeting_result === "미팅불발").length, color: "bg-gray-500" },
  ];
  const totalResults = resultDist.reduce((s, r) => s + r.count, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-brand-text font-bold text-xl">성과 분석</h1>
        <p className="text-brand-muted text-sm mt-0.5">2026년 4월 · TM → 계약 전환 퍼널</p>
      </div>

      {/* 전환 퍼널 */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-brand-text mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-brand-gold" />
          팀 전체 전환 퍼널
        </h2>
        <div className="flex items-center gap-2">
          {funnel.map((f, i) => (
            <div key={f.label} className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <div className="flex items-end justify-between mb-1">
                  <span className="text-brand-muted text-xs">{f.label}</span>
                  <span className="text-brand-text font-bold text-sm">{f.value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-brand-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-gold rounded-full"
                    style={{ width: `${f.pct}%`, opacity: 1 - i * 0.1 }}
                  />
                </div>
                <p className="text-brand-muted text-xs mt-0.5 text-right">{f.pct.toFixed(1)}%</p>
              </div>
              {i < funnel.length - 1 && (
                <ArrowRight size={12} className="text-brand-border flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 팀원별 상세 */}
      <div>
        <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">팀원별 실적 상세</h2>
        <div className="grid grid-cols-2 gap-4">
          {memberStats.map((m) => {
            const targetContracts = m.goal?.target_contracts || 4;
            const achieved = m.ct + m.rv;
            const rate = Math.min((achieved / targetContracts) * 100, 100);
            return (
              <div key={m.name} className="bg-brand-surface border border-brand-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-gold/15 rounded-full flex items-center justify-center">
                      <span className="text-brand-gold font-bold">{m.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-brand-text font-semibold">{m.name}</p>
                      <p className="text-brand-muted text-xs">{m.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-brand-gold font-bold text-xl">{achieved}</p>
                    <p className="text-brand-muted text-xs">/ {targetContracts}명 목표</p>
                  </div>
                </div>

                {/* 달성률 바 */}
                <div className="h-2 bg-brand-border rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-brand-gold rounded-full" style={{ width: `${rate}%` }} />
                </div>

                {/* KPI 그리드 */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: "총 DB", value: m.total.toLocaleString(), color: "text-brand-text" },
                    { label: "TM 완료", value: m.tmDone, color: "text-blue-400" },
                    { label: "가망", value: m.pp, color: "text-amber-400" },
                    { label: "계약+예약", value: m.ct + m.rv, color: "text-emerald-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center bg-brand-navy rounded-lg p-2">
                      <p className={`font-bold ${color}`}>{value}</p>
                      <p className="text-brand-muted text-xs">{label}</p>
                    </div>
                  ))}
                </div>

                {/* TM 감도 분포 */}
                <div className="mb-3">
                  <p className="text-brand-muted text-xs mb-1.5">TM 감도 분포</p>
                  <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-brand-border">
                    {m.sensH > 0 && (
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${(m.sensH / (m.sensH + m.sensM + m.sensL || 1)) * 100}%` }}
                        title={`상: ${m.sensH}건`}
                      />
                    )}
                    {m.sensM > 0 && (
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${(m.sensM / (m.sensH + m.sensM + m.sensL || 1)) * 100}%` }}
                        title={`중: ${m.sensM}건`}
                      />
                    )}
                    {m.sensL > 0 && (
                      <div
                        className="h-full bg-gray-500"
                        style={{ width: `${(m.sensL / (m.sensH + m.sensM + m.sensL || 1)) * 100}%` }}
                        title={`하: ${m.sensL}건`}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {[{l:"상", v:m.sensH, c:"text-red-400"},{l:"중", v:m.sensM, c:"text-yellow-400"},{l:"하", v:m.sensL, c:"text-gray-400"}].map(({l,v,c}) => (
                      <div key={l} className="flex items-center gap-1">
                        <span className={`text-xs ${c}`}>{l}</span>
                        <span className="text-brand-muted text-xs">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 전환율 */}
                <div className="flex gap-3 text-sm">
                  <div className="flex-1 bg-brand-navy rounded-lg px-3 py-2">
                    <p className="text-brand-muted text-xs">TM→가망율</p>
                    <p className="text-amber-400 font-bold">{m.tmToProspect}%</p>
                  </div>
                  <div className="flex-1 bg-brand-navy rounded-lg px-3 py-2">
                    <p className="text-brand-muted text-xs">TM→계약율</p>
                    <p className="text-emerald-400 font-bold">{m.tmToContract}%</p>
                  </div>
                  <div className="flex-1 bg-brand-navy rounded-lg px-3 py-2">
                    <p className="text-brand-muted text-xs">계약거부</p>
                    <p className="text-red-400 font-bold">{m.dr}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 미팅 결과 분포 */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-brand-text mb-4">미팅 결과 분포</h2>
        <div className="space-y-2">
          {resultDist.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-brand-muted text-sm w-28 flex-shrink-0">{r.label}</span>
              <div className="flex-1 h-5 bg-brand-border rounded-full overflow-hidden">
                <div
                  className={`h-full ${r.color} rounded-full`}
                  style={{ width: totalResults > 0 ? `${(r.count / totalResults) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-brand-text font-semibold text-sm w-8 text-right">{r.count}</span>
              <span className="text-brand-muted text-xs w-10 text-right">
                {totalResults > 0 ? `${((r.count / totalResults) * 100).toFixed(0)}%` : "0%"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
