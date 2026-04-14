"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Phone, Calendar, MapPin, X, ChevronRight } from "lucide-react";
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

function MemoPopup({ value, name, onClose }: { value: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 ${getAvatarColor(name)} rounded-full flex items-center justify-center text-white text-xs font-bold`}>{name[0]}</div>
            <span className="font-bold text-slate-800 text-sm">{name} — 비고</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16}/></button>
        </div>
        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-100">{value}</p>
      </div>
    </div>
  );
}

function ContactCard({ contact, col, onMemoClick }: {
  contact: Contact;
  col: typeof COLUMNS[0];
  onMemoClick: (memo: string, name: string) => void;
}) {
  const router = useRouter();

  const handleDoubleClick = () => {
    router.push(`/contacts/${contact.id}`);
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
        onDoubleClick={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <ContactNotes contactId={contact.id} compact />
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [memoPopup, setMemoPopup] = useState<{ memo: string; name: string } | null>(null);

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

  const getColumnContacts = (colKey: string) => {
    return contacts.filter(c =>
      c.prospect_type === colKey ||
      c.tm_sensitivity === colKey ||
      c.meeting_result === colKey
    );
  };

  const totalCount = contacts.length;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-800">파이프라인</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              전체 <span className="text-blue-600 font-bold">{totalCount}</span>명 · 더블클릭으로 고객 상세 확인
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              실시간
            </div>
          </div>
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
                          onMemoClick={(memo, name) => setMemoPopup({ memo, name })}
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

      {/* 비고 팝업 */}
      {memoPopup && (
        <MemoPopup
          value={memoPopup.memo}
          name={memoPopup.name}
          onClose={() => setMemoPopup(null)}
        />
      )}
    </div>
  );
}
