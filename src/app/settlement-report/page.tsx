"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

// 주차 계산: 일요일~토요일 기준
function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear(), month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstSat = new Date(year, month, 1);
  // 첫 번째 토요일 찾기
  while (firstSat.getDay() !== 6) firstSat.setDate(firstSat.getDate() + 1);
  if (d <= firstSat) return 1;
  // 2주차부터: 첫 번째 일요일 기준
  const firstSun = new Date(firstSat);
  firstSun.setDate(firstSat.getDate() + 1);
  const diff = Math.floor((d.getTime() - firstSun.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return diff + 2;
}

function getWeekRanges(year: number, month: number): { week: number; start: string; end: string }[] {
  const weeks: { week: number; start: string; end: string }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1);
  const firstSat = new Date(year, month - 1, 1);
  while (firstSat.getDay() !== 6) firstSat.setDate(firstSat.getDate() + 1);
  const firstSatDate = Math.min(firstSat.getDate(), daysInMonth);
  weeks.push({ week: 1, start: `${year}-${String(month).padStart(2,"0")}-01`, end: `${year}-${String(month).padStart(2,"0")}-${String(firstSatDate).padStart(2,"0")}` });
  let sunDate = firstSatDate + 1;
  let wk = 2;
  while (sunDate <= daysInMonth) {
    const endDate = Math.min(sunDate + 6, daysInMonth);
    weeks.push({ week: wk, start: `${year}-${String(month).padStart(2,"0")}-${String(sunDate).padStart(2,"0")}`, end: `${year}-${String(month).padStart(2,"0")}-${String(endDate).padStart(2,"0")}` });
    sunDate += 7; wk++;
  }
  return weeks;
}

const OPS_MAP: Record<string, string> = { "이세호": "김재영", "기여운": "김재영", "조계현": "최은정", "최연전": "최은정" };
const HOG_CHS = ["호갱노노_채널톡", "호갱노노_단지마커", "호갱노노_기타"];
const fmt = (n: number) => n.toLocaleString() + "원";
const fmtMan = (n: number) => Math.round(n / 10000) > 0 ? Math.round(n / 10000).toLocaleString() + "만" : fmt(n);

export default function SettlementReport() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [allExecs, setAllExecs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selMonth, setSelMonth] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; });

  const year = parseInt(selMonth.split("-")[0]);
  const month = parseInt(selMonth.split("-")[1]);
  const monthLabel = `${month}월`;
  const mStart = `${selMonth}-01`;
  const mEnd = `${selMonth}-${String(new Date(year, month, 0).getDate()).padStart(2,"0")}`;
  const weeks = getWeekRanges(year, month);

  useEffect(() => { const u = getCurrentUser(); setUser(u); }, []);
  useEffect(() => { if (user) loadData(); }, [user, selMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from("ad_executions").select("*").gte("payment_date", mStart).lte("payment_date", mEnd),
        supabase.from("contacts").select("id,name,title,bunyanghoe_number,meeting_result,assigned_to,contract_date,reservation_date").in("meeting_result", ["계약완료", "예약완료"]),
        supabase.from("ad_executions").select("id,member_name,channel,payment_date,execution_amount,vat_amount,refund_amount").eq("channel", "분양회 월회비"),
        supabase.from("wanpan_trucks").select("*").gte("dispatch_date", mStart).lte("dispatch_date", mEnd).order("dispatch_date"),
      ]);
      setData(r1.data || []);
      setContacts(r2.data || []);
      setAllExecs(r3.data || []);
      setTrucks(r4.data || []);
    } finally { setLoading(false); }
  };

  const eff = (e: any) => (e.vat_amount && e.vat_amount !== e.execution_amount) ? e.vat_amount : (e.execution_amount || 0);

  // ═══ 1. 광고연계매출-분양회 (하이타겟만) ═══
  const bunyanghoeHT = data.filter(e => e.contract_route === "분양회" && e.channel === "하이타겟" && (e.refund_amount || 0) === 0);
  const bunyanghoeRows = bunyanghoeHT.map(e => ({
    week: `${month}월${getWeekNumber(e.payment_date)}주차`,
    weekNum: getWeekNumber(e.payment_date),
    amount: eff(e),
    teamMember: e.team_member || "-",
    consultant: e.consultant || "-",
    customer: `${e.member_name || "-"} ${e.position || ""}`.trim(),
  })).sort((a, b) => a.weekNum - b.weekNum);

  // ═══ 2. 광고연계매출-완판트럭 (하이타겟만) ═══
  const wanpanHT = data.filter(e => e.contract_route === "완판트럭" && e.channel === "하이타겟" && (e.refund_amount || 0) === 0);
  const wanpanRows = wanpanHT.map(e => ({
    week: `${month}월${getWeekNumber(e.payment_date)}주차`,
    weekNum: getWeekNumber(e.payment_date),
    amount: eff(e),
    teamMember: e.team_member || "-",
    consultant: e.consultant || "-",
  })).sort((a, b) => a.weekNum - b.weekNum);

  // ═══ 3. 광고연계매출-환불내역 ═══
  const refunds = data.filter(e => e.channel === "하이타겟" && (e.refund_amount || 0) > 0);
  const refundRows = refunds.map(e => ({
    week: `${month}월${getWeekNumber(e.payment_date)}주차`,
    weekNum: getWeekNumber(e.payment_date),
    amount: e.refund_amount || 0,
    teamMember: e.team_member || "-",
  })).sort((a, b) => a.weekNum - b.weekNum);
  const totalRefund = refundRows.reduce((s, r) => s + r.amount, 0);

  // ═══ 4. 주차별마감 ═══
  const allHT = data.filter(e => e.channel === "하이타겟");
  const weeklyTotals = weeks.map(w => {
    const weekData = allHT.filter(e => e.payment_date >= w.start && e.payment_date <= w.end);
    const sales = weekData.filter(e => (e.refund_amount || 0) === 0).reduce((s, e) => s + eff(e), 0);
    return { label: `${month}월${w.week}주`, amount: sales };
  });
  const totalHTSales = weeklyTotals.reduce((s, w) => s + w.amount, 0);
  const totalHTClose = totalHTSales - totalRefund;

  // ═══ 5. 광고특전매출 (LMS + 호갱노노) ═══
  const specialSales = data.filter(e => (e.channel === "LMS" || HOG_CHS.includes(e.channel)) && (e.refund_amount || 0) === 0);
  const specialRows = specialSales.map(e => ({
    week: `${month}월${getWeekNumber(e.payment_date)}주차`,
    weekNum: getWeekNumber(e.payment_date),
    product: e.channel === "LMS" ? "LMS" : "호갱노노",
    amount: eff(e),
    customer: `${e.member_name || "-"} ${e.position || ""}`.trim(),
    teamMember: e.team_member || "-",
    consultant: e.consultant || "-",
    opsMember: OPS_MAP[e.team_member || ""] || "-",
  })).sort((a, b) => a.weekNum - b.weekNum);

  // ═══ 6. 매출 트랙별 마감 ═══
  const allAdSales = data.filter(e => ["하이타겟", "LMS", ...HOG_CHS].includes(e.channel));
  const track1Total = allAdSales.reduce((s, e) => s + eff(e) - (e.refund_amount || 0), 0);
  const track1Target = 170000000;
  const track2Count = data.filter(e => e.channel === "분양회 월회비" && (e.refund_amount || 0) === 0).length;
  const track2Target = 25;
  const track3Total = data.filter(e => e.channel === "하이타겟" && (e.refund_amount || 0) === 0).reduce((s, e) => s + eff(e), 0);
  const track3Target = 110000000;

  const th = "px-3 py-2.5 text-left text-xs font-bold border-b-2";
  const td = "px-3 py-2 text-xs border-b";

  if (!user || !["admin", "ops"].includes(user.role)) return (
    <div className="flex items-center justify-center h-screen" style={{ color: "var(--text-subtle)" }}>
      <p>관리자 전용 메뉴입니다.</p>
    </div>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>📊 결산보고서</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>당월 기준 매출 결산 · {year}년 {monthLabel}</p>
        </div>
        <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* ═══ 1. 광고연계매출 - 분양회 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#8b5cf6" }}>분양회</span>
              광고연계매출 — 하이타겟
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>주차</th><th className={th}>금액</th><th className={th}>대외협력팀</th><th className={th}>컨설턴트</th><th className={th}>고객명(직급)</th>
                </tr></thead>
                <tbody>
                  {bunyanghoeRows.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-xs" style={{ color: "var(--text-subtle)" }}>데이터 없음</td></tr> :
                    bunyanghoeRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td}><span className="font-semibold" style={{ color: "#8b5cf6" }}>{r.week}</span></td>
                        <td className={td + " font-bold"}>{fmtMan(r.amount)}</td>
                        <td className={td}>{r.teamMember}</td>
                        <td className={td}>{r.consultant}</td>
                        <td className={td}>{r.customer}</td>
                      </tr>
                    ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td} style={{ color: "#8b5cf6" }}>{fmt(bunyanghoeRows.reduce((s, r) => s + r.amount, 0))}</td>
                    <td colSpan={3} className={td}>{bunyanghoeRows.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 1-2. 대협팀활동연계매출 - 하이타겟 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#3b82f6" }}>대협팀</span>
              대협팀활동연계매출 — 하이타겟
            </h2>
            {(() => {
              const daehyupHT = data.filter(e => e.contract_route === "대협팀 활동" && e.channel === "하이타겟" && (e.refund_amount || 0) === 0);
              const rows = daehyupHT.map(e => ({
                week: `${month}월${getWeekNumber(e.payment_date)}주차`, weekNum: getWeekNumber(e.payment_date),
                amount: eff(e), teamMember: e.team_member || "-", consultant: e.consultant || "-",
                customer: `${e.member_name || "-"} ${e.position || ""}`.trim(),
              })).sort((a, b) => a.weekNum - b.weekNum);
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>주차</th><th className={th}>금액</th><th className={th}>대외협력팀</th><th className={th}>컨설턴트</th><th className={th}>고객명(직급)</th>
                </tr></thead><tbody>
                  {rows.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-xs" style={{ color: "var(--text-subtle)" }}>데이터 없음</td></tr> :
                    rows.map((r, i) => (<tr key={i} style={{ color: "var(--text)" }}><td className={td}><span className="font-semibold" style={{ color: "#3b82f6" }}>{r.week}</span></td><td className={td + " font-bold"}>{fmtMan(r.amount)}</td><td className={td}>{r.teamMember}</td><td className={td}>{r.consultant}</td><td className={td}>{r.customer}</td></tr>))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td} style={{ color: "#3b82f6" }}>{fmt(rows.reduce((s, r) => s + r.amount, 0))}</td><td colSpan={3} className={td}>{rows.length}건</td>
                  </tr>
                </tbody></table></div>
              );
            })()}
          </section>

          {/* ═══ 2. 광고연계매출 - 완판트럭 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#f59e0b" }}>완판트럭</span>
              광고연계매출 — 하이타겟
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>주차</th><th className={th}>금액</th><th className={th}>대외협력팀</th><th className={th}>컨설턴트</th>
                </tr></thead>
                <tbody>
                  {wanpanRows.length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-xs" style={{ color: "var(--text-subtle)" }}>데이터 없음</td></tr> :
                    wanpanRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td}><span className="font-semibold" style={{ color: "#f59e0b" }}>{r.week}</span></td>
                        <td className={td + " font-bold"}>{fmtMan(r.amount)}</td>
                        <td className={td}>{r.teamMember}</td>
                        <td className={td}>{r.consultant}</td>
                      </tr>
                    ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td} style={{ color: "#f59e0b" }}>{fmt(wanpanRows.reduce((s, r) => s + r.amount, 0))}</td>
                    <td colSpan={2} className={td}>{wanpanRows.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 3. 광고연계매출 - 환불내역 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#ef4444" }}>환불</span>
              광고연계매출 — 환불내역
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>주차</th><th className={th}>금액</th><th className={th}>대외협력팀</th>
                </tr></thead>
                <tbody>
                  {refundRows.length === 0 ? <tr><td colSpan={3} className="text-center py-6 text-xs" style={{ color: "var(--text-subtle)" }}>환불 내역 없음</td></tr> :
                    refundRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td}><span className="font-semibold" style={{ color: "#ef4444" }}>{r.week}</span></td>
                        <td className={td + " font-bold"} style={{ color: "#ef4444" }}>-{fmtMan(r.amount)}</td>
                        <td className={td}>{r.teamMember}</td>
                      </tr>
                    ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "#ef4444" }}>
                    <td className={td}>환불 합계</td><td className={td}>-{fmt(totalRefund)}</td><td className={td}>{refundRows.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 4. 광고연계매출 주차별마감 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📅 광고연계매출 주차별 마감 (하이타겟)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>구분</th>
                  {weeklyTotals.map(w => <th key={w.label} className={th}>{w.label}</th>)}
                  <th className={th} style={{ color: "#ef4444" }}>환불</th>
                  <th className={th} style={{ color: "#3b82f6" }}>{monthLabel} 마감</th>
                </tr></thead>
                <tbody>
                  <tr style={{ color: "var(--text)" }}>
                    <td className={td + " font-bold"}>매출액</td>
                    {weeklyTotals.map(w => <td key={w.label} className={td + " font-semibold"}>{w.amount > 0 ? fmtMan(w.amount) : "-"}</td>)}
                    <td className={td + " font-bold"} style={{ color: "#ef4444" }}>{totalRefund > 0 ? `-${fmtMan(totalRefund)}` : "-"}</td>
                    <td className={td + " font-black text-sm"} style={{ color: "#3b82f6" }}>{fmt(totalHTClose)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 5. 광고특전매출 (운영파트귀속) ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#10b981" }}>운영파트</span>
              광고특전매출 (LMS + 호갱노노)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>주차</th><th className={th}>상품</th><th className={th}>금액</th><th className={th}>광고주</th><th className={th}>대외협력팀</th><th className={th}>컨설턴트</th><th className={th}>운영파트</th>
                </tr></thead>
                <tbody>
                  {specialRows.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-xs" style={{ color: "var(--text-subtle)" }}>데이터 없음</td></tr> :
                    specialRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td}><span className="font-semibold" style={{ color: "#10b981" }}>{r.week}</span></td>
                        <td className={td}><span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: r.product === "LMS" ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)", color: r.product === "LMS" ? "#3b82f6" : "#f59e0b" }}>{r.product}</span></td>
                        <td className={td + " font-bold"}>{fmtMan(r.amount)}</td>
                        <td className={td}>{r.customer}</td>
                        <td className={td}>{r.teamMember}</td>
                        <td className={td}>{r.consultant}</td>
                        <td className={td}><span className="font-semibold" style={{ color: "#10b981" }}>{r.opsMember}</span></td>
                      </tr>
                    ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td}></td>
                    <td className={td} style={{ color: "#10b981" }}>{fmt(specialRows.reduce((s, r) => s + r.amount, 0))}</td>
                    <td colSpan={4} className={td}>{specialRows.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 6. 매출 트랙별 마감 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>🏁 매출 트랙별 {monthLabel} 마감 (3트랙 독립)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>매출트랙</th><th className={th}>{monthLabel} 목표</th><th className={th}>현재 진행</th><th className={th}>달성률</th><th className={th}>성격</th>
                </tr></thead>
                <tbody>
                  {[
                    { track: "광고연계매출", target: track1Target, current: track1Total, unit: "원", note: "실행파트 귀속", color: "#3b82f6" },
                    { track: "분양회 (결제완료)", target: track2Target, current: track2Count, unit: "건", note: "실행파트 (결제건수)", color: "#8b5cf6" },
                    { track: "광고특전매출", target: track3Target, current: track3Total, unit: "원", note: "운영파트 귀속", color: "#10b981" },
                  ].map(t => {
                    const rate = t.unit === "원" ? (t.target > 0 ? t.current / t.target * 100 : 0) : (t.target > 0 ? t.current / t.target * 100 : 0);
                    return (
                      <tr key={t.track} style={{ color: "var(--text)" }}>
                        <td className={td + " font-bold"}><span style={{ color: t.color }}>●</span> {t.track}</td>
                        <td className={td + " font-semibold"}>{t.unit === "원" ? fmt(t.target) : `${t.target}건`}</td>
                        <td className={td}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{t.unit === "원" ? fmt(t.current) : `${t.current}건`}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 120 }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: t.color }} />
                            </div>
                          </div>
                        </td>
                        <td className={td + " font-black text-sm"} style={{ color: rate >= 100 ? "#10b981" : rate >= 50 ? t.color : "#ef4444" }}>{rate.toFixed(1)}%</td>
                        <td className={td + " text-xs"} style={{ color: "var(--text-muted)" }}>{t.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {/* ═══════════════ PART 2. 분양회 ═══════════════ */}
          <div className="mt-8 mb-4"><h2 className="text-lg font-black" style={{ color: "var(--text)" }}>PART 2. 분양회</h2></div>

          {(() => {
            // 특수 케이스 메모
            const SPECIAL_NOTES: Record<string, string> = {
              "백민엽": "3월 예약완료→계약완료 미전환 (당월내 전환예정)",
              "김나윤": "3월 예약완료→계약완료 미전환 (당월내 전환예정)",
              "이연수": "4월 예약완료→계약완료 미전환 (당월내 전환예정)",
              "윤권": "예약 후 현장상황 문제로 딜레이",
              "김정환": "현장문제 해소 후 진행예정",
              "장은경": "계약완료, 사업자 발행 후 당월입금예정",
              "김성주": "계약완료, 사업자 발행 후 당월입금예정",
              "최두식": "정기결제 등록, 개인계좌 문제로 별도입금예정",
              "이정재": "정기출금 불가, 매월 별도 입금키로함",
              "신우진": "광고효율 불만족 임시중단",
            };
            const TARGETS: Record<string, { count: number; amount: number }> = {
              "조계현": { count: 9, amount: 4950000 },
              "이세호": { count: 8, amount: 4400000 },
              "기여운": { count: 14, amount: 7700000 },
              "최연전": { count: 9, amount: 4950000 },
            };
            const EXEC_MEMBERS = ["조계현", "이세호", "기여운", "최연전"];

            // 가입일 = contract_date 또는 reservation_date
            const getJoinDate = (c: any) => c.contract_date || c.reservation_date || "";
            const getJoinMonth = (c: any) => { const d = getJoinDate(c); return d ? d.substring(0, 7) : ""; };
            const getNum = (c: any) => { const n = c.bunyanghoe_number || ""; return parseInt(n.replace(/[^0-9]/g, "")) || 0; };

            // 당월 신규가입 회원
            const monthNewMembers = contacts
              .filter(c => { const d = getJoinDate(c); return d >= mStart && d <= mEnd; })
              .sort((a, b) => getNum(a) - getNum(b));

            // 전체 월회비 결제 내역 (all months)
            const allFees = allExecs.filter(e => (e.refund_amount || 0) === 0).sort((a: any, b: any) => (a.payment_date || "").localeCompare(b.payment_date || ""));
            // 당월 월회비 결제
            const monthFees = allFees.filter((e: any) => e.payment_date >= mStart && e.payment_date <= mEnd);

            // 회원별 결제 이력 (차수별)
            const getMemberPayments = (name: string) => {
              return allFees.filter((e: any) => e.member_name === name).sort((a: any, b: any) => (a.payment_date || "").localeCompare(b.payment_date || ""));
            };

            // 당월 결제 상태 확인
            const getPaymentStatus = (name: string) => {
              const paid = monthFees.find((e: any) => e.member_name === name);
              return paid ? paid.payment_date : null;
            };

            // 월별 가입자 수 (2~5월)
            const monthRange = ["02", "03", "04", "05"];
            const getMonthJoinCount = (assignee: string, m: string) => {
              return contacts.filter(c => c.assigned_to === assignee && getJoinMonth(c) === `${year}-${m}`).length;
            };

            return (
              <>
                {/* ═══ P2-1. 당월 주차별 신규모집 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📋 당월 주차별 신규모집</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                      <th className={th}>연번</th><th className={th}>이름</th><th className={th}>직급</th><th className={th}>실행파트</th><th className={th}>결제상태</th><th className={th}>비고</th>
                    </tr></thead><tbody>
                      {monthNewMembers.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-xs" style={{ color: "var(--text-subtle)" }}>당월 신규가입 없음</td></tr> :
                        monthNewMembers.map(c => {
                          const paidDate = getPaymentStatus(c.name);
                          return (
                            <tr key={c.id} style={{ color: "var(--text)" }}>
                              <td className={td + " font-bold"}>{getNum(c)}</td>
                              <td className={td + " font-semibold"}>{c.name}</td>
                              <td className={td}>{c.title || "-"}</td>
                              <td className={td}>{c.assigned_to || "-"}</td>
                              <td className={td}><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: paidDate ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: paidDate ? "#10b981" : "#f59e0b" }}>{paidDate || "예정"}</span></td>
                              <td className={td + " text-xs"} style={{ color: "var(--text-muted)" }}>{SPECIAL_NOTES[c.name] || `${month}월${getWeekNumber(getJoinDate(c))}주차 가입`}</td>
                            </tr>
                          );
                        })}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-2. 전체회원결제현황 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>💳 전체회원 결제현황</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                      <th className={th}>연번</th><th className={th}>이름</th><th className={th}>직급</th><th className={th}>가입일</th>
                      <th className={th}>1차</th><th className={th}>2차</th><th className={th}>3차</th><th className={th}>4차</th>
                      <th className={th}>실행파트</th><th className={th}>비고</th>
                    </tr></thead><tbody>
                      {contacts.sort((a, b) => getNum(a) - getNum(b)).map(c => {
                        const payments = getMemberPayments(c.name);
                        return (
                          <tr key={c.id} style={{ color: "var(--text)" }}>
                            <td className={td + " font-bold"}>{getNum(c)}</td>
                            <td className={td + " font-semibold"}>{c.name}</td>
                            <td className={td}>{c.title || "-"}</td>
                            <td className={td}>{getJoinDate(c) || "-"}</td>
                            {[0, 1, 2, 3].map(i => (
                              <td key={i} className={td}><span className={payments[i] ? "font-semibold" : ""} style={{ color: payments[i] ? "#10b981" : "var(--text-subtle)" }}>{payments[i]?.payment_date || "-"}</span></td>
                            ))}
                            <td className={td}>{c.assigned_to || "-"}</td>
                            <td className={td + " text-[10px]"} style={{ color: "var(--text-muted)" }}>{SPECIAL_NOTES[c.name] || ""}</td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-3. 월별 담당자 분양회 모집실적 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📈 월별 담당자 분양회 모집실적 (가입 VS 결제 분리)</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                      <th className={th}>대협팀 담당자</th>
                      {monthRange.map(m => <th key={m} className={th}>{parseInt(m)}월 가입</th>)}
                      <th className={th}>누적가입</th><th className={th}>결제완료</th><th className={th}>결제대기</th><th className={th}>결제대기회원</th>
                    </tr></thead><tbody>
                      {EXEC_MEMBERS.map(name => {
                        const myContacts = contacts.filter(c => c.assigned_to === name);
                        const totalJoined = myContacts.length;
                        const paidThisMonth = monthFees.filter((e: any) => {
                          const c = myContacts.find(c2 => c2.name === e.member_name);
                          return !!c;
                        }).length;
                        const unpaid = totalJoined - myContacts.filter(c => allFees.some((e: any) => e.member_name === c.name && e.payment_date >= mStart && e.payment_date <= mEnd)).length;
                        const specialMembers = myContacts.filter(c => SPECIAL_NOTES[c.name]);
                        return (
                          <tr key={name} style={{ color: "var(--text)" }}>
                            <td className={td + " font-bold"}>{name}</td>
                            {monthRange.map(m => <td key={m} className={td + " text-center font-semibold"}>{getMonthJoinCount(name, m)}명</td>)}
                            <td className={td + " text-center font-bold"} style={{ color: "#3b82f6" }}>{totalJoined}명</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#10b981" }}>{paidThisMonth}건</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#f59e0b" }}>{unpaid}건</td>
                            <td className={td + " text-[10px]"} style={{ color: "var(--text-muted)" }}>{specialMembers.map(c => `${c.name}: ${SPECIAL_NOTES[c.name]}`).join(" / ") || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-4. 실행파트 담당자별 현재 진척율 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>🎯 실행파트 담당자별 현재 진척율</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                      <th className={th}>담당자</th><th className={th}>{monthLabel} 가입</th><th className={th}>결제완료</th><th className={th}>결제미완료</th><th className={th}>결제매출</th><th className={th}>{monthLabel} 목표</th><th className={th}>달성율</th>
                    </tr></thead><tbody>
                      {EXEC_MEMBERS.map(name => {
                        const myContacts = contacts.filter(c => c.assigned_to === name);
                        const monthJoined = myContacts.filter(c => { const d = getJoinDate(c); return d >= mStart && d <= mEnd; }).length;
                        const paidMembers = myContacts.filter(c => monthFees.some((e: any) => e.member_name === c.name));
                        const paidCount = paidMembers.length;
                        const unpaidCount = myContacts.length - paidCount;
                        const paidAmount = monthFees.filter((e: any) => myContacts.some(c => c.name === e.member_name)).reduce((s: number, e: any) => s + eff(e), 0);
                        const target = TARGETS[name]?.count || 0;
                        const rate = target > 0 ? paidCount / target * 100 : 0;
                        return (
                          <tr key={name} style={{ color: "var(--text)" }}>
                            <td className={td + " font-bold"}>{name}</td>
                            <td className={td + " text-center"}>{monthJoined}명</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#10b981" }}>{paidCount}건</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#ef4444" }}>{unpaidCount}건</td>
                            <td className={td + " font-semibold"}>{fmt(paidAmount)}</td>
                            <td className={td + " text-center"}>{target}건</td>
                            <td className={td + " font-black"} style={{ color: rate >= 100 ? "#10b981" : rate >= 50 ? "#3b82f6" : "#ef4444" }}>
                              <div className="flex items-center gap-2">
                                <span>{rate.toFixed(1)}%</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 80 }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: rate >= 100 ? "#10b981" : "#3b82f6" }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-5. 차수별 결제 진행율 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📊 {monthLabel} 차수별 결제 진행율</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                      <th className={th}>결제분류</th><th className={th}>건수</th><th className={th}>매출</th><th className={th}>회원명</th>
                    </tr></thead><tbody>
                      {(() => {
                        // 가입월 기준으로 차수 계산
                        const joinMonths = [
                          { label: `4차결제 (2월 가입자)`, joinM: `${year}-02` },
                          { label: `3차결제 (3월 가입자)`, joinM: `${year}-03` },
                          { label: `2차결제 (4월 가입자)`, joinM: `${year}-04` },
                          { label: `1차결제 (${monthLabel} 가입자)`, joinM: selMonth },
                        ];
                        return joinMonths.map(jm => {
                          const members = contacts.filter(c => getJoinMonth(c) === jm.joinM);
                          const paidMembers = members.filter(c => monthFees.some((e: any) => e.member_name === c.name));
                          const unpaidMembers = members.filter(c => !monthFees.some((e: any) => e.member_name === c.name));
                          const paidAmount = paidMembers.reduce((s, c) => {
                            const fee = monthFees.find((e: any) => e.member_name === c.name);
                            return s + (fee ? eff(fee) : 0);
                          }, 0);
                          return (
                            <tr key={jm.label} style={{ color: "var(--text)" }}>
                              <td className={td + " font-bold"}>{jm.label}</td>
                              <td className={td + " text-center font-bold"} style={{ color: "#3b82f6" }}>{paidMembers.length}건 <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>/ {members.length}명</span></td>
                              <td className={td + " font-semibold"}>{paidAmount > 0 ? fmt(paidAmount) : "-"}</td>
                              <td className={td + " text-xs"}>
                                {paidMembers.length > 0 && <span style={{ color: "#10b981" }}>✓ {paidMembers.map(c => c.name).join(", ")}</span>}
                                {unpaidMembers.length > 0 && <span style={{ color: "#f59e0b" }}>{paidMembers.length > 0 ? " / " : ""}예정: {unpaidMembers.map(c => c.name).join(", ")}</span>}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-6. 담당자별 회비 매출 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>💰 담당자별 {monthLabel} 회비 매출</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                      <th className={th}>담당자</th><th className={th}>결제건수</th><th className={th}>회비매출</th><th className={th}>목표매출</th><th className={th}>달성율</th>
                    </tr></thead><tbody>
                      {EXEC_MEMBERS.map(name => {
                        const myContacts = contacts.filter(c => c.assigned_to === name);
                        const paidFees = monthFees.filter((e: any) => myContacts.some(c => c.name === e.member_name));
                        const paidCount = paidFees.length;
                        const paidAmount = paidFees.reduce((s: number, e: any) => s + eff(e), 0);
                        const targetAmt = TARGETS[name]?.amount || 0;
                        const rate = targetAmt > 0 ? paidAmount / targetAmt * 100 : 0;
                        return (
                          <tr key={name} style={{ color: "var(--text)" }}>
                            <td className={td + " font-bold"}>{name}</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#3b82f6" }}>{paidCount}건</td>
                            <td className={td + " font-bold"}>{fmt(paidAmount)}</td>
                            <td className={td + " font-semibold"}>{fmt(targetAmt)}</td>
                            <td className={td + " font-black"} style={{ color: rate >= 100 ? "#10b981" : rate >= 50 ? "#3b82f6" : "#ef4444" }}>
                              <div className="flex items-center gap-2">
                                <span>{rate.toFixed(1)}%</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 100 }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: rate >= 100 ? "#10b981" : "#3b82f6" }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const totalPaid = EXEC_MEMBERS.reduce((s, name) => {
                          const myC = contacts.filter(c => c.assigned_to === name);
                          return s + monthFees.filter((e: any) => myC.some(c => c.name === e.member_name)).reduce((s2: number, e: any) => s2 + eff(e), 0);
                        }, 0);
                        const totalTarget = Object.values(TARGETS).reduce((s, t) => s + t.amount, 0);
                        const totalCount = EXEC_MEMBERS.reduce((s, name) => {
                          const myC = contacts.filter(c => c.assigned_to === name);
                          return s + monthFees.filter((e: any) => myC.some(c => c.name === e.member_name)).length;
                        }, 0);
                        const rate = totalTarget > 0 ? totalPaid / totalTarget * 100 : 0;
                        return (
                          <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                            <td className={td}>합계</td>
                            <td className={td + " text-center"} style={{ color: "#3b82f6" }}>{totalCount}건</td>
                            <td className={td}>{fmt(totalPaid)}</td>
                            <td className={td}>{fmt(totalTarget)}</td>
                            <td className={td} style={{ color: rate >= 100 ? "#10b981" : "#3b82f6" }}>{rate.toFixed(1)}%</td>
                          </tr>
                        );
                      })()}
                    </tbody></table>
                  </div>
                </section>
              </>
            );
          })()}
          {/* ═══════════════ PART 3. 완판트럭 ═══════════════ */}
          <div className="mt-8 mb-4"><h2 className="text-lg font-black" style={{ color: "var(--text)" }}>PART 3. 완판트럭</h2></div>

          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>🚚 {monthLabel} 완판트럭 실행 현황</h2>
            {(() => {
              const TRUCK_BASE = 28; // 4월 마지막 회차
              const truckRows = trucks.sort((a: any, b: any) => (a.dispatch_date || "").localeCompare(b.dispatch_date || "")).map((t: any, i: number) => ({
                round: TRUCK_BASE + i + 1,
                week: `${month}월${getWeekNumber(t.dispatch_date)}주차`,
                siteName: t.site_name || "-",
                date: t.dispatch_date || "-",
                status: new Date(t.dispatch_date + "T23:59:59") <= new Date() ? "완료" : "예정",
              }));
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>회차</th><th className={th}>주차</th><th className={th}>현장명</th><th className={th}>실행일</th><th className={th}>상태</th>
                </tr></thead><tbody>
                  {truckRows.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-xs" style={{ color: "var(--text-subtle)" }}>데이터 없음</td></tr> :
                    truckRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td + " font-bold"} style={{ color: "#f59e0b" }}>{r.round}회차</td>
                        <td className={td}>{r.week}</td>
                        <td className={td + " font-semibold"}>{r.siteName}</td>
                        <td className={td}>{r.date}</td>
                        <td className={td}><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: r.status === "완료" ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: r.status === "완료" ? "#10b981" : "#3b82f6" }}>{r.status}</span></td>
                      </tr>
                    ))}
                </tbody></table></div>
              );
            })()}
          </section>

          {/* ═══════════════ PART 4. 신규회원 즉시 매출 패턴 ═══════════════ */}
          <div className="mt-8 mb-4"><h2 className="text-lg font-black" style={{ color: "var(--text)" }}>PART 4. 신규회원 즉시 매출 패턴</h2></div>

          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>⚡ 가입 후 7일 이내 매출 발생 케이스</h2>
            {(() => {
              const monthNew = contacts.filter(c => { const d = c.contract_date || c.reservation_date || ""; return d >= mStart && d <= mEnd; });
              const quickSales: any[] = [];
              monthNew.forEach(c => {
                const joinDate = c.contract_date || c.reservation_date || "";
                const joinD = new Date(joinDate + "T00:00:00");
                const within7 = new Date(joinD); within7.setDate(within7.getDate() + 7);
                const w7str = within7.toISOString().split("T")[0];
                const htSales = data.filter(e => e.channel === "하이타겟" && e.member_name === c.name && (e.refund_amount || 0) === 0 && e.payment_date >= joinDate && e.payment_date <= w7str);
                if (htSales.length > 0) {
                  const totalAmt = htSales.reduce((s: number, e: any) => s + eff(e), 0);
                  quickSales.push({
                    name: `${c.name} ${c.title || ""}`.trim(),
                    num: c.bunyanghoe_number || "-",
                    joinDate,
                    salesDate: htSales[0].payment_date,
                    amount: totalAmt,
                    teamMember: c.assigned_to || "-",
                    consultant: htSales[0].consultant || "-",
                  });
                }
              });
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>구분</th><th className={th}>회원명</th><th className={th}>가입시점(넘버링)</th><th className={th}>매출발생시점</th><th className={th}>매출유형</th><th className={th}>금액</th><th className={th}>R&R</th>
                </tr></thead><tbody>
                  {quickSales.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-xs" style={{ color: "var(--text-subtle)" }}>해당 케이스 없음</td></tr> :
                    quickSales.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td + " font-bold"}>{i + 1}</td>
                        <td className={td + " font-semibold"}>{r.name}</td>
                        <td className={td}>{r.joinDate} ({r.num})</td>
                        <td className={td}>{r.salesDate}</td>
                        <td className={td}><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>광고연계</span></td>
                        <td className={td + " font-bold"}>{fmt(r.amount)}</td>
                        <td className={td}>{r.teamMember} / {r.consultant}</td>
                      </tr>
                    ))}
                </tbody></table></div>
              );
            })()}
          </section>

          {/* ═══════════════ PART 5. 담당자별 매출 결산 ═══════════════ */}
          <div className="mt-8 mb-4"><h2 className="text-lg font-black" style={{ color: "var(--text)" }}>PART 5. {monthLabel} 현재 진척사항 — 담당자별 매출 결산</h2></div>

          {/* 실행파트 하이타겟 매출 */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>🎯 실행파트 담당자별 하이타겟 매출 결산</h2>
            {(() => {
              const EXEC_TARGETS_HT: Record<string, number> = { "조계현": 30000000, "이세호": 20000000, "기여운": 35000000, "최연전": 25000000 };
              const allHTMonth = data.filter(e => e.channel === "하이타겟");
              const execNames = ["조계현", "이세호", "기여운", "최연전"];
              const rows = execNames.map(name => {
                const myData = allHTMonth.filter(e => e.team_member === name);
                const weekSales = weeks.map(w => {
                  return myData.filter(e => e.payment_date >= w.start && e.payment_date <= w.end && (e.refund_amount || 0) === 0).reduce((s: number, e: any) => s + eff(e), 0);
                });
                const refundAmt = myData.filter(e => (e.refund_amount || 0) > 0).reduce((s: number, e: any) => s + (e.refund_amount || 0), 0);
                const totalSales = weekSales.reduce((s, v) => s + v, 0);
                const net = totalSales - refundAmt;
                const target = EXEC_TARGETS_HT[name] || 0;
                const rate = target > 0 ? net / target * 100 : 0;
                return { name, weekSales, refundAmt, net, target, rate };
              });
              const totals = {
                weekSales: weeks.map((_, i) => rows.reduce((s, r) => s + r.weekSales[i], 0)),
                refundAmt: rows.reduce((s, r) => s + r.refundAmt, 0),
                net: rows.reduce((s, r) => s + r.net, 0),
                target: rows.reduce((s, r) => s + r.target, 0),
              };
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>담당자</th><th className={th}>목표</th>
                  {weeks.map(w => <th key={w.week} className={th}>{w.week}주</th>)}
                  <th className={th} style={{ color: "#ef4444" }}>환불</th><th className={th}>{monthLabel} 진척(달성율)</th>
                </tr></thead><tbody>
                  {rows.map(r => (
                    <tr key={r.name} style={{ color: "var(--text)" }}>
                      <td className={td + " font-bold"}>{r.name}</td>
                      <td className={td + " font-semibold"}>{fmtMan(r.target)}</td>
                      {r.weekSales.map((v, i) => <td key={i} className={td + " font-semibold"}>{v > 0 ? fmtMan(v) : "-"}</td>)}
                      <td className={td + " font-bold"} style={{ color: "#ef4444" }}>{r.refundAmt > 0 ? `-${fmtMan(r.refundAmt)}` : "-"}</td>
                      <td className={td + " font-black"}>
                        <div className="flex items-center gap-2">
                          <span>{fmtMan(r.net)}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: r.rate >= 100 ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: r.rate >= 100 ? "#10b981" : "#3b82f6" }}>{r.rate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td}>{fmtMan(totals.target)}</td>
                    {totals.weekSales.map((v, i) => <td key={i} className={td}>{v > 0 ? fmtMan(v) : "-"}</td>)}
                    <td className={td} style={{ color: "#ef4444" }}>{totals.refundAmt > 0 ? `-${fmtMan(totals.refundAmt)}` : "-"}</td>
                    <td className={td} style={{ color: "#3b82f6" }}>{fmtMan(totals.net)} ({(totals.target > 0 ? totals.net / totals.target * 100 : 0).toFixed(1)}%)</td>
                  </tr>
                </tbody></table></div>
              );
            })()}
          </section>

          {/* 운영파트 광고특전매출 */}
          <section className="rounded-2xl p-5 mt-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📊 운영파트 담당자별 광고특전매출 ({monthLabel} 진척)</h2>
            {(() => {
              const opsMembers = ["김재영", "최은정"];
              const specialData = data.filter(e => (e.channel === "LMS" || HOG_CHS.includes(e.channel)) && (e.refund_amount || 0) === 0);
              const rows = opsMembers.map(opsName => {
                const myData = specialData.filter(e => OPS_MAP[e.team_member || ""] === opsName);
                const weekSales = weeks.map(w => myData.filter(e => e.payment_date >= w.start && e.payment_date <= w.end).reduce((s: number, e: any) => s + eff(e), 0));
                const total = weekSales.reduce((s, v) => s + v, 0);
                return { name: opsName, weekSales, total };
              });
              const grandTotal = rows.reduce((s, r) => s + r.total, 0);
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ color: "var(--text-muted)" }}>
                  <th className={th}>운영파트</th>
                  {weeks.map(w => <th key={w.week} className={th}>{w.week}주차</th>)}
                  <th className={th}>누적</th><th className={th}>달성율</th>
                </tr></thead><tbody>
                  {rows.map(r => (
                    <tr key={r.name} style={{ color: "var(--text)" }}>
                      <td className={td + " font-bold"}>{r.name}</td>
                      {r.weekSales.map((v, i) => <td key={i} className={td + " font-semibold"}>{v > 0 ? fmtMan(v) : "-"}</td>)}
                      <td className={td + " font-bold"} style={{ color: "#10b981" }}>{fmt(r.total)}</td>
                      <td className={td + " font-semibold"} style={{ color: "#3b82f6" }}>-</td>
                    </tr>
                  ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td>
                    {weeks.map((_, i) => <td key={i} className={td}>{fmtMan(rows.reduce((s, r) => s + r.weekSales[i], 0))}</td>)}
                    <td className={td} style={{ color: "#10b981" }}>{fmt(grandTotal)}</td>
                    <td className={td}>-</td>
                  </tr>
                </tbody></table></div>
              );
            })()}
          </section>
        </>
      )}
    </div>
  );
}
