"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, AlertCircle } from "lucide-react";

// ── 타입 ──────────────────────────────────────────────────
interface VipContact {
  id: number;
  name: string;
  title: string | null;
  bunyanghoe_number: string | null;
  assigned_to: string;
  consultant: string | null;
  meeting_result: string;
}
interface RewardRow {
  id: number;
  contact_id: number | null;
  member_number: string;
  member_name: string;
  quarter: string;
  hightarget_mileage: number;
  hightarget_reward: number;
  hogaengnono_reward: number;
  lms_reward: number;
  accumulated_reward: number;
  payment_due_month: string | null;
  income_tax: number;
  remaining_reward: number;
  mileage_used: number;
  is_paid: boolean;
  paid_date: string | null;
}

// ── 유틸 ──────────────────────────────────────────────────
function fw(n: number) {
  if (!n) return "-";
  return n.toLocaleString() + "원";
}

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}
function calcPaymentDueMonth(q: string): string {
  if (!q) return "";
  const [year, quarter] = q.split("-");
  const y = parseInt(year);
  return { Q1:`${y}-04`, Q2:`${y}-07`, Q3:`${y}-10`, Q4:`${y+1}-01` }[quarter] || "";
}
function getQuarters(): string[] {
  const y = new Date().getFullYear();
  return [`${y}-Q1`,`${y}-Q2`,`${y}-Q3`,`${y}-Q4`];
}

// ── 메인 ──────────────────────────────────────────────────
export default function RewardsPage() {
  const [contacts, setContacts]   = useState<VipContact[]>([]);
  const [rewards, setRewards]     = useState<RewardRow[]>([]);
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

    // 리워드 테이블
    let q = supabase.from("rewards").select("*");
    if (filterQuarter) q = q.eq("quarter", filterQuarter);
    if (filterPaid === "paid")   q = q.eq("is_paid", true);
    if (filterPaid === "unpaid") q = q.eq("is_paid", false);
    const { data: r } = await q;
    setRewards((r||[]) as RewardRow[]);
    setLoading(false);
  };

  // 분양회 회원 + 리워드 JOIN
  const rows = contacts.map(c => {
    const reward = rewards.find(r => r.contact_id === c.id || r.member_name === c.name);
    return { contact: c, reward: reward || null };
  }).filter(row => {
    if (filterPaid === "paid")   return row.reward?.is_paid === true;
    if (filterPaid === "unpaid") return row.reward?.is_paid === false;
    return true;
  });

  // 대시보드 집계
  const allRewards       = rewards;
  const totalAccum       = allRewards.reduce((s,r)=>s+(r.accumulated_reward||0),0);
  const totalMileage     = allRewards.reduce((s,r)=>s+(r.hightarget_mileage||0),0);
  const totalPaid        = allRewards.filter(r=>r.is_paid).reduce((s,r)=>s+(r.accumulated_reward||0),0);
  const totalUnpaid      = allRewards.filter(r=>!r.is_paid && r.quarter===currentQ)
                                     .reduce((s,r)=>s+(r.remaining_reward||0),0);

  // 지급 처리
  const handlePayment = async (rewardId: number, memberName: string, amount: number) => {
    if (!confirm(`${memberName}님의 리워드를 지급 처리하시겠습니까?\n지급액: ${fw(amount)}`)) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("rewards").update({ is_paid: true, paid_date: today, remaining_reward: 0 }).eq("id", rewardId);
    fetchAll();
  };

  // 리워드 등록 (없는 회원)
  const handleAddReward = async (contact: VipContact) => {
    const q = filterQuarter || currentQ;
    const { data: exist } = await supabase.from("rewards").select("id")
      .eq("contact_id", contact.id).eq("quarter", q).single();
    if (exist) return alert("이미 해당 분기 리워드가 등록되어 있습니다.");
    const due = calcPaymentDueMonth(q);
    await supabase.from("rewards").insert({
      contact_id: contact.id,
      member_number: contact.bunyanghoe_number || "",
      member_name: contact.name,
      quarter: q,
      hightarget_mileage: 0, hightarget_reward: 0,
      hogaengnono_reward: 0, lms_reward: 0,
      accumulated_reward: 0, income_tax: 0,
      remaining_reward: 0, mileage_used: 0,
      payment_due_month: due, is_paid: false,
    });
    fetchAll();
  };

  // 리워드 수동 수정
  const [editId, setEditId]   = useState<number|null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const openEdit = (r: RewardRow) => {
    setEditId(r.id);
    setEditForm({
      hightarget_mileage: r.hightarget_mileage,
      hightarget_reward:  r.hightarget_reward,
      hogaengnono_reward: r.hogaengnono_reward,
      lms_reward:         r.lms_reward,
      mileage_used:       r.mileage_used,
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const accum = (Number(editForm.hightarget_reward)||0)
                + (Number(editForm.hogaengnono_reward)||0)
                + (Number(editForm.lms_reward)||0);
    const tax  = Math.floor(accum * 0.033);
    await supabase.from("rewards").update({
      ...editForm,
      hightarget_mileage: Number(editForm.hightarget_mileage)||0,
      hightarget_reward:  Number(editForm.hightarget_reward)||0,
      hogaengnono_reward: Number(editForm.hogaengnono_reward)||0,
      lms_reward:         Number(editForm.lms_reward)||0,
      mileage_used:       Number(editForm.mileage_used)||0,
      accumulated_reward: accum,
      income_tax: tax,
      remaining_reward: accum - tax,
    }).eq("id", editId);
    setEditId(null);
    fetchAll();
  };

  const inp = "w-full px-2 py-1 text-xs bg-white border border-blue-200 rounded focus:outline-none focus:border-blue-400";

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

        {/* 대시보드 카드 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label:"누적 리워드 합계",     value:fw(totalAccum),   color:"text-slate-800", bg:"bg-slate-50" },
            { label:"하이타겟 마일리지",    value:fw(totalMileage), color:"text-blue-600",  bg:"bg-blue-50" },
            { label:"지급 완료",           value:fw(totalPaid),    color:"text-emerald-600",bg:"bg-emerald-50" },
            { label:`지급 예정 (${currentQ})`, value:fw(totalUnpaid), color:"text-amber-600", bg:"bg-amber-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-4 py-3 border border-slate-100`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-base font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div className="flex gap-2">
          <select value={filterQuarter} onChange={e=>setFilterQuarter(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 분기</option>
            {quarters.map(q=><option key={q} value={q}>{q}</option>)}
          </select>
          <select value={filterPaid} onChange={e=>setFilterPaid(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
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
                {rows.map(({ contact, reward }) => {
                  const isEditing = editId === reward?.id;
                  const accum    = reward?.accumulated_reward || 0;
                  const tax      = reward?.income_tax || Math.floor(accum * 0.033);
                  const netPay   = reward?.remaining_reward || (accum - tax);
                  const due      = reward?.payment_due_month || (filterQuarter ? calcPaymentDueMonth(filterQuarter) : "");

                  return (
                    <tr key={contact.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                          {contact.bunyanghoe_number || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800 text-xs whitespace-nowrap">{contact.name}</td>
                      <td className="px-3 py-2.5">
                        {reward
                          ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{reward.quarter}</span>
                          : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{contact.assigned_to||"-"}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{contact.consultant||"-"}</td>

                      {/* 하이타겟 마일리지 */}
                      <td className="px-3 py-2.5 text-xs text-blue-600 font-medium">
                        {isEditing
                          ? <input className={inp} type="number" value={editForm.hightarget_mileage} onChange={e=>setEditForm({...editForm,hightarget_mileage:e.target.value})}/>
                          : fw(reward?.hightarget_mileage||0)}
                      </td>
                      {/* 하이타겟 리워드 */}
                      <td className="px-3 py-2.5 text-xs text-amber-600 font-medium">
                        {isEditing
                          ? <input className={inp} type="number" value={editForm.hightarget_reward} onChange={e=>setEditForm({...editForm,hightarget_reward:e.target.value})}/>
                          : fw(reward?.hightarget_reward||0)}
                      </td>
                      {/* 호갱노노 리워드 */}
                      <td className="px-3 py-2.5 text-xs text-amber-600 font-medium">
                        {isEditing
                          ? <input className={inp} type="number" value={editForm.hogaengnono_reward} onChange={e=>setEditForm({...editForm,hogaengnono_reward:e.target.value})}/>
                          : fw(reward?.hogaengnono_reward||0)}
                      </td>
                      {/* LMS 리워드 */}
                      <td className="px-3 py-2.5 text-xs text-purple-600 font-medium">
                        {isEditing
                          ? <input className={inp} type="number" value={editForm.lms_reward} onChange={e=>setEditForm({...editForm,lms_reward:e.target.value})}/>
                          : fw(reward?.lms_reward||0)}
                      </td>

                      <td className="px-3 py-2.5">
                        <span className="font-bold text-amber-600 text-xs">{fw(accum)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {due ? `${due} 15일` : "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-red-500 font-medium">{accum ? `-${fw(tax)}` : "-"}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-bold ${reward?.is_paid ? "text-slate-400 line-through" : "text-emerald-600"}`}>
                          {reward?.is_paid ? "지급완료" : fw(netPay)}
                        </span>
                      </td>
                      {/* 마일리지사용 */}
                      <td className="px-3 py-2.5 text-xs">
                        {isEditing
                          ? <input className={inp} type="number" value={editForm.mileage_used} onChange={e=>setEditForm({...editForm,mileage_used:e.target.value})}/>
                          : reward?.mileage_used ? <span className="text-blue-500 font-medium">{fw(reward.mileage_used)}</span> : <span className="text-slate-300">-</span>}
                      </td>
                      {/* 지급여부 */}
                      <td className="px-3 py-2.5">
                        {!reward
                          ? <span className="text-xs text-slate-300">-</span>
                          : reward.is_paid
                          ? <div className="flex items-center gap-1">
                              <CheckCircle size={13} className="text-emerald-500"/>
                              <span className="text-xs text-emerald-600 font-medium">
                                {reward.paid_date ? new Date(reward.paid_date).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric"}) : "완료"}
                              </span>
                            </div>
                          : <div className="flex items-center gap-1">
                              <AlertCircle size={13} className="text-amber-400"/>
                              <span className="text-xs text-amber-600 font-medium">미지급</span>
                            </div>}
                      </td>
                      {/* 액션 */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          {!reward && (
                            <button onClick={()=>handleAddReward(contact)}
                              className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-200 hover:bg-slate-100">
                              등록
                            </button>
                          )}
                          {reward && !reward.is_paid && !isEditing && (
                            <>
                              <button onClick={()=>openEdit(reward)}
                                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100">
                                수정
                              </button>
                              <button onClick={()=>handlePayment(reward.id, contact.name, netPay)}
                                className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-100 font-medium">
                                지급처리
                              </button>
                            </>
                          )}
                          {isEditing && (
                            <>
                              <button onClick={saveEdit}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">
                                저장
                              </button>
                              <button onClick={()=>setEditId(null)}
                                className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded hover:bg-slate-200">
                                취소
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
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
