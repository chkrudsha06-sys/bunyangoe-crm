"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, AlertCircle, X, Save } from "lucide-react";

// ── 타입 ──────────────────────────────────────────────────
interface VipContact {
  id: number; name: string; title: string | null;
  bunyanghoe_number: string | null;
  assigned_to: string; consultant: string | null;
  meeting_result: string;
}
interface AdExecution {
  id: number; member_name: string;
  bunyanghoe_number: string | null;
  hightarget_mileage: number; hightarget_reward: number;
  hogaengnono_reward: number; lms_reward: number;
  payment_date: string | null; contract_route: string | null;
}
interface PaymentRecord {
  id: number; contact_id: number; quarter: string;
  paid_amount: number; paid_date: string | null; is_paid: boolean;
}
interface MileageUsage {
  id: number; contact_id: number;
  usage_date: string; usage_amount: number; memo: string | null;
}

// ── 유틸 ──────────────────────────────────────────────────
function fw(n: number) {
  if (!n) return "-";
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toLocaleString() + "원";
}
function getCurrentQuarter() {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth()+1)/3)}`;
}
function getQuarterDateRange(q: string): { start: string; end: string } {
  const [year, quarter] = q.split("-");
  const y = parseInt(year);
  const ranges: Record<string,{start:string;end:string}> = {
    Q1:{start:`${y}-01-01`,end:`${y}-03-31`},
    Q2:{start:`${y}-04-01`,end:`${y}-06-30`},
    Q3:{start:`${y}-07-01`,end:`${y}-09-30`},
    Q4:{start:`${y}-10-01`,end:`${y}-12-31`},
  };
  return ranges[quarter] || {start:"",end:""};
}
function calcPaymentDueMonth(q: string) {
  const [year, quarter] = q.split("-");
  const y = parseInt(year);
  return {Q1:`${y}-04`,Q2:`${y}-07`,Q3:`${y}-10`,Q4:`${y+1}-01`}[quarter]||"";
}
function getQuarters() {
  const y = new Date().getFullYear();
  return [`${y}-Q1`,`${y}-Q2`,`${y}-Q3`,`${y}-Q4`];
}
// 분기 순서 비교
function quarterOrder(q: string) {
  const [y, qn] = q.split("-Q");
  return parseInt(y)*10 + parseInt(qn);
}
// 선택 분기 이전 분기 목록
function getPrevQuarters(quarters: string[], current: string) {
  return quarters.filter(q => quarterOrder(q) < quarterOrder(current));
}

// ── 메인 ──────────────────────────────────────────────────
export default function RewardsPage() {
  const [contacts, setContacts]     = useState<VipContact[]>([]);
  const [executions, setExecutions] = useState<AdExecution[]>([]);
  const [payments, setPayments]     = useState<PaymentRecord[]>([]);
  const [mileageUsages, setMileageUsages] = useState<MileageUsage[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterQuarter, setFilterQuarter] = useState(getCurrentQuarter());
  const [filterPaid, setFilterPaid] = useState("");

  // 모달 상태
  const [payModal, setPayModal]   = useState<{contact:VipContact;amount:number;editId?:number}|null>(null);
  const [payInput, setPayInput]   = useState("");
  const [mileModal, setMileModal] = useState<{contact:VipContact;editId?:number}|null>(null);
  const [mileDate, setMileDate]   = useState("");
  const [mileAmt, setMileAmt]     = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  const quarters = getQuarters();
  const currentQ = getCurrentQuarter();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: e }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("contacts")
        .select("id,name,title,bunyanghoe_number,assigned_to,consultant,meeting_result")
        .in("meeting_result",["계약완료","예약완료"])
        .order("bunyanghoe_number",{ascending:true}),
      supabase.from("ad_executions")
        .select("id,member_name,bunyanghoe_number,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward,payment_date,contract_route")
        .eq("contract_route","분양회"),
      supabase.from("rewards").select("*"),
      supabase.from("mileage_usages").select("*").order("usage_date",{ascending:false}),
    ]);
    setContacts((c||[]) as VipContact[]);
    setExecutions((e||[]) as AdExecution[]);
    setPayments((p||[]) as PaymentRecord[]);
    setMileageUsages((m||[]) as MileageUsage[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── 분기별 ad_executions 집계 ────────────────────────────
  function getExecByQuarter(contactId: number, contactName: string, bunNum: string|null, q: string) {
    const { start, end } = getQuarterDateRange(q);
    const list = executions.filter(e => {
      if (!e.payment_date) return false;
      if (e.payment_date < start || e.payment_date > end) return false;
      return e.member_name === contactName ||
        (bunNum && e.bunyanghoe_number === bunNum);
    });
    return {
      mileage: list.reduce((s,e)=>s+(e.hightarget_mileage||0),0),
      htReward: list.reduce((s,e)=>s+(e.hightarget_reward||0),0),
      hogReward: list.reduce((s,e)=>s+(e.hogaengnono_reward||0),0),
      lmsReward: list.reduce((s,e)=>s+(e.lms_reward||0),0),
    };
  }

  // ── 누적 계산 (Q1 ~ filterQuarter) ──────────────────────
  function getCumulative(contact: VipContact) {
    const targetQ = filterQuarter || currentQ;
    // 선택 분기 이하 모든 분기 집계
    const relevantQ = quarters.filter(q => quarterOrder(q) <= quarterOrder(targetQ));

    let cumMileage = 0, cumHt = 0, cumHog = 0, cumLms = 0;
    let totalPaid = 0;

    for (const q of relevantQ) {
      const exec = getExecByQuarter(contact.id, contact.name, contact.bunyanghoe_number, q);
      cumMileage += exec.mileage;
      cumHt      += exec.htReward;
      cumHog     += exec.hogReward;
      cumLms     += exec.lmsReward;

      // 해당 분기 지급 기록
      const paidInQ = payments.filter(p => p.contact_id === contact.id && p.quarter === q);
      totalPaid += paidInQ.reduce((s,p)=>s+(p.paid_amount||0),0);
    }

    // 마일리지 사용 합계
    const mileUsed = mileageUsages
      .filter(m => m.contact_id === contact.id)
      .reduce((s,m)=>s+(m.usage_amount||0),0);
    const latestMileUsage = mileageUsages
      .filter(m => m.contact_id === contact.id)
      .sort((a,b)=>b.usage_date.localeCompare(a.usage_date))[0];

    const cumReward   = cumHt + cumHog + cumLms;
    const income_tax  = cumReward > 0 ? Math.floor((cumReward - totalPaid) * 0.033) : 0;
    const netBalance  = cumReward - totalPaid;
    const netPay      = netBalance > 0 ? netBalance - income_tax : 0;

    return {
      cumMileage, cumHt, cumHog, cumLms, cumReward,
      totalPaid, mileUsed, latestMileUsage,
      mileBalance: cumMileage - mileUsed,
      income_tax, netBalance, netPay,
      isPaid: netBalance <= 0 && totalPaid > 0,
    };
  }

  // ── 지급 처리 ────────────────────────────────────────────
  const handlePaySave = async () => {
    if (!payModal) return;
    const amt = Number(payInput.replace(/,/g,"")) || 0;
    if (!amt) return alert("지급금액을 입력해주세요.");
    setModalSaving(true);
    const q = filterQuarter || currentQ;
    const today = new Date().toISOString().split("T")[0];
    if (payModal.editId) {
      await supabase.from("rewards").update({
        paid_amount: amt, paid_date: today, is_paid: true,
      }).eq("id", payModal.editId);
    } else {
      await supabase.from("rewards").insert({
        contact_id: payModal.contact.id, quarter: q,
        paid_amount: amt, paid_date: today, is_paid: true,
      });
    }
    setModalSaving(false);
    setPayModal(null); setPayInput("");
    fetchAll();
  };

  const handlePayDelete = async () => {
    if (!payModal?.editId) return;
    if (!confirm("지급 기록을 삭제하시겠습니까?")) return;
    await supabase.from("rewards").delete().eq("id", payModal.editId);
    setPayModal(null); setPayInput("");
    fetchAll();
  };

  // ── 마일리지 사용 처리 ───────────────────────────────────
  const handleMileSave = async () => {
    if (!mileModal) return;
    const amt = Number(mileAmt.replace(/,/g,"")) || 0;
    if (!amt || !mileDate) return alert("사용일과 사용금액을 입력해주세요.");
    setModalSaving(true);
    if (mileModal.editId) {
      await supabase.from("mileage_usages").update({
        usage_date: mileDate, usage_amount: amt,
      }).eq("id", mileModal.editId);
    } else {
      await supabase.from("mileage_usages").insert({
        contact_id: mileModal.contact.id,
        usage_date: mileDate, usage_amount: amt,
      });
    }
    setModalSaving(false);
    setMileModal(null); setMileDate(""); setMileAmt("");
    fetchAll();
  };

  const handleMileDelete = async () => {
    if (!mileModal?.editId) return;
    if (!confirm("마일리지 사용 기록을 삭제하시겠습니까?")) return;
    await supabase.from("mileage_usages").delete().eq("id", mileModal.editId);
    setMileModal(null); setMileDate(""); setMileAmt("");
    fetchAll();
  };

  // ── 대시보드 ─────────────────────────────────────────────
  const allData = contacts.map(c => getCumulative(c));
  const totalCumReward = allData.reduce((s,d)=>s+d.cumReward,0);
  const totalMileage   = allData.reduce((s,d)=>s+d.cumMileage,0);
  const totalPaid      = allData.reduce((s,d)=>s+d.totalPaid,0);
  const totalUnpaid    = allData.reduce((s,d)=>s+(d.netPay>0?d.netPay:0),0);

  const filteredContacts = contacts.filter(c => {
    if (!filterPaid) return true;
    const d = getCumulative(c);
    if (filterPaid === "paid")   return d.isPaid;
    if (filterPaid === "unpaid") return !d.isPaid && d.cumReward > 0;
    return true;
  });

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1.5";

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* ── 헤더 ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">리워드 관리</h1>
            <p className="text-xs text-slate-500 mt-0.5">분양회 입회대상자별 누적 리워드 현황 및 지급 관리</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label:"누적 리워드 합계", value:fw(totalCumReward), color:"text-slate-800", bg:"bg-slate-50" },
            { label:"누적 마일리지",   value:fw(totalMileage),   color:"text-blue-600",  bg:"bg-blue-50" },
            { label:"지급 완료",      value:fw(totalPaid),      color:"text-emerald-600",bg:"bg-emerald-50" },
            { label:"지급 잔액",      value:fw(totalUnpaid),    color:"text-amber-600",  bg:"bg-amber-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-4 py-3 border border-slate-100`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-base font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={filterQuarter} onChange={e=>setFilterQuarter(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 분기</option>
            {quarters.map(q=><option key={q} value={q}>{q} (누적)</option>)}
          </select>
          <select value={filterPaid} onChange={e=>setFilterPaid(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체</option>
            <option value="unpaid">미지급 (잔액 있는)</option>
            <option value="paid">지급완료</option>
          </select>
        </div>
      </div>

      {/* ── 테이블 ── */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["넘버링","고객명","누적분기","대협팀","컨설턴트",
                    "하이타겟마일리지","하이타겟리워드(5%)","호갱노노리워드(5%)","LMS리워드(15%)",
                    "누적리워드","지급예정월","소득세(3.3%)","리워드지급액",
                    "마일리지잔액","마일리지사용","마일리지지급여부","액션"
                  ].map(h=>(
                    <th key={h} className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => {
                  const d = getCumulative(contact);
                  const q = filterQuarter || currentQ;
                  const due = calcPaymentDueMonth(q);
                  return (
                    <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                          {contact.bunyanghoe_number||"-"}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center font-semibold text-slate-800 text-xs whitespace-nowrap">{contact.name}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                          Q1 ~ {q.split("-")[1]}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs text-slate-500">{contact.assigned_to||"-"}</td>
                      <td className="px-2 py-2.5 text-center text-xs text-slate-500">{contact.consultant||"-"}</td>

                      <td className="px-2 py-2.5 text-center text-xs font-medium">
                        <span className={d.cumMileage<0?"text-red-500":"text-blue-600"}>{fw(d.cumMileage)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs font-medium">
                        <span className={d.cumHt<0?"text-red-500":"text-amber-600"}>{fw(d.cumHt)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs font-medium">
                        <span className={d.cumHog<0?"text-red-500":"text-amber-600"}>{fw(d.cumHog)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs font-medium">
                        <span className={d.cumLms<0?"text-red-500":"text-purple-600"}>{fw(d.cumLms)}</span>
                      </td>

                      <td className="px-2 py-2.5 text-center">
                        <span className={`font-bold text-xs ${d.cumReward<0?"text-red-500":"text-amber-600"}`}>{fw(d.cumReward)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs text-slate-500 whitespace-nowrap">
                        {due?`${due} 15일`:"-"}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs text-red-500 font-medium">{d.income_tax>0?`-${fw(d.income_tax)}`:"-"}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-bold ${d.isPaid?"text-slate-400":d.netPay>0?"text-emerald-600":"text-slate-300"}`}>
                          {d.isPaid?"지급완료":fw(d.netPay)}
                        </span>
                      </td>

                      {/* 마일리지 잔액 */}
                      <td className="px-2 py-2.5 text-center text-xs">
                        <span className={d.mileBalance>0?"text-blue-600 font-medium":"text-slate-300"}>{fw(d.mileBalance)}</span>
                      </td>

                      {/* 마일리지 사용 */}
                      <td className="px-2 py-2.5 text-center text-xs">
                        {d.latestMileUsage ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-blue-500 font-medium">{fw(d.mileUsed)}</span>
                            <span className="text-slate-400 text-[10px]">{d.latestMileUsage.usage_date}</span>
                            <button onClick={()=>{
                              setMileModal({contact, editId: d.latestMileUsage!.id});
                              setMileDate(d.latestMileUsage!.usage_date);
                              setMileAmt(d.latestMileUsage!.usage_amount.toLocaleString());
                            }} className="text-[10px] text-blue-400 hover:text-blue-600 underline mt-0.5">수정</button>
                          </div>
                        ) : <span className="text-slate-300">-</span>}
                      </td>

                      {/* 마일리지지급여부 */}
                      <td className="px-2 py-2.5 text-center">
                        {d.isPaid ? (() => {
                          const q = filterQuarter || currentQ;
                          const latestPay = payments
                            .filter(p=>p.contact_id===contact.id && p.quarter===q)
                            .sort((a,b)=>((b.paid_date||"").localeCompare(a.paid_date||"")))[0];
                          return (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1">
                                <CheckCircle size={13} className="text-emerald-500"/>
                                <span className="text-xs text-emerald-600 font-medium">완료</span>
                              </div>
                              {latestPay && (
                                <button onClick={()=>{
                                  setPayModal({contact, amount:d.netPay, editId:latestPay.id});
                                  setPayInput((latestPay.paid_amount||0).toLocaleString());
                                }} className="text-[10px] text-emerald-400 hover:text-emerald-600 underline">수정</button>
                              )}
                            </div>
                          );
                        })()
                          : d.cumReward>0
                          ? <div className="flex items-center justify-center gap-1">
                              <AlertCircle size={13} className="text-amber-400"/>
                              <span className="text-xs text-amber-600 font-medium">미지급</span>
                            </div>
                          : <span className="text-xs text-slate-300">-</span>}
                      </td>

                      {/* 액션 */}
                      <td className="px-2 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                          {d.cumMileage > 0 && (
                            <button onClick={()=>{ setMileModal({contact}); setMileDate(new Date().toISOString().split("T")[0]); setMileAmt(""); }}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100">
                              마일리지사용
                            </button>
                          )}
                          {!d.isPaid && d.netPay>0 && (
                            <button onClick={()=>{ setPayModal({contact,amount:d.netPay}); setPayInput(d.netPay.toLocaleString()); }}
                              className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-100 font-medium">
                              지급처리
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredContacts.length===0 && (
                  <tr><td colSpan={17} className="text-center py-12 text-slate-300 text-sm">분양회 회원이 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 지급처리 모달 ── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">지급처리 — {payModal.contact.name}</h2>
              <button onClick={()=>setPayModal(null)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className={lbl}>지급금액</label>
                <input className={inp} value={payInput}
                  onChange={e=>setPayInput(e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,","))}
                  placeholder="전체 또는 일부 금액 입력"/>
                <p className="text-xs text-slate-400 mt-1">리워드 지급액: <span className="font-bold text-emerald-600">{fw(payModal.amount)}</span></p>
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              {payModal?.editId && (
                <button onClick={handlePayDelete} className="px-4 py-2.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">삭제</button>
              )}
              <button onClick={()=>setPayModal(null)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handlePaySave} disabled={modalSaving}
                className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Save size={13}/>{modalSaving?"저장 중...":payModal?.editId?"수정 확정":"지급 확정"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 마일리지 사용 모달 ── */}
      {mileModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">마일리지 사용 — {mileModal.contact.name}</h2>
              <button onClick={()=>setMileModal(null)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className={lbl}>사용일</label>
                <input type="date" className={inp} value={mileDate} onChange={e=>setMileDate(e.target.value)}/>
              </div>
              <div>
                <label className={lbl}>사용금액</label>
                <input className={inp} value={mileAmt}
                  onChange={e=>setMileAmt(e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,","))}
                  placeholder="사용 금액 입력"/>
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              {mileModal?.editId && (
                <button onClick={handleMileDelete} className="px-4 py-2.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">삭제</button>
              )}
              <button onClick={()=>setMileModal(null)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handleMileSave} disabled={modalSaving}
                className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Save size={13}/>{modalSaving?"저장 중...":mileModal?.editId?"수정 확정":"사용 처리"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
