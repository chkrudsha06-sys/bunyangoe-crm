"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Filter, X, Edit2, Trash2, ChevronDown } from "lucide-react";
import ContactNotes from "@/components/ContactNotes";

// ── 타입 ──
interface Contact {
  id: number;
  name: string;
  title: string | null;
  phone: string | null;
  customer_type: string | null;
  tm_sensitivity: string | null;
  prospect_type: string | null;
  meeting_date: string | null;
  meeting_date_text: string | null;
  meeting_address: string | null;
  meeting_result: string | null;
  management_stage: string | null;
  memo: string | null;
  assigned_to: string | null;
  contract_date: string | null;
  reservation_date: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  name: "", title: "", phone: "",
  customer_type: "", tm_sensitivity: "", prospect_type: "",
  meeting_date: "", meeting_date_text: "", meeting_address: "",
  meeting_result: "", management_stage: "", memo: "", assigned_to: "", consultant: "", contract_date: "", reservation_date: "", regular_payment_date: "",
};

// 옵션 목록
const OPT = {
  customer_type: ["신규", "기고객"],
  tm_sensitivity: ["상", "중", "하"],
  prospect_type: ["즉가입가망", "미팅예정가망", "연계매출가망"],
  meeting_result: ["계약완료", "예약완료", "서류만수취", "미팅후가망관리", "계약거부", "미팅불발"],
  management_stage: ["리드", "프로스펙팅", "딜크로징", "리텐션"],
};

const BADGE: Record<string, string> = {
  계약완료: "bg-emerald-100 text-emerald-700",
  예약완료: "bg-blue-100 text-blue-700",
  서류만수취: "bg-purple-100 text-purple-700",
  미팅후가망관리: "bg-amber-100 text-amber-700",
  계약거부: "bg-red-100 text-red-700",
  미팅불발: "bg-slate-100 text-slate-500",
  즉가입가망: "bg-red-100 text-red-600",
  미팅예정가망: "bg-amber-100 text-amber-700",
  연계매출가망: "bg-slate-100 text-slate-600",
  신규: "bg-sky-100 text-sky-700",
  기고객: "bg-violet-100 text-violet-700",
  리드: "bg-pink-100 text-pink-600",
  프로스펙팅: "bg-orange-100 text-orange-500",
  딜크로징: "bg-sky-100 text-sky-600",
  리텐션: "bg-purple-100 text-purple-500",
};

const TEAM = ["조계현", "이세호", "기여운", "최연전"];

// ── 팝업 셀 ──
function CellPopup({ value, onClose }: { value: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-slate-700 text-sm">상세 내용</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
        </div>
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  );
}

// ── Select 컴포넌트 ──
function Sel({ val, onChange, opts, placeholder, className="" }: {
  val: string; onChange: (v: string) => void;
  opts: string[]; placeholder: string; className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select value={val} onChange={e=>onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-400 pr-8">
        <option value="">{placeholder}</option>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    </div>
  );
}

// ── 메인 ──
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [useDatePicker, setUseDatePicker] = useState(true);

  // 검색/필터
  const [search, setSearch] = useState("");
  const [fCustomerType, setFCustomerType] = useState("");
  const [fProspect, setFProspect] = useState("");
  const [fResult, setFResult] = useState("");
  const [fStage, setFStage] = useState("");
  const [fAssigned, setFAssigned] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    // exec 로그인 시 기본값: 본인 담당 고객만
    // 단, 사용자가 직접 필터를 적용하면 전체 기준으로 전환
    let execName = "";
    try {
      const raw = localStorage.getItem("crm_user");
      if (raw) { const u = JSON.parse(raw); if (u.role === "exec") execName = u.name; }
    } catch {}

    // 필터가 하나라도 적용되면 exec 제한 해제
    const hasFilter = !!(search || fCustomerType || fProspect || fResult || fStage || fAssigned);

    let q = supabase.from("contacts").select("*", { count: "exact" });
    // 필터 없을 때만 exec 본인 고객 제한
    if (execName && !hasFilter) q = q.eq("assigned_to", execName);
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,memo.ilike.%${search}%,meeting_address.ilike.%${search}%`);
    if (fCustomerType) q = q.eq("customer_type", fCustomerType);
    if (fProspect) q = q.eq("prospect_type", fProspect);
    if (fResult) q = q.eq("meeting_result", fResult);
    if (fStage) q = q.eq("management_stage", fStage);
    if (fAssigned) q = q.eq("assigned_to", fAssigned);
    q = q.order("created_at", { ascending: false }).range((page-1)*PER_PAGE, page*PER_PAGE-1);
    const { data, count } = await q;
    setContacts((data || []) as Contact[]);
    setTotal(count || 0);
    setLoading(false);
  }, [search, fCustomerType, fProspect, fResult, fStage, fAssigned, page]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openAdd = () => {
    setEditContact(null);
    // 로그인한 실행파트 유저면 본인 자동 셋팅
    let defaultAssigned = "";
    try {
      const raw = localStorage.getItem("crm_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u.role === "exec") defaultAssigned = u.name;
      }
    } catch {}
    setForm({ ...EMPTY_FORM, assigned_to: defaultAssigned });
    setUseDatePicker(true);
    setShowModal(true);
  };
  const openEdit = (c: Contact) => {
    setEditContact(c);
    setForm({
      name: c.name || "", title: c.title || "", phone: c.phone || "",
      customer_type: c.customer_type || "", tm_sensitivity: c.tm_sensitivity || "",
      prospect_type: c.prospect_type || "", meeting_date: c.meeting_date?.split("T")[0] || "",
      meeting_date_text: c.meeting_date_text || "", meeting_address: c.meeting_address || "",
      meeting_result: c.meeting_result || "", management_stage: c.management_stage || "", regular_payment_date: (c as any).regular_payment_date || "",
      contract_date: (c as any).contract_date || "", reservation_date: (c as any).reservation_date || "",
      consultant: (c as any).consultant || "",
      memo: c.memo || "", assigned_to: c.assigned_to || "",
    });
    setUseDatePicker(!c.meeting_date_text);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return alert("고객명을 입력하세요.");
    setSaving(true);
    const payload = {
      name: form.name || null,
      title: form.title || null,
      phone: form.phone || null,
      customer_type: form.customer_type || null,
      tm_sensitivity: form.tm_sensitivity || null,
      prospect_type: form.prospect_type || null,
      meeting_date: useDatePicker ? (form.meeting_date || null) : null,
      meeting_date_text: !useDatePicker ? (form.meeting_date_text || null) : null,
      meeting_address: form.meeting_address || null,
      meeting_result: form.meeting_result || null,
      management_stage: form.management_stage || null,
      memo: form.memo || null,
      assigned_to: form.assigned_to || null,
      consultant: form.consultant || null,
      contract_date: form.contract_date || null,
      reservation_date: form.reservation_date || null,
      regular_payment_date: form.regular_payment_date || null,
    };
    let error;
    if (editContact) {
      const res = await supabase.from("contacts").update(payload).eq("id", editContact.id);
      error = res.error;
    } else {
      const res = await supabase.from("contacts").insert(payload);
      error = res.error;
    }
    setSaving(false);
    if (error) {
      console.error("저장 에러:", error);
      alert(`저장 실패: ${error.message}\n\n코드: ${error.code || "-"}\n상세: ${error.details || "-"}`);
      return;
    }
    setShowModal(false);
    setPage(1);
    fetchContacts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    fetchContacts();
  };

  const f = (key: string, val: string) => setForm((p: any) => ({ ...p, [key]: val }));
  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";

  const totalPages = Math.ceil(total / PER_PAGE);
  const activeFilters = [fCustomerType, fProspect, fResult, fStage, fAssigned].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-black text-slate-800">고객 데이터</h1>
            <p className="text-xs text-slate-400 mt-0.5">전체 <span className="text-blue-600 font-bold">{total.toLocaleString()}</span>명</p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E3A8A] text-white text-sm font-bold rounded-xl hover:bg-blue-800 shadow-sm transition-colors">
            <Plus size={15}/> 신규 등록
          </button>
        </div>

        {/* 검색 + 필터 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="이름, 연락처, 메모, 지역 검색..." value={search}
              onChange={e=>{setSearch(e.target.value);setPage(1);}}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"/>
          </div>
          <button onClick={()=>setShowFilter(!showFilter)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border transition-colors ${
              showFilter || activeFilters > 0 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>
            <Filter size={14}/> 필터 {activeFilters > 0 && <span className="bg-white/30 text-white text-xs px-1.5 rounded-full">{activeFilters}</span>}
          </button>
          {activeFilters > 0 && (
            <button onClick={()=>{setFCustomerType("");setFProspect("");setFResult("");setFStage("");setFAssigned("");}}
              className="text-xs text-red-400 hover:text-red-600 px-2">초기화</button>
          )}
        </div>

        {/* 필터 패널 */}
        {showFilter && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            <Sel val={fCustomerType} onChange={v=>{setFCustomerType(v);setPage(1);}} opts={OPT.customer_type} placeholder="고객유형"/>
            <Sel val={fProspect} onChange={v=>{setFProspect(v);setPage(1);}} opts={OPT.prospect_type} placeholder="가망구분"/>
            <Sel val={fResult} onChange={v=>{setFResult(v);setPage(1);}} opts={OPT.meeting_result} placeholder="미팅결과"/>
            <Sel val={fStage} onChange={v=>{setFStage(v);setPage(1);}} opts={OPT.management_stage} placeholder="고객관리구간"/>
            <Sel val={fAssigned} onChange={v=>{setFAssigned(v);setPage(1);}} opts={TEAM} placeholder="담당자"/>
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <p className="text-sm mb-2">등록된 고객이 없습니다</p>
            <button onClick={openAdd} className="text-xs text-blue-600 underline">첫 번째 고객 등록하기</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    ["#","w-10"], ["고객명","w-24"], ["직급","w-20"], ["연락처","w-32"],
                    ["고객유형","w-20"], ["TM감도","w-28"], ["가망구분","w-28"],
                    ["미팅일정","w-24"], ["미팅지역","w-24"], ["미팅결과","w-28"], ["완료/예약일","w-24"], ["정기출금일","w-24"],
                    ["관리구간","w-24"], ["담당자","w-20"], ["담당컨설턴트","w-24"], ["비고","w-32"], ["","w-20"],
                  ].map(([h,w])=>(
                    <th key={h} className={`text-center px-3 py-3 text-slate-600 text-sm font-semibold ${w} truncate`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center align-middle text-slate-400 text-sm">{(page-1)*PER_PAGE+i+1}</td>
                    <td className="px-3 py-3 text-center align-middle font-bold text-slate-800 truncate">{c.name}</td>
                    <td className="px-3 py-3 text-center align-middle text-slate-500 text-sm truncate">{c.title||"-"}</td>
                    <td className="px-3 py-3 text-center align-middle text-slate-600 text-sm">{c.phone||"-"}</td>
                    <td className="px-3 py-3 text-center align-middle">
                      {c.customer_type ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[c.customer_type]||"bg-slate-100 text-slate-600"}`}>{c.customer_type}</span> : <span className="text-slate-300 text-sm">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <div className="text-sm text-slate-600 truncate text-center cursor-pointer"
                        onDoubleClick={()=>c.tm_sensitivity&&setPopup(c.tm_sensitivity)}>
                        {c.tm_sensitivity||"-"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      {c.prospect_type ? <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${BADGE[c.prospect_type]||"bg-slate-100 text-slate-600"}`}>{c.prospect_type}</span> : <span className="text-slate-300 text-sm">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-sm text-slate-600 truncate">
                      {c.meeting_date ? new Date(c.meeting_date+"T00:00:00").toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"})
                       : c.meeting_date_text || "-"}
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-sm text-slate-600 truncate max-w-[100px] cursor-pointer"
                      onDoubleClick={()=>c.meeting_address&&setPopup(c.meeting_address)}>
                      {c.meeting_address||"-"}
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      {c.meeting_result ? <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${BADGE[c.meeting_result]||"bg-slate-100 text-slate-600"}`}>{c.meeting_result}</span> : <span className="text-slate-300 text-sm">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-xs text-slate-600">
                      {c.meeting_result === "계약완료" && c.contract_date
                        ? <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-100">
                            {new Date(c.contract_date+"T00:00:00").toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"})}
                          </span>
                        : c.meeting_result === "예약완료" && c.reservation_date
                        ? <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100">
                            {new Date(c.reservation_date+"T00:00:00").toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"})}
                          </span>
                        : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-xs">
                      {(c as any).regular_payment_date
                        ? <span className="text-sm text-slate-600">{`매월 ${(c as any).regular_payment_date}일`}</span>
                        : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      {c.management_stage ? <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${BADGE[c.management_stage]||"bg-slate-100 text-slate-600"}`}>{c.management_stage}</span> : <span className="text-slate-300 text-sm">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-sm px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">{c.assigned_to||"-"}</span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-xs text-slate-500 truncate">{(c as any).consultant||"-"}</td>
                    <td className="px-3 py-3 text-center align-middle max-w-[120px] cursor-pointer"
                      onDoubleClick={()=>c.memo&&setPopup(c.memo)}>
                      <p className="text-xs text-slate-500 truncate">{c.memo||"-"}</p>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <div className="flex gap-1">
                        <button onClick={()=>openEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={13}/>
                        </button>
                        <button onClick={()=>handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400">{(page-1)*PER_PAGE+1}~{Math.min(page*PER_PAGE,total)} / 전체 {total.toLocaleString()}명</p>
                <div className="flex gap-1">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className="px-3 py-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40">이전</button>
                  {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                    const p = Math.max(1, Math.min(page-2,totalPages-4)) + i;
                    return (
                      <button key={p} onClick={()=>setPage(p)}
                        className={`px-3 py-1.5 text-xs rounded-lg border ${page===p?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                    className="px-3 py-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40">다음</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 팝업 (더블클릭) */}
      {popup && <CellPopup value={popup} onClose={()=>setPopup(null)}/>}

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-black text-slate-800">{editContact ? "고객 정보 수정" : "신규 고객 등록"}</h2>
              <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div><label className={lbl}>고객명 *</label><input className={inp} value={form.name} onChange={e=>f("name",e.target.value)} placeholder="홍길동"/></div>
                <div><label className={lbl}>직급</label><input className={inp} value={form.title} onChange={e=>f("title",e.target.value)} placeholder="본부장"/></div>
                <div><label className={lbl}>연락처</label><input className={inp} value={form.phone} onChange={e=>f("phone",e.target.value)} placeholder="010-0000-0000"/></div>
                <div>
                  <label className={lbl}>고객유형</label>
                  <Sel val={form.customer_type} onChange={v=>f("customer_type",v)} opts={OPT.customer_type} placeholder="선택"/>
                </div>
                <div>
                  <label className={lbl}>TM감도</label>
                  <Sel val={form.tm_sensitivity} onChange={v=>f("tm_sensitivity",v)} opts={OPT.tm_sensitivity} placeholder="선택"/>
                </div>
                <div>
                  <label className={lbl}>가망구분</label>
                  <Sel val={form.prospect_type} onChange={v=>f("prospect_type",v)} opts={OPT.prospect_type} placeholder="선택"/>
                </div>
                <div className="col-span-3">
                  <label className={lbl}>미팅일정</label>
                  <div className="flex gap-2 mb-1.5">
                    <button onClick={()=>setUseDatePicker(true)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold border transition-colors ${useDatePicker?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-500 border-slate-200"}`}>날짜 선택</button>
                    <button onClick={()=>setUseDatePicker(false)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold border transition-colors ${!useDatePicker?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-500 border-slate-200"}`}>텍스트 입력</button>
                  </div>
                  {useDatePicker
                    ? <input type="date" className={inp} value={form.meeting_date} onChange={e=>f("meeting_date",e.target.value)}/>
                    : <input className={inp} value={form.meeting_date_text} onChange={e=>f("meeting_date_text",e.target.value)} placeholder="예: 4월 셋째주, 조율중"/>
                  }
                </div>
                <div><label className={lbl}>미팅지역</label><input className={inp} value={form.meeting_address} onChange={e=>f("meeting_address",e.target.value)} placeholder="서울 강남"/></div>
                <div>
                  <label className={lbl}>미팅결과</label>
                  <Sel val={form.meeting_result} onChange={v=>f("meeting_result",v)} opts={OPT.meeting_result} placeholder="선택"/>
                </div>
                {form.meeting_result === "계약완료" && (
                  <div>
                    <label className={lbl}>계약완료일 <span className="text-blue-400">★ 자동반영</span></label>
                    <input type="date" className={inp} value={form.contract_date} onChange={e=>f("contract_date",e.target.value)}/>
                  </div>
                )}
                {form.meeting_result === "계약완료" && (
                  <div>
                    <label className={lbl}>정기출금일 <span className="text-emerald-500">계약완료 전용</span></label>
                    <select className={inp} value={form.regular_payment_date} onChange={e=>f("regular_payment_date",e.target.value)}>
                      <option value="">선택</option>
                      {Array.from({length:31},(_,i)=>i+1).map(d=>(
                        <option key={d} value={String(d)}>{`매월 ${d}일`}</option>
                      ))}
                    </select>
                  </div>
                )}
                {form.meeting_result === "예약완료" && (
                  <div>
                    <label className={lbl}>예약완료일 <span className="text-blue-400">★ 자동반영</span></label>
                    <input type="date" className={inp} value={form.reservation_date} onChange={e=>f("reservation_date",e.target.value)}/>
                  </div>
                )}
                <div>
                  <label className={lbl}>고객관리구간</label>
                  <Sel val={form.management_stage} onChange={v=>f("management_stage",v)} opts={OPT.management_stage} placeholder="선택"/>
                </div>
                <div>
                  <label className={lbl}>담당자</label>
                  <Sel val={form.assigned_to} onChange={v=>f("assigned_to",v)} opts={TEAM} placeholder="선택"/>
                </div>
                <div>
                  <label className={lbl}>담당컨설턴트</label>
                  <input className={inp} value={form.consultant} onChange={e=>f("consultant",e.target.value)} placeholder="담당 컨설턴트명"/>
                </div>
                <div className="col-span-3">
                  <label className={lbl}>비고</label>
                  <textarea className={`${inp} resize-none`} rows={3} value={form.memo} onChange={e=>f("memo",e.target.value)} placeholder="메모를 입력하세요"/>
                </div>
              </div>
              {/* 활동 노트 히스토리 - 수정 모드에서만 */}
              {editContact && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <ContactNotes contactId={editContact.id} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 text-center align-middle">취소</button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 text-sm bg-[#1E3A8A] text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50">
                {saving ? "저장 중..." : editContact ? "수정 완료" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
