"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { CreditCard, Plus, Save, X, TrendingUp, Search } from "lucide-react";

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

interface VipMember {
  id: number;
  name: string;
  title: string | null;
  assigned_to: string;
  consultant: string | null;
  bunyanghoe_number: string | null;
  meeting_result: string;
}

const CHANNELS = ["하이타겟", "호갱노노_채널톡", "호갱노노_단지마커", "호갱노노_기타", "LMS"];
const TEAM = ["조계현", "이세호", "기여운", "최연전"];

const EMPTY_FORM = {
  sales_type: "",         // 매출구분: 분양회 | 완판트럭
  vip_member_id: "",      // 분양회 선택 시 분양회 입회자 ID
  member_name: "",
  position: "",
  bunyanghoe_number: "",
  execution_amount: "",
  channel: "",
  payment_date: "",
  team_member: "",
  consultant: "",
  hightarget_reward_type: "",
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

// 집행금액 천단위 콤마 포맷
function formatAmountInput(val: string) {
  const num = val.replace(/[^0-9]/g, "");
  if (!num) return "";
  return Number(num).toLocaleString();
}

export default function SalesPage() {
  const [executions, setExecutions] = useState<AdExecution[]>([]);
  const [vipMembers, setVipMembers] = useState<VipMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [vipSearch, setVipSearch] = useState("");

  useEffect(() => { fetchExecutions(); }, [filterChannel, filterMember]);
  useEffect(() => { fetchVipMembers(); }, []);

  const fetchExecutions = async () => {
    setLoading(true);
    let query = supabase.from("ad_executions").select("*").order("payment_date", { ascending: false, nullsFirst: false });
    if (filterChannel) query = query.eq("channel", filterChannel);
    if (filterMember) query = query.eq("team_member", filterMember);
    const { data } = await query;
    setExecutions((data as AdExecution[]) || []);
    setLoading(false);
  };

  const fetchVipMembers = async () => {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, title, assigned_to, consultant, bunyanghoe_number, meeting_result")
      .in("meeting_result", ["계약완료", "예약완료"])
      .order("bunyanghoe_number", { ascending: true });
    setVipMembers((data as VipMember[]) || []);
  };

  // 분양회 목록 검색 필터
  const filteredVip = useMemo(() => {
    if (!vipSearch.trim()) return vipMembers;
    return vipMembers.filter(v => v.name.includes(vipSearch.trim()));
  }, [vipMembers, vipSearch]);

  const totalAmount  = executions.reduce((s, e) => s + (e.execution_amount || 0), 0);
  const totalReward  = executions.reduce((s, e) => s + e.hightarget_reward + e.hogaengnono_reward + e.lms_reward, 0);
  const totalMileage = executions.reduce((s, e) => s + e.hightarget_mileage, 0);

  // 분양회 입회자 선택 시 자동 입력
  const handleVipSelect = (memberId: string) => {
    const member = vipMembers.find(v => String(v.id) === memberId);
    if (!member) { setForm({ ...form, vip_member_id: "" }); return; }
    setForm({
      ...form,
      vip_member_id:      memberId,
      member_name:        member.name,
      position:           member.title || "",
      bunyanghoe_number:  member.bunyanghoe_number || "",
      team_member:        member.assigned_to || "",
      consultant:         member.consultant || "",
    });
  };

  const handleSave = async () => {
    if (!form.sales_type)          return alert("매출구분을 선택해주세요.");
    if (!form.member_name)         return alert("고객명을 입력해주세요.");
    if (!form.channel)             return alert("광고채널을 선택해주세요.");
    if (!form.execution_amount)    return alert("집행금액을 입력해주세요.");

    setSaving(true);
    const amount = Number(form.execution_amount.replace(/,/g, "")) || 0;
    const rewards = calcRewards(form.channel, amount, form.hightarget_reward_type);
    await supabase.from("ad_executions").insert({
      member_name:     form.member_name,
      position:        form.position || null,
      execution_amount: amount,
      channel:         form.channel,
      contract_route:  form.sales_type,   // 매출구분 → contract_route에 저장
      payment_date:    form.payment_date || null,
      team_member:     form.team_member || null,
      consultant:      form.consultant || null,
      hightarget_reward_type: form.hightarget_reward_type || null,
      ...rewards,
    });
    setSaving(false);
    setShowModal(false);
    setForm(EMPTY_FORM);
    setVipSearch("");
    fetchExecutions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("ad_executions").delete().eq("id", id);
    fetchExecutions();
  };

  const previewRewards = form.channel && form.execution_amount
    ? calcRewards(form.channel, Number(form.execution_amount.replace(/,/g, "")) || 0, form.hightarget_reward_type)
    : null;

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";

  const isBunyanghoe = form.sales_type === "분양회";
  const isWanpan     = form.sales_type === "완판트럭";

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-500"/>
              통합매출관리
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">광고 집행 내역 및 리워드 현황</p>
          </div>
          <button
            onClick={() => { setForm(EMPTY_FORM); setVipSearch(""); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 shadow-sm"
          >
            <Plus size={14}/>매출 등록
          </button>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label:"총 집행금액",    value:formatWon(totalAmount),  color:"text-slate-800", bg:"bg-slate-50" },
            { label:"총 리워드 발생",  value:formatWon(totalReward),  color:"text-amber-600", bg:"bg-amber-50" },
            { label:"총 마일리지 적립", value:formatWon(totalMileage), color:"text-blue-600",  bg:"bg-blue-50" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl px-4 py-3 border border-slate-100`}>
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* 필터 */}
        <div className="flex gap-2">
          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 채널</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 담당자</option>
            {TEAM.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <TrendingUp size={40} className="mb-3 opacity-30"/>
            <p className="text-sm">집행 내역이 없습니다</p>
            <button onClick={() => setShowModal(true)} className="mt-2 text-xs text-blue-600 underline">첫 번째 매출 등록하기</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["매출구분","고객명","직급","집행금액","광고채널","결제일","대협팀담당","담당컨설턴트","하이타겟마일리지","하이타겟리워드","호갱노노리워드","LMS리워드",""].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {executions.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${
                        e.contract_route === "분양회"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : e.contract_route === "완판트럭"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-slate-50 text-slate-500 border-slate-100"
                      }`}>{e.contract_route || "-"}</span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 text-xs">{e.member_name}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{e.position || "-"}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800 text-xs">{formatWon(e.execution_amount)}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{e.channel}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">
                      {e.payment_date ? new Date(e.payment_date).toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"}) : "-"}
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

      {/* 매출집행등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">매출집행등록</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">

              {/* ① 매출구분 */}
              <div>
                <label className={lbl}>매출구분 *</label>
                <div className="flex gap-2">
                  {["분양회","완판트럭"].map(t => (
                    <button key={t}
                      onClick={() => setForm({ ...EMPTY_FORM, sales_type: t })}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-all ${
                        form.sales_type === t
                          ? t === "분양회"
                            ? "bg-amber-50 border-amber-400 text-amber-700"
                            : "bg-emerald-50 border-emerald-400 text-emerald-700"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              {/* ② 분양회 선택 시 */}
              {isBunyanghoe && (
                <>
                  {/* 분양회 입회자 검색 + 선택 */}
                  <div>
                    <label className={lbl}>분양회 입회자 선택 *</label>
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input
                        className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                        placeholder="이름으로 검색..."
                        value={vipSearch}
                        onChange={e => setVipSearch(e.target.value)}
                      />
                    </div>
                    <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto bg-slate-50">
                      {filteredVip.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">검색 결과 없음</div>
                      ) : filteredVip.map(v => (
                        <button key={v.id}
                          onClick={() => { handleVipSelect(String(v.id)); setVipSearch(""); }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors ${
                            form.vip_member_id === String(v.id) ? "bg-blue-50" : ""
                          }`}
                        >
                          <span className="text-xs font-bold text-amber-600 min-w-[48px]">{v.bunyanghoe_number || "미부여"}</span>
                          <span className="font-semibold text-slate-800">{v.name}</span>
                          <span className="text-xs text-slate-400">{v.title || ""}</span>
                          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                            v.meeting_result === "계약완료" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                          }`}>{v.meeting_result}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 자동 입력된 정보 표시 */}
                  {form.vip_member_id && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">선택된 분양회 회원</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-slate-400">넘버링</span><p className="font-bold text-amber-600">{form.bunyanghoe_number || "-"}</p></div>
                        <div><span className="text-slate-400">고객명</span><p className="font-bold text-slate-800">{form.member_name}</p></div>
                        <div><span className="text-slate-400">직급</span><p className="font-bold text-slate-800">{form.position || "-"}</p></div>
                        <div><span className="text-slate-400">대협팀 담당자</span><p className="font-bold text-slate-800">{form.team_member || "-"}</p></div>
                        <div><span className="text-slate-400">담당 컨설턴트</span><p className="font-bold text-slate-800">{form.consultant || "-"}</p></div>
                      </div>
                    </div>
                  )}

                  {/* 집행금액 + 광고채널 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>집행금액 *</label>
                      <input
                        className={inp}
                        value={form.execution_amount}
                        onChange={e => setForm({ ...form, execution_amount: formatAmountInput(e.target.value) })}
                        placeholder="5,000,000"
                      />
                    </div>
                    <div>
                      <label className={lbl}>광고채널 *</label>
                      <select className={inp} value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value, hightarget_reward_type:"" })}>
                        <option value="">선택</option>
                        {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {form.channel === "하이타겟" && (
                      <div>
                        <label className={lbl}>마일리지/리워드</label>
                        <select className={inp} value={form.hightarget_reward_type} onChange={e => setForm({ ...form, hightarget_reward_type: e.target.value })}>
                          <option value="">선택</option>
                          <option value="마일리지10%">마일리지 10%</option>
                          <option value="리워드5%">리워드 5%</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={lbl}>결제일</label>
                      <input type="date" className={inp} value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })}/>
                    </div>
                  </div>
                </>
              )}

              {/* ③ 완판트럭 선택 시 */}
              {isWanpan && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>고객명 *</label>
                    <input className={inp} value={form.member_name} onChange={e => setForm({ ...form, member_name: e.target.value })} placeholder="홍길동"/>
                  </div>
                  <div>
                    <label className={lbl}>직급</label>
                    <input className={inp} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="본부장"/>
                  </div>
                  <div>
                    <label className={lbl}>집행금액 *</label>
                    <input
                      className={inp}
                      value={form.execution_amount}
                      onChange={e => setForm({ ...form, execution_amount: formatAmountInput(e.target.value) })}
                      placeholder="5,000,000"
                    />
                  </div>
                  <div>
                    <label className={lbl}>광고채널 *</label>
                    <select className={inp} value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value, hightarget_reward_type:"" })}>
                      <option value="">선택</option>
                      {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {form.channel === "하이타겟" && (
                    <div>
                      <label className={lbl}>마일리지/리워드</label>
                      <select className={inp} value={form.hightarget_reward_type} onChange={e => setForm({ ...form, hightarget_reward_type: e.target.value })}>
                        <option value="">선택</option>
                        <option value="마일리지10%">마일리지 10%</option>
                        <option value="리워드5%">리워드 5%</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={lbl}>결제일</label>
                    <input type="date" className={inp} value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })}/>
                  </div>
                  <div>
                    <label className={lbl}>대협팀 담당자</label>
                    <select className={inp} value={form.team_member} onChange={e => setForm({ ...form, team_member: e.target.value })}>
                      <option value="">선택</option>
                      {TEAM.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>담당 컨설턴트</label>
                    <input className={inp} value={form.consultant} onChange={e => setForm({ ...form, consultant: e.target.value })} placeholder="컨설턴트명"/>
                  </div>
                </div>
              )}

              {/* 리워드 미리보기 */}
              {previewRewards && (form.sales_type) && (
                Object.values(previewRewards).some(v => v > 0) && (
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 mb-2">자동 계산 리워드</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      {previewRewards.hightarget_mileage > 0 && <div className="flex justify-between"><span>하이타겟 마일리지</span><span className="font-bold text-blue-600">{formatWon(previewRewards.hightarget_mileage)}</span></div>}
                      {previewRewards.hightarget_reward  > 0 && <div className="flex justify-between"><span>하이타겟 리워드</span><span className="font-bold text-amber-600">{formatWon(previewRewards.hightarget_reward)}</span></div>}
                      {previewRewards.hogaengnono_reward > 0 && <div className="flex justify-between"><span>호갱노노 리워드</span><span className="font-bold text-amber-600">{formatWon(previewRewards.hogaengnono_reward)}</span></div>}
                      {previewRewards.lms_reward         > 0 && <div className="flex justify-between"><span>LMS 리워드</span><span className="font-bold text-amber-600">{formatWon(previewRewards.lms_reward)}</span></div>}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleSave} disabled={saving || !form.sales_type}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40">
                <Save size={13}/>{saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
