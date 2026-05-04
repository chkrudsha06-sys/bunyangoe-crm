"use client";

import { useState, useEffect } from "react";
import { Search, Plus, ChevronDown, ChevronUp, Pencil, Trash2, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
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
  prospect_type: ["즉가입가망", "미팅예정가망", "연계매출가망"],
  meeting_result: ["계약완료", "예약완료", "서류만수취", "미팅후가망관리", "계약거부", "미팅불발"],
};
const EMPTY_FORM = {
  name: "", title: "", phone: "", customer_type: "", management_stage: "",
  assigned_to: "", consultant: "", intake_route: "", prospect_type: "",
  meeting_date: "", meeting_address: "", meeting_result: "", memo: "", tm_sensitivity: "",
};

export default function CustomerRegisterPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState("");
  const [toast, setToast] = useState("");
  const [notesPopup, setNotesPopup] = useState<{ contactId: number; name: string } | null>(null);

  // 검색/필터
  const [search, setSearch] = useState("");
  const [fCustomerType, setFCustomerType] = useState("");
  const [fStage, setFStage] = useState("");
  const [fAssigned, setFAssigned] = useState("");
  const [fConsultant, setFConsultant] = useState("");
  const [fIntake, setFIntake] = useState("");

  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      setUserName(u.name);
      if (u.role === "exec") setForm(f => ({ ...f, assigned_to: u.name }));
    }
    fetchContacts();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const fetchContacts = async () => {
    setLoading(true);
    const { data } = await supabase.from("contacts")
      .select("id,name,title,phone,customer_type,prospect_type,management_stage,assigned_to,consultant,intake_route,meeting_date,meeting_address,meeting_result,memo,tm_sensitivity,contract_date,reservation_date")
      .order("id", { ascending: false }).limit(500);
    setContacts((data || []) as Contact[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name) { showToast("고객명을 입력하세요"); return; }
    setSaving(true);
    const payload: any = {};
    Object.entries(form).forEach(([k, v]) => { payload[k] = v || null; });

    let error;
    if (editId) {
      const res = await supabase.from("contacts").update(payload).eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("contacts").insert(payload);
      error = res.error;
    }
    setSaving(false);
    if (error) { showToast(`저장 실패: ${error.message}`); return; }
    showToast(editId ? "수정 완료" : "등록 완료");
    setShowAdd(false); setEditId(null); setForm({ ...EMPTY_FORM });
    fetchContacts();
  };

  const handleEdit = (c: Contact) => {
    setEditId(c.id);
    setForm({
      name: c.name || "", title: c.title || "", phone: c.phone || "",
      customer_type: c.customer_type || "", management_stage: c.management_stage || "",
      assigned_to: c.assigned_to || "", consultant: c.consultant || "",
      intake_route: c.intake_route || "", prospect_type: c.prospect_type || "",
      meeting_date: c.meeting_date || "", meeting_address: c.meeting_address || "",
      meeting_result: c.meeting_result || "", memo: c.memo || "", tm_sensitivity: c.tm_sensitivity || "",
    });
    setShowAdd(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`${name} 고객을 삭제하시겠습니까?`)) return;
    await supabase.from("rewards").delete().eq("contact_id", id);
    await supabase.from("mileage_usages").delete().eq("contact_id", id);
    await supabase.from("contact_notes").delete().eq("contact_id", id);
    await supabase.from("notifications").delete().eq("contact_id", id);
    await supabase.from("push_subscriptions").delete().eq("contact_id", id);
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) { showToast(`삭제 실패: ${error.message}`); return; }
    showToast(`${name} 삭제 완료`);
    fetchContacts();
  };

  // 필터 적용
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

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));
  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";
  const selCls = "w-full appearance-none px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-400 pr-7";

  const stageColor = (s: string | null) => {
    switch(s) {
      case "리드": return "#3b82f6";
      case "프로스펙팅": return "#f59e0b";
      case "딜크로징": return "#ef4444";
      case "리텐션": return "#10b981";
      default: return "#94a3b8";
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <div className="px-6 py-4 flex-shrink-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>📋 고객등록</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>고객 등록 및 관리</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>
              전체 <span className="font-bold" style={{ color: "#3b82f6" }}>{filtered.length}</span>명
              {search || activeFilters > 0 ? ` (전체 ${contacts.length}명)` : ""}
            </p>
          </div>
          <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ ...EMPTY_FORM }); }}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
            style={{ background: "#1E3A8A" }}>
            <Plus size={15} /> 신규 등록
          </button>
        </div>

        {/* 검색 + 필터 */}
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

      {/* 리스트 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm">등록된 고객이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* 컬럼 헤더 */}
            <div className="flex items-center px-3 py-2 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="w-8 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>No</span>
              <span className="w-20 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>유입경로</span>
              <span className="w-16 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>고객명</span>
              <span className="w-14 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>직급</span>
              <span className="w-28 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>연락처</span>
              <span className="w-12 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>고객유형</span>
              <span className="w-16 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>관리구간</span>
              <span className="w-14 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>담당자</span>
              <span className="w-14 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>담당컨설턴트</span>
              <span className="flex-1 min-w-0 mx-3 text-center text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>활동노트</span>
              <span className="w-16 text-center text-[10px] font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>관리</span>
            </div>
            {filtered.map((c, idx) => {
              const isExpanded = expandedId === c.id;
              return (
                <div key={c.id} className="rounded-xl overflow-hidden"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {/* 바 (고정 높이) */}
                  <div className="flex items-center px-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    style={{ borderLeft: `3px solid ${stageColor(c.management_stage)}`, height: 44 }}>
                    <span className="w-8 text-center text-xs font-bold flex-shrink-0" style={{ color: "var(--text-muted)" }}>{idx + 1}</span>
                    <span className="w-20 text-center flex-shrink-0">
                      {c.intake_route ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{c.intake_route}</span>
                      ) : <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>-</span>}
                    </span>
                    <span className="w-16 text-[13px] font-bold truncate flex-shrink-0" style={{ color: "var(--text)" }}>{c.name}</span>
                    <span className="w-14 text-center text-[11px] truncate flex-shrink-0" style={{ color: "var(--text-muted)" }}>{c.title || "-"}</span>
                    <span className="w-28 text-center text-[11px] flex-shrink-0" style={{ color: "var(--text)" }}>{c.phone || "-"}</span>
                    <span className="w-12 text-center flex-shrink-0">
                      {c.customer_type ? (
                        <span className="text-[10px] px-1 py-0.5 rounded font-semibold"
                          style={{ background: c.customer_type === "신규" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: c.customer_type === "신규" ? "#10b981" : "#f59e0b" }}>
                          {c.customer_type}
                        </span>
                      ) : <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>-</span>}
                    </span>
                    <span className="w-16 text-center flex-shrink-0">
                      {c.management_stage ? (
                        <span className="text-[10px] px-1 py-0.5 rounded font-semibold"
                          style={{ background: `${stageColor(c.management_stage)}15`, color: stageColor(c.management_stage) }}>
                          {c.management_stage}
                        </span>
                      ) : <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>-</span>}
                    </span>
                    <span className="w-14 text-center text-[11px] font-semibold flex-shrink-0" style={{ color: "#8b5cf6" }}>{c.assigned_to || "-"}</span>
                    <span className="w-14 text-center text-[11px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>{c.consultant || "-"}</span>
                    {/* 활동노트 미리보기 (더블클릭으로 팝업) */}
                    <div className="flex-1 min-w-0 mx-3 overflow-hidden cursor-text"
                      onDoubleClick={e => { e.stopPropagation(); setNotesPopup({ contactId: c.id, name: c.name }); }}
                      onClick={e => e.stopPropagation()}
                      title="더블클릭하여 활동노트 보기/편집">
                      <ContactNotes contactId={c.id} compact />
                    </div>
                    <span className="w-16 flex items-center justify-center gap-0.5 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); handleEdit(c); }}
                        className="p-1 rounded transition-colors" style={{ color: "#3b82f6" }}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(c.id, c.name); }}
                        className="p-1 rounded transition-colors" style={{ color: "#ef4444" }}>
                        <Trash2 size={12} />
                      </button>
                      {isExpanded ? <ChevronUp size={12} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />}
                    </span>
                  </div>

                  {/* 확장 상세 */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          { label: "가망구분", value: c.prospect_type },
                          { label: "TM감도", value: c.tm_sensitivity },
                          { label: "미팅일정", value: c.meeting_date },
                          { label: "미팅지역", value: c.meeting_address },
                          { label: "미팅결과", value: c.meeting_result },
                          { label: "계약일", value: c.contract_date },
                          { label: "예약일", value: c.reservation_date },
                          { label: "메모", value: c.memo },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-[10px] font-semibold mb-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                            <p className="text-xs font-semibold" style={{ color: item.value ? "var(--text)" : "var(--text-subtle)" }}>{item.value || "-"}</p>
                          </div>
                        ))}
                      </div>
                      {/* 활동 노트 전체 */}
                      <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <h4 className="text-xs font-bold mb-2" style={{ color: "var(--text)" }}>📝 활동노트</h4>
                        <ContactNotes contactId={c.id} authorName={userName} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 신규등록 / 수정 모달 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                {editId ? "✏️ 고객 수정" : "📋 신규 등록"}
              </h3>
              <button onClick={() => { setShowAdd(false); setEditId(null); }} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>고객명 *</label><input className={inp} value={form.name} onChange={e => f("name", e.target.value)} placeholder="홍길동" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} /></div>
                <div><label className={lbl}>직급</label><input className={inp} value={form.title} onChange={e => f("title", e.target.value)} placeholder="본부장" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} /></div>
                <div><label className={lbl}>연락처</label><input className={inp} value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="010-1234-5678" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} /></div>
                <div><label className={lbl}>유입경로</label>
                  <select className={selCls} value={form.intake_route} onChange={e => f("intake_route", e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    <option value="">선택</option>
                    {OPT.intake_route.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>고객유형</label>
                  <select className={selCls} value={form.customer_type} onChange={e => f("customer_type", e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    <option value="">선택</option>
                    {OPT.customer_type.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>관리구간</label>
                  <select className={selCls} value={form.management_stage} onChange={e => f("management_stage", e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    <option value="">선택</option>
                    {OPT.management_stage.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>대협팀 담당자</label>
                  <select className={selCls} value={form.assigned_to} onChange={e => f("assigned_to", e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    <option value="">선택</option>
                    {TEAM.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>담당 컨설턴트</label>
                  <select className={selCls} value={form.consultant} onChange={e => f("consultant", e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    <option value="">선택</option>
                    {CONSULTANTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>메모</label>
                <textarea className={inp + " resize-none"} rows={3} value={form.memo} onChange={e => f("memo", e.target.value)} placeholder="메모 입력..."
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => { setShowAdd(false); setEditId(null); }}
                className="px-5 py-2 text-sm font-semibold rounded-xl" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>취소</button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                <span className="flex items-center gap-1.5"><Save size={14} />{saving ? "저장 중..." : editId ? "수정" : "등록"}</span>
              </button>
            </div>
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

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
