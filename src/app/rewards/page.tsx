"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { X, Search, Copy, Check, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

// ── 타입 ──────────────────────────────────────────────────
interface VipContact {
  id: number; name: string; title: string | null;
  bunyanghoe_number: string | null;
  assigned_to: string; consultant: string | null;
  meeting_result: string;
  bank_holder: string | null; bank_code: string | null; bank_name: string | null; bank_account: string | null;
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
  carried_over: number; member_name: string;
}
interface MileageUsage {
  id: number; contact_id: number;
  usage_date: string; usage_amount: number; memo: string | null;
}

// ── 유틸 ──────────────────────────────────────────────────
function fw(n: number) {
  if (n === 0) return "0원";
  if (!n) return "-";
  return (n < 0 ? "-" : "") + Math.abs(n).toLocaleString() + "원";
}
function fmtBun(s: string | null) {
  if (!s) return "-";
  return s.startsWith("B-") ? s : `B-${s}`;
}
function numOrd(s: string | null) {
  return parseInt((s||"").replace(/[^0-9]/g,"")) || 9999;
}
function getCurrentQuarter() {
  const n = new Date();
  return `${n.getFullYear()}-Q${Math.ceil((n.getMonth()+1)/3)}`;
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
function calcDueMonth(q: string) {
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
  return parseInt(y)*10+parseInt(qn);
}
function prevQuarter(q: string): string | null {
  const [y, qn] = q.split("-Q");
  const n = parseInt(qn);
  if (n === 1) return `${parseInt(y)-1}-Q4`;
  return `${y}-Q${n-1}`;
}

// ── 메인 ──────────────────────────────────────────────────
export default function RewardsPage() {
  const [contacts, setContacts]         = useState<VipContact[]>([]);
  const [executions, setExecutions]     = useState<AdExecution[]>([]);
  const [payments, setPayments]         = useState<PaymentRecord[]>([]);
  const [mileageUsages, setMileageUsages] = useState<MileageUsage[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterQuarter, setFilterQuarter] = useState(getCurrentQuarter());
  const [filterPaid, setFilterPaid]     = useState("");
  const [search, setSearch]             = useState("");
  const [copiedId, setCopiedId]         = useState<number|null>(null);

  // 인라인 지급처리 {contactId: {date, amt}}
  const [payInline, setPayInline] = useState<{[id:number]:{date:string;amt:string}}>({});

  // 팝업
  const [mileHistoryContact, setMileHistoryContact] = useState<VipContact|null>(null);
  const [payHistoryContact, setPayHistoryContact]   = useState<VipContact|null>(null);

  // 마일리지 수정 모달
  const [mileEditModal, setMileEditModal] = useState<{usage:MileageUsage;contact:VipContact}|null>(null);
  const [mileEditDate, setMileEditDate]   = useState("");
  const [mileEditAmt, setMileEditAmt]     = useState("");

  const quarters = getQuarters();
  const currentQ = getCurrentQuarter();
  const today    = new Date().toISOString().split("T")[0];

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data:c },{ data:e },{ data:p },{ data:m }] = await Promise.all([
      supabase.from("contacts")
        .select("id,name,title,bunyanghoe_number,assigned_to,consultant,meeting_result,bank_holder,bank_code,bank_name,bank_account")
        .in("meeting_result",["계약완료","예약완료"]),
      supabase.from("ad_executions")
        .select("id,member_name,bunyanghoe_number,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward,payment_date,contract_route")
        .eq("contract_route","분양회"),
      supabase.from("rewards").select("*"),
      supabase.from("mileage_usages").select("*").order("usage_date",{ascending:false}),
    ]);
    const sorted = ((c||[]) as VipContact[]).sort((a,b)=>numOrd(a.bunyanghoe_number)-numOrd(b.bunyanghoe_number));
    setContacts(sorted);
    setExecutions((e||[]) as AdExecution[]);
    setPayments((p||[]) as PaymentRecord[]);
    setMileageUsages((m||[]) as MileageUsage[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── 분기별 ad_executions 집계 ────────────────────────────
  function getExecByQ(contact: VipContact, q: string) {
    const { start, end } = getQuarterDateRange(q);
    const list = executions.filter(e => {
      if (!e.payment_date || e.payment_date < start || e.payment_date > end) return false;
      return e.member_name === contact.name || (contact.bunyanghoe_number && e.bunyanghoe_number === contact.bunyanghoe_number);
    });
    return {
      mileage:   list.reduce((s,e)=>s+(e.hightarget_mileage||0),0),
      htReward:  list.reduce((s,e)=>s+(e.hightarget_reward||0),0),
      hogReward: list.reduce((s,e)=>s+(e.hogaengnono_reward||0),0),
      lmsReward: list.reduce((s,e)=>s+(e.lms_reward||0),0),
    };
  }

  // ── 이전 분기 이월액 계산 (반복문 방식 - 무한루프 방지) ──────
  function getCarriedOver(contact: VipContact, targetQ: string): number {
    // Q1부터 targetQ 이전 분기까지 순서대로 계산
    const allQ = getQuarters();
    const targetIdx = allQ.findIndex(q => q === targetQ);
    if (targetIdx <= 0) return 0;

    let carried = 0;
    for (let i = 0; i < targetIdx; i++) {
      const q = allQ[i];
      const exec    = getExecByQ(contact, q);
      const reward  = exec.htReward + exec.hogReward + exec.lmsReward;
      const tax     = reward > 0 ? Math.floor(reward * 0.033) : 0;
      const payable = (reward - tax) + carried;
      const paid    = payments
        .filter(p=>(p.contact_id===contact.id || (p as any).member_name===contact.name) && p.quarter===q)
        .reduce((s,p)=>s+(p.paid_amount||0),0);
      carried = Math.max(payable - paid, 0);
    }
    return carried;
  }

  // ── 해당 분기 계산 ──────────────────────────────────────────
  function getQuarterData(contact: VipContact, q: string) {
    const exec       = getExecByQ(contact, q);
    const reward     = exec.htReward + exec.hogReward + exec.lmsReward;
    const carriedOver= getCarriedOver(contact, q);
    const incomeTax  = reward > 0 ? Math.floor(reward * 0.033) : 0;
    const payable    = (reward - incomeTax) + carriedOver;  // 지급가능액

    // 해당 분기 지급액
    const paidRecords = payments.filter(p=>(p.contact_id===contact.id || (p as any).member_name===contact.name) && p.quarter===q);
    const totalPaid   = paidRecords.reduce((s,p)=>s+(p.paid_amount||0),0);
    const afterBalance= Math.max(payable - totalPaid, 0);

    // 마일리지 (누적 — 전체 분기 합산)
    const allQ = quarters.filter(qq=>quarterOrder(qq)<=quarterOrder(q));
    const cumMileage = allQ.reduce((s,qq)=>s+getExecByQ(contact,qq).mileage,0);
    const mileUsages = mileageUsages.filter(m=>m.contact_id===contact.id);
    const mileUsed   = mileUsages.reduce((s,m)=>s+(m.usage_amount||0),0);
    const mileBalance= cumMileage - mileUsed;

    return {
      qMileage: exec.mileage, htReward: exec.htReward,
      hogReward: exec.hogReward, lmsReward: exec.lmsReward,
      reward, carriedOver, incomeTax, payable,
      totalPaid, afterBalance, paidRecords,
      cumMileage, mileUsed, mileBalance, mileUsages,
      isPaid: totalPaid > 0 && afterBalance <= 0 && payable > 0,
      due: calcDueMonth(q),
    };
  }

  // ── 지급처리 저장 ────────────────────────────────────────
  const handlePaySave = async (contact: VipContact) => {
    const inline = payInline[contact.id];
    const amt    = inline ? Number(inline.amt.replace(/,/g,"")) : 0;
    const date   = inline?.date || today;
    if (!amt) return alert("지급금액을 입력해주세요.");
    const q = filterQuarter || currentQ;
    const { error } = await supabase.from("rewards").insert({
      contact_id: contact.id, member_name: contact.name,
      member_number: contact.bunyanghoe_number||"",
      quarter: q, paid_amount: amt, paid_date: date, is_paid: true,
      carried_over: 0,
    });
    if (error) { alert(`저장 실패: ${error.message}`); return; }
    setPayInline(prev => { const n={...prev}; delete n[contact.id]; return n; });
    fetchAll();
  };

  // ── 마일리지 수정/삭제 ────────────────────────────────────
  const handleMileEditSave = async () => {
    if (!mileEditModal) return;
    const amt = Number(mileEditAmt.replace(/,/g,""))||0;
    if (!amt||!mileEditDate) return alert("내용을 입력하세요.");
    await supabase.from("mileage_usages").update({ usage_date:mileEditDate, usage_amount:amt }).eq("id",mileEditModal.usage.id);
    setMileEditModal(null); fetchAll();
  };
  const handleMileEditDelete = async () => {
    if (!mileEditModal) return;
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("mileage_usages").delete().eq("id",mileEditModal.usage.id);
    setMileEditModal(null); fetchAll();
  };

  // 마일리지 인라인 사용
  const [mileInline, setMileInline] = useState<{[id:number]:{date:string;amt:string}}>({});
  const handleMileSave = async (contact: VipContact) => {
    const inline = mileInline[contact.id];
    const amt    = inline ? Number(inline.amt.replace(/,/g,"")) : 0;
    const date   = inline?.date || today;
    if (!amt||!date) return alert("사용일과 사용금액을 입력해주세요.");
    const { error } = await supabase.from("mileage_usages").insert({ contact_id:contact.id, usage_date:date, usage_amount:amt });
    if (error) { alert(`저장 실패: ${error.message}`); return; }
    setMileInline(prev => { const n={...prev}; delete n[contact.id]; return n; });
    fetchAll();
  };

  // ── 대시보드 집계 ─────────────────────────────────────────
  const q = filterQuarter || currentQ;
  const allRows = contacts.map(c => getQuarterData(c, q));
  const totalReward  = allRows.reduce((s,d)=>s+d.reward,0);
  const totalMileage = allRows.reduce((s,d)=>s+d.cumMileage,0);
  const totalPaidSum = allRows.reduce((s,d)=>s+d.totalPaid,0);
  const totalPayable = allRows.reduce((s,d)=>s+d.afterBalance,0);

  // ── 누적 집계 (전체 분기 합산) ──
  const allQUpTo = quarters.filter(qq => quarterOrder(qq) <= quarterOrder(q));
  let cumRewardAll = 0, qMileageAll = 0;
  // 선택분기 마일리지 + 누적 리워드
  for (const c of contacts) {
    const thisExec = getExecByQ(c, q);
    qMileageAll += thisExec.mileage;
    for (const qq of allQUpTo) {
      const exec = getExecByQ(c, qq);
      cumRewardAll += exec.htReward + exec.hogReward + exec.lmsReward;
    }
  }
  const cumPaidAll = payments.reduce((s,p) => s + (p.paid_amount||0), 0);
  const { start: qStart, end: qEnd } = getQuarterDateRange(q);
  const qMileUsedAll = mileageUsages
    .filter(m => m.usage_date >= qStart && m.usage_date <= qEnd)
    .reduce((s,m) => s + (m.usage_amount||0), 0);
  const cumMileUsedAll = mileageUsages.reduce((s,m) => s + (m.usage_amount||0), 0);

  // ── 엑셀 다운로드 함수 ──────────────────────────────────
  const downloadDataXLS = () => {
    const rows = filteredContacts.map(c => {
      const d = getQuarterData(c, q);
      return {
        "넘버링": fmtBun(c.bunyanghoe_number),
        "고객명": c.name,
        "분기": q,
        "대협팀": c.assigned_to||"",
        "컨설턴트": c.consultant||"",
        "마일리지": d.cumMileage,
        "잔여마일리지": d.mileBalance,
        "하이타겟(5%)": d.htReward,
        "호갱노노(5%)": d.hogReward,
        "LMS(15%)": d.lmsReward,
        "발생리워드": d.reward,
        "전분기이월": d.carriedOver,
        "소득세(3.3%)": d.incomeTax,
        "지급가능액": d.payable,
        "지급완료액": d.totalPaid,
        "지급후잔액": d.afterBalance,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws["!ref"]||"A1");
    for(let R=range.s.r+1;R<=range.e.r;R++){for(let C=5;C<=range.e.c;C++){const addr=XLSX.utils.encode_cell({r:R,c:C});if(ws[addr]&&typeof ws[addr].v==="number")ws[addr].z="#,##0";}}
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "리워드데이터");
    XLSX.writeFile(wb, `리워드_데이터_${q}.xls`);
  };

  const downloadPaymentXLS = () => {
    // 지급처리 완료된 고객(isPaid=true, totalPaid>0)만 대상
    const paidContacts = contacts.filter(c => {
      const d = getQuarterData(c, q);
      return d.totalPaid > 0;
    });
    // 분기 → 익월 매핑
    const [,qn] = q.split("-");
    const monthMap: Record<string,string> = { Q1:"4", Q2:"7", Q3:"10", Q4:"1" };
    const payMonth = monthMap[qn] || "1";
    const payLabel = `${payMonth}월프리이화원`;

    const rows = paidContacts.map(c => {
      const d = getQuarterData(c, q);
      return [
        c.bank_code || "",           // A: 은행코드
        c.bank_account || "",        // B: 계좌번호
        c.bank_holder || c.name,     // C: 예금주
        d.totalPaid,                 // D: 지급금액
        payLabel,                    // E: 월프리이화원
        "(주)광고인",                // F: 고정
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws["!ref"]||"A1");
    for(let R=range.s.r;R<=range.e.r;R++){const addr=XLSX.utils.encode_cell({r:R,c:3});if(ws[addr]&&typeof ws[addr].v==="number")ws[addr].z="#,##0";}
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "입력정보");
    XLSX.writeFile(wb, `리워드_지급정보_${q}.xls`);
  };

  // 검색+필터
  const filteredContacts = contacts.filter(c => {
    const d = getQuarterData(c, q);
    if (filterPaid==="paid"   && !d.isPaid) return false;
    if (filterPaid==="unpaid" && (d.isPaid||d.reward<=0)) return false;
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      return c.name.includes(s)||c.assigned_to.toLowerCase().includes(s)||
        (c.consultant||"").toLowerCase().includes(s)||fmtBun(c.bunyanghoe_number).toLowerCase().includes(s);
    }
    return true;
  });

  const inp = "w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* ── 헤더 ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">리워드 관리</h1>
            <p className="text-xs text-slate-500 mt-0.5">분기별 리워드 지급 및 이월 관리</p>
          </div>
        </div>
        {/* 대시보드 — 분기별 + 누적 */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          {/* 발생리워드 */}
          <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
            <p className="text-xs text-slate-500 mb-0.5">{q} 발생리워드</p>
            <p className="text-base font-bold text-amber-600">{fw(totalReward)}</p>
            <div className="border-t border-amber-200 mt-2 pt-1.5">
              <p className="text-[10px] text-slate-400">누적</p>
              <p className="text-sm font-bold text-amber-700">{fw(cumRewardAll)}</p>
            </div>
          </div>
          {/* 발생마일리지(하이타겟) */}
          <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
            <p className="text-xs text-slate-500 mb-0.5">{q} 발생마일리지 (하이타겟)</p>
            <p className="text-base font-bold text-blue-600">{fw(qMileageAll)}</p>
            <div className="border-t border-blue-200 mt-2 pt-1.5">
              <p className="text-[10px] text-slate-400">누적</p>
              <p className="text-sm font-bold text-blue-700">{fw(totalMileage)}</p>
            </div>
          </div>
          {/* 리워드 지급금액 */}
          <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
            <p className="text-xs text-slate-500 mb-0.5">{q} 리워드지급금액</p>
            <p className="text-base font-bold text-emerald-600">{fw(totalPaidSum)}</p>
            <div className="border-t border-emerald-200 mt-2 pt-1.5">
              <p className="text-[10px] text-slate-400">누적</p>
              <p className="text-sm font-bold text-emerald-700">{fw(cumPaidAll)}</p>
            </div>
          </div>
          {/* 사용 마일리지(하이타겟) */}
          <div className="bg-violet-50 rounded-xl px-4 py-3 border border-violet-100">
            <p className="text-xs text-slate-500 mb-0.5">{q} 사용마일리지 (하이타겟)</p>
            <p className="text-base font-bold text-violet-600">{fw(qMileUsedAll)}</p>
            <div className="border-t border-violet-200 mt-2 pt-1.5">
              <p className="text-[10px] text-slate-400">누적</p>
              <p className="text-sm font-bold text-violet-700">{fw(cumMileUsedAll)}</p>
            </div>
          </div>
        </div>
        {/* 필터 */}
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="이름, 대협팀, 컨설턴트, 넘버링..."
              className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg w-52 outline-none focus:border-blue-400"/>
          </div>
          <select value={filterQuarter} onChange={e=>setFilterQuarter(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체</option>
            {quarters.map(qq=><option key={qq} value={qq}>{qq}</option>)}
          </select>
          <select value={filterPaid} onChange={e=>setFilterPaid(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">지급여부</option>
            <option value="unpaid">미지급</option>
            <option value="paid">지급완료</option>
          </select>
          <button onClick={()=>{setSearch("");setFilterQuarter(getCurrentQuarter());setFilterPaid("");}}
            className={`text-sm px-3 py-1.5 font-semibold rounded-lg whitespace-nowrap transition-colors ${(search||filterPaid||filterQuarter!==getCurrentQuarter())?"bg-red-500 text-white border border-red-500":"text-red-400 border border-red-200 hover:bg-red-50"}`}>↺ 초기화</button>
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={downloadDataXLS}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100">
              <FileSpreadsheet size={14}/> 데이터다운(XLS)
            </button>
            <button onClick={downloadPaymentXLS}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100">
              <FileSpreadsheet size={14}/> 지급정보(XLS)
            </button>
          </div>
        </div>
      </div>

      {/* ── 테이블 ── */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto" style={{maxHeight:"calc(100vh - 180px)"}}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                <tr>
                  {/* 기본 */}
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">넘버링</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">고객명</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">분기</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">대협팀</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">컨설턴트</th>
                  {/* 마일리지 */}
                  <th className="text-center px-2 py-2.5 text-blue-600 text-xs font-semibold whitespace-nowrap bg-blue-50/40">마일리지</th>
                  <th className="text-center px-2 py-2.5 text-blue-600 text-xs font-semibold whitespace-nowrap bg-blue-50/40">사용내역</th>
                  <th className="text-center px-2 py-2.5 text-blue-600 text-xs font-semibold whitespace-nowrap bg-blue-50/40">마일리지사용</th>
                  <th className="text-center px-2 py-2.5 text-blue-600 text-xs font-semibold whitespace-nowrap bg-blue-50/40">잔여마일리지</th>
                  {/* 구분선 */}
                  <th className="bg-slate-300 w-0.5 p-0"/>
                  {/* 리워드 */}
                  <th className="text-center px-2 py-2.5 text-amber-600 text-xs font-semibold whitespace-nowrap">하이타겟(5%)</th>
                  <th className="text-center px-2 py-2.5 text-amber-600 text-xs font-semibold whitespace-nowrap">호갱노노(5%)</th>
                  <th className="text-center px-2 py-2.5 text-purple-600 text-xs font-semibold whitespace-nowrap">LMS(15%)</th>
                  <th className="text-center px-2 py-2.5 text-amber-700 text-xs font-semibold whitespace-nowrap">발생리워드</th>
                  <th className="text-center px-2 py-2.5 text-sky-600 text-xs font-semibold whitespace-nowrap">전분기이월</th>
                  <th className="text-center px-2 py-2.5 text-red-500 text-xs font-semibold whitespace-nowrap">소득세(3.3%)</th>
                  <th className="text-center px-2 py-2.5 text-emerald-600 text-xs font-semibold whitespace-nowrap">지급가능액</th>
                  <th className="text-center px-2 py-2.5 text-emerald-600 text-xs font-semibold whitespace-nowrap">지급처리</th>
                  <th className="text-center px-2 py-2.5 text-amber-500 text-xs font-semibold whitespace-nowrap">지급후잔액(이월)</th>
                  <th className="text-center px-2 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">지급내역</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => {
                  const d = getQuarterData(contact, q);
                  const pInline = payInline[contact.id];
                  const mInline = mileInline[contact.id];

                  return (
                    <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                      {/* 넘버링 */}
                      <td className="px-2 py-3 text-center">
                        <span className="text-sm font-black text-amber-600">{fmtBun(contact.bunyanghoe_number)}</span>
                      </td>
                      <td className="px-2 py-3 text-center font-semibold text-slate-800 text-xs whitespace-nowrap">{contact.name}</td>
                      <td className="px-2 py-3 text-center">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{q}</span>
                      </td>
                      <td className="px-2 py-3 text-center text-xs text-slate-500">{contact.assigned_to||"-"}</td>
                      <td className="px-2 py-3 text-center text-xs text-slate-500">{contact.consultant||"-"}</td>

                      {/* 마일리지 */}
                      <td className="px-2 py-3 text-center mile-cell">
                        <span className={`text-xs font-bold ${d.cumMileage<0?"text-red-500":"text-blue-600"}`}>{fw(d.cumMileage)}</span>
                      </td>
                      <td className="px-2 py-3 text-center mile-cell">
                        {d.mileUsages.length>0 ? (
                          <button onClick={()=>setMileHistoryContact(contact)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100">
                            {d.mileUsages.length}건
                          </button>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center mile-cell">
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
                                  className="px-2 py-1 text-xs bg-slate-100 text-slate-500 rounded">✕</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={()=>setMileInline(p=>({...p,[contact.id]:{date:today,amt:""}}))}
                              className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-200 hover:bg-slate-100 whitespace-nowrap">
                              사용처리
                            </button>
                          )
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                      <td className="px-2 py-3 text-center mile-cell">
                        <span className={`text-xs font-bold ${d.mileBalance>0?"text-blue-600":d.mileBalance<0?"text-red-500":"text-slate-400"}`}>{fw(d.mileBalance)}</span>
                      </td>

                      {/* 구분선 */}
                      <td className="w-0.5 p-0" style={{background:"var(--border-2)"}}/>

                      {/* 리워드 */}
                      <td className="px-2 py-3 text-center text-xs font-medium">
                        <span className={d.htReward<0?"text-red-500":"text-amber-600"}>{fw(d.htReward)}</span>
                      </td>
                      <td className="px-2 py-3 text-center text-xs font-medium">
                        <span className={d.hogReward<0?"text-red-500":"text-amber-600"}>{fw(d.hogReward)}</span>
                      </td>
                      <td className="px-2 py-3 text-center text-xs font-medium">
                        <span className={d.lmsReward<0?"text-red-500":"text-purple-600"}>{fw(d.lmsReward)}</span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span className={`text-xs font-bold ${d.reward<0?"text-red-500":"text-amber-700"}`}>{fw(d.reward)}</span>
                      </td>
                      {/* 전분기이월 */}
                      <td className="px-2 py-3 text-center">
                        {d.carriedOver > 0
                          ? <span className="text-xs font-bold text-sky-600">+{d.carriedOver.toLocaleString()}원</span>
                          : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                      {/* 소득세 */}
                      <td className="px-2 py-3 text-center">
                        <span className="text-xs text-red-500 font-medium">{d.incomeTax>0?`-${fw(d.incomeTax)}`:"-"}</span>
                      </td>
                      {/* 지급가능액 */}
                      <td className="px-2 py-3 text-center">
                        <span className={`text-xs font-bold ${d.payable>0?"text-emerald-600":"text-slate-300"}`}>{fw(d.payable)}</span>
                      </td>

                      {/* 지급처리 인라인 */}
                      <td className="px-2 py-3 text-center">
                        {d.payable > 0 ? (
                          pInline ? (
                            <div className="flex flex-col gap-1 min-w-[140px]">
                              <input type="date" value={pInline.date}
                                onChange={e=>setPayInline(p=>({...p,[contact.id]:{...p[contact.id],date:e.target.value}}))}
                                className={inp}/>
                              <input value={pInline.amt} placeholder="지급금액"
                                onChange={e=>setPayInline(p=>({...p,[contact.id]:{...p[contact.id],amt:e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,",")}}))}
                                className={inp}/>
                              {/* 계좌 정보 */}
                              {(contact.bank_holder||contact.bank_name||contact.bank_account) && (
                                <div className="bg-slate-50 rounded px-2 py-1 border border-slate-200 text-[10px] text-slate-500 space-y-0.5 text-center">
                                  {contact.bank_holder && <p>예금주: <span className="font-semibold text-slate-700">{contact.bank_holder}</span></p>}
                                  {contact.bank_name && <p>은행: <span className="font-semibold text-slate-700">{contact.bank_name}</span></p>}
                                  {contact.bank_account && (
                                    <div className="flex items-center justify-center gap-1">
                                      <p>계좌: <span className="font-semibold text-slate-700">{contact.bank_account}</span></p>
                                      <button onClick={()=>{ navigator.clipboard.writeText(contact.bank_account||""); setCopiedId(contact.id); setTimeout(()=>setCopiedId(null),1500); }}
                                        className={`p-0.5 rounded ${copiedId===contact.id?"text-emerald-500":"text-slate-400 hover:text-blue-500"}`}>
                                        {copiedId===contact.id ? <Check size={10}/> : <Copy size={10}/>}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex gap-1">
                                <button onClick={()=>handlePaySave(contact)}
                                  className="flex-1 py-1 text-xs bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700">지급확정</button>
                                <button onClick={()=>setPayInline(p=>{const n={...p};delete n[contact.id];return n;})}
                                  className="px-2 py-1 text-xs bg-slate-100 text-slate-500 rounded">✕</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={()=>setPayInline(p=>({...p,[contact.id]:{date:d.due?`${d.due}-15`:today, amt:d.afterBalance>0?d.afterBalance.toLocaleString():d.payable.toLocaleString()}}))}
                              className={`text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap ${d.isPaid?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-[#1E3A8A] text-white hover:bg-blue-800"}`}>
                              {d.isPaid ? "추가지급" : "지급처리"}
                            </button>
                          )
                        ) : (
                          <span className="text-xs px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 font-semibold cursor-not-allowed whitespace-nowrap inline-block">
                            지급처리
                          </span>
                        )}
                      </td>

                      {/* 지급후잔액(이월) */}
                      <td className="px-2 py-3 text-center">
                        {(() => {
                          if (pInline) {
                            const inputAmt = Number((pInline.amt||"0").replace(/,/g,""))||0;
                            const remain   = d.payable - d.totalPaid - inputAmt;
                            const color    = remain > 0 ? "text-amber-500" : remain===0 ? "text-slate-400" : "text-red-400";
                            return <span className={`text-xs font-bold ${color}`}>{remain.toLocaleString()}원</span>;
                          }
                          if (d.payable > 0) {
                            const remain = d.payable - d.totalPaid;
                            const color  = remain > 0 ? "text-amber-500" : "text-slate-400";
                            return (
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-bold ${color}`}>{remain.toLocaleString()}원</span>
                                {remain > 0 && <span className="text-[9px] text-sky-500 font-medium mt-0.5">→다음분기이월</span>}
                              </div>
                            );
                          }
                          return <span className="text-slate-300 text-xs">-</span>;
                        })()}
                      </td>

                      {/* 지급내역 */}
                      <td className="px-2 py-3 text-center">
                        {d.paidRecords.length>0 ? (
                          <button onClick={()=>setPayHistoryContact(contact)}
                            className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-100">
                            {d.paidRecords.length}건
                          </button>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredContacts.length===0 && (
                  <tr><td colSpan={20} className="text-center py-12 text-slate-300 text-sm">분양회 회원이 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 마일리지 사용내역 팝업 ── */}
      {mileHistoryContact && (() => {
        const usages = mileageUsages.filter(m=>m.contact_id===mileHistoryContact.id)
          .sort((a,b)=>b.usage_date.localeCompare(a.usage_date));
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setMileHistoryContact(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">마일리지 사용내역 — {mileHistoryContact.name}</h2>
                <button onClick={()=>setMileHistoryContact(null)}><X size={18} className="text-slate-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {usages.length===0
                  ? <p className="text-center py-8 text-slate-300 text-sm">사용 내역이 없습니다</p>
                  : usages.map(u=>(
                    <div key={u.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-medium text-slate-600">{u.usage_date}</span>
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
        const d = getQuarterData(payHistoryContact, q);
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setPayHistoryContact(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">지급내역 — {payHistoryContact.name} ({q})</h2>
                <button onClick={()=>setPayHistoryContact(null)}><X size={18} className="text-slate-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {d.paidRecords.length===0
                  ? <p className="text-center py-8 text-slate-300 text-sm">지급 내역이 없습니다</p>
                  : d.paidRecords.sort((a,b)=>((b.paid_date||"").localeCompare(a.paid_date||""))).map(p=>(
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{p.paid_date||"-"}</p>
                        <p className="text-xs text-slate-400">{p.quarter}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{(p.paid_amount||0).toLocaleString()}원</span>
                      <button onClick={async()=>{ if(!confirm("삭제하시겠습니까?"))return; await supabase.from("rewards").delete().eq("id",p.id); fetchAll(); }}
                        className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                    </div>
                  ))}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex justify-between">
                <span className="text-xs text-slate-400">총 지급금액</span>
                <span className="text-sm font-bold text-emerald-600">{d.paidRecords.reduce((s,p)=>s+(p.paid_amount||0),0).toLocaleString()}원</span>
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
              <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">사용일</label>
                <input type="date" value={mileEditDate} onChange={e=>setMileEditDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1.5">사용금액</label>
                <input value={mileEditAmt} onChange={e=>setMileEditAmt(e.target.value.replace(/[^0-9]/g,"").replace(/\B(?=(\d{3})+(?!\d))/g,","))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/></div>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button onClick={handleMileEditDelete} className="px-3 py-2.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50">삭제</button>
              <button onClick={()=>setMileEditModal(null)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handleMileEditSave} className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800">수정 확정</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
