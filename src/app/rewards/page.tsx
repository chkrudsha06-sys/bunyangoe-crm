"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { X, Save, ChevronRight } from "lucide-react";

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

function fw(n: number) {
  if (!n) return "-";
  const sign = n < 0 ? "-" : "";
  return sign + Math.abs(n).toLocaleString() + "원";
}
function getCurrentQuarter() {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth()+1)/3)}`;
}
function getQuarterDateRange(q: string) {
  const [year, quarter] = q.split("-");
  const y = parseInt(year);
  return {
    Q1:{start:`${y}-01-01`,end:`${y}-03-31`},
    Q2:{start:`${y}-04-01`,end:`${y}-06-30`},
    Q3:{start:`${y}-07-01`,end:`${y}-09-30`},
    Q4:{start:`${y}-10-01`,end:`${y}-12-31`},
  }[quarter] || {start:"",end:""};
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
function quarterOrder(q: string) {
  const [y, qn] = q.split("-Q");
  return parseInt(y)*10 + parseInt(qn);
}

export default function RewardsPage() {
  const [contacts, setContacts]         = useState<VipContact[]>([]);
  const [executions, setExecutions]     = useState<AdExecution[]>([]);
  const [payments, setPayments]         = useState<PaymentRecord[]>([]);
  const [mileageUsages, setMileageUsages] = useState<MileageUsage[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterQuarter, setFilterQuarter] = useState(getCurrentQuarter());
  const [filterPaid, setFilterPaid]     = useState("");

  // 모달
  const [payModal, setPayModal]     = useState<{contact:VipContact; netPay:number; editId?:number}|null>(null);
  const [payInput, setPayInput]     = useState("");
  const [mileModal, setMileModal]   = useState<{contact:VipContact; editId?:number}|null>(null);
  const [mileDate, setMileDate]     = useState("");
  const [mileAmt, setMileAmt]       = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  // 팝업 (히스토리)
  const [mileHistoryContact, setMileHistoryContact] = useState<VipContact|null>(null);
  const [payHistoryContact, setPayHistoryContact]   = useState<VipContact|null>(null);

  const quarters = getQuarters();
  const currentQ = getCurrentQuarter();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: c },{ data: e },{ data: p },{ data: m }] = await Promise.all([
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

  function getExecByQuarter(contactId: number, name: string, bunNum: string|null, q: string) {
    const { start, end } = getQuarterDateRange(q);
    const list = executions.filter(e => {
      if (!e.payment_date || e.payment_date < start || e.payment_date > end) return false;
      return e.member_name === name || (bunNum && e.bunyanghoe_number === bunNum);
    });
    return {
      mileage:   list.reduce((s,e)=>s+(e.hightarget_mileage||0),0),
      htReward:  list.reduce((s,e)=>s+(e.hightarget_reward||0),0),
      hogReward: list.reduce((s,e)=>s+(e.hogaengnono_reward||0),0),
      lmsReward: list.reduce((s,e)=>s+(e.lms_reward||0),0),
    };
  }

  function getCumulative(contact: VipContact) {
    const targetQ = filterQuarter || currentQ;
    const relevantQ = quarters.filter(q => quarterOrder(q) <= quarterOrder(targetQ));
    let cumMileage=0, cumHt=0, cumHog=0, cumLms=0, totalPaid=0;
    for (const q of relevantQ) {
      const ex = getExecByQuarter(contact.id, contact.name, contact.bunyanghoe_number, q);
      cumMileage += ex.mileage;
      cumHt      += ex.htReward;
      cumHog     += ex.hogReward;
      cumLms     += ex.lmsReward;
      const paidQ = payments.filter(p=>p.contact_id===contact.id && p.quarter===q);
      totalPaid  += paidQ.reduce((s,p)=>s+(p.paid_amount||0),0);
    }
    const myMileUsages = mileageUsages.filter(m=>m.contact_id===contact.id);
    const mileUsed = myMileUsages.reduce((s,m)=>s+(m.usage_amount||0),0);
    const cumReward  = cumHt + cumHog + cumLms;
    const taxBase    = Math.max(cumReward - totalPaid, 0);
    const income_tax = taxBase > 0 ? Math.floor(taxBase * 0.033) : 0;
    const netPay     = taxBase - income_tax;
    const isPaid     = totalPaid > 0 && netPay <= 0;
    return { cumMileage, cumHt, cumHog, cumLms, cumReward, totalPaid, mileUsed,
      mileBalance: cumMileage - mileUsed, income_tax, netPay, isPaid, myMileUsages };
  }

  // 지급처리 저장
  const handlePaySave = async () => {
    if (!payModal) return;
    const amt = Number(payInput.replace(/,/g,""))||0;
    if (!amt) return alert("지급금액을 입력해주세요.");
    setModalSaving(true);
    const q = filterQuarter||currentQ;
    const today = new Date().toISOString().split("T")[0];
    if (payModal.editId) {
      await supabase.from("rewards").update({ paid_amount:amt, paid_date:today, is_paid:true }).eq("id",payModal.editId);
    } else {
      await supabase.from("rewards").insert({ contact_id:payModal.contact.id, quarter:q, paid_amount:amt, paid_date:today, is_paid:true });
    }
    setModalSaving(false); setPayModal(null); setPayInput(""); fetchAll();
  };
  const handlePayDelete = async () => {
    if (!payModal?.editId) return;
    if (!confirm("지급 기록을 삭제하시겠습니까?")) return;
    await supabase.from("rewards").delete().eq("id",payModal.editId);
    setPayModal(null); setPayInput(""); fetchAll();
  };

  // 마일리지 사용 저장
  const handleMileSave = async () => {
    if (!mileModal) return;
    const amt = Number(mileAmt.replace(/,/g,""))||0;
    if (!amt||!mileDate) return alert("사용일과 사용금액을 입력해주세요.");
    setModalSaving(true);
    if (mileModal.editId) {
      await supabase.from("mileage_usages").update({ usage_date:mileDate, usage_amount:amt }).eq("id",mileModal.editId);
    } else {
      await supabase.from("mileage_usages").insert({ contact_id:mileModal.contact.id, usage_date:mileDate, usage_amount:amt });
    }
    setModalSaving(false); setMileModal(null); setMileDate(""); setMileAmt(""); fetchAll();
  };
  const handleMileDelete = async () => {
    if (!mileModal?.editId) return;
    if (!confirm("마일리지 사용 기록을 삭제하시겠습니까?")) return;
    await supabase.from("mileage_usages").delete().eq("id",mileModal.editId);
    setMileModal(null); setMileDate(""); setMileAmt(""); fetchAll();
  };

  const allData = contacts.map(c=>getCumulative(c));
  const totalCumReward = allData.reduce((s,d)=>s+d.cumReward,0);
  const totalMileage   = allData.reduce((s,d)=>s+d.cumMileage,0);
  const totalPaid      = allData.reduce((s,d)=>s+d.totalPaid,0);
  const totalUnpaid    = allData.reduce((s,d)=>s+(d.netPay>0?d.netPay:0),0);

  const filteredContacts = contacts.filter(c => {
    if (!filterPaid) return true;
    const d = getCumulative(c);
    if (filterPaid==="paid")   return d.isPaid;
    if (filterPaid==="unpaid") return !d.isPaid && d.cumReward>0;
    return true;
  });

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1.5";

  // 컬럼 헤더 스타일
  const TH = ({ children, red }: { children: React.ReactNode; red?: boolean }) => (
    <th className={`text-center px-2 py-2.5 text-xs font-semibold whitespace-nowrap ${red?"text-blue-600":"text-slate-500"}`}>{children}</th>
  );

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">리워드 관리</h1>
            <p className="text-xs text-slate-500 mt-0.5">분양회 입회대상자별 누적 리워드 현황 및 지급 관리</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            {label:"누적 리워드 합계", value:fw(totalCumReward), color:"text-slate-800", bg:"bg-slate-50"},
            {label:"누적 마일리지",   value:fw(totalMileage),   color:"text-blue-600",  bg:"bg-blue-50"},
            {label:"지급 완료",      value:fw(totalPaid),      color:"text-emerald-600",bg:"bg-emerald-50"},
            {label:"지급 잔액",      value:fw(totalUnpaid),    color:"text-amber-600",  bg:"bg-amber-50"},
          ].map(({label,value,color,bg})=>(
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

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {/* 기본 정보 */}
                  <TH>넘버링</TH><TH>고객명</TH><TH>누적분기</TH><TH>대협팀</TH><TH>컨설턴트</TH>
                  {/* 마일리지 섹션 */}
                  <TH>하이타겟마일리지</TH>
                  <TH>마일리지사용내역</TH>
                  <TH>마일리지사용</TH>
                  <TH>잔여마일리지</TH>
                  {/* 구분선 역할 헤더 */}
                  <th className="bg-slate-200 w-1 p-0"/>
                  {/* 리워드 섹션 */}
                  <TH>하이타겟리워드(5%)</TH>
                  <TH>호갱노노리워드(5%)</TH>
                  <TH>LMS리워드(15%)</TH>
                  <TH>누적리워드</TH>
                  <TH>소득세(3.3%)</TH>
                  <TH>실지급예정액</TH>
                  <TH>지급처리</TH>
                  <TH>지급내역</TH>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => {
                  const d = getCumulative(contact);
                  const q = filterQuarter||currentQ;
                  const myPayments = payments
                    .filter(p=>p.contact_id===contact.id)
                    .sort((a,b)=>((b.paid_date||"").localeCompare(a.paid_date||"")));
                  const latestPay = myPayments[0];

                  return (
                    <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                      {/* 넘버링 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">{contact.bunyanghoe_number||"-"}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center font-semibold text-slate-800 text-xs whitespace-nowrap">{contact.name}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">Q1~{q.split("-")[1]}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs text-slate-500">{contact.assigned_to||"-"}</td>
                      <td className="px-2 py-2.5 text-center text-xs text-slate-500">{contact.consultant||"-"}</td>

                      {/* 하이타겟 마일리지 */}
                      <td className="px-2 py-2.5 text-center text-xs font-bold">
                        <span className={d.cumMileage<0?"text-red-500":"text-blue-600"}>{fw(d.cumMileage)}</span>
                      </td>

                      {/* 마일리지사용내역 — 클릭 시 팝업 */}
                      <td className="px-2 py-2.5 text-center">
                        {d.myMileUsages.length > 0 ? (
                          <button onClick={()=>setMileHistoryContact(contact)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 flex items-center gap-1 mx-auto">
                            {d.myMileUsages.length}건 <ChevronRight size={10}/>
                          </button>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>

                      {/* 마일리지 사용 버튼 */}
                      <td className="px-2 py-2.5 text-center">
                        {d.cumMileage > 0 ? (
                          <button onClick={()=>{ setMileModal({contact}); setMileDate(new Date().toISOString().split("T")[0]); setMileAmt(""); }}
                            className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-200 hover:bg-slate-100 whitespace-nowrap">
                            사용 처리
                          </button>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>

                      {/* 잔여마일리지 */}
                      <td className="px-2 py-2.5 text-center text-xs font-bold">
                        <span className={d.mileBalance>0?"text-blue-600":d.mileBalance<0?"text-red-500":"text-slate-300"}>{fw(d.mileBalance)}</span>
                      </td>

                      {/* 구분선 */}
                      <td className="bg-slate-200 w-1 p-0"/>

                      {/* 하이타겟 리워드 */}
                      <td className="px-2 py-2.5 text-center text-xs font-medium">
                        <span className={d.cumHt<0?"text-red-500":"text-amber-600"}>{fw(d.cumHt)}</span>
                      </td>
                      {/* 호갱노노 리워드 */}
                      <td className="px-2 py-2.5 text-center text-xs font-medium">
                        <span className={d.cumHog<0?"text-red-500":"text-amber-600"}>{fw(d.cumHog)}</span>
                      </td>
                      {/* LMS 리워드 */}
                      <td className="px-2 py-2.5 text-center text-xs font-medium">
                        <span className={d.cumLms<0?"text-red-500":"text-purple-600"}>{fw(d.cumLms)}</span>
                      </td>
                      {/* 누적리워드 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className={`font-bold text-xs ${d.cumReward<0?"text-red-500":"text-amber-600"}`}>{fw(d.cumReward)}</span>
                      </td>
                      {/* 소득세 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs text-red-500 font-medium">{d.income_tax>0?`-${fw(d.income_tax)}`:"-"}</span>
                      </td>
                      {/* 실지급예정액 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-bold ${d.netPay>0?"text-emerald-600":"text-slate-300"}`}>{d.netPay>0?fw(d.netPay):"-"}</span>
                      </td>

                      {/* 지급처리 버튼 */}
                      <td className="px-2 py-2.5 text-center">
                        {d.isPaid ? (
                          <button onClick={()=>{ setPayModal({contact,netPay:d.netPay,editId:latestPay?.id}); setPayInput((latestPay?.paid_amount||0).toLocaleString()); }}
                            className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 font-semibold whitespace-nowrap">
                            지급완료
                          </button>
                        ) : d.netPay > 0 ? (
                          <button onClick={()=>{ setPayModal({contact,netPay:d.netPay}); setPayInput(d.netPay.toLocaleString()); }}
                            className="text-xs px-3 py-1.5 bg-[#1E3A8A] text-white rounded-lg hover:bg-blue-800 font-semibold whitespace-nowrap">
                            지급처리
                          </button>
                        ) : (
                          <button disabled className="text-xs px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 font-semibold cursor-not-allowed whitespace-nowrap">
                            지급처리
                          </button>
                        )}
                      </td>

                      {/* 지급내역 — 팝업 */}
                      <td className="px-2 py-2.5 text-center">
                        {myPayments.length > 0 ? (
                          <button onClick={()=>setPayHistoryContact(contact)}
                            className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 mx-auto">
                            {myPayments.length}건 <ChevronRight size={10}/>
                          </button>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredContacts.length===0 && (
                  <tr><td colSpan={18} className="text-center py-12 text-slate-300 text-sm">분양회 회원이 없습니다</td></tr>
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
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className={lbl}>지급금액</label>
                <input className={inp} value={payInput}
                  onChange={e=>setPayInput(e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,","))}
                  placeholder="지급 금액 입력"/>
                <p className="text-xs text-slate-400 mt-1">실지급예정액: <span className="font-bold text-emerald-600">{fw(payModal.netPay)}</span></p>
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              {payModal.editId && (
                <button onClick={handlePayDelete} className="px-3 py-2.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">삭제</button>
              )}
              <button onClick={()=>setPayModal(null)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handlePaySave} disabled={modalSaving}
                className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Save size={13}/>{modalSaving?"저장 중...":payModal.editId?"수정":"지급 확정"}
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
              <h2 className="font-bold text-slate-800">{mileModal.editId?"마일리지 사용 수정":"마일리지 사용 처리"} — {mileModal.contact.name}</h2>
              <button onClick={()=>setMileModal(null)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
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
              {mileModal.editId && (
                <button onClick={handleMileDelete} className="px-3 py-2.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">삭제</button>
              )}
              <button onClick={()=>setMileModal(null)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handleMileSave} disabled={modalSaving}
                className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Save size={13}/>{modalSaving?"저장 중...":mileModal.editId?"수정 확정":"사용 처리"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 마일리지 사용내역 팝업 ── */}
      {mileHistoryContact && (() => {
        const usages = mileageUsages
          .filter(m=>m.contact_id===mileHistoryContact.id)
          .sort((a,b)=>b.usage_date.localeCompare(a.usage_date));
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={()=>setMileHistoryContact(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col"
              onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">마일리지 사용내역 — {mileHistoryContact.name}</h2>
                <button onClick={()=>setMileHistoryContact(null)}><X size={18} className="text-slate-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {usages.length===0
                  ? <p className="text-center py-8 text-slate-300 text-sm">사용 내역이 없습니다</p>
                  : usages.map(u=>(
                    <div key={u.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-500">{u.usage_date}</span>
                      <span className="text-sm font-bold text-blue-600">{u.usage_amount.toLocaleString()}원</span>
                      <button onClick={()=>{
                        setMileHistoryContact(null);
                        setMileModal({contact:mileHistoryContact,editId:u.id});
                        setMileDate(u.usage_date); setMileAmt(u.usage_amount.toLocaleString());
                      }} className="text-xs text-slate-400 hover:text-blue-500 underline">수정</button>
                    </div>
                  ))}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">총 사용금액</span>
                <span className="text-sm font-bold text-blue-600">{usages.reduce((s,u)=>s+(u.usage_amount||0),0).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 지급내역 팝업 ── */}
      {payHistoryContact && (() => {
        const pays = payments
          .filter(p=>p.contact_id===payHistoryContact.id)
          .sort((a,b)=>((b.paid_date||"").localeCompare(a.paid_date||"")));
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={()=>setPayHistoryContact(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col"
              onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">지급내역 — {payHistoryContact.name}</h2>
                <button onClick={()=>setPayHistoryContact(null)}><X size={18} className="text-slate-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {pays.length===0
                  ? <p className="text-center py-8 text-slate-300 text-sm">지급 내역이 없습니다</p>
                  : pays.map(p=>(
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div>
                        <p className="text-xs text-slate-500">{p.paid_date||"-"}</p>
                        <p className="text-xs text-slate-400">{p.quarter}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{(p.paid_amount||0).toLocaleString()}원</span>
                    </div>
                  ))}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">총 지급금액</span>
                <span className="text-sm font-bold text-emerald-600">{pays.reduce((s,p)=>s+(p.paid_amount||0),0).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
