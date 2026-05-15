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
  const [contacts, setContacts] = useState<any[]>([]);
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
      const [r1, r2] = await Promise.all([
        supabase.from("ad_executions").select("*").gte("payment_date", mStart).lte("payment_date", mEnd),
        supabase.from("contacts").select("id,name,title,bunyanghoe_number,meeting_result").in("meeting_result", ["계약완료", "예약완료"]),
      ]);
      setData(r1.data || []);
      setContacts(r2.data || []);
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
        </>
      )}
    </div>
  );
}
