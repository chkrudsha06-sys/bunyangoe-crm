"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { CreditCard, Plus, Save, X, TrendingUp, Search, Edit2 } from "lucide-react";

interface AdExecution {
  id: number;
  member_name: string;
  position: string | null;
  execution_amount: number;
  vat_amount: number | null;
  channel: string;
  contract_route: string | null;
  bunyanghoe_number: string | null;
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
  id: number; name: string; title: string | null;
  assigned_to: string; consultant: string | null;
  bunyanghoe_number: string | null; meeting_result: string;
}

// 분양회 전용 채널 포함
const CHANNELS_BUNYANGHOE = ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS","분양회 입회비","분양회 월회비"];
const CHANNELS_WANPAN     = ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];
const CHANNELS_DAEHYUP    = ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];
const TEAM = ["조계현","이세호","기여운","최연전"];

const EMPTY_FORM = {
  sales_type:"", vip_member_id:"",
  member_name:"", position:"", bunyanghoe_number:"",
  execution_amount:"", vat_yn:"여",  // 부가세 여/부
  channel:"", payment_date:"",
  team_member:"", consultant:"",
  hightarget_reward_type:"",
};

// ── 리워드 계산 (집행금액 기준) ──────────────────────────────
function calcRewards(channel: string, amount: number, rewardType: string) {
  let hightarget_mileage = 0, hightarget_reward = 0, hogaengnono_reward = 0, lms_reward = 0;
  if (channel === "하이타겟") {
    if (rewardType === "마일리지10%") hightarget_mileage = Math.floor(amount * 0.10);
    else if (rewardType === "리워드5%") hightarget_reward = Math.floor(amount * 0.05);
  } else if (channel === "호갱노노_채널톡") {
    // (집행금액 / 150) * 200 * 5%
    hogaengnono_reward = Math.floor((amount / 150) * 200 * 0.05);
  } else if (channel === "호갱노노_단지마커" || channel === "호갱노노_기타") {
    hogaengnono_reward = Math.floor(amount * 0.05);
  } else if (channel === "LMS") {
    lms_reward = Math.floor(amount * 0.15);
  }
  return { hightarget_mileage, hightarget_reward, hogaengnono_reward, lms_reward };
}

function fw(n: number) {
  if (!n) return "-";
  return n >= 10000 ? `${Math.floor(n/10000).toLocaleString()}만원` : `${n.toLocaleString()}원`;
}
function fwFull(n: number) {
  if (!n) return "-";
  return n.toLocaleString() + "원";
}

function parseAmount(s: string) { return Number(s.replace(/,/g,"")) || 0; }
function formatAmt(s: string) {
  const n = s.replace(/[^0-9]/g,"");
  return n ? Number(n).toLocaleString() : "";
}

export default function SalesPage() {
  const [executions, setExecutions]   = useState<AdExecution[]>([]);
  const [vipMembers, setVipMembers]   = useState<VipMember[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editId, setEditId]           = useState<number|null>(null);
  const [form, setForm]               = useState<any>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [filterChannel, setFilterChannel] = useState("");
  const [filterMember, setFilterMember]   = useState("");
  const [vipSearch, setVipSearch]         = useState("");

  useEffect(() => { fetchExecutions(); }, [filterChannel, filterMember]);
  useEffect(() => { fetchVipMembers(); }, []);

  const fetchExecutions = async () => {
    setLoading(true);
    let q = supabase.from("ad_executions").select("*").order("payment_date",{ascending:false,nullsFirst:false});
    if (filterChannel) q = q.eq("channel", filterChannel);
    if (filterMember)  q = q.eq("team_member", filterMember);
    const { data } = await q;
    setExecutions((data as AdExecution[]) || []);
    setLoading(false);
  };

  const fetchVipMembers = async () => {
    const { data } = await supabase.from("contacts")
      .select("id,name,title,assigned_to,consultant,bunyanghoe_number,meeting_result")
      .in("meeting_result",["계약완료","예약완료"])
      .order("bunyanghoe_number",{ascending:true});
    setVipMembers((data as VipMember[]) || []);
  };

  const filteredVip = useMemo(() => {
    const list = !vipSearch.trim()
      ? [...vipMembers]
      : vipMembers.filter(v => v.name.includes(vipSearch.trim()));
    return list.sort((a, b) => {
      const na = parseInt(a.bunyanghoe_number?.replace(/[^0-9]/g, "") || "9999");
      const nb = parseInt(b.bunyanghoe_number?.replace(/[^0-9]/g, "") || "9999");
      return na - nb;
    });
  }, [vipMembers, vipSearch]);

  // ── 대시보드 집계 ─────────────────────────────────────────
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
  const monthEnd   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${new Date(now.getFullYear(),now.getMonth()+1,0).getDate()}`;

  const monthly = executions.filter(e => e.payment_date && e.payment_date >= monthStart && e.payment_date <= monthEnd);
  const all     = executions;

  const calc = (list: AdExecution[]) => ({
    total:     list.reduce((s,e)=>s+(e.execution_amount||0), 0),
    inBunyan:  list.filter(e=>e.channel==="분양회 입회비").reduce((s,e)=>s+(e.execution_amount||0),0),
    monBunyan: list.filter(e=>e.channel==="분양회 월회비").reduce((s,e)=>s+(e.execution_amount||0),0),
    adSpecial: list.filter(e=>["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"].includes(e.channel)).reduce((s,e)=>s+(e.execution_amount||0),0),
    hightarget:list.filter(e=>e.channel==="하이타겟").reduce((s,e)=>s+(e.execution_amount||0),0),
  });

  const mon = calc(monthly);
  const cum = calc(all);

  // ── VAT 계산 ──────────────────────────────────────────────
  const rawAmount  = parseAmount(form.execution_amount);
  const vatAmount  = form.vat_yn === "여" ? Math.round(rawAmount * 1.1) : rawAmount;

  // 리워드 미리보기 (집행금액 기준)
  const previewRewards = form.channel && rawAmount > 0
    ? calcRewards(form.channel, rawAmount, form.hightarget_reward_type)
    : null;

  // ── 분양회 입회자 선택 ────────────────────────────────────
  const handleVipSelect = (memberId: string) => {
    const m = vipMembers.find(v => String(v.id) === memberId);
    if (!m) return;
    setForm((p:any) => ({
      ...p, vip_member_id: memberId,
      member_name: m.name, position: m.title||"",
      bunyanghoe_number: m.bunyanghoe_number||"",
      team_member: m.assigned_to||"", consultant: m.consultant||"",
    }));
    setVipSearch("");
  };

  // ── 저장 ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.sales_type)       return alert("매출구분을 선택해주세요.");
    if (!form.member_name)      return alert("고객명을 입력해주세요.");
    if (!form.channel)          return alert("광고채널을 선택해주세요.");
    if (!rawAmount)             return alert("집행금액을 입력해주세요.");
    setSaving(true);
    const rewards = calcRewards(form.channel, rawAmount, form.hightarget_reward_type);
    const payload = {
      member_name: form.member_name,
      position: form.position||null,
      execution_amount: rawAmount,
      vat_amount: vatAmount,
      channel: form.channel,
      contract_route: form.sales_type,
      bunyanghoe_number: form.bunyanghoe_number||null,
      payment_date: form.payment_date||null,
      team_member: form.team_member||null,
      consultant: form.consultant||null,
      hightarget_reward_type: form.hightarget_reward_type||null,
      ...rewards,
    };
    if (editId) {
      await supabase.from("ad_executions").update(payload).eq("id", editId);
    } else {
      await supabase.from("ad_executions").insert(payload);
    }
    setSaving(false);
    setShowModal(false); setEditId(null);
    setForm(EMPTY_FORM); setVipSearch("");
    fetchExecutions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("ad_executions").delete().eq("id", id);
    fetchExecutions();
  };

  const handleEdit = (e: AdExecution) => {
    setEditId(e.id);
    setForm({
      sales_type: e.contract_route||"",
      vip_member_id: "",
      member_name: e.member_name,
      position: e.position||"",
      bunyanghoe_number: e.bunyanghoe_number||"",
      execution_amount: e.execution_amount ? e.execution_amount.toLocaleString() : "",
      vat_yn: (e.vat_amount && e.vat_amount !== e.execution_amount) ? "여" : "부",
      channel: e.channel,
      payment_date: e.payment_date||"",
      team_member: e.team_member||"",
      consultant: e.consultant||"",
      hightarget_reward_type: e.hightarget_reward_type||"",
    });
    setShowModal(true);
  };

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";
  const isBunyanghoe = form.sales_type === "분양회";
  const isWanpan     = form.sales_type === "완판트럭";
  const isDaehyup    = form.sales_type === "대협팀활동";
  const channels     = isBunyanghoe ? CHANNELS_BUNYANGHOE : isDaehyup ? CHANNELS_DAEHYUP : CHANNELS_WANPAN;

  // 대시보드 카드 데이터
  const dashCols = [
    { label:"총 집행금액",    mVal:mon.total,     cVal:cum.total },
    { label:"분양회 입회비",  mVal:mon.inBunyan,  cVal:cum.inBunyan },
    { label:"분양회 월회비",  mVal:mon.monBunyan, cVal:cum.monBunyan },
    { label:"광고특전 집행매출", mVal:mon.adSpecial,cVal:cum.adSpecial },
    { label:"연계매출(하이타겟)",mVal:mon.hightarget,cVal:cum.hightarget },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* ── 헤더 ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={20} className="text-blue-500"/>통합매출관리
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">광고 집행 내역 및 리워드 현황</p>
          </div>
          <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setVipSearch(""); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 shadow-sm">
            <Plus size={14}/>매출 등록
          </button>
        </div>

        {/* ── 대시보드 ── */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"/>
            <span className="text-xs font-bold text-slate-600">당월 매출</span>
            <span className="text-xs text-slate-400">{now.getFullYear()}.{String(now.getMonth()+1).padStart(2,"0")}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {dashCols.map(({ label, mVal, cVal }) => (
              <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 flex flex-col">
                <p className="text-[10px] text-slate-400 mb-1.5 truncate font-medium">{label}</p>
                {/* 당월 */}
                <p className={`text-sm font-bold ${label.includes("총") ? "text-slate-800" : label.includes("하이타겟") ? "text-blue-600" : "text-amber-600"}`}>{fw(mVal)}</p>
                {/* 구분선 */}
                <div className="border-t border-dashed border-slate-200 my-2"/>
                {/* 누적 */}
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[9px] text-slate-400 font-semibold tracking-wider">누적</span>
                </div>
                <p className={`text-xs font-bold ${label.includes("총") ? "text-slate-500" : label.includes("하이타겟") ? "text-blue-400" : "text-amber-400"}`}>{fw(cVal)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 필터 */}
        <div className="flex gap-2">
          <select value={filterChannel} onChange={e=>setFilterChannel(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 채널</option>
            {CHANNELS_BUNYANGHOE.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterMember} onChange={e=>setFilterMember(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 담당자</option>
            {TEAM.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* ── 테이블 ── */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <TrendingUp size={40} className="mb-3 opacity-30"/>
            <p className="text-sm">집행 내역이 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["매출구분","분양회 넘버링","고객명","직급","집행금액","VAT포함금액","광고채널","결제일","대협팀담당","담당컨설턴트","하이타겟마일리지","하이타겟리워드","호갱노노리워드","LMS리워드",""].map(h=>(
                    <th key={h} className="text-left px-3 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {executions.map(e=>(
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${e.contract_route==="분양회"?"bg-amber-50 text-amber-700 border-amber-100":e.contract_route==="완판트럭"?"bg-emerald-50 text-emerald-700 border-emerald-100":e.contract_route==="대협팀활동"?"bg-blue-50 text-blue-700 border-blue-100":"bg-slate-50 text-slate-500 border-slate-100"}`}>
                        {e.contract_route||"-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-amber-600">{(e as any).bunyanghoe_number||"-"}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 text-xs">{e.member_name}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{e.position||"-"}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800 text-xs">{fwFull(e.execution_amount)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {e.vat_amount && e.vat_amount !== e.execution_amount
                        ? <span className="font-bold text-blue-600">{fwFull(e.vat_amount)}</span>
                        : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{e.channel}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">
                      {e.payment_date ? new Date(e.payment_date).toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"}) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">{e.team_member||"-"}</span></td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{e.consultant||"-"}</td>
                    <td className="px-3 py-2.5 text-blue-600 font-medium text-xs">{e.hightarget_mileage ? fw(e.hightarget_mileage) : "-"}</td>
                    <td className="px-3 py-2.5 text-amber-600 font-medium text-xs">{e.hightarget_reward ? fw(e.hightarget_reward) : "-"}</td>
                    <td className="px-3 py-2.5 text-amber-600 font-medium text-xs">{e.hogaengnono_reward ? fw(e.hogaengnono_reward) : "-"}</td>
                    <td className="px-3 py-2.5 text-amber-600 font-medium text-xs">{e.lms_reward ? fw(e.lms_reward) : "-"}</td>
                    <td className="px-3 py-2.5 flex items-center gap-1">
                      <button onClick={()=>handleEdit(e)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1">
                        <Edit2 size={11}/>수정
                      </button>
                      <button onClick={()=>handleDelete(e.id)} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 매출집행등록 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editId ? "매출 수정" : "매출집행등록"}</h2>
              <button onClick={()=>{setShowModal(false);setEditId(null);}} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">

              {/* ① 매출구분 */}
              <div>
                <label className={lbl}>매출구분 *</label>
                <div className="flex gap-2">
                  {["분양회","완판트럭","대협팀활동"].map(t=>(
                    <button key={t} onClick={()=>setForm({...EMPTY_FORM, sales_type:t, vat_yn:"여"})}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-all ${
                        form.sales_type===t
                          ? t==="분양회"    ? "bg-amber-50 border-amber-400 text-amber-700"
                          : t==="완판트럭"  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                                           : "bg-blue-50 border-blue-400 text-blue-700"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* 분양회 */}
              {isBunyanghoe && (
                <>
                  <div>
                    <label className={lbl}>분양회 입회자 선택 *</label>
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                        placeholder="이름으로 검색..." value={vipSearch} onChange={e=>setVipSearch(e.target.value)}/>
                    </div>
                    <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-slate-50">
                      {filteredVip.length===0
                        ? <div className="text-center py-4 text-xs text-slate-400">검색 결과 없음</div>
                        : filteredVip.map(v=>(
                          <button key={v.id} onClick={()=>handleVipSelect(String(v.id))}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors ${form.vip_member_id===String(v.id)?"bg-blue-50":""}`}>
                            <span className="text-xs font-bold text-amber-600 min-w-[48px]">{v.bunyanghoe_number||"미부여"}</span>
                            <span className="font-semibold text-slate-800">{v.name}</span>
                            <span className="text-xs text-slate-400">{v.title||""}</span>
                            <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${v.meeting_result==="계약완료"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>{v.meeting_result}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {form.vip_member_id && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">선택된 분양회 회원</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-slate-400">넘버링</span><p className="font-bold text-amber-600">{form.bunyanghoe_number||"-"}</p></div>
                        <div><span className="text-slate-400">고객명</span><p className="font-bold text-slate-800">{form.member_name}</p></div>
                        <div><span className="text-slate-400">직급</span><p className="font-bold text-slate-800">{form.position||"-"}</p></div>
                        <div><span className="text-slate-400">대협팀 담당</span><p className="font-bold text-slate-800">{form.team_member||"-"}</p></div>
                        <div><span className="text-slate-400">담당 컨설턴트</span><p className="font-bold text-slate-800">{form.consultant||"-"}</p></div>
                      </div>
                    </div>
                  )}

                  {/* 집행금액 + VAT */}
                  <div>
                    <label className={lbl}>집행금액 *</label>
                    <input className={inp} value={form.execution_amount}
                      onChange={e=>setForm({...form, execution_amount:formatAmt(e.target.value)})}
                      placeholder="5,000,000"/>
                    {rawAmount > 0 && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-semibold">부가세</span>
                        {["여","부"].map(v=>(
                          <button key={v} onClick={()=>setForm({...form,vat_yn:v})}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
                              form.vat_yn===v
                                ? v==="여" ? "bg-blue-50 border-blue-400 text-blue-700"
                                           : "bg-slate-100 border-slate-400 text-slate-700"
                                : "bg-white border-slate-200 text-slate-400"
                            }`}>{v}</button>
                        ))}
                        <span className="text-xs text-slate-400 ml-1">
                          VAT포함금액: <span className="font-bold text-blue-600">{vatAmount.toLocaleString()}원</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 광고채널 + 하이타겟 옵션 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>광고채널 *</label>
                      <select className={inp} value={form.channel} onChange={e=>setForm({...form,channel:e.target.value,hightarget_reward_type:""})}>
                        <option value="">선택</option>
                        {channels.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {form.channel==="하이타겟" && (
                      <div>
                        <label className={lbl}>마일리지/리워드</label>
                        <select className={inp} value={form.hightarget_reward_type} onChange={e=>setForm({...form,hightarget_reward_type:e.target.value})}>
                          <option value="">선택</option>
                          <option value="마일리지10%">마일리지 10%</option>
                          <option value="리워드5%">리워드 5%</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={lbl}>결제일</label>
                      <input type="date" className={inp} value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/>
                    </div>
                  </div>
                </>
              )}

              {/* 완판트럭 */}
              {isWanpan && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>고객명 *</label><input className={inp} value={form.member_name} onChange={e=>setForm({...form,member_name:e.target.value})} placeholder="홍길동"/></div>
                  <div><label className={lbl}>직급</label><input className={inp} value={form.position} onChange={e=>setForm({...form,position:e.target.value})} placeholder="본부장"/></div>
                  <div>
                    <label className={lbl}>집행금액 *</label>
                    <input className={inp} value={form.execution_amount}
                      onChange={e=>setForm({...form,execution_amount:formatAmt(e.target.value)})}
                      placeholder="5,000,000"/>
                    {rawAmount > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">부가세</span>
                        {["여","부"].map(v=>(
                          <button key={v} onClick={()=>setForm({...form,vat_yn:v})}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all ${form.vat_yn===v ? v==="여"?"bg-blue-50 border-blue-400 text-blue-700":"bg-slate-100 border-slate-400 text-slate-700":"bg-white border-slate-200 text-slate-400"}`}>{v}</button>
                        ))}
                        <span className="text-xs text-blue-600 font-bold">{vatAmount.toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={lbl}>광고채널 *</label>
                    <select className={inp} value={form.channel} onChange={e=>setForm({...form,channel:e.target.value,hightarget_reward_type:""})}>
                      <option value="">선택</option>
                      {channels.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>결제일</label><input type="date" className={inp} value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/></div>
                  <div>
                    <label className={lbl}>대협팀 담당자</label>
                    <select className={inp} value={form.team_member} onChange={e=>setForm({...form,team_member:e.target.value})}>
                      <option value="">선택</option>{TEAM.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>담당 컨설턴트</label><input className={inp} value={form.consultant} onChange={e=>setForm({...form,consultant:e.target.value})} placeholder="컨설턴트명"/></div>
                </div>
              )}

              {/* 대협팀활동 — 완판트럭과 동일 구성, 리워드 없음 */}
              {isDaehyup && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>고객명 *</label><input className={inp} value={form.member_name} onChange={e=>setForm({...form,member_name:e.target.value})} placeholder="홍길동"/></div>
                  <div><label className={lbl}>직급</label><input className={inp} value={form.position} onChange={e=>setForm({...form,position:e.target.value})} placeholder="본부장"/></div>
                  <div>
                    <label className={lbl}>집행금액 *</label>
                    <input className={inp} value={form.execution_amount}
                      onChange={e=>setForm({...form,execution_amount:formatAmt(e.target.value)})}
                      placeholder="5,000,000"/>
                    {rawAmount > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">부가세</span>
                        {["여","부"].map(v=>(
                          <button key={v} onClick={()=>setForm({...form,vat_yn:v})}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all ${form.vat_yn===v ? v==="여"?"bg-blue-50 border-blue-400 text-blue-700":"bg-slate-100 border-slate-400 text-slate-700":"bg-white border-slate-200 text-slate-400"}`}>{v}</button>
                        ))}
                        <span className="text-xs text-blue-600 font-bold">{vatAmount.toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={lbl}>광고채널 *</label>
                    <select className={inp} value={form.channel} onChange={e=>setForm({...form,channel:e.target.value,hightarget_reward_type:""})}>
                      <option value="">선택</option>
                      {channels.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>결제일</label><input type="date" className={inp} value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/></div>
                  <div>
                    <label className={lbl}>대협팀 담당자</label>
                    <select className={inp} value={form.team_member} onChange={e=>setForm({...form,team_member:e.target.value})}>
                      <option value="">선택</option>{TEAM.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>담당 컨설턴트</label><input className={inp} value={form.consultant} onChange={e=>setForm({...form,consultant:e.target.value})} placeholder="컨설턴트명"/></div>
                </div>
              )}

              {/* 리워드 미리보기 */}
              {previewRewards && form.sales_type && Object.values(previewRewards).some(v=>v>0) && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-2">자동 계산 리워드 (집행금액 기준)</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    {previewRewards.hightarget_mileage>0 && <div className="flex justify-between"><span>하이타겟 마일리지</span><span className="font-bold text-blue-600">{fw(previewRewards.hightarget_mileage)}</span></div>}
                    {previewRewards.hightarget_reward>0  && <div className="flex justify-between"><span>하이타겟 리워드</span><span className="font-bold text-amber-600">{fw(previewRewards.hightarget_reward)}</span></div>}
                    {previewRewards.hogaengnono_reward>0 && <div className="flex justify-between"><span>호갱노노 리워드</span><span className="font-bold text-amber-600">{fw(previewRewards.hogaengnono_reward)}</span></div>}
                    {previewRewards.lms_reward>0         && <div className="flex justify-between"><span>LMS 리워드</span><span className="font-bold text-amber-600">{fw(previewRewards.lms_reward)}</span></div>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={()=>{setShowModal(false);setEditId(null);}} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleSave} disabled={saving||!form.sales_type}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40">
                <Save size={13}/>{saving?"저장 중...":editId?"수정":"저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
