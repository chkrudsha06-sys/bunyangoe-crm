"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { Search, Plus, X, ChevronRight } from "lucide-react";

interface Member {
  id: number; name: string; title: string | null; bunyanghoe_number: string | null;
  assigned_to: string | null; contract_date: string | null; meeting_result: string | null;
}

interface TimelineEvent {
  id: string; date: string; type: string; title: string; detail: string;
  source: string; color: string; icon: string; sourceId?: number;
}

const EVENT_COLORS: Record<string, { color: string; icon: string }> = {
  "가입": { color: "#8b5cf6", icon: "🎉" },
  "사진수취": { color: "#ec4899", icon: "📸" },
  "정보수취": { color: "#3b82f6", icon: "📋" },
  "TF2전달": { color: "#f59e0b", icon: "📤" },
  "PR완료": { color: "#10b981", icon: "✅" },
  "제작불가": { color: "#ef4444", icon: "🚫" },
  "광고집행": { color: "#06b6d4", icon: "📡" },
  "활동노트": { color: "#6366f1", icon: "📝" },
  "수동": { color: "#f97316", icon: "🔧" },
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}
function fmtFull(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

export default function MemberTimelinePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [userName, setUserName] = useState("");
  const [toast, setToast] = useState("");
  const [detailEvent, setDetailEvent] = useState<TimelineEvent | null>(null);

  // 이벤트 추가 모달
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ event_type: "수동", event_title: "", event_detail: "", event_date: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    const u = getCurrentUser();
    if (u) setUserName(u.name);
    fetchMembers();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase.from("contacts")
      .select("id,name,title,bunyanghoe_number,assigned_to,contract_date,meeting_result")
      .in("meeting_result", ["계약완료", "예약완료"])
      .order("contract_date", { ascending: true });
    setMembers(data || []);
    setLoading(false);
  };

  const loadTimeline = async (contactId: number) => {
    setEventsLoading(true);
    const allEvents: TimelineEvent[] = [];
    const member = members.find(m => m.id === contactId);

    // 1. 가입일
    if (member?.contract_date) {
      allEvents.push({
        id: `join-${contactId}`, date: member.contract_date, type: "가입",
        title: "분양회 가입", detail: `${member.meeting_result} · ${member.contract_date}`,
        source: "contacts", color: EVENT_COLORS["가입"].color, icon: EVENT_COLORS["가입"].icon,
      });
    }

    // 2. PR 상태 (content_statuses)
    const { data: cs } = await supabase.from("content_statuses")
      .select("*").eq("contact_id", contactId).single();
    if (cs) {
      const baseDate = cs.updated_at ? cs.updated_at.split("T")[0] : member?.contract_date || "";
      if (cs.photo_received) allEvents.push({ id: `cs-photo-${contactId}`, date: baseDate, type: "사진수취", title: "사진 수취 완료", detail: "PR패키지용 사진 수취", source: "content_statuses", color: EVENT_COLORS["사진수취"].color, icon: EVENT_COLORS["사진수취"].icon });
      if (cs.info_received) allEvents.push({ id: `cs-info-${contactId}`, date: baseDate, type: "정보수취", title: "기본정보 수취 완료", detail: "PR패키지 기본정보 입력 완료", source: "content_statuses", color: EVENT_COLORS["정보수취"].color, icon: EVENT_COLORS["정보수취"].icon });
      if (cs.tf2_delivered) allEvents.push({ id: `cs-tf2-${contactId}`, date: baseDate, type: "TF2전달", title: "TF2팀 전달 완료", detail: "콘텐츠 제작팀에 자료 전달", source: "content_statuses", color: EVENT_COLORS["TF2전달"].color, icon: EVENT_COLORS["TF2전달"].icon });
      if (cs.pr_completed) allEvents.push({ id: `cs-pr-${contactId}`, date: baseDate, type: "PR완료", title: "PR패키지 제작 완료", detail: "PR패키지 7종 제작 완료", source: "content_statuses", color: EVENT_COLORS["PR완료"].color, icon: EVENT_COLORS["PR완료"].icon });
      if (cs.production_impossible) allEvents.push({ id: `cs-imp-${contactId}`, date: baseDate, type: "제작불가", title: "제작불가 처리", detail: cs.impossible_reason || "사유 미기재", source: "content_statuses", color: EVENT_COLORS["제작불가"].color, icon: EVENT_COLORS["제작불가"].icon });
    }

    // 3. 광고집행 (ad_executions)
    const { data: ads } = await supabase.from("ad_executions")
      .select("id,channel,execution_amount,payment_date,member_name,bunyanghoe_number")
      .or(`member_name.eq.${member?.name},bunyanghoe_number.eq.${member?.bunyanghoe_number}`)
      .order("payment_date", { ascending: true });
    (ads || []).forEach(ad => {
      allEvents.push({
        id: `ad-${ad.id}`, date: ad.payment_date || "", type: "광고집행",
        title: `${ad.channel} 집행`, detail: `채널: ${ad.channel}\n금액: ${(ad.execution_amount || 0).toLocaleString()}원\n일자: ${ad.payment_date}`,
        source: "ad_executions", sourceId: ad.id,
        color: EVENT_COLORS["광고집행"].color, icon: EVENT_COLORS["광고집행"].icon,
      });
    });

    // 4. 활동노트 (contact_notes)
    const { data: notes } = await supabase.from("contact_notes")
      .select("id,note_date,content,author")
      .eq("contact_id", contactId).order("note_date", { ascending: true });
    (notes || []).forEach(n => {
      allEvents.push({
        id: `note-${n.id}`, date: n.note_date, type: "활동노트",
        title: `활동노트 (${n.author || ""})`, detail: n.content,
        source: "contact_notes", sourceId: n.id,
        color: EVENT_COLORS["활동노트"].color, icon: EVENT_COLORS["활동노트"].icon,
      });
    });

    // 5. 수동 이벤트 (member_timeline)
    const { data: manual } = await supabase.from("member_timeline")
      .select("*").eq("contact_id", contactId).order("event_date", { ascending: true });
    (manual || []).forEach(ev => {
      const evType = ev.event_type || "수동";
      const ec = EVENT_COLORS[evType] || EVENT_COLORS["수동"];
      allEvents.push({
        id: `mt-${ev.id}`, date: ev.event_date, type: evType,
        title: ev.event_title, detail: ev.event_detail || "",
        source: "member_timeline", sourceId: ev.id,
        color: ec.color, icon: ec.icon,
      });
    });

    // 날짜순 정렬
    allEvents.sort((a, b) => a.date.localeCompare(b.date));
    setEvents(allEvents);
    setEventsLoading(false);
  };

  const selectMember = (id: number) => {
    setSelectedId(id);
    setDetailEvent(null);
    loadTimeline(id);
  };

  const handleAddEvent = async () => {
    if (!selectedId || !addForm.event_title) { showToast("제목을 입력하세요"); return; }
    await supabase.from("member_timeline").insert({
      contact_id: selectedId,
      event_type: addForm.event_type,
      event_title: addForm.event_title,
      event_detail: addForm.event_detail,
      event_date: addForm.event_date,
      created_by: userName,
    });
    showToast("이벤트 추가 완료");
    setShowAdd(false);
    setAddForm({ event_type: "수동", event_title: "", event_detail: "", event_date: new Date().toISOString().split("T")[0] });
    loadTimeline(selectedId);
  };

  const handleDeleteEvent = async (ev: TimelineEvent) => {
    if (ev.source !== "member_timeline") { showToast("수동 이벤트만 삭제 가능합니다"); return; }
    if (!confirm("이벤트를 삭제하시겠습니까?")) return;
    await supabase.from("member_timeline").delete().eq("id", ev.sourceId);
    showToast("이벤트 삭제 완료");
    setDetailEvent(null);
    if (selectedId) loadTimeline(selectedId);
  };

  const filtered = members.filter(m => {
    if (search) {
      const q = search.toLowerCase();
      if (!(m.name.toLowerCase().includes(q) || (m.bunyanghoe_number || "").toLowerCase().includes(q))) return false;
    }
    if (filterAssigned && m.assigned_to !== filterAssigned) return false;
    return true;
  });

  const assignedList = Array.from(new Set(members.map(m => m.assigned_to).filter(Boolean))).sort();
  const selectedMember = members.find(m => m.id === selectedId);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <div className="px-6 py-4 flex-shrink-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>📅 분양회 타임라인</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>분양회 입회자별 프로세스 진행 현황</p>
      </div>

      {/* 필터 */}
      <div className="px-6 py-3 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="고객명, 넘버링 검색..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl focus:outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>
        <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="">전체 담당자</option>
          {assignedList.map(a => <option key={a} value={a!}>{a}</option>)}
        </select>
      </div>

      {/* 메인: 좌측 목록 + 우측 타임라인 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 회원 목록 */}
        <div className="overflow-y-auto pb-4" style={{ width: 280, flexShrink: 0, borderRight: "1px solid var(--border)" }}>
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
          ) : (
            <div className="px-2 pt-2">
              <p className="text-[10px] px-2 py-1" style={{ color: "var(--text-muted)" }}>총 {filtered.length}명</p>
              {filtered.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer mb-0.5 transition-colors"
                  onClick={() => selectMember(m.id)}
                  style={{
                    background: selectedId === m.id ? "rgba(59,130,246,0.08)" : "transparent",
                    border: selectedId === m.id ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent",
                  }}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", minWidth: 32, textAlign: "center" }}>
                    {m.bunyanghoe_number ? `B-${m.bunyanghoe_number.replace(/[^0-9]/g, "")}` : "-"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{m.name}</span>
                      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{m.title || ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {m.assigned_to && <span className="text-[10px] font-semibold" style={{ color: "#8b5cf6" }}>{m.assigned_to}</span>}
                      {m.contract_date && <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{fmtDate(m.contract_date)}</span>}
                    </div>
                  </div>
                  <ChevronRight size={12} style={{ color: "var(--text-subtle)" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 우측: 타임라인 */}
        <div className="flex-1 overflow-y-auto">
          {!selectedMember ? (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--text-subtle)" }}>
              <div className="text-center">
                <p className="text-2xl mb-2">👈</p>
                <p className="text-sm">좌측에서 회원을 선택해주세요</p>
              </div>
            </div>
          ) : (
            <div className="p-5">
              {/* 회원 헤더 */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
                    {selectedMember.bunyanghoe_number ? `B-${selectedMember.bunyanghoe_number.replace(/[^0-9]/g, "")}` : "-"}
                  </span>
                  <span className="text-lg font-bold" style={{ color: "var(--text)" }}>{selectedMember.name}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{selectedMember.title || ""}</span>
                  {selectedMember.assigned_to && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{selectedMember.assigned_to}</span>}
                </div>
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  <Plus size={13} /> 이벤트 추가
                </button>
              </div>

              {/* 이벤트 요약 뱃지 */}
              <div className="flex items-center gap-2 flex-wrap mb-5">
                {Object.entries(EVENT_COLORS).map(([type, { color, icon }]) => {
                  const count = events.filter(e => e.type === type).length;
                  if (!count) return null;
                  return (
                    <span key={type} className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                      style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
                      {icon} {type} {count}
                    </span>
                  );
                })}
                <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>총 {events.length}건</span>
              </div>

              {/* 타임라인 */}
              {eventsLoading ? (
                <div className="flex justify-center py-10"><div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
              ) : events.length === 0 ? (
                <div className="text-center py-10" style={{ color: "var(--text-subtle)" }}>등록된 이벤트가 없습니다</div>
              ) : (
                <div className="relative pl-8">
                  {/* 세로 라인 */}
                  <div className="absolute left-3.5 top-2 bottom-2 w-0.5 rounded-full" style={{ background: "var(--border)" }} />

                  {events.map((ev, idx) => {
                    const isSelected = detailEvent?.id === ev.id;
                    return (
                      <div key={ev.id} className="relative mb-1">
                        {/* 타임라인 점 */}
                        <div className="absolute -left-[18px] top-3 w-3 h-3 rounded-full border-2 z-10"
                          style={{ background: ev.color, borderColor: "var(--bg)" }} />

                        {/* 이벤트 카드 */}
                        <div className="rounded-xl p-3 cursor-pointer transition-all mb-1"
                          onClick={() => setDetailEvent(isSelected ? null : ev)}
                          style={{
                            background: isSelected ? `${ev.color}08` : "var(--surface)",
                            border: isSelected ? `1px solid ${ev.color}30` : "1px solid var(--border)",
                          }}>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{ev.icon}</span>
                            <span className="text-xs font-bold" style={{ color: ev.color }}>{fmtDate(ev.date)}</span>
                            <span className="text-sm font-bold flex-1" style={{ color: "var(--text)" }}>{ev.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${ev.color}12`, color: ev.color }}>{ev.type}</span>
                          </div>

                          {/* 상세 (클릭 시) */}
                          {isSelected && (
                            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${ev.color}20` }}>
                              <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{fmtFull(ev.date)}</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{ev.detail || "상세 내용 없음"}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>소스: {ev.source}</span>
                                {ev.source === "member_timeline" && (
                                  <button onClick={e => { e.stopPropagation(); handleDeleteEvent(ev); }}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded"
                                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>삭제</button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 이벤트 추가 모달 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowAdd(false)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-md"
            style={{ background: "var(--modal-bg)", border: "1px solid var(--border)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Plus size={16} style={{ color: "#3b82f6" }} />
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>이벤트 추가</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedMember?.name}</span>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1" style={{ color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>이벤트 유형</label>
                <select value={addForm.event_type} onChange={e => setAddForm(p => ({ ...p, event_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  <option value="수동">🔧 수동 (기타)</option>
                  <option value="사진수취">📸 사진수취</option>
                  <option value="정보수취">📋 정보수취</option>
                  <option value="TF2전달">📤 TF2전달</option>
                  <option value="PR완료">✅ PR완료</option>
                  <option value="광고집행">📡 광고집행</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>제목 *</label>
                <input type="text" value={addForm.event_title} onChange={e => setAddForm(p => ({ ...p, event_title: e.target.value }))}
                  placeholder="예: PR패키지 7종 작업요청" className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>날짜</label>
                <input type="date" value={addForm.event_date} onChange={e => setAddForm(p => ({ ...p, event_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>상세 내용</label>
                <textarea value={addForm.event_detail} onChange={e => setAddForm(p => ({ ...p, event_detail: e.target.value }))}
                  placeholder="상세 내용 (선택)" rows={3} className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 pb-4">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2 text-sm font-semibold rounded-xl" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>취소</button>
              <button onClick={handleAddEvent}
                className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700">등록</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
