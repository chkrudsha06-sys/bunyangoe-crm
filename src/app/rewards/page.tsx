"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { X, Search, Copy, Check } from "lucide-react";

interface VipContact {
  id: number; name: string; title: string | null;
  bunyanghoe_number: string | null;
  assigned_to: string; consultant: string | null;
  meeting_result: string;
  bank_holder: string | null;
  bank_name: string | null;
  bank_account: string | null;
}
interface AdExecution {
  id: number; member_name: string; bunyanghoe_number: string | null;
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
  return (n < 0 ? "-" : "") + Math.abs(n).toLocaleString() + "원";
}
function fmtBun(num: string | null) {
  if (!num) return "-";
  if (num.startsWith("B-")) return num;
  return `B-${num}`;
}
function getCurrentQuarter() {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth()+1)/3)}`;
}
function getQuarterDateRange(q: string) {
  const [year, quarter] = q.split("-");
  const y = parseInt(year);
  return ({
    Q1:{start:`${y}-01-01`,end:`${y}-03-31`},
    Q2:{start:`${y}-04-01`,end:`${y}-06-30`},
    Q3:{start:`${y}-07-01`,end:`${y}-09-30`},
    Q4:{start:`${y}-10-01`,end:`${y}-12-31`},
  } as any)[quarter] || {start:"",end:""};
}
function calcPaymentDueMonth(q: string) {
  const [year, quarter] = q.split("-");
  const y = parseInt(year);
  return ({Q1:`${y}-04`,Q2:`${y}-07`,Q3:`${y}-10`,Q4:`${y+1}-01`} as any)[quarter]||"";
}
function getQuarters() {
  const y = new Date().getFullYear();
  return [`${y}-Q1`,`${y}-Q2`,`${y}-Q3`,`${y}-Q4`];
}
function quarterOrder(q: string) {
  const [y, qn] = q.split("-Q");
  return parseInt(y)*10 + parseInt(qn);
}
function numericOrder(bunNum: string | null) {
  if (!bunNum) return 9999;
  return parseInt(bunNum.replace(/[^0-9]/g,"")) || 9999;
}

export default function RewardsPage() {
  const [contacts, setContacts]         = useState<VipContact[]>([]);
  const [executions, setExecutions]     = useState<AdExecution[]>([]);
  const [payments, setPayments]         = useState<PaymentRecord[]>([]);
  const [mileageUsages, setMileageUsages] = useState<MileageUsage[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterQuarter, setFilterQuarter] = useState(getCurrentQuarter());
  const [filterPaid, setFilterPaid]     = useState("");
  const [search, setSearch]             = useState("");

  // 인라인 지급처리 상태
  const [payInline, setPayInline] = useState<{[contactId:number]:{date:string;amt:string}}>({});
  // 인라인 마일리지 사용 상태
  const [mileInline, setMileInline] = useState<{[contactId:number]:{date:string;amt:string}}>({});

  // 팝업
  const [mileHistoryContact, setMileHistoryContact] = useState<VipContact|null>(null);
  const [payHistoryContact, setPayHistoryContact]   = useState<VipContact|null>(null);

  // 마일리지 수정 모달
  const [mileEditModal, setMileEditModal] = useState<{usage:MileageUsage;contact:VipContact}|null>(null);
  const [mileEditDate, setMileEditDate] = useState("");
  const [mileEditAmt, setMileEditAmt]   = useState("");
  const [copiedId, setCopiedId]         = useState<number|null>(null);

  const quarters = getQuarters();
  const currentQ = getCurrentQuarter();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data:c },{ data:e },{ data:p },{ data:m }] = await Promise.all([
      supabase.from("contacts")
        .select("id,name,title,bunyanghoe_number,assigned_to,consultant,meeting_result,bank_holder,bank_name,bank_account")
        .in("meeting_result",["계약완료","예약완료"]),
      supabase.from("ad_executions")
        .select("id,member_name,bunyanghoe_number,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward,payment_date,contract_route")
        .eq("contract_route","분양회"),
      supabase.from("rewards").select("*"),
      supabase.from("mileage_usages").select("*").order("usage_date",{ascending:false}),
    ]);
    const sorted = ((c||[]) as VipContact[]).sort((a,b)=>numericOrder(a.bunyanghoe_number)-numericOrder(b.bunyanghoe_number));
    setContacts(sorted);
    setExecutions((e||[]) as AdExecution[]);
    setPayments((p||[]) as PaymentRecord[]);
    setMileageUsages((m||[]) as MileageUsage[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function getExecByQuarter(contact: VipContact, q: string) {
    const { start, end } = getQuarterDateRange(q);
    const list = executions.filter(e => {
      if (!e.payment_date || e.payment_date < start || e.payment_date > end) return false;
      return e.member_name === contact.name ||
        (contact.bunyanghoe_number && e.bunyanghoe_number === contact.bunyanghoe_number);
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
      const ex = getExecByQuarter(contact, q);
      cumMileage += ex.mileage; cumHt += ex.htReward;
      cumHog += ex.hogReward;   cumLms += ex.lmsReward;
      totalPaid += payments.filter(p=>(p.contact_id===contact.id || (p as any).member_name===contact.name) && p.quarter===q).reduce((s,p)=>s+(p.paid_amount||0),0);
    }
    const myMileUsages = mileageUsages.filter(m=>m.contact_id===contact.id);
    const mileUsed  = myMileUsages.reduce((s,m)=>s+(m.usage_amount||0),0);
    const cumReward = cumHt + cumHog + cumLms;
    const taxBase   = Math.max(cumReward - totalPaid, 0);
    const incomeTax = taxBase > 0 ? Math.floor(taxBase * 0.033) : 0;
    const netPay    = taxBase - incomeTax;
    return { cumMileage, cumHt, cumHog, cumLms, cumReward, totalPaid,
      mileUsed, mileBalance:cumMileage-mileUsed, myMileUsages,
      incomeTax, netPay, isPaid: totalPaid>0 && netPay<=0 };
  }

  // 지급 처리 (인라인)
  const handlePaySave = async (contact: VipContact, netPay: number) => {
    const inline = payInline[contact.id];
    const amt = inline ? Number(inline.amt.replace(/,/g,"")) : 0;
    const date = inline?.date || new Date().toISOString().split("T")[0];
    if (!amt) return alert("지급금액을 입력해주세요.");
    const q = filterQuarter || currentQ;
    const { error } = await supabase.from("rewards").insert({
      contact_id: contact.id, quarter: q,
      member_name: contact.name,
      member_number: contact.bunyanghoe_number||"",
      paid_amount: amt, paid_date: date, is_paid: true,
    });
    if (error) { alert(`저장 실패: ${error.message}`); return; }
    setPayInline(prev => { const n={...prev}; delete n[contact.id]; return n; });
    fetchAll();
  };

  // 마일리지 사용 처리 (인라인)
  const handleMileSave = async (contact: VipContact) => {
    const inline = mileInline[contact.id];
    const amt = inline ? Number(inline.amt.replace(/,/g,"")) : 0;
    const date = inline?.date || new Date().toISOString().split("T")[0];
    if (!amt || !date) return alert("사용일과 사용금액을 입력해주세요.");
    const { error } = await supabase.from("mileage_usages").insert({
      contact_id: contact.id, usage_date: date, usage_amount: amt,
    });
    if (error) { alert(`저장 실패: ${error.message}`); return; }
    setMileInline(prev => { const n={...prev}; delete n[contact.id]; return n; });
    fetchAll();
  };

  // 마일리지 수정/삭제
  const handleMileEditSave = async () => {
    if (!mileEditModal) return;
    const amt = Number(mileEditAmt.replace(/,/g,""))||0;
    if (!amt || !mileEditDate) return alert("내용을 입력하세요.");
    await supabase.from("mileage_usages").update({ usage_date:mileEditDate, usage_amount:amt }).eq("id",mileEditModal.usage.id);
    setMileEditModal(null); fetchAll();
  };
  const handleMileEditDelete = async () => {
    if (!mileEditModal) return;
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("mileage_usages").delete().eq("id",mileEditModal.usage.id);
    setMileEditModal(null); fetchAll();
  };

  // 대시보드 집계
  const allData = contacts.map(c=>getCumulative(c));
  const totalCumReward = allData.reduce((s,d)=>s+d.cumReward,0);
  const totalMileage   = allData.reduce((s,d)=>s+d.cumMileage,0);
  const totalPaidSum   = allData.reduce((s,d)=>s+d.totalPaid,0);
  const totalUnpaid    = allData.reduce((s,d)=>s+(d.netPay>0?d.netPay:0),0);

  // 검색 + 필터
  const filteredContacts = contacts.filter(c => {
    const d = getCumulative(c);
    if (filterPaid==="paid"   && !d.isPaid) return false;
    if (filterPaid==="unpaid" && (d.isPaid || d.cumReward<=0)) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      const bun = fmtBun(c.bunyanghoe_number).toLowerCase();
      return c.name.includes(s) || c.assigned_to.toLowerCase().includes(s) ||
        (c.consultant||"").toLowerCase().includes(s) || bun.includes(s);
    }
    return true;
  });

  const inp = "w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* ── 헤더 ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">리워드 관리</h1>
            <p className="text-xs text-slate-500 mt-0.5">분양회 입회대상자별 누적 리워드 현황 및 지급 관리</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          {[
            {label:"누적 리워드 합계", value:fw(totalCumReward), color:"text-slate-800", bg:"bg-slate-50"},
            {label:"누적 마일리지",   value:fw(totalMileage),   color:"text-blue-600",  bg:"bg-blue-50"},
            {label:"지급 완료",      value:fw(totalPaidSum),   color:"text-emerald-600",bg:"bg-emerald-50"},
            {label:"지급 잔액",      value:fw(totalUnpaid),    color:"text-amber-600",  bg:"bg-amber-50"},
          ].map(({label,value,color,bg})=>(
            <div key={label} className={`${bg} rounded-xl px-4 py-3 border border-slate-100`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-base font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="이름, 대협팀, 컨설턴트, 넘버링 검색..."
              className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg w-56 outline-none focus:border-blue-400"/>
          </div>
          <select value={filterQuarter} onChange={e=>setFilterQuarter(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 분기</option>
            {quarters.map(q=><option key={q} value={q}>{q} (누적)</option>)}
          </select>
          <select value={filterPaid} onChange={e=>setFilterPaid(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체</option>
            <option value="unpaid">미지급</option>
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
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">넘버링</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">고객명</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">누적분기</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">대협팀</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">컨설턴트</th>
                  {/* 마일리지 섹션 */}
                  <th className="text-center px-2 py-2.5 text-blue-600 text-xs font-semibold whitespace-nowrap">하이타겟마일리지</th>
                  <th className="text-center px-2 py-2.5 text-blue-600 text-xs font-semibold whitespace-nowrap">마일리지사용내역</th>
                  <th className="text-center px-2 py-2.5 text-blue-600 text-xs font-semibold whitespace-nowrap">마일리지사용</th>
                  <th className="text-center px-2 py-2.5 text-blue-600 text-xs font-semibold whitespace-nowrap">잔여마일리지</th>
                  {/* 구분선 */}
                  <th className="bg-slate-300 w-0.5 p-0"/>
                  {/* 리워드 섹션 */}
                  <th className="text-center px-2 py-2.5 text-amber-600 text-xs font-semibold whitespace-nowrap">하이타겟리워드(5%)</th>
                  <th className="text-center px-2 py-2.5 text-amber-600 text-xs font-semibold whitespace-nowrap">호갱노노리워드(5%)</th>
                  <th className="text-center px-2 py-2.5 text-purple-600 text-xs font-semibold whitespace-nowrap">LMS리워드(15%)</th>
                  <th className="text-center px-2 py-2.5 text-amber-700 text-xs font-semibold whitespace-nowrap">누적리워드</th>
                  <th className="text-center px-2 py-2.5 text-red-500 text-xs font-semibold whitespace-nowrap">소득세(3.3%)</th>
                  <th className="text-center px-2 py-2.5 text-emerald-600 text-xs font-semibold whitespace-nowrap">실지급예정액</th>
                  <th className="text-center px-2 py-2.5 text-emerald-600 text-xs font-semibold whitespace-nowrap">지급처리</th>
                  <th className="text-center px-2 py-2.5 text-emerald-600 text-xs font-semibold whitespace-nowrap">지급후잔액</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">지급내역</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => {
                  const d = getCumulative(contact);
                  const q = filterQuarter||currentQ;
                  const due = calcPaymentDueMonth(q);
                  const myPayments = payments
                    .filter(p=>p.contact_id===contact.id)
                    .sort((a,b)=>((b.paid_date||"").localeCompare(a.paid_date||"")));
                  const pInline = payInline[contact.id];
                  const mInline = mileInline[contact.id];

                  return (
                    <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                      {/* 넘버링 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-sm font-black text-amber-600">{fmtBun(contact.bunyanghoe_number)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center font-semibold text-slate-800 text-xs whitespace-nowrap">{contact.name}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">Q1~{q.split("-")[1]}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs text-slate-500">{contact.assigned_to||"-"}</td>
                      <td className="px-2 py-2.5 text-center text-xs text-slate-500">{contact.consultant||"-"}</td>

                      {/* 하이타겟 마일리지 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-bold ${d.cumMileage<0?"text-red-500":"text-blue-600"}`}>{fw(d.cumMileage)}</span>
                      </td>

                      {/* 마일리지사용내역 팝업 */}
                      <td className="px-2 py-2.5 text-center">
                        {d.myMileUsages.length>0 ? (
                          <button onClick={()=>setMileHistoryContact(contact)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100">
                            {d.myMileUsages.length}건 보기
                          </button>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>

                      {/* 마일리지사용 인라인 */}
                      <td className="px-2 py-2.5 text-center">
                        {d.cumMileage > 0 ? (
                          mInline ? (
                            <div className="flex flex-col gap-1 min-w-[110px]">
                              <input type="date" value={mInline.date}
                                onChange={e=>setMileInline(p=>({...p,[contact.id]:{...p[contact.id],date:e.target.value}}))}
                                className={inp}/>
                              <input value={mInline.amt} placeholder="사용금액"
                                onChange={e=>setMileInline(p=>({...p,[contact.id]:{...p[contact.id],amt:e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,",")}}))}
                                className={inp}/>
                              <div className="flex gap-1">
                                <button onClick={()=>handleMileSave(contact)}
                                  className="flex-1 py-1 text-xs bg-blue-600 text-white rounded font-bold hover:bg-blue-700">저장</button>
                                <button onClick={()=>setMileInline(p=>{const n={...p};delete n[contact.id];return n;})}
                                  className="px-2 py-1 text-xs bg-slate-100 text-slate-500 rounded hover:bg-slate-200">✕</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={()=>setMileInline(p=>({...p,[contact.id]:{date:today,amt:""}}))}
                              className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-200 hover:bg-slate-100 whitespace-nowrap">
                              사용 처리
                            </button>
                          )
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>

                      {/* 잔여마일리지 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-bold ${d.mileBalance>0?"text-blue-600":d.mileBalance<0?"text-red-500":"text-slate-300"}`}>
                          {fw(d.mileBalance)}
                        </span>
                      </td>

                      {/* 구분선 */}
                      <td className="bg-slate-300 w-0.5 p-0"/>

                      {/* 하이타겟 리워드 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-medium ${d.cumHt<0?"text-red-500":"text-amber-600"}`}>{fw(d.cumHt)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-medium ${d.cumHog<0?"text-red-500":"text-amber-600"}`}>{fw(d.cumHog)}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-medium ${d.cumLms<0?"text-red-500":"text-purple-600"}`}>{fw(d.cumLms)}</span>
                      </td>
                      {/* 누적리워드 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-bold ${d.cumReward<0?"text-red-500":"text-amber-700"}`}>{fw(d.cumReward)}</span>
                      </td>
                      {/* 소득세 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-xs text-red-500 font-medium">{d.incomeTax>0?`-${fw(d.incomeTax)}`:"-"}</span>
                      </td>
                      {/* 실지급예정액 */}
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-xs font-bold ${d.netPay>0?"text-emerald-600":"text-slate-300"}`}>{d.netPay>0?fw(d.netPay):"-"}</span>
                      </td>

                      {/* 지급처리 인라인 */}
                      <td className="px-2 py-2.5 text-center">
                        {d.netPay > 0 ? (
                          pInline ? (
                            <div className="flex flex-col gap-1 min-w-[140px]">
                              <input type="date" value={pInline.date}
                                onChange={e=>setPayInline(p=>({...p,[contact.id]:{...p[contact.id],date:e.target.value}}))}
                                className={inp}/>
                              <input value={pInline.amt} placeholder="지급금액"
                                onChange={e=>setPayInline(p=>({...p,[contact.id]:{...p[contact.id],amt:e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,",")}}))}
                                className={inp}/>
                              {(contact.bank_holder||contact.bank_name||contact.bank_account) && (
                                <div className="bg-slate-50 rounded px-2 py-1 border border-slate-200 text-[10px] text-slate-500 space-y-0.5 text-center">
                                  {contact.bank_holder && <p>예금주: <span className="font-semibold text-slate-700">{contact.bank_holder}</span></p>}
                                  {contact.bank_name && <p>은행: <span className="font-semibold text-slate-700">{contact.bank_name}</span></p>}
                                  {contact.bank_account && (
                                    <div className="flex items-center justify-center gap-1">
                                      <p>계좌: <span className="font-semibold text-slate-700">{contact.bank_account}</span></p>
                                      <button onClick={()=>{
                                        navigator.clipboard.writeText(contact.bank_account||"");
                                        setCopiedId(contact.id);
                                        setTimeout(()=>setCopiedId(null),1500);
                                      }} className={`p-0.5 rounded ${copiedId===contact.id?"text-emerald-500":"text-slate-400 hover:text-blue-500"}`}>
                                        {copiedId===contact.id ? <Check size={10}/> : <Copy size={10}/>}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex gap-1">
                                <button onClick={()=>handlePaySave(contact, d.netPay)}
                                  className="flex-1 py-1 text-xs bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">지급확정</button>
                                <button onClick={()=>setPayInline(p=>{const n={...p};delete n[contact.id];return n;})}
                                  className="px-2 py-1 text-xs bg-slate-100 text-slate-500 rounded hover:bg-slate-200">✕</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={()=>setPayInline(p=>({...p,[contact.id]:{date:today,amt:d.netPay.toLocaleString()}}))}
                              className="text-xs px-3 py-1.5 bg-[#1E3A8A] text-white rounded-lg hover:bg-blue-800 font-semibold whitespace-nowrap">
                              지급처리
                            </button>
                          )
                        ) : d.isPaid ? (
                          <span className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-semibold whitespace-nowrap inline-block">
                            지급완료
                          </span>
                        ) : (
                          <span className="text-xs px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 font-semibold cursor-not-allowed whitespace-nowrap inline-block">
                            지급처리
                          </span>
                        )}
                      </td>

                      {/* 지급후 잔액 */}
                      <td className="px-2 py-2.5 text-center">
                        {d.netPay > 0 && pInline ? (
                          (() => {
                            const paidAmt = Number((pInline.amt||"0").replace(/,/g,""))||0;
                            const remain  = d.netPay - paidAmt;
                            return (
                              <span className={`text-xs font-bold ${remain > 0 ? "text-amber-500" : remain === 0 ? "text-slate-400" : "text-red-400"}`}>
                                {remain !== d.netPay ? fw(remain) : "-"}
                              </span>
                            );
                          })()
                        ) : d.isPaid ? (
                          <span className="text-xs text-slate-400">0원</span>
                        ) : d.netPay > 0 ? (
                          <span className="text-xs text-slate-300">-</span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>

                      {/* 지급내역 팝업 */}
                      <td className="px-2 py-2.5 text-center">
                        {myPayments.length>0 ? (
                          <button onClick={()=>setPayHistoryContact(contact)}
                            className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-100">
                            {myPayments.length}건 보기
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

      {/* ── 마일리지사용내역 팝업 ── */}
      {mileHistoryContact && (() => {
        const usages = mileageUsages.filter(m=>m.contact_id===mileHistoryContact.id)
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
                      <span className="text-xs text-slate-500 font-medium">{u.usage_date}</span>
                      <span className="text-sm font-bold text-blue-600">{u.usage_amount.toLocaleString()}원</span>
                      <button onClick={()=>{ setMileHistoryContact(null); setMileEditModal({usage:u,contact:mileHistoryContact}); setMileEditDate(u.usage_date); setMileEditAmt(u.usage_amount.toLocaleString()); }}
                        className="text-xs text-slate-400 hover:text-blue-500 underline">수정</button>
                    </div>
                  ))}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex justify-between">
                <span className="text-xs text-slate-400">총 사용금액</span>
                <span className="text-sm font-bold text-blue-600">{usages.reduce((s,u)=>s+(u.usage_amount||0),0).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 지급내역 팝업 ── */}
      {payHistoryContact && (() => {
        const pays = payments.filter(p=>p.contact_id===payHistoryContact.id)
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
                        <p className="text-xs font-medium text-slate-700">{p.paid_date||"-"}</p>
                        <p className="text-xs text-slate-400">{p.quarter}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{(p.paid_amount||0).toLocaleString()}원</span>
                      <button onClick={async()=>{
                        if(!confirm("이 지급 기록을 삭제하시겠습니까?")) return;
                        await supabase.from("rewards").delete().eq("id",p.id);
                        fetchAll();
                      }} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 ml-1">삭제</button>
                    </div>
                  ))}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex justify-between">
                <span className="text-xs text-slate-400">총 지급금액</span>
                <span className="text-sm font-bold text-emerald-600">{pays.reduce((s,p)=>s+(p.paid_amount||0),0).toLocaleString()}원</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 마일리지 수정 모달 ── */}
      {mileEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">마일리지 사용 수정</h2>
              <button onClick={()=>setMileEditModal(null)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">사용일</label>
                <input type="date" value={mileEditDate} onChange={e=>setMileEditDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">사용금액</label>
                <input value={mileEditAmt} onChange={e=>setMileEditAmt(e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,","))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button onClick={handleMileEditDelete} className="px-3 py-2.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">삭제</button>
              <button onClick={()=>setMileEditModal(null)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handleMileEditSave}
                className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800">수정 확정</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
