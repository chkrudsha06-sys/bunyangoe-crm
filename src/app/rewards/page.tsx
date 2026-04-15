"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, AlertCircle } from "lucide-react";

interface VipContact {
  id: number;
  name: string;
  title: string | null;
  bunyanghoe_number: string | null;
  assigned_to: string;
  consultant: string | null;
  meeting_result: string;
}

interface AdExecution {
  id: number;
  member_name: string;
  bunyanghoe_number: string | null;
  hightarget_mileage: number;
  hightarget_reward: number;
  hogaengnono_reward: number;
  lms_reward: number;
  payment_date: string | null;
  contract_route: string | null;
}

interface PaymentRecord {
  id: number;
  contact_id: number;
  quarter: string;
  is_paid: boolean;
  paid_date: string | null;
  mileage_used: number;
}

function fw(n: number) {
  if (!n) return "-";
  return (n < 0 ? "-" : "") + Math.abs(n).toLocaleString() + "원";
}

function getQuarterFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}-Q${q}`;
}

function getCurrentQuarter(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth()+1)/3)}`;
}

function calcPaymentDueMonth(q: string): string {
  const [year, quarter] = q.split("-");
  const y = parseInt(year);
  return { Q1:`${y}-04`, Q2:`${y}-07`, Q3:`${y}-10`, Q4:`${y+1}-01` }[quarter] || "";
}

function getQuarters(): string[] {
  const y = new Date().getFullYear();
  return [`${y}-Q1`,`${y}-Q2`,`${y}-Q3`,`${y}-Q4`];
}

export default function RewardsPage() {
  const [contacts, setContacts]   = useState<VipContact[]>([]);
  const [executions, setExecutions] = useState<AdExecution[]>([]);
  const [payments, setPayments]   = useState<PaymentRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterQuarter, setFilterQuarter] = useState(getCurrentQuarter());
  const [filterPaid, setFilterPaid]       = useState("");

  const quarters = getQuarters();
  const currentQ = getCurrentQuarter();

  useEffect(() => { fetchAll(); }, [filterQuarter, filterPaid]);

  const fetchAll = async () => {
    setLoading(true);

    // 분양회 회원 전체
    const { data: c } = await supabase.from("contacts")
      .select("id,name,title,bunyanghoe_number,assigned_to,consultant,meeting_result")
      .in("meeting_result",["계약완료","예약완료"])
      .order("bunyanghoe_number",{ascending:true});
    setContacts((c||[]) as VipContact[]);

    // ad_executions — 분양회 매출만 (리워드 반영 대상)
    const { data: e } = await supabase.from("ad_executions")
      .select("id,member_name,bunyanghoe_number,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward,payment_date,contract_route")
      .eq("contract_route","분양회");
    setExecutions((e||[]) as AdExecution[]);

    // 지급 처리 기록
    let pq = supabase.from("rewards").select("id,contact_id,quarter,is_paid,paid_date,mileage_used");
    if (filterPaid === "paid")   pq = pq.eq("is_paid", true);
    if (filterPaid === "unpaid") pq = pq.eq("is_paid", false);
    const { data: p } = await pq;
    setPayments((p||[]) as PaymentRecord[]);

    setLoading(false);
  };

  // 멤버별 분기별 리워드 집계 (ad_executions 기반)
  const getRewardsByMember = (contact: VipContact, quarter: string) => {
    const memberExecs = executions.filter(e => {
      if (!e.payment_date) return false;
      const eQ = getQuarterFromDate(e.payment_date);
      if (eQ !== quarter) return false;
      // 이름 또는 넘버링으로 매칭
      return e.member_name === contact.name ||
        (contact.bunyanghoe_number && e.bunyanghoe_number === contact.bunyanghoe_number);
    });

    const hightarget_mileage = memberExecs.reduce((s,e)=>s+(e.hightarget_mileage||0),0);
    const hightarget_reward  = memberExecs.reduce((s,e)=>s+(e.hightarget_reward||0),0);
    const hogaengnono_reward = memberExecs.reduce((s,e)=>s+(e.hogaengnono_reward||0),0);
    const lms_reward         = memberExecs.reduce((s,e)=>s+(e.lms_reward||0),0);
    const accumulated        = hightarget_reward + hogaengnono_reward + lms_reward;
    const income_tax         = accumulated > 0 ? Math.floor(accumulated * 0.033) : 0;
    const net_pay            = accumulated - income_tax;

    return { hightarget_mileage, hightarget_reward, hogaengnono_reward, lms_reward, accumulated, income_tax, net_pay };
  };

  // 지급 처리 기록 조회
  const getPayment = (contactId: number, quarter: string) =>
    payments.find(p => p.contact_id === contactId && p.quarter === quarter);

  // 대시보드 집계
  const allRows = contacts.map(c => ({
    rewards: getRewardsByMember(c, filterQuarter || currentQ),
    payment: getPayment(c.id, filterQuarter || currentQ),
  }));
  const totalAccum   = allRows.reduce((s,r)=>s+r.rewards.accumulated,0);
  const totalMileage = allRows.reduce((s,r)=>s+r.rewards.hightarget_mileage,0);
  const totalPaid    = allRows.filter(r=>r.payment?.is_paid).reduce((s,r)=>s+r.rewards.accumulated,0);
  const totalUnpaid  = allRows.filter(r=>!r.payment?.is_paid && r.rewards.accumulated > 0)
                              .reduce((s,r)=>s+r.rewards.net_pay,0);

  // 지급 처리
  const handlePayment = async (contact: VipContact, quarter: string, amount: number) => {
    if (!confirm(`${contact.name}님의 리워드를 지급 처리하시겠습니까?\n지급액: ${fw(amount)}`)) return;
    const today = new Date().toISOString().split("T")[0];
    const existing = getPayment(contact.id, quarter);
    if (existing) {
      await supabase.from("rewards").update({ is_paid: true, paid_date: today }).eq("id", existing.id);
    } else {
      await supabase.from("rewards").insert({
        contact_id: contact.id, quarter,
        is_paid: true, paid_date: today, mileage_used: 0,
      });
    }
    fetchAll();
  };

  // 마일리지 사용 처리
  const [editMileage, setEditMileage] = useState<{contactId:number;quarter:string;current:number}|null>(null);
  const [mileageInput, setMileageInput] = useState("");

  const saveMileage = async () => {
    if (!editMileage) return;
    const amt = Number(mileageInput) || 0;
    const existing = getPayment(editMileage.contactId, editMileage.quarter);
    if (existing) {
      await supabase.from("rewards").update({ mileage_used: editMileage.current + amt }).eq("id", existing.id);
    } else {
      await supabase.from("rewards").insert({
        contact_id: editMileage.contactId, quarter: editMileage.quarter,
        is_paid: false, mileage_used: amt,
      });
    }
    setEditMileage(null); setMileageInput("");
    fetchAll();
  };

  // 필터링
  const filteredContacts = contacts.filter(c => {
    if (!filterPaid) return true;
    const p = getPayment(c.id, filterQuarter || currentQ);
    if (filterPaid === "paid")   return p?.is_paid === true;
    if (filterPaid === "unpaid") {
      const r = getRewardsByMember(c, filterQuarter || currentQ);
      return !p?.is_paid && r.accumulated > 0;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* ── 헤더 ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800">리워드 관리</h1>
            <p className="text-xs text-slate-500 mt-0.5">분양회 입회대상자별 리워드 현황 및 지급 관리</p>
          </div>
        </div>

        {/* 대시보드 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label:"누적 리워드 합계",        value:fw(totalAccum),   color:"text-slate-800", bg:"bg-slate-50" },
            { label:"하이타겟 마일리지",       value:fw(totalMileage), color:"text-blue-600",  bg:"bg-blue-50" },
            { label:"지급 완료",              value:fw(totalPaid),    color:"text-emerald-600",bg:"bg-emerald-50" },
            { label:`지급 예정 (${currentQ})`, value:fw(totalUnpaid),  color:"text-amber-600", bg:"bg-amber-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-4 py-3 border border-slate-100`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-base font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div className="flex gap-2">
          <select value={filterQuarter} onChange={e=>setFilterQuarter(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 분기</option>
            {quarters.map(q=><option key={q} value={q}>{q}</option>)}
          </select>
          <select value={filterPaid} onChange={e=>setFilterPaid(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체</option>
            <option value="unpaid">미지급 (리워드 있는)</option>
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
                  {["넘버링","고객명","분기","대협팀담당","담당컨설턴트",
                    "하이타겟마일리지(10%)","하이타겟리워드(5%)",
                    "호갱노노리워드(5%)","LMS리워드(15%)",
                    "누적리워드","지급예정월","소득세(3.3%)",
                    "리워드지급액","마일리지사용","지급여부","액션"
                  ].map(h=>(
                    <th key={h} className="text-left px-3 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => {
                  const q = filterQuarter || currentQ;
                  const r = getRewardsByMember(contact, q);
                  const p = getPayment(contact.id, q);
                  const due = calcPaymentDueMonth(q);
                  const mileageUsed = p?.mileage_used || 0;
                  const isEditingMileage = editMileage?.contactId === contact.id && editMileage?.quarter === q;

                  return (
                    <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                          {contact.bunyanghoe_number || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 text-xs whitespace-nowrap">{contact.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{q}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{contact.assigned_to||"-"}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{contact.consultant||"-"}</td>

                      <td className="px-3 py-2.5 text-xs font-medium">
                        <span className={r.hightarget_mileage < 0 ? "text-red-500" : "text-blue-600"}>
                          {fw(r.hightarget_mileage)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium">
                        <span className={r.hightarget_reward < 0 ? "text-red-500" : "text-amber-600"}>
                          {fw(r.hightarget_reward)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium">
                        <span className={r.hogaengnono_reward < 0 ? "text-red-500" : "text-amber-600"}>
                          {fw(r.hogaengnono_reward)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium">
                        <span className={r.lms_reward < 0 ? "text-red-500" : "text-purple-600"}>
                          {fw(r.lms_reward)}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <span className={`font-bold text-xs ${r.accumulated < 0 ? "text-red-500" : "text-amber-600"}`}>
                          {fw(r.accumulated)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {due ? `${due} 15일` : "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-red-500 font-medium">
                          {r.income_tax > 0 ? `-${fw(r.income_tax)}` : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-bold ${p?.is_paid ? "text-slate-400 line-through" : r.net_pay > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                          {p?.is_paid ? "지급완료" : r.net_pay > 0 ? fw(r.net_pay) : "-"}
                        </span>
                      </td>

                      {/* 마일리지 사용 */}
                      <td className="px-3 py-2.5 text-xs">
                        {isEditingMileage ? (
                          <div className="flex items-center gap-1">
                            <input type="number" value={mileageInput} onChange={e=>setMileageInput(e.target.value)}
                              className="w-20 px-1.5 py-1 text-xs border border-blue-300 rounded outline-none"/>
                            <button onClick={saveMileage} className="text-xs px-1.5 py-1 bg-blue-600 text-white rounded">저장</button>
                            <button onClick={()=>setEditMileage(null)} className="text-xs text-slate-400">✕</button>
                          </div>
                        ) : r.hightarget_mileage > 0 ? (
                          <button onClick={()=>{ setEditMileage({contactId:contact.id,quarter:q,current:mileageUsed}); setMileageInput(""); }}
                            className="text-xs text-blue-500 hover:underline">
                            {mileageUsed > 0 ? `${fw(mileageUsed)} 사용됨` : "사용 처리"}
                          </button>
                        ) : <span className="text-slate-300">-</span>}
                      </td>

                      {/* 지급여부 */}
                      <td className="px-3 py-2.5">
                        {p?.is_paid
                          ? <div className="flex items-center gap-1">
                              <CheckCircle size={13} className="text-emerald-500"/>
                              <span className="text-xs text-emerald-600 font-medium">
                                {p.paid_date ? new Date(p.paid_date).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric"}) : "완료"}
                              </span>
                            </div>
                          : r.accumulated > 0
                          ? <div className="flex items-center gap-1">
                              <AlertCircle size={13} className="text-amber-400"/>
                              <span className="text-xs text-amber-600 font-medium">미지급</span>
                            </div>
                          : <span className="text-xs text-slate-300">-</span>}
                      </td>

                      {/* 액션 */}
                      <td className="px-3 py-2.5">
                        {!p?.is_paid && r.net_pay > 0 && (
                          <button onClick={()=>handlePayment(contact, q, r.net_pay)}
                            className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-100 font-medium whitespace-nowrap">
                            지급처리
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredContacts.length === 0 && (
                  <tr><td colSpan={16} className="text-center py-12 text-slate-300 text-sm">분양회 회원이 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
