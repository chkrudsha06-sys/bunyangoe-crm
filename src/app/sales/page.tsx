"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CreditCard, Plus, Save, X, TrendingUp } from "lucide-react";

interface AdExecution {
  id: number;
  member_name: string;
  position: string | null;
  execution_amount: number;
  channel: string;
  contract_route: string | null;
  payment_date: string | null;
  team_member: string | null;
  consultant: string | null;
  hightarget_reward_type: string | null;
  hightarget_mileage: number;
  hightarget_reward: number;
  hogaengnono_reward: number;
  lms_reward: number;
  created_at: string;
}

const CHANNELS = ["하이타겟", "호갱노노_채널톡", "호갱노노_단지마커", "호갱노노_기타", "LMS"];
const ROUTES = ["분양회", "완판트럭"];
const TEAM = ["조계현", "이세호", "기여운", "최연전"];
const EMPTY_FORM = {
  member_name: "", position: "", execution_amount: "",
  channel: "", contract_route: "", payment_date: "",
  team_member: "", consultant: "", hightarget_reward_type: "",
};

function calcRewards(channel: string, amount: number, rewardType: string) {
  let hightarget_mileage = 0, hightarget_reward = 0, hogaengnono_reward = 0, lms_reward = 0;
  if (channel === "하이타겟") {
    if (rewardType === "마일리지10%") hightarget_mileage = Math.floor(amount * 0.1);
    else if (rewardType === "리워드5%") hightarget_reward = Math.floor(amount * 0.05);
  } else if (channel.startsWith("호갱노노")) {
    hogaengnono_reward = Math.floor(amount * 0.05);
  } else if (channel === "LMS") {
    lms_reward = Math.floor(amount * 0.15);
  }
  return { hightarget_mileage, hightarget_reward, hogaengnono_reward, lms_reward };
}

function formatWon(n: number) {
  if (!n) return "-";
  return n >= 10000 ? `${Math.floor(n / 10000)}만원` : `${n.toLocaleString()}원`;
}

export default function SalesPage() {
  const [executions, setExecutions] = useState<AdExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterMember, setFilterMember] = useState("");

  useEffect(() => { fetchExecutions(); }, [filterChannel, filterMember]);

  const fetchExecutions = async () => {
    setLoading(true);
    let query = supabase.from("ad_executions").select("*").order("payment_date", { ascending: false, nullsFirst: false });
    if (filterChannel) query = query.eq("channel", filterChannel);
    if (filterMember) query = query.eq("team_member", filterMember);
    const { data } = await query;
    setExecutions((data as AdExecution[]) || []);
    setLoading(false);
  };

  const totalAmount = executions.reduce((s, e) => s + (e.execution_amount || 0), 0);
  const totalReward = executions.reduce((s, e) => s + e.hightarget_reward + e.hogaengnono_reward + e.lms_reward, 0);
  const totalMileage = executions.reduce((s, e) => s + e.hightarget_mileage, 0);

  const handleSave = async () => {
    if (!form.member_name || !form.channel || !form.execution_amount) return alert("고객명, 채널, 집행금액은 필수입니다.");
    setSaving(true);
    const amount = Number(form.execution_amount) || 0;
    const rewards = calcRewards(form.channel, amount, form.hightarget_reward_type);
    await supabase.from("ad_executions").insert({
      ...form,
      execution_amount: amount,
      ...rewards,
    });
    setSaving(false);
    setShowModal(false);
    setForm(EMPTY_FORM);
    fetchExecutions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("ad_executions").delete().eq("id", id);
    fetchExecutions();
  };

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";

  // 실시간 리워드 미리보기
  const previewRewards = form.channel && form.execution_amount
    ? calcRewards(form.channel, Number(form.execution_amount) || 0, form.hightarget_reward_type)
    : null;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-500" />
              통합매출관리
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">광고 집행 내역 및 리워드 현황</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 shadow-sm">
            <Plus size={14} />집행 등록
          </button>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: "총 집행금액", value: formatWon(totalAmount), color: "text-slate-800", bg: "bg-slate-50" },
            { label: "총 리워드 발생", value: formatWon(totalReward), color: "text-amber-600", bg: "bg-amber-50" },
            { label: "총 마일리지 적립", value: formatWon(totalMileage), color: "text-blue-600", bg: "bg-blue-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-4 py-3 border border-slate-100`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div className="flex gap-2">
          <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 채널</option>
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 담당자</option>
            {TEAM.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <TrendingUp size={40} className="mb-3 opacity-30" />
            <p className="text-sm">집행 내역이 없습니다</p>
            <button onClick={() => setShowModal(true)} className="mt-2 text-xs text-blue-600 underline">첫 번째 집행 등록하기</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["고객명", "직급", "집행금액", "광고채널", "계약경로", "결제일", "대협팀담당", "담당컨설턴트", "하이타겟마일리지", "하이타겟리워드", "호갱노노리워드", "LMS리워드", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {executions.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-semibold text-slate-800 text-xs">{e.member_name}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{e.position || "-"}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800 text-xs">{formatWon(e.execution_amount)}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{e.channel}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${e.contract_route === "분양회" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-600 border-slate-100"}`}>
                        {e.contract_route || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">
                      {e.payment_date ? new Date(e.payment_date).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">{e.team_member || "-"}</span></td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{e.consultant || "-"}</td>
                    <td className="px-3 py-2.5 text-blue-600 font-medium text-xs">{e.hightarget_mileage ? formatWon(e.hightarget_mileage) : "-"}</td>
                    <td className="px-3 py-2.5 text-amber-600 font-medium text-xs">{e.hightarget_reward ? formatWon(e.hightarget_reward) : "-"}</td>
                    <td className="px-3 py-2.5 text-amber-600 font-medium text-xs">{e.hogaengnono_reward ? formatWon(e.hogaengnono_reward) : "-"}</td>
                    <td className="px-3 py-2.5 text-amber-600 font-medium text-xs">{e.lms_reward ? formatWon(e.lms_reward) : "-"}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => handleDelete(e.id)} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">광고 집행 등록</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>고객명 *</label><input className={inp} value={form.member_name} onChange={(e) => setForm({ ...form, member_name: e.target.value })} placeholder="홍길동 본부장" /></div>
                <div><label className={lbl}>직급</label><input className={inp} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="본부장" /></div>
                <div><label className={lbl}>집행금액 *</label><input type="number" className={inp} value={form.execution_amount} onChange={(e) => setForm({ ...form, execution_amount: e.target.value })} placeholder="원" /></div>
                <div><label className={lbl}>광고채널 *</label>
                  <select className={inp} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    <option value="">선택</option>{CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {form.channel === "하이타겟" && (
                  <div><label className={lbl}>마일리지/리워드 선택</label>
                    <select className={inp} value={form.hightarget_reward_type} onChange={(e) => setForm({ ...form, hightarget_reward_type: e.target.value })}>
                      <option value="">선택</option>
                      <option value="마일리지10%">마일리지 10%</option>
                      <option value="리워드5%">리워드 5%</option>
                    </select>
                  </div>
                )}
                <div><label className={lbl}>계약경로</label>
                  <select className={inp} value={form.contract_route} onChange={(e) => setForm({ ...form, contract_route: e.target.value })}>
                    <option value="">선택</option>{ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>결제일</label><input type="date" className={inp} value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
                <div><label className={lbl}>대협팀 담당자</label>
                  <select className={inp} value={form.team_member} onChange={(e) => setForm({ ...form, team_member: e.target.value })}>
                    <option value="">선택</option>{TEAM.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>담당 컨설턴트</label><input className={inp} value={form.consultant} onChange={(e) => setForm({ ...form, consultant: e.target.value })} /></div>
              </div>

              {/* 리워드 미리보기 */}
              {previewRewards && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-2">자동 계산 리워드</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    {previewRewards.hightarget_mileage > 0 && <div className="flex justify-between"><span>하이타겟 마일리지</span><span className="font-bold text-blue-600">{formatWon(previewRewards.hightarget_mileage)}</span></div>}
                    {previewRewards.hightarget_reward > 0 && <div className="flex justify-between"><span>하이타겟 리워드</span><span className="font-bold text-amber-600">{formatWon(previewRewards.hightarget_reward)}</span></div>}
                    {previewRewards.hogaengnono_reward > 0 && <div className="flex justify-between"><span>호갱노노 리워드</span><span className="font-bold text-amber-600">{formatWon(previewRewards.hogaengnono_reward)}</span></div>}
                    {previewRewards.lms_reward > 0 && <div className="flex justify-between"><span>LMS 리워드</span><span className="font-bold text-amber-600">{formatWon(previewRewards.lms_reward)}</span></div>}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50">
                <Save size={13} />{saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
