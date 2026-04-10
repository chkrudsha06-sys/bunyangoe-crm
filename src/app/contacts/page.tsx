"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, TEAM_MEMBERS, RESULT_COLORS, PROSPECT_COLORS, SENSITIVITY_COLORS } from "@/lib/supabase";
import { Contact, TeamMember } from "@/types";
import { Search, Plus, Filter, X, Phone, MapPin, Calendar } from "lucide-react";
import ContactModal from "@/components/ContactModal";

const PAGE_SIZE = 50;

function InlineSelect({ value, options, placeholder, colorMap, onSave }: {
  value: string | null;
  options: { value: string; label: string }[];
  placeholder: string;
  colorMap?: Record<string, string>;
  onSave: (val: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} className="cursor-pointer min-w-[80px]">
        {value ? (
          <span className={`text-xs px-1.5 py-0.5 rounded border ${colorMap?.[value] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>{value}</span>
        ) : (
          <span className="text-brand-border text-xs hover:text-brand-muted border border-dashed border-brand-border/50 px-1.5 py-0.5 rounded">{placeholder}</span>
        )}
      </div>
    );
  }
  return (
    <select autoFocus value={value || ""} onChange={(e) => { onSave(e.target.value || null); setEditing(false); }} onBlur={() => setEditing(false)} className="text-xs px-1.5 py-0.5 bg-brand-surface border border-brand-gold rounded focus:outline-none">
      <option value="">없음</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function InlineText({ value, placeholder, icon, onSave }: {
  value: string | null; placeholder: string; icon?: React.ReactNode; onSave: (val: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const handleSave = () => { onSave(draft || null); setEditing(false); };
  if (!editing) {
    return (
      <div onClick={() => { setDraft(value || ""); setEditing(true); }} className="cursor-pointer min-w-[60px]">
        {value ? (
          <span className="text-brand-muted text-xs flex items-center gap-1">{icon}{value}</span>
        ) : (
          <span className="text-brand-border text-xs hover:text-brand-muted border border-dashed border-brand-border/50 px-1.5 py-0.5 rounded">{placeholder}</span>
        )}
      </div>
    );
  }
  return (
    <input autoFocus type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
      onBlur={handleSave} className="text-xs px-1.5 py-0.5 bg-brand-surface border border-brand-gold rounded focus:outline-none w-28" placeholder={placeholder} />
  );
}

function InlineMeetingDate({ value, onSave }: { value: string | null; onSave: (val: string | null) => void; }) {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"date" | "text">("date");
  const [draft, setDraft] = useState(value || "");
  const handleSave = () => { onSave(draft || null); setEditing(false); };
  const isDate = value && /^\d{4}-\d{2}-\d{2}/.test(value);
  if (!editing) {
    return (
      <div onClick={() => { setDraft(value || ""); setEditing(true); }} className="cursor-pointer min-w-[70px]">
        {value ? (
          <span className="text-blue-400 text-xs flex items-center gap-1">
            <Calendar size={10} />{isDate ? new Date(value).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : value}
          </span>
        ) : (
          <span className="text-brand-border text-xs hover:text-brand-muted border border-dashed border-brand-border/50 px-1.5 py-0.5 rounded">날짜입력</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 bg-brand-surface border border-brand-gold rounded p-2 z-20 shadow-lg absolute">
      <div className="flex gap-1 mb-1">
        <button onClick={() => setMode("date")} className={`text-xs px-2 py-0.5 rounded ${mode === "date" ? "bg-brand-gold text-brand-navy" : "text-brand-muted"}`}>날짜선택</button>
        <button onClick={() => setMode("text")} className={`text-xs px-2 py-0.5 rounded ${mode === "text" ? "bg-brand-gold text-brand-navy" : "text-brand-muted"}`}>텍스트</button>
      </div>
      {mode === "date" ? (
        <input autoFocus type="date" value={draft.split("T")[0] || ""} onChange={(e) => setDraft(e.target.value)} onBlur={handleSave} className="text-xs px-1.5 py-0.5 bg-brand-navy border border-brand-border rounded focus:outline-none" />
      ) : (
        <input autoFocus type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }} onBlur={handleSave} placeholder="예: 4월 중, 미정" className="text-xs px-1.5 py-0.5 bg-brand-navy border border-brand-border rounded focus:outline-none w-32" />
      )}
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterProspect, setFilterProspect] = useState("");
  const [filterSensitivity, setFilterSensitivity] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("contacts").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,memo.ilike.%${search}%,meeting_address.ilike.%${search}%`);
    if (filterMember) query = query.eq("assigned_to", filterMember);
    if (filterResult) { if (filterResult === "없음") query = query.is("meeting_result", null); else query = query.eq("meeting_result", filterResult); }
    if (filterProspect) { if (filterProspect === "없음") query = query.is("prospect_type", null); else query = query.eq("prospect_type", filterProspect); }
    if (filterSensitivity) query = query.eq("tm_sensitivity", filterSensitivity);
    if (filterType) query = query.eq("customer_type", filterType);
    const { data, count } = await query;
    setContacts((data as Contact[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, filterMember, filterResult, filterProspect, filterSensitivity, filterType]);

  useEffect(() => { setPage(0); }, [search, filterMember, filterResult, filterProspect, filterSensitivity, filterType]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const updateField = async (id: number, field: string, value: string | null) => {
    await supabase.from("contacts").update({ [field]: value }).eq("id", id);
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async (data: Partial<Contact>) => {
    if (editContact) await supabase.from("contacts").update(data).eq("id", editContact.id);
    else await supabase.from("contacts").insert(data);
    fetchContacts(); setModalOpen(false); setEditContact(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm("이 고객을 삭제하시겠습니까?")) { await supabase.from("contacts").delete().eq("id", id); fetchContacts(); }
  };

  const activeFilters = [filterMember, filterResult, filterProspect, filterSensitivity, filterType].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-brand-border bg-brand-navy sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input type="text" placeholder="이름, 연락처, 메모, 지역 검색..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-4 py-2 text-sm bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:border-brand-gold" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${showFilters || activeFilters > 0 ? "bg-brand-gold/10 border-brand-gold/30 text-brand-gold" : "border-brand-border text-brand-muted hover:text-brand-text"}`}>
            <Filter size={14} />필터{activeFilters > 0 && <span className="bg-brand-gold text-brand-navy text-xs font-bold px-1.5 rounded-full">{activeFilters}</span>}
          </button>
          <button onClick={() => { setEditContact(null); setModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-gold text-brand-navy font-semibold rounded-lg hover:bg-brand-gold-light transition-colors">
            <Plus size={14} />신규 등록
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg">
              <option value="">전체 담당자</option>{TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg">
              <option value="">신규/기고객</option><option value="신규">신규</option><option value="기고객">기고객</option>
            </select>
            <select value={filterSensitivity} onChange={(e) => setFilterSensitivity(e.target.value)} className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg">
              <option value="">TM감도</option><option value="상">상</option><option value="중">중</option><option value="하">하</option>
            </select>
            <select value={filterProspect} onChange={(e) => setFilterProspect(e.target.value)} className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg">
              <option value="">가망구분</option><option value="즉가입가망">즉가입가망</option><option value="미팅예정가망">미팅예정가망</option><option value="연계매출가망고객">연계매출가망고객</option><option value="없음">미분류</option>
            </select>
            <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg">
              <option value="">미팅결과</option><option value="계약완료">계약완료</option><option value="예약완료">예약완료</option><option value="서류만수취">서류만수취</option><option value="미팅후가망관리">미팅후가망관리</option><option value="계약거부">계약거부</option><option value="미팅불발">미팅불발</option><option value="없음">결과없음</option>
            </select>
            {activeFilters > 0 && <button onClick={() => { setFilterMember(""); setFilterResult(""); setFilterProspect(""); setFilterSensitivity(""); setFilterType(""); }} className="flex items-center gap-1 text-sm text-red-400 px-2 py-1.5 hover:bg-red-500/10 rounded-lg"><X size={12} /> 초기화</button>}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-brand-muted text-xs">총 <span className="text-brand-gold font-semibold">{total.toLocaleString()}</span>건</p>
            <p className="text-brand-muted text-xs">· ✏️ 표시 셀은 클릭하면 바로 수정</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-brand-muted">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 rounded hover:bg-brand-surface disabled:opacity-30">이전</button>
            <span>{page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 rounded hover:bg-brand-surface disabled:opacity-30">다음</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-brand-navy-light border-b border-brand-border z-10">
              <tr>
                {["고객명", "연락처", "담당", "유형", "TM감도 ✏️", "가망구분 ✏️", "미팅일정 ✏️", "지역 ✏️", "미팅결과 ✏️", "비고 ✏️", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-brand-muted text-xs font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="table-row-hover border-b border-brand-border/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-brand-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-gold text-xs">{c.name[0]}</span>
                      </div>
                      <span className="text-brand-text font-medium truncate max-w-[110px] text-xs">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2"><span className="text-brand-muted text-xs flex items-center gap-1"><Phone size={9} />{c.phone || "-"}</span></td>
                  <td className="px-3 py-2"><span className="text-brand-text text-xs px-1.5 py-0.5 bg-brand-border rounded-full">{c.assigned_to}</span></td>
                  <td className="px-3 py-2"><span className={`text-xs px-1.5 py-0.5 rounded ${c.customer_type === "기고객" ? "bg-amber-500/20 text-amber-300" : "bg-gray-500/20 text-gray-400"}`}>{c.customer_type}</span></td>
                  <td className="px-3 py-2">
                    <InlineSelect value={c.tm_sensitivity} options={[{value:"상",label:"상"},{value:"중",label:"중"},{value:"하",label:"하"}]} placeholder="감도" colorMap={SENSITIVITY_COLORS} onSave={(val) => updateField(c.id, "tm_sensitivity", val)} />
                  </td>
                  <td className="px-3 py-2">
                    <InlineSelect value={c.prospect_type} options={[{value:"즉가입가망",label:"즉가입가망"},{value:"미팅예정가망",label:"미팅예정가망"},{value:"연계매출가망고객",label:"연계매출가망"}]} placeholder="가망" colorMap={PROSPECT_COLORS} onSave={(val) => updateField(c.id, "prospect_type", val)} />
                  </td>
                  <td className="px-3 py-2 relative">
                    <InlineMeetingDate value={c.meeting_date} onSave={(val) => updateField(c.id, "meeting_date", val)} />
                  </td>
                  <td className="px-3 py-2">
                    <InlineText value={c.meeting_address} placeholder="지역" icon={<MapPin size={9} />} onSave={(val) => updateField(c.id, "meeting_address", val)} />
                  </td>
                  <td className="px-3 py-2">
                    <InlineSelect value={c.meeting_result} options={[{value:"계약완료",label:"계약완료"},{value:"예약완료",label:"예약완료"},{value:"서류만수취",label:"서류만수취"},{value:"미팅후가망관리",label:"미팅후가망관리"},{value:"계약거부",label:"계약거부"},{value:"미팅불발",label:"미팅불발"}]} placeholder="결과" colorMap={RESULT_COLORS} onSave={(val) => updateField(c.id, "meeting_result", val)} />
                  </td>
                  <td className="px-3 py-2 max-w-[140px]">
                    <InlineText value={c.memo ? c.memo.substring(0, 25) + (c.memo.length > 25 ? "..." : "") : null} placeholder="메모" onSave={(val) => updateField(c.id, "memo", val)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditContact(c); setModalOpen(true); }} className="text-xs text-brand-muted hover:text-brand-gold px-2 py-1 rounded hover:bg-brand-gold/10">수정</button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-brand-muted hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modalOpen && <ContactModal contact={editContact} onSave={handleSave} onClose={() => { setModalOpen(false); setEditContact(null); }} />}
    </div>
  );
}
