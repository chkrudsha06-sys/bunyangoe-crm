"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Save, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";

interface RewardRow {
  id: number;
  member_number: string;
  member_name: string;
  quarter: string;
  hogaengnono_reward: number;
  lms_reward: number;
  hightarget_reward: number;
  hightarget_mileage: number;
  accumulated_reward: number;
  payment_due_month: string | null;
  income_tax: number;
  is_paid: boolean;
  paid_date: string | null;
  remaining_reward: number;
  mileage_used: number;
  mileage_use_date: string | null;
}

function formatWon(n: number) {
  if (!n) return "-";
  if (n >= 10000) return `${Math.floor(n / 10000)}만${n % 10000 > 0 ? ` ${n % 10000}` : ""}원`;
  return `${n.toLocaleString()}원`;
}

function getQuarterLabel(q: string) {
  const map: Record<string, string> = {
    "Q1": "1분기 (1~3월)", "Q2": "2분기 (4~6월)",
    "Q3": "3분기 (7~9월)", "Q4": "4분기 (10~12월)",
  };
  const [year, quarter] = q.split("-");
  return `${year}년 ${map[quarter] || quarter}`;
}

// 분기 → 지급예정월 계산
function calcPaymentDueMonth(quarter: string): string {
  const [year, q] = quarter.split("-");
  const y = parseInt(year);
  const qMap: Record<string, string> = {
    "Q1": `${y}-04`, "Q2": `${y}-07`,
    "Q3": `${y}-10`, "Q4": `${y + 1}-01`,
  };
  return qMap[q] || "";
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuarter, setFilterQuarter] = useState("");
  const [filterPaid, setFilterPaid] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const quarters = [
    `${currentYear}-Q1`, `${currentYear}-Q2`,
    `${currentYear}-Q3`, `${currentYear}-Q4`,
  ];

  useEffect(() => { fetchRewards(); }, [filterQuarter, filterPaid]);

  const fetchRewards = async () => {
    setLoading(true);
    let q = supabase.from("rewards").select("*").order("member_number");
    if (filterQuarter) q = q.eq("quarter", filterQuarter);
    if (filterPaid === "paid") q = q.eq("is_paid", true);
    if (filterPaid === "unpaid") q = q.eq("is_paid", false);
    const { data } = await q;
    setRewards((data as RewardRow[]) || []);
    setLoading(false);
  };

  const handlePayment = async (row: RewardRow) => {
    const confirmed = confirm(`${row.member_name}님의 리워드를 지급 처리하시겠습니까?\n지급액: ${formatWon(row.accumulated_reward - row.income_tax)}`);
    if (!confirmed) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("rewards").update({
      is_paid: true,
      paid_date: today,
      remaining_reward: 0,
    }).eq("id", row.id);
    fetchRewards();
  };

  const handleMileageUse = async (row: RewardRow) => {
    const amount = prompt(`하이타겟 마일리지 사용 금액을 입력하세요.\n현재 잔여: ${formatWon(row.hightarget_mileage - row.mileage_used)}`);
    if (!amount || isNaN(Number(amount))) return;
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("rewards").update({
      mileage_used: row.mileage_used + Number(amount),
      mileage_use_date: today,
    }).eq("id", row.id);
    fetchRewards();
  };

  // 합계 계산
  const totalAccumulated = rewards.reduce((s, r) => s + r.accumulated_reward, 0);
  const totalPaid = rewards.filter((r) => r.is_paid).reduce((s, r) => s + r.accumulated_reward, 0);
  const totalUnpaid = rewards.filter((r) => !r.is_paid).reduce((s, r) => s + r.remaining_reward, 0);

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      {/* 헤더 */}
      <div className="page-header bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title text-lg font-bold text-slate-800">리워드 관리</h1>
            <p className="page-subtitle text-xs text-slate-500 mt-0.5">분양회 입회대상자별 리워드 현황 및 지급 관리</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-[#1e40af] transition-colors shadow-sm"
          >
            <Plus size={14} />
            리워드 추가
          </button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "누적 리워드 합계", value: formatWon(totalAccumulated), color: "text-slate-800", bg: "bg-slate-50" },
            { label: "지급 완료", value: formatWon(totalPaid), color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "지급 예정", value: formatWon(totalUnpaid), color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-4 py-3 border border-slate-100`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2 mt-3">
          <select
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="text-sm px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="">전체 분기</option>
            {quarters.map((q) => <option key={q} value={q}>{getQuarterLabel(q)}</option>)}
          </select>
          <select
            value={filterPaid}
            onChange={(e) => setFilterPaid(e.target.value)}
            className="text-sm px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="">전체</option>
            <option value="unpaid">미지급</option>
            <option value="paid">지급완료</option>
          </select>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <BarChart3Icon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">리워드 데이터가 없습니다</p>
            <p className="text-xs mt-1">우측 상단 리워드 추가 버튼을 클릭하세요</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    "넘버링", "고객명", "분기", "호갱노노\n리워드(5%)", "LMS\n리워드(15%)",
                    "하이타겟\n리워드(5%)", "하이타겟\n마일리지(10%)", "누적리워드",
                    "지급예정월", "소득세(3.3%)", "잔여리워드", "마일리지사용",
                    "지급여부", "액션"
                  ].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-slate-500 text-xs font-semibold whitespace-pre-line">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rewards.map((row) => {
                  const remaining = row.accumulated_reward - row.income_tax - (row.is_paid ? row.accumulated_reward - row.income_tax : 0);
                  const mileageRemaining = row.hightarget_mileage - row.mileage_used;

                  return (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {row.member_number || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-slate-800 text-sm">{row.member_name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                          {row.quarter}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-slate-700">{row.hogaengnono_reward ? formatWon(row.hogaengnono_reward) : "-"}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-700">{row.lms_reward ? formatWon(row.lms_reward) : "-"}</td>
                      <td className="px-3 py-2.5 text-sm text-slate-700">{row.hightarget_reward ? formatWon(row.hightarget_reward) : "-"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700">{row.hightarget_mileage ? formatWon(row.hightarget_mileage) : "-"}</span>
                          {row.mileage_used > 0 && (
                            <span className="text-xs text-red-500">-{formatWon(row.mileage_used)} 사용</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-[#C9A84C]">{formatWon(row.accumulated_reward)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium text-slate-600">
                          {row.payment_due_month ? `${row.payment_due_month} 15일` : calcPaymentDueMonth(row.quarter) ? `${calcPaymentDueMonth(row.quarter)} 15일` : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-red-500">
                          -{formatWon(row.income_tax || Math.floor(row.accumulated_reward * 0.033))}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`font-semibold text-sm ${row.is_paid ? "text-slate-400 line-through" : "text-emerald-600"}`}>
                          {row.is_paid ? "지급완료" : formatWon(row.remaining_reward || (row.accumulated_reward - Math.floor(row.accumulated_reward * 0.033)))}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {mileageRemaining > 0 ? (
                          <button
                            onClick={() => handleMileageUse(row)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            {formatWon(mileageRemaining)} 잔여
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.is_paid ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle size={14} className="text-emerald-500" />
                            <span className="text-xs text-emerald-600 font-medium">
                              {row.paid_date ? new Date(row.paid_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "완료"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle size={14} className="text-amber-500" />
                            <span className="text-xs text-amber-600 font-medium">미지급</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {!row.is_paid && (
                          <button
                            onClick={() => handlePayment(row)}
                            className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors font-medium"
                          >
                            지급처리
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <AddRewardModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchRewards(); }}
          quarters={quarters}
        />
      )}
    </div>
  );
}

function BarChart3Icon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function AddRewardModal({ onClose, onSaved, quarters }: {
  onClose: () => void;
  onSaved: () => void;
  quarters: string[];
}) {
  const [form, setForm] = useState({
    member_number: "", member_name: "", quarter: quarters[1] || "",
    hogaengnono_reward: "", lms_reward: "",
    hightarget_reward: "", hightarget_mileage: "",
  });
  const [saving, setSaving] = useState(false);

  const accumulated =
    (Number(form.hogaengnono_reward) || 0) +
    (Number(form.lms_reward) || 0) +
    (Number(form.hightarget_reward) || 0);

  const income_tax = Math.floor(accumulated * 0.033);
  const payment_due_month = calcPaymentDueMonth(form.quarter);

  const handleSave = async () => {
    if (!form.member_name || !form.quarter) return alert("고객명과 분기를 입력하세요.");
    setSaving(true);
    await supabase.from("rewards").insert({
      ...form,
      hogaengnono_reward: Number(form.hogaengnono_reward) || 0,
      lms_reward: Number(form.lms_reward) || 0,
      hightarget_reward: Number(form.hightarget_reward) || 0,
      hightarget_mileage: Number(form.hightarget_mileage) || 0,
      accumulated_reward: accumulated,
      income_tax,
      payment_due_month,
      remaining_reward: accumulated - income_tax,
    });
    setSaving(false);
    onSaved();
  };

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">리워드 추가</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>분양회 넘버링</label>
              <input className={inp} value={form.member_number} onChange={(e) => setForm({ ...form, member_number: e.target.value })} placeholder="VIP-001" />
            </div>
            <div>
              <label className={lbl}>고객명 *</label>
              <input className={inp} value={form.member_name} onChange={(e) => setForm({ ...form, member_name: e.target.value })} placeholder="홍길동 본부장" />
            </div>
          </div>
          <div>
            <label className={lbl}>분기 *</label>
            <select className={inp} value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
              {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>호갱노노 리워드 (5%)</label>
              <input type="number" className={inp} value={form.hogaengnono_reward} onChange={(e) => setForm({ ...form, hogaengnono_reward: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>LMS 리워드 (15%)</label>
              <input type="number" className={inp} value={form.lms_reward} onChange={(e) => setForm({ ...form, lms_reward: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>하이타겟 리워드 (5%)</label>
              <input type="number" className={inp} value={form.hightarget_reward} onChange={(e) => setForm({ ...form, hightarget_reward: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>하이타겟 마일리지 (10%)</label>
              <input type="number" className={inp} value={form.hightarget_mileage} onChange={(e) => setForm({ ...form, hightarget_mileage: e.target.value })} placeholder="0" />
            </div>
          </div>

          {/* 자동 계산 미리보기 */}
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 mb-2">자동 계산</p>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>누적 리워드</span>
                <span className="font-bold text-amber-700">{formatWon(accumulated)}</span>
              </div>
              <div className="flex justify-between">
                <span>사업소득세 (3.3%)</span>
                <span className="text-red-500">-{formatWon(income_tax)}</span>
              </div>
              <div className="flex justify-between">
                <span>지급예정월</span>
                <span className="font-medium text-blue-700">{payment_due_month ? `${payment_due_month} 15일` : "-"}</span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                <span className="font-semibold">실지급 예정액</span>
                <span className="font-bold text-emerald-700">{formatWon(accumulated - income_tax)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-[#1e40af] disabled:opacity-50">
            <Save size={13} />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function calcPaymentDueMonth(quarter: string): string {
  if (!quarter) return "";
  const [year, q] = quarter.split("-");
  const y = parseInt(year);
  const map: Record<string, string> = {
    "Q1": `${y}-04`, "Q2": `${y}-07`,
    "Q3": `${y}-10`, "Q4": `${y + 1}-01`,
  };
  return map[q] || "";
}

function formatWon(n: number) {
  if (!n || n === 0) return "-";
  if (n >= 10000) return `${Math.floor(n / 10000)}만원`;
  return `${n.toLocaleString()}원`;
}
