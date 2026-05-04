"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { Search, Phone, Calendar, MapPin, X, ChevronDown, ChevronUp } from "lucide-react";
import ContactNotes from "@/components/ContactNotes";

interface Contact {
  id: number;
  name: string;
  title: string | null;
  phone: string | null;
  customer_type: string | null;
  prospect_type: string | null;
  management_stage: string | null;
  assigned_to: string | null;
  consultant: string | null;
  intake_route: string | null;
  meeting_date: string | null;
  meeting_address: string | null;
  meeting_result: string | null;
  memo: string | null;
  tm_sensitivity: string | null;
  contract_date: string | null;
  reservation_date: string | null;
}

const TEAM = ["조계현", "이세호", "기여운", "최연전"];
const CONSULTANTS = ["박경화", "박혜은", "조승현", "박민경", "백선중", "강아름", "전정훈", "박나라"];
const OPT = {
  customer_type: ["신규", "기고객"],
  management_stage: ["리드", "프로스펙팅", "딜크로징", "리텐션"],
  intake_route: ["컨설턴트VIP DB", "컨설턴트 교차DB", "신규TM", "완판트럭", "분양회MGM"],
};

const COLUMNS = [
  { key: "리드",       label: "리드",       color: "#3b82f6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.15)" },
  { key: "프로스펙팅", label: "프로스펙팅", color: "#f59e0b", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.15)" },
  { key: "딜클로징",   label: "딜클로징",   color: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.15)" },
  { key: "리텐션",     label: "리텐션",     color: "#10b981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.15)" },
  { key: "예약완료",   label: "예약완료",   color: "#6366f1", bg: "rgba(99,102,241,0.06)",  border: "rgba(99,102,241,0.15)" },
  { key: "계약완료",   label: "계약완료",   color: "#8b5cf6", bg: "rgba(139,92,246,0.06)",  border: "rgba(139,92,246,0.15)" },
];

const SURNAME_COLORS: Record<string,string> = {
  "김":"#3b82f6","이":"#8b5cf6","박":"#10b981","최":"#f43f5e","정":"#f59e0b","강":"#06b6d4",
  "조":"#6366f1","윤":"#ec4899","장":"#f97316","임":"#14b8a6","한":"#0ea5e9","오":"#a855f7",
  "서":"#ef4444","신":"#65a30d","권":"#d946ef","황":"#ca8a04","안":"#2563eb","송":"#16a34a",
  "류":"#4f46e5","전":"#e11d48","홍":"#dc2626","고":"#0891b2","문":"#7c3aed","양":"#d97706",
  "손":"#059669","배":"#0284c7","백":"#64748b","허":"#db2777","남":"#0d9488","유":"#ea580c",
  "민":"#7c3aed","곽":"#0891b2",
};
function getAvatarColor(name: string) {
  if (name && SURNAME_COLORS[name[0]]) return SURNAME_COLORS[name[0]];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  const colors = ["#3b82f6","#8b5cf6","#f59e0b","#10b981","#f43f5e","#06b6d4","#6366f1","#ec4899"];
  return colors[sum % colors.length];
}

export default function CustomerJourneyPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [userName, setUserName] = useState("");

  // 검색/필터 (고객등록과 동일)
  const [search, setSearch] = useState("");
  const [fCustomerType, setFCustomerType] = useState("");
  const [fStage, setFStage] = useState("");
  const [fAssigned, setFAssigned] = useState("");
  const [fConsultant, setFConsultant] = useState("");
  const [fIntake, setFIntake] = useState("");

  // 활동노트 팝업
  const [notesPopup, setNotesPopup] = useState<{ contactId: number; name: string } | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    if (u) setUserName(u.name);
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data } = await supabase.from("contacts")
      .select("id,name,title,phone,customer_type,prospect_type,management_stage,assigned_to,consultant,intake_route,meeting_date,meeting_address,meeting_result,memo,tm_sensitivity,contract_date,reservation_date")
      .order("id", { ascending: false }).limit(500);
    setContacts((data || []) as Contact[]);
    setLoading(false);
  };

  const activeFilters = [fCustomerType, fStage, fAssigned, fConsultant, fIntake].filter(Boolean).length;
  const filtered = contacts.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!((c.name||"").toLowerCase().includes(q) || (c.title||"").toLowerCase().includes(q) || (c.phone||"").includes(q))) return false;
    }
    if (fCustomerType && c.customer_type !== fCustomerType) return false;
    if (fStage && c.management_stage !== fStage) return false;
    if (fAssigned && c.assigned_to !== fAssigned) return false;
    if (fConsultant && c.consultant !== fConsultant) return false;
    if (fIntake && c.intake_route !== fIntake) return false;
    return true;
  });

  const getColumnContacts = (colKey: string) => {
    return filtered.filter(c => {
      // 예약완료/계약완료는 meeting_result 기반
      if (colKey === "계약완료") return c.meeting_result === "계약완료";
      if (colKey === "예약완료") return c.meeting_result === "예약완료";
      // 나머지는 management_stage 기반 (단, 계약완료/예약완료 고객 제외)
      const isCompleted = c.meeting_result === "계약완료" || c.meeting_result === "예약완료";
      if (isCompleted) return false;
      // 딜클로징 매핑 (DB에 "딜크로징"으로 저장됨)
      if (colKey === "딜클로징") return c.management_stage === "딜크로징";
      return c.management_stage === colKey;
    });
  };

  const totalDisplayed = COLUMNS.reduce((sum, col) => sum + getColumnContacts(col.key).length, 0);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <div className="px-6 py-4 flex-shrink-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>🗺️ 고객여정</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>고객 관리구간 기반 파이프라인</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>
              전체 <span className="font-bold" style={{ color: "#3b82f6" }}>{totalDisplayed}</span>명 표시
              {search || activeFilters > 0 ? ` (전체 ${contacts.length}명)` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />실시간
          </div>
        </div>

        {/* 검색 + 필터 (고객등록과 동일) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="고객명, 직급, 연락처 검색..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl focus:outline-none focus:border-blue-400"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          {[
            { val: fIntake, set: setFIntake, opts: OPT.intake_route, ph: "유입경로" },
            { val: fCustomerType, set: setFCustomerType, opts: OPT.customer_type, ph: "고객유형" },
            { val: fStage, set: setFStage, opts: OPT.management_stage, ph: "관리구간" },
          ].map(s => (
            <select key={s.ph} value={s.val} onChange={e => s.set(e.target.value)}
              className="appearance-none px-2.5 py-2 text-xs rounded-xl focus:outline-none focus:border-blue-400"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 100, maxWidth: 130 }}>
              <option value="">{s.ph}</option>
              {s.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <select value={fAssigned} onChange={e => setFAssigned(e.target.value)}
            className="appearance-none px-2.5 py-2 text-xs rounded-xl focus:outline-none focus:border-blue-400"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 110, maxWidth: 140 }}>
            <option value="">담당자</option>
            {TEAM.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={fConsultant} onChange={e => setFConsultant(e.target.value)}
            className="appearance-none px-2.5 py-2 text-xs rounded-xl focus:outline-none focus:border-blue-400"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 110, maxWidth: 140 }}>
            <option value="">담당컨설턴트</option>
            {CONSULTANTS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => { setSearch(""); setFCustomerType(""); setFStage(""); setFAssigned(""); setFConsultant(""); setFIntake(""); }}
            className={`px-2.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${activeFilters > 0 || search ? "bg-red-500 text-white border border-red-500" : "text-red-400 border border-red-200"}`}>
            ↺ 초기화
          </button>
        </div>
      </div>

      {/* 파이프라인 칸반 */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-3 h-full" style={{ gridTemplateColumns: "repeat(6, minmax(180px, 1fr))", minWidth: "1100px" }}>
            {COLUMNS.map(col => {
              const colContacts = getColumnContacts(col.key);
              return (
                <div key={col.key} className="flex flex-col rounded-2xl overflow-hidden min-w-0"
                  style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                  {/* 컬럼 헤더 */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${col.border}` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                      <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{col.label}</span>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: `${col.color}20`, color: col.color }}>
                      {colContacts.length}
                    </span>
                  </div>

                  {/* 카드 리스트 */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {colContacts.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-sm" style={{ color: "var(--text-subtle)" }}>없음</div>
                    ) : (
                      colContacts.map(c => {
                        const isExpanded = expandedId === c.id;
                        const avatarColor = getAvatarColor(c.name);
                        return (
                          <div key={c.id} className="rounded-xl overflow-hidden transition-shadow"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            {/* 카드 헤더 (클릭으로 토글) */}
                            <div className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer"
                              onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                              {/* 아바타 */}
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: avatarColor }}>
                                {c.name[0]}
                              </div>
                              {/* 이름+직급 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{c.name}</span>
                                  {c.title && <span className="text-[11px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>{c.title}</span>}
                                </div>
                                {c.assigned_to && (
                                  <span className="text-[10px] font-semibold" style={{ color: "#8b5cf6" }}>{c.assigned_to}</span>
                                )}
                              </div>
                              {/* 토글 아이콘 */}
                              {isExpanded
                                ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} />
                                : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
                            </div>

                            {/* 확장 상세 */}
                            {isExpanded && (
                              <div className="px-3 pb-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                                {/* 기본 정보 */}
                                <div className="pt-2 space-y-1.5">
                                  {c.phone && (
                                    <div className="flex items-center gap-1.5">
                                      <Phone size={11} style={{ color: "var(--text-subtle)" }} />
                                      <span className="text-[11px]" style={{ color: "var(--text)" }}>{c.phone}</span>
                                    </div>
                                  )}
                                  {c.meeting_date && (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar size={11} style={{ color: "#3b82f6" }} />
                                      <span className="text-[11px] font-semibold" style={{ color: "#3b82f6" }}>
                                        {new Date(c.meeting_date + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                                      </span>
                                      {c.meeting_address && (
                                        <>
                                          <MapPin size={10} style={{ color: "var(--text-subtle)" }} />
                                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{c.meeting_address}</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* 상세 필드 */}
                                <div className="grid grid-cols-2 gap-1.5">
                                  {[
                                    { label: "유입경로", value: c.intake_route },
                                    { label: "고객유형", value: c.customer_type },
                                    { label: "가망구분", value: c.prospect_type },
                                    { label: "담당컨설턴트", value: c.consultant },
                                    { label: "미팅결과", value: c.meeting_result },
                                    { label: "계약일", value: c.contract_date },
                                  ].map(item => (
                                    <div key={item.label}>
                                      <p className="text-[9px] font-semibold" style={{ color: "var(--text-subtle)" }}>{item.label}</p>
                                      <p className="text-[11px] font-semibold" style={{ color: item.value ? "var(--text)" : "var(--text-subtle)" }}>
                                        {item.value || "-"}
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                {/* 메모 */}
                                {c.memo && (
                                  <div className="rounded-lg px-2 py-1.5" style={{ background: "var(--bg)" }}>
                                    <p className="text-[9px] font-semibold mb-0.5" style={{ color: "var(--text-subtle)" }}>메모</p>
                                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{c.memo}</p>
                                  </div>
                                )}

                                {/* 활동노트 */}
                                <div className="rounded-lg p-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[10px] font-bold" style={{ color: "var(--text)" }}>📝 활동노트</p>
                                    <button
                                      onClick={e => { e.stopPropagation(); setNotesPopup({ contactId: c.id, name: c.name }); }}
                                      className="text-[10px] font-semibold hover:underline" style={{ color: "#3b82f6" }}>
                                      전체보기 →
                                    </button>
                                  </div>
                                  <ContactNotes contactId={c.id} compact />
                                </div>

                                {/* 상세 페이지 링크 */}
                                <a href={`/contacts/${c.id}`}
                                  className="block text-center text-[11px] font-semibold py-1.5 rounded-lg transition-colors"
                                  style={{ background: "var(--bg)", color: "#3b82f6", border: "1px solid var(--border)" }}>
                                  상세 페이지 →
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setNotesPopup(null)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-base">📝</span>
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{notesPopup.name}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>활동노트</span>
              </div>
              <button onClick={() => setNotesPopup(null)} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ContactNotes contactId={notesPopup.contactId} authorName={userName} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
