"use client";
import EmptyState from "@/components/EmptyState";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
  { key: "계약완료",      label: "계약 완료",      color: "bg-emerald-50",border: "border-emerald-200",dot: "bg-emerald-500",badge: "bg-emerald-100 text-emerald-700" },
  { key: "예약완료",      label: "예약 완료",      color: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700" },
];

const STAGE_BADGE: Record<string,string> = {
  "리드": "bg-pink-100 text-pink-600",
  "프로스펙팅": "bg-orange-100 text-orange-500",
  "딜크로징": "bg-sky-100 text-sky-600",
  "리텐션": "bg-purple-100 text-purple-500",
};
const SURNAME_COLORS: Record<string,string> = {
  "김": "bg-blue-500",   "이": "bg-violet-500", "박": "bg-emerald-500",
  "최": "bg-rose-500",   "정": "bg-amber-500",  "강": "bg-cyan-500",
  "조": "bg-indigo-500", "윤": "bg-pink-500",   "장": "bg-orange-500",
  "임": "bg-teal-500",   "한": "bg-sky-500",    "오": "bg-purple-500",
  "서": "bg-red-500",    "신": "bg-lime-600",   "권": "bg-fuchsia-500",
  "황": "bg-yellow-600", "안": "bg-blue-600",   "송": "bg-green-600",
  "류": "bg-indigo-600", "전": "bg-rose-600",   "홍": "bg-red-400",
  "고": "bg-cyan-600",   "문": "bg-violet-600", "양": "bg-amber-600",
  "손": "bg-emerald-600","배": "bg-sky-600",    "백": "bg-slate-500",
  "허": "bg-pink-600",   "남": "bg-teal-600",   "유": "bg-orange-600",
};
const AVATAR_COLORS = ["bg-blue-500","bg-violet-500","bg-amber-500","bg-emerald-500","bg-rose-500","bg-cyan-500","bg-indigo-500","bg-pink-500"];

function getAvatarColor(name: string) {
  if (name && SURNAME_COLORS[name[0]]) return SURNAME_COLORS[name[0]];
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

function ContactCard({ contact, col, onNotesClick, refreshKey }: {
  contact: Contact;
  col: typeof COLUMNS[0];
  onNotesClick: (contactId: number, name: string) => void;
  refreshKey?: number;
}) {


  const meetingDate = contact.meeting_date
    ? new Date(contact.meeting_date + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    : contact.meeting_date_text || null;

  return (
    <div
      className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 ${getAvatarColor(contact.name)} rounded-full flex items-center justify-center text-white text-base font-black flex-shrink-0`}>
            {contact.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-base">{contact.name}</span>
              {contact.title && <span className="text-sm text-slate-400">{contact.title}</span>}
            </div>
            {contact.assigned_to && (
              <span className="text-sm text-slate-500">{contact.assigned_to}</span>
            )}
          </div>
        </div>
        <a
          href={`/contacts/${contact.id}`}
          onClick={e => e.stopPropagation()}
          className="text-[10px] px-2 py-1 bg-blue-50 text-blue-500 rounded-lg border border-blue-100 hover:bg-blue-100 font-semibold flex-shrink-0 whitespace-nowrap"
        >상세</a>
      </div>

      {/* 연락처 */}
      {contact.management_stage && (
        <div className="mb-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STAGE_BADGE[contact.management_stage]||"bg-slate-100 text-slate-500"}`}>
            {contact.management_stage}
          </span>
        </div>
      )}
      {contact.phone && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Phone size={11} className="text-slate-300 flex-shrink-0"/>
          <span className="text-sm text-slate-500">{contact.phone}</span>
        </div>
      )}

      {/* 미팅일정 */}
      {meetingDate && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Calendar size={11} className="text-blue-300 flex-shrink-0"/>
          <span className="text-sm text-blue-500 font-semibold">{meetingDate}</span>
          {contact.meeting_address && (
            <>
              <span className="text-slate-200">·</span>
              <MapPin size={10} className="text-slate-300"/>
              <span className="text-sm text-slate-400">{contact.meeting_address}</span>
            </>
          )}
        </div>
      )}

      {/* 활동 노트 */}
      <div
        className="mt-2 pt-2 border-t border-slate-50"
        onDoubleClick={e => { e.stopPropagation(); onNotesClick(contact.id, contact.name); }}
        onClick={e => e.stopPropagation()}
      >
        <ContactNotes contactId={contact.id} compact refreshKey={refreshKey}/>
        <p
          onClick={() => onNotesClick(contact.id, contact.name)}
          className="text-xs text-slate-800 font-semibold mt-2 text-right cursor-pointer hover:text-blue-600 select-none">
          활동노트 입력하기 →
        </p>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesPopup, setNotesPopup] = useState<{ contactId: number; name: string } | null>(null);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [fProspect, setFProspect] = useState("");
  const [fAssigned, setFAssigned] = useState("");
  const [fStage, setFStage] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      // exec 로그인 시 본인 담당 고객만
      let execName = "";
      try {
        const raw = localStorage.getItem("crm_user");
        if (raw) { const u = JSON.parse(raw); if (u.role === "exec") execName = u.name; }
      } catch {}

      let q = supabase
        .from("contacts")
        .select("id,name,title,phone,tm_sensitivity,prospect_type,meeting_date,meeting_date_text,meeting_address,meeting_result,management_stage,assigned_to,memo")
        .order("created_at", { ascending: false });
      if (execName) { q = q.eq("assigned_to", execName); }
      const { data } = await q;
      setContacts((data || []) as Contact[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = contacts.filter(c => {
    const matchSearch = !search || 
      c.name.includes(search) ||
      (c.title && c.title.includes(search)) ||
      (c.phone && c.phone.includes(search));
    const matchProspect = !fProspect || c.prospect_type === fProspect;
    const matchAssigned = !fAssigned || c.assigned_to === fAssigned;
    const matchStage = !fStage || c.management_stage === fStage;
    return matchSearch && matchProspect && matchAssigned && matchStage;
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
            <h1 className="text-lg font-bold text-slate-800">🔄 파이프라인</h1>
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
            <input type="text" placeholder="고객명, 직급, 연락처 검색..." value={search}
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
          <select value={fStage} onChange={e=>setFStage(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none">
            <option value="">고객관리구간</option>
            <option value="리드">리드</option>
            <option value="프로스펙팅">프로스펙팅</option>
            <option value="딜크로징">딜크로징</option>
            <option value="리텐션">리텐션</option>
          </select>
          <select value={fAssigned} onChange={e=>setFAssigned(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 outline-none">
            <option value="">전체 담당자</option>
            {["조계현","이세호","기여운","최연전"].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={()=>{setSearch("");setFProspect("");setFStage("");setFAssigned("");}}
            className={`text-xs px-2.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors ${(search||fProspect||fStage||fAssigned) ? "bg-red-500 text-white border border-red-500 hover:bg-red-600" : "text-red-400 border border-red-200 hover:bg-red-50"}`}>
            ↺ 초기화
          </button>
        </div>
      </div>

      {/* 칸반 */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-3 h-full" style={{gridTemplateColumns:"repeat(5, minmax(160px, 1fr))", minWidth:"850px"}}>
            {COLUMNS.map(col => {
              const colContacts = getColumnContacts(col.key);
              return (
                <div key={col.key} className={`flex flex-col rounded-2xl border ${col.border} ${col.color} overflow-hidden min-w-0`}>
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
                          refreshKey={notesRefreshKey}
                          onNotesClick={(id, name) => setNotesPopup({ contactId: id, name })}
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
          onClose={() => { setNotesPopup(null); setNotesRefreshKey(k => k + 1); }}
        />
      )}


    </div>
  );
}
