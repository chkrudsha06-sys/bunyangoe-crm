"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, TEAM_MEMBERS, RESULT_COLORS, PROSPECT_COLORS, SENSITIVITY_COLORS } from "@/lib/supabase";
import { Contact, TeamMember, MeetingResult, ProspectType, TmSensitivity } from "@/types";
import { Search, Plus, Filter, X, Phone, MapPin, Calendar, ChevronDown } from "lucide-react";
import ContactModal from "@/components/ContactModal";

const PAGE_SIZE = 50;

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // 필터 상태
  const [search, setSearch] = useState("");
  const [filterMember, setFilterMember] = useState<string>("");
  const [filterResult, setFilterResult] = useState<string>("");
  const [filterProspect, setFilterProspect] = useState<string>("");
  const [filterSensitivity, setFilterSensitivity] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,memo.ilike.%${search}%,meeting_address.ilike.%${search}%`);
    }
    if (filterMember) query = query.eq("assigned_to", filterMember);
    if (filterResult) {
      if (filterResult === "없음") query = query.is("meeting_result", null);
      else query = query.eq("meeting_result", filterResult);
    }
    if (filterProspect) {
      if (filterProspect === "없음") query = query.is("prospect_type", null);
      else query = query.eq("prospect_type", filterProspect);
    }
    if (filterSensitivity) query = query.eq("tm_sensitivity", filterSensitivity);
    if (filterType) query = query.eq("customer_type", filterType);

    const { data, count } = await query;
    setContacts((data as Contact[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, filterMember, filterResult, filterProspect, filterSensitivity, filterType]);

  useEffect(() => {
    setPage(0);
  }, [search, filterMember, filterResult, filterProspect, filterSensitivity, filterType]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSave = async (data: Partial<Contact>) => {
    if (editContact) {
      await supabase.from("contacts").update(data).eq("id", editContact.id);
    } else {
      await supabase.from("contacts").insert(data);
    }
    fetchContacts();
    setModalOpen(false);
    setEditContact(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm("이 고객을 삭제하시겠습니까?")) {
      await supabase.from("contacts").delete().eq("id", id);
      fetchContacts();
    }
  };

  const activeFilters = [filterMember, filterResult, filterProspect, filterSensitivity, filterType].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* 상단 바 */}
      <div className="px-6 py-4 border-b border-brand-border bg-brand-navy sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              type="text"
              placeholder="이름, 연락처, 메모, 지역 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm bg-brand-surface border border-brand-border rounded-lg focus:outline-none focus:border-brand-gold"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              showFilters || activeFilters > 0
                ? "bg-brand-gold/10 border-brand-gold/30 text-brand-gold"
                : "border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            <Filter size={14} />
            필터
            {activeFilters > 0 && (
              <span className="bg-brand-gold text-brand-navy text-xs font-bold px-1.5 rounded-full">
                {activeFilters}
              </span>
            )}
          </button>

          <button
            onClick={() => { setEditContact(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-brand-gold text-brand-navy font-semibold rounded-lg hover:bg-brand-gold-light transition-colors"
          >
            <Plus size={14} />
            신규 등록
          </button>
        </div>

        {/* 필터 패널 */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg"
            >
              <option value="">전체 담당자</option>
              {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg"
            >
              <option value="">신규/기고객</option>
              <option value="신규">신규</option>
              <option value="기고객">기고객</option>
            </select>

            <select
              value={filterSensitivity}
              onChange={(e) => setFilterSensitivity(e.target.value)}
              className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg"
            >
              <option value="">TM감도</option>
              <option value="상">상</option>
              <option value="중">중</option>
              <option value="하">하</option>
            </select>

            <select
              value={filterProspect}
              onChange={(e) => setFilterProspect(e.target.value)}
              className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg"
            >
              <option value="">가망구분</option>
              <option value="즉가입가망">즉가입가망</option>
              <option value="미팅예정가망">미팅예정가망</option>
              <option value="연계매출가망고객">연계매출가망고객</option>
              <option value="없음">미분류</option>
            </select>

            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg"
            >
              <option value="">미팅결과</option>
              <option value="계약완료">계약완료</option>
              <option value="예약완료">예약완료</option>
              <option value="서류만수취">서류만수취</option>
              <option value="미팅후가망관리">미팅후가망관리</option>
              <option value="계약거부">계약거부</option>
              <option value="미팅불발">미팅불발</option>
              <option value="없음">결과없음</option>
            </select>

            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setFilterMember(""); setFilterResult(""); setFilterProspect("");
                  setFilterSensitivity(""); setFilterType("");
                }}
                className="flex items-center gap-1 text-sm text-red-400 px-2 py-1.5 hover:bg-red-500/10 rounded-lg"
              >
                <X size={12} /> 초기화
              </button>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between">
          <p className="text-brand-muted text-xs">
            총 <span className="text-brand-gold font-semibold">{total.toLocaleString()}</span>건
          </p>
          <div className="flex items-center gap-1 text-xs text-brand-muted">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 rounded hover:bg-brand-surface disabled:opacity-30"
            >
              이전
            </button>
            <span>{page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded hover:bg-brand-surface disabled:opacity-30"
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-brand-navy-light border-b border-brand-border">
              <tr>
                {["고객명", "연락처", "담당", "유형", "TM감도", "가망구분", "미팅일정", "지역", "미팅결과", "비고", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-brand-muted text-xs font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="table-row-hover border-b border-brand-border/30">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-brand-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-gold text-xs">{c.name[0]}</span>
                      </div>
                      <span className="text-brand-text font-medium truncate max-w-[120px]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-brand-muted flex items-center gap-1">
                      <Phone size={10} />
                      {c.phone || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-brand-text text-xs px-2 py-0.5 bg-brand-border rounded-full">{c.assigned_to}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${c.customer_type === "기고객" ? "bg-amber-500/20 text-amber-300" : "bg-gray-500/20 text-gray-400"}`}>
                      {c.customer_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {c.tm_sensitivity ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${SENSITIVITY_COLORS[c.tm_sensitivity] || ""}`}>
                        {c.tm_sensitivity}
                      </span>
                    ) : <span className="text-brand-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.prospect_type ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${PROSPECT_COLORS[c.prospect_type] || ""}`}>
                        {c.prospect_type}
                      </span>
                    ) : <span className="text-brand-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.meeting_date ? (
                      <span className="text-brand-muted flex items-center gap-1 text-xs">
                        <Calendar size={10} />
                        {new Date(c.meeting_date).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                      </span>
                    ) : <span className="text-brand-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-brand-muted flex items-center gap-1 text-xs truncate max-w-[80px]">
                      {c.meeting_address ? <><MapPin size={10} />{c.meeting_address}</> : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {c.meeting_result ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${RESULT_COLORS[c.meeting_result] || ""}`}>
                        {c.meeting_result}
                      </span>
                    ) : <span className="text-brand-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5 max-w-[160px]">
                    <p className="text-brand-muted text-xs truncate">{c.memo || "-"}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditContact(c); setModalOpen(true); }}
                        className="text-xs text-brand-muted hover:text-brand-gold px-2 py-1 rounded hover:bg-brand-gold/10"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-brand-muted hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 고객 등록/수정 모달 */}
      {modalOpen && (
        <ContactModal
          contact={editContact}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditContact(null); }}
        />
      )}
    </div>
  );
}
