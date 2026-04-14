"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Phone, Calendar, MapPin, X, ChevronRight, Search } from "lucide-react";
import ContactNotes from "@/components/ContactNotes";

interface Contact {
  id: number;
  name: string;
  title: string | null;
  phone: string | null;
  tm_sensitivity: string | null;
  prospect_type: string | null;
  meeting_date: string | null;
  meeting_date_text: string | null;
  meeting_address: string | null;
  meeting_result: string | null;
  management_stage: string | null;
  assigned_to: string | null;
  memo: string | null;
}

const COLUMNS = [
  { key: "즉가입가망",    label: "즉가입 가망",    color: "bg-red-50",    border: "border-red-200",    dot: "bg-red-400",    badge: "bg-red-100 text-red-600" },
  { key: "미팅예정가망",  label: "미팅 예정",      color: "bg-cyan-50",   border: "border-cyan-200",   dot: "bg-cyan-400",   badge: "bg-cyan-100 text-cyan-700" },
  { key: "연계매출가망",  label: "연계매출 가망",  color: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-700" },
  { key: "미팅후가망관리",label: "미팅 후 관리",   color: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-400", badge: "bg-purple-100 text-purple-700" },
  { key: "계약완료",      label: "계약 완료",      color: "bg-emerald-50",border: "border-emerald-200",dot: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700" },
  { key: "예약완료",      label: "예약 완료",      color: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700" },
];

const AVATAR_COLORS = ["bg-blue-500","bg-violet-500","bg-amber-500","bg-emerald-500","bg-rose-500","bg-cyan-500","bg-indigo-500","bg-pink-500"];

function getAvatarColor(name: string) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function NotesPopup({ contactId, name, onClose }: { contactId: number; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 ${getAvatarColor(name)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>{name[0]}</div>
            <span className="font-bold text-slate-800 text-sm">{name} — 활동 노트</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ContactNotes contactId={contactId} />
        </div>
      </div>
    </div>
  );
}

function ContactCard({ contact, col, onNotesClick, onQuickEdit }: {
  contact: Contact;
  col: typeof COLUMNS[0];
  onNotesClick: (contactId: number, name: string) => void;
  onQuickEdit: (c: Contact) => void;
}) {
  const router = useRouter();

  const handleDoubleClick = () => {
    onQuickEdit(contact);
  };

  const meetingDate = contact.meeting_date
    ? new Date(contact.meeting_date + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    : contact.meeting_date_text || null;

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-3.5 cursor-pointer hover:shadow-md hover:border-slate-200 transition-all group"
      title="더블클릭하면 고객 상세 페이지로 이동"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${getAvatarColor(contact.name)} rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0`}>
            {contact.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-sm">{contact.name}</span>
              {contact.title && <span className="text-xs text-slate-400">{contact.title}</span>}
            </div>
            {contact.assigned_to && (
              <span className="text-xs text-slate-400">{contact.assigned_to}</span>
            )}
          </div>
        </div>
        <ChevronRight size={13} className="text-slate-200 group-hover:text-slate-400 mt-1 transition-colors flex-shrink-0"/>
      </div>

      {/* 연락처 */}
      {contact.phone && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Phone size={11} className="text-slate-300 flex-shrink-0"/>
          <span className="text-xs text-slate-500">{contact.phone}</span>
        </div>
      )}

      {/* 미팅일정 */}
      {meetingDate && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Calendar size={11} className="text-blue-300 flex-shrink-0"/>
          <span className="text-xs text-blue-500 font-medium">{meetingDate}</span>
          {contact.meeting_address && (
            <>
              <span className="text-slate-200">·</span>
              <MapPin size={10} className="text-slate-300"/>
              <span className="text-xs text-slate-400">{contact.meeting_address}</span>
            </>
          )}
        </div>
      )}

      {/* 활동 노트 */}
      <div
        className="mt-2 pt-2 border-t border-slate-50"
        onDoubleClick={e => { e.stopPropagation(); onNotesClick(contact.id, contact.name); }}
        onClick={e => e.stopPropagation()}
        title="더블클릭: 전체 활동노트 확인"
      >
        <ContactNotes contactId={contact.id} compact />
        <p className="text-[9px] text-slate-300 mt-1 text-right">더블클릭으로 전체보기</p>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesPopup, setNotesPopup] = useState<{ contactId: number; name: string } | null>(null);
  const [quickEdit, setQuickEdit] = useState<Contact | null>(null);
  const [qForm, setQForm] = useState<{ prospect_type: string; management_stage: string; tm_sensitivity: string; meeting_result: string }>({ prospect_type: "", management_stage: "", tm_sensitivity: "", meeting_result: "" });
  const [qSaving, setQSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [fProspect, setFProspect] = useState("");
  const [fAssigned, setFAssigned] = useState("");
  const [fResult, setFResult] = useState("");

  const openQuickEdit = (c: Contact) => {
    setQuickEdit(c);
    setQForm({
      prospect_type: c.prospect_type || "",
      management_stage: c.management_stage || "",
      tm_sensitivity: c.tm_sensitivity || "",
      meeting_result: c.meeting_result || "",
    });
  };

  const handleQuickSave = async () => {
    if (!quickEdit) return;
    setQSaving(true);
    const { error } = await supabase.from("contacts").update(qForm).eq("id", quickEdit.id);
    setQSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    setQuickEdit(null);
    // 목록 갱신
    const { data } = await supabase.from("contacts").select("id,name,title,phone,tm_sensitivity,prospect_type,meeting_date,meeting_date_text,meeting_address,meeting_result,management_stage,assigned_to,memo").order("created_at", { ascending: false });
    setContacts((data || []) as Contact[]);
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("contacts")
        .select("id,name,title,phone,tm_sensitivity,prospect_type,meeting_date,meeting_date_text,meeting_address,meeting_result,management_stage,assigned_to,memo")
        .order("created_at", { ascending: false });
      setContacts((data || []) as Contact[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = contacts.filter(c => {
    const matchSearch = !search || 
      c.name.includes(search) || 
      (c.phone && c.phone.includes(search)) ||
      (c.meeting_address && c.meeting_address.includes(search));
    const matchProspect = !fProspect || c.prospect_type === fProspect;
    const matchAssigned = !fAssigned || c.assigned_to === fAssigned;
    const matchResult = !fResult || c.meeting_result === fResult;
    return matchSearch && matchProspect && matchAssigned && matchResult;
  });

  const getColumnContacts = (colKey: string) => {
    return filtered.filter(c =>
      c.prospect_type === colKey ||
      c.tm_sensitivity === colKey ||
      c.meeting_result === colKey
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-black text-slate-800">파이프라인</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              전체 <span className="text-blue-600 font-bold">{contacts.length}</span>명 중 <span className="text-blue-600 font-bold">{filtered.length}</span>명 표시
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>실시간
          </div>
        </div>
        {/* 검색 + 필터 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="이름, 연락처, 지역 검색..." value={search}
              onChange={e=>setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={fProspect} onChange={e=>setFProspect(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none">
            <option value="">전체 가망구분</option>
            <option value="즉가입가망">즉가입가망</option>
            <option value="미팅예정가망">미팅예정가망</option>
            <option value="연계매출가망">연계매출가망</option>
          </select>
          <select value={fResult} onChange={e=>setFResult(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none">
            <option value="">전체 미팅결과</option>
            <option value="계약완료">계약완료</option>
            <option value="예약완료">예약완료</option>
            <option value="미팅후가망관리">미팅후가망관리</option>
          </select>
          <select value={fAssigned} onChange={e=>setFAssigned(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none">
            <option value="">전체 담당자</option>
            {["조계현","이세호","기여운","최연전"].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          {(search||fProspect||fResult||fAssigned) && (
            <button onClick={()=>{setSearch("");setFProspect("");setFResult("");setFAssigned("");}}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1">초기화</button>
          )}
        </div>
      </div>

      {/* 칸반 */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-3 min-w-max h-full">
            {COLUMNS.map(col => {
              const colContacts = getColumnContacts(col.key);
              return (
                <div key={col.key} className={`w-72 flex flex-col rounded-2xl border ${col.border} ${col.color} overflow-hidden`}>
                  {/* 컬럼 헤더 */}
                  <div className="px-4 py-3 border-b border-white/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`}/>
                      <span className="text-sm font-bold text-slate-700">{col.label}</span>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${col.badge}`}>
                      {colContacts.length}
                    </span>
                  </div>

                  {/* 카드 리스트 */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {colContacts.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-slate-300 text-sm">없음</div>
                    ) : (
                      colContacts.map(c => (
                        <ContactCard
                          key={c.id}
                          contact={c}
                          col={col}
                          onNotesClick={(id, name) => setNotesPopup({ contactId: id, name })}
                          onQuickEdit={openQuickEdit}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 활동노트 팝업 */}
      {notesPopup && (
        <NotesPopup
          contactId={notesPopup.contactId}
          name={notesPopup.name}
          onClose={() => setNotesPopup(null)}
        />
      )}

      {/* 퀵 편집 팝업 */}
      {quickEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setQuickEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${getAvatarColor(quickEdit.name)} rounded-xl flex items-center justify-center text-white font-black`}>
                  {quickEdit.name[0]}
                </div>
                <div>
                  <p className="font-black text-slate-800">{quickEdit.name}</p>
                  <p className="text-xs text-slate-400">{quickEdit.title||""} · {quickEdit.assigned_to||""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/contacts/${quickEdit.id}`}
                  className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-semibold">
                  전체 수정
                </a>
                <button onClick={() => setQuickEdit(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18}/>
                </button>
              </div>
            </div>

            {/* 영업 정보 빠른 수정 */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">영업 정보 빠른 수정</p>

              {/* TM감도 */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">TM감도</label>
                <div className="flex gap-2">
                  {["상","중","하"].map(v => (
                    <button key={v} onClick={() => setQForm(f => ({...f, tm_sensitivity: v}))}
                      className={`flex-1 py-2 text-sm font-bold rounded-xl border transition-colors ${
                        qForm.tm_sensitivity === v
                          ? v==="상" ? "bg-red-500 text-white border-red-500"
                          : v==="중" ? "bg-amber-500 text-white border-amber-500"
                          : "bg-slate-500 text-white border-slate-500"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      }`}>{v}</button>
                  ))}
                </div>
              </div>

              {/* 가망구분 */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">가망구분</label>
                <div className="flex gap-2">
                  {["즉가입가망","미팅예정가망","연계매출가망"].map(v => (
                    <button key={v} onClick={() => setQForm(f => ({...f, prospect_type: v}))}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                        qForm.prospect_type === v
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      }`}>{v}</button>
                  ))}
                </div>
              </div>

              {/* 고객관리구간 */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">고객관리구간</label>
                <div className="flex gap-2">
                  {["리드","프로스펙팅","딜크로징","리텐션"].map(v => (
                    <button key={v} onClick={() => setQForm(f => ({...f, management_stage: v}))}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                        qForm.management_stage === v
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      }`}>{v}</button>
                  ))}
                </div>
              </div>

              {/* 미팅결과 */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">미팅결과</label>
                <div className="grid grid-cols-3 gap-2">
                  {["계약완료","예약완료","서류만수취","미팅후가망관리","계약거부","미팅불발"].map(v => (
                    <button key={v} onClick={() => setQForm(f => ({...f, meeting_result: v}))}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                        qForm.meeting_result === v
                          ? v==="계약완료" ? "bg-emerald-500 text-white border-emerald-500"
                          : v==="예약완료" ? "bg-blue-500 text-white border-blue-500"
                          : v==="계약거부"||v==="미팅불발" ? "bg-red-400 text-white border-red-400"
                          : "bg-amber-500 text-white border-amber-500"
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      }`}>{v}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <button onClick={() => setQuickEdit(null)}
                className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handleQuickSave} disabled={qSaving}
                className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
                {qSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
