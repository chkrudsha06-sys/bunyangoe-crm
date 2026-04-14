"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Truck, Plus, Save, X, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────
interface WanpanTruck {
  id: number;
  site_name: string | null;
  team_size: number | null;
  agency: string | null;
  contact_point: string | null;
  contact_point_title: string | null;
  contact_phone: string | null;
  location: string | null;
  dispatch_date: string | null;
  is_ordered: boolean;
  staff_count: number | null;
  staff_members: string | null;
  consultant_count: number | null;
  consultant_members: string | null;
  has_photo: boolean;
  notes: string | null;
  task_assignees: string | null;
  consultant_pre_reports: string | null;
}

interface TaskAssignee { name: string; done: boolean; }
interface PreReport { name: string; title: string; current_ad: string; call_reaction: string; opening: string; }

// ─── Constants ──────────────────────────────────────────────────
const DAEHYUP_MEMBERS = ["김정후","김창완","최웅","조계현","이세호","기여운","최연전"];
const CONSULTANT_MEMBERS = ["박경화","박혜은","조승현","박민경","백선중","강아름","전정훈","박나라"];
const TASK_MEMBERS = ["김재영","최은정"];
const EMPTY_REPORT: PreReport = { name:"", title:"", current_ad:"", call_reaction:"", opening:"" };

const EMPTY: any = {
  site_name:"",
  team_size:"", agency:"", contact_point:"", contact_point_title:"", contact_phone:"",
  location:"", dispatch_date:"", is_ordered:false,
  staff_count:"", staff_members:[],
  consultant_count:"", consultant_members:[],
  has_photo:false, notes:"",
  task_assignees:[],
  consultant_pre_reports:{},
};

// ─── Helpers ────────────────────────────────────────────────────
function parseJSON<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}
function parseMembers(val: string | null): string[] { return parseJSON<string[]>(val, []); }

// ─── MemberSelector ─────────────────────────────────────────────
function MemberSelector({ count, selected, options, onChange, label, color }: {
  count: number; selected: string[]; options: string[];
  onChange: (v: string[]) => void; label: string; color: string;
}) {
  if (count <= 0) return null;
  const toggle = (name: string) => {
    if (selected.includes(name)) onChange(selected.filter(s => s !== name));
    else if (selected.length < count) onChange([...selected, name]);
  };
  return (
    <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
      <p className="text-xs font-semibold text-slate-500 mb-2">
        {label} 선택 <span className="text-blue-600 font-bold">{selected.length}/{count}명</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(name => {
          const sel = selected.includes(name);
          const disabled = !sel && selected.length >= count;
          return (
            <button key={name} type="button" onClick={() => toggle(name)} disabled={disabled}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                sel ? `${color} text-white border-transparent`
                  : disabled ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}>{name}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── TaskAssigneeSelector ────────────────────────────────────────
function TaskAssigneeSelector({ selected, onChange }: {
  selected: TaskAssignee[];
  onChange: (v: TaskAssignee[]) => void;
}) {
  const toggle = (name: string) => {
    const exists = selected.find(a => a.name === name);
    if (exists) onChange(selected.filter(a => a.name !== name));
    else onChange([...selected, { name, done: false }]);
  };
  return (
    <div className="col-span-2 bg-orange-50 rounded-xl p-3 border border-orange-200">
      <p className="text-xs font-semibold text-orange-600 mb-2">업무담당자 선택</p>
      <div className="flex gap-2">
        {TASK_MEMBERS.map(name => {
          const sel = selected.find(a => a.name === name);
          return (
            <button key={name} type="button" onClick={() => toggle(name)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                sel ? "bg-orange-500 text-white border-transparent"
                   : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
              }`}>{name}</button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ConsultantPreReportSection ──────────────────────────────────
function ConsultantPreReportSection({ consultants, reports, onChange }: {
  consultants: string[];
  reports: Record<string, PreReport[]>;
  onChange: (v: Record<string, PreReport[]>) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addingFor, setAddingFor] = useState<Record<string, boolean>>({});
  const [newReport, setNewReport] = useState<Record<string, PreReport>>({});

  if (consultants.length === 0) return null;

  const toggleAdding = (name: string) => {
    setAddingFor(p => ({ ...p, [name]: !p[name] }));
    if (!newReport[name]) setNewReport(p => ({ ...p, [name]: { ...EMPTY_REPORT } }));
  };

  const addReport = (name: string) => {
    const r = newReport[name];
    if (!r?.name) { alert("이름을 입력해주세요"); return; }
    const updated = { ...reports, [name]: [...(reports[name] || []), r] };
    onChange(updated);
    setNewReport(p => ({ ...p, [name]: { ...EMPTY_REPORT } }));
    setAddingFor(p => ({ ...p, [name]: false }));
  };

  const removeReport = (consultant: string, idx: number) => {
    const updated = { ...reports, [consultant]: (reports[consultant] || []).filter((_, i) => i !== idx) };
    onChange(updated);
  };

  const inp2 = "w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";

  return (
    <div className="col-span-2 space-y-2">
      <p className="text-xs font-semibold text-violet-600 flex items-center gap-1.5">
        컨설턴트 출장전 리포트
        <span className="text-[10px] font-normal text-slate-400">(이름 클릭 → 입력)</span>
      </p>
      {consultants.map(name => {
        const reps = reports[name] || [];
        const hasReports = reps.length > 0;
        const isExp = expanded[name];
        const isAdding = addingFor[name];
        return (
          <div key={name} className="border border-violet-200 rounded-xl overflow-hidden">
            {/* 헤더 행 */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-violet-50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-violet-700">{name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  hasReports
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}>
                  {hasReports ? `확인완료 ${reps.length}건` : "미확인"}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => toggleAdding(name)}
                  className="text-[10px] px-2.5 py-1 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700">
                  + 추가
                </button>
                {hasReports && (
                  <button type="button" onClick={() => setExpanded(p => ({ ...p, [name]: !p[name] }))}
                    className="text-[10px] px-2 py-1 bg-white text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-0.5">
                    {isExp ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
                    {isExp ? "접기" : `보기`}
                  </button>
                )}
              </div>
            </div>

            {/* 기존 리포트 목록 */}
            {isExp && reps.length > 0 && (
              <div className="px-3 py-2.5 space-y-2 border-t border-violet-100 bg-white">
                {reps.map((r, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{r.name}</span>
                        {r.title && <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{r.title}</span>}
                      </div>
                      <button type="button" onClick={() => removeReport(name, idx)}
                        className="text-slate-300 hover:text-red-400 transition-colors"><X size={12}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <span><span className="text-slate-400">현재광고 </span>{r.current_ad || "-"}</span>
                      <span><span className="text-slate-400">통화반응 </span>{r.call_reaction || "-"}</span>
                      {r.opening && <span className="col-span-2"><span className="text-slate-400">오프닝 </span>{r.opening}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 추가 입력 폼 */}
            {isAdding && (
              <div className="px-3 py-3 border-t border-violet-100 bg-blue-50/40">
                <p className="text-[10px] font-bold text-blue-600 mb-2">출장전 리포트 입력</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">이름 *</label>
                    <input className={inp2} placeholder="홍길동"
                      value={newReport[name]?.name || ""}
                      onChange={e => setNewReport(p => ({ ...p, [name]: { ...(p[name] || EMPTY_REPORT), name: e.target.value } }))}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">직급</label>
                    <input className={inp2} placeholder="본부장"
                      value={newReport[name]?.title || ""}
                      onChange={e => setNewReport(p => ({ ...p, [name]: { ...(p[name] || EMPTY_REPORT), title: e.target.value } }))}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">현재광고</label>
                    <input className={inp2} placeholder="LMS, 호갱노노..."
                      value={newReport[name]?.current_ad || ""}
                      onChange={e => setNewReport(p => ({ ...p, [name]: { ...(p[name] || EMPTY_REPORT), current_ad: e.target.value } }))}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">사전통화반응</label>
                    <input className={inp2} placeholder="긍정 / 보통 / 부정"
                      value={newReport[name]?.call_reaction || ""}
                      onChange={e => setNewReport(p => ({ ...p, [name]: { ...(p[name] || EMPTY_REPORT), call_reaction: e.target.value } }))}/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 font-semibold mb-0.5 block">오프닝 멘트 (비고)</label>
                    <input className={inp2} placeholder="오프닝 멘트 또는 특이사항"
                      value={newReport[name]?.opening || ""}
                      onChange={e => setNewReport(p => ({ ...p, [name]: { ...(p[name] || EMPTY_REPORT), opening: e.target.value } }))}/>
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 mt-2">
                  <button type="button" onClick={() => toggleAdding(name)}
                    className="text-[10px] px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-white">취소</button>
                  <button type="button" onClick={() => addReport(name)}
                    className="text-[10px] px-3 py-1.5 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700">추가 저장</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function WanpanTruckPage() {
  const [trucks, setTrucks] = useState<WanpanTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<WanpanTruck | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");

  useEffect(() => { fetchTrucks(); }, [filterMonth]);

  const fetchTrucks = async () => {
    setLoading(true);
    let q = supabase.from("wanpan_trucks").select("*").order("dispatch_date", { ascending: false, nullsFirst: false });
    if (filterMonth) {
      const year = new Date().getFullYear();
      const m = filterMonth.padStart(2,"0");
      const lastDay = new Date(year, parseInt(filterMonth), 0).getDate();
      q = q.gte("dispatch_date", `${year}-${m}-01`).lte("dispatch_date", `${year}-${m}-${lastDay}`);
    }
    const { data } = await q;
    setTrucks((data as WanpanTruck[]) || []);
    setLoading(false);
  };

  const openAdd = () => { setEditItem(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (t: WanpanTruck) => {
    setEditItem(t);
    setForm({
      site_name: t.site_name || "",
      team_size: t.team_size||"", agency: t.agency||"",
      contact_point: t.contact_point||"", contact_point_title: t.contact_point_title||"",
      contact_phone: t.contact_phone||"", location: t.location||"",
      dispatch_date: t.dispatch_date?.split("T")[0]||"", is_ordered: t.is_ordered,
      staff_count: t.staff_count||"", staff_members: parseMembers(t.staff_members),
      consultant_count: t.consultant_count||"", consultant_members: parseMembers(t.consultant_members),
      has_photo: t.has_photo||false, notes: t.notes||"",
      task_assignees: parseJSON<TaskAssignee[]>(t.task_assignees, []),
      consultant_pre_reports: parseJSON<Record<string, PreReport[]>>(t.consultant_pre_reports, {}),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      site_name: form.site_name || null,
      team_size: Number(form.team_size)||null,
      agency: form.agency||null, contact_point: form.contact_point||null,
      contact_point_title: form.contact_point_title||null,
      contact_phone: form.contact_phone||null, location: form.location||null,
      dispatch_date: form.dispatch_date||null, is_ordered: form.is_ordered,
      staff_count: Number(form.staff_count)||null,
      staff_members: form.staff_members.length>0 ? JSON.stringify(form.staff_members) : null,
      consultant_count: Number(form.consultant_count)||null,
      consultant_members: form.consultant_members.length>0 ? JSON.stringify(form.consultant_members) : null,
      has_photo: form.has_photo, notes: form.notes||null,
      task_assignees: form.task_assignees.length>0 ? JSON.stringify(form.task_assignees) : null,
      consultant_pre_reports: Object.keys(form.consultant_pre_reports).length>0
        ? JSON.stringify(form.consultant_pre_reports) : null,
    };
    let error;
    if (editItem) {
      const res = await supabase.from("wanpan_trucks").update(payload).eq("id", editItem.id);
      error = res.error;
    } else {
      const res = await supabase.from("wanpan_trucks").insert(payload);
      error = res.error;
    }
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    setShowModal(false); fetchTrucks();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("wanpan_trucks").delete().eq("id", id);
    fetchTrucks();
  };

  const toggleOrder = async (id: number, current: boolean) => {
    await supabase.from("wanpan_trucks").update({ is_ordered: !current }).eq("id", id);
    fetchTrucks();
  };

  // 업무담당자 완료 토글 (목록에서 직접)
  const toggleTaskDone = async (truckId: number, assignees: TaskAssignee[], name: string) => {
    const updated = assignees.map(a => a.name === name ? { ...a, done: !a.done } : a);
    await supabase.from("wanpan_trucks").update({ task_assignees: JSON.stringify(updated) }).eq("id", truckId);
    setTrucks(prev => prev.map(t => t.id === truckId ? { ...t, task_assignees: JSON.stringify(updated) } : t));
  };

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";

  const HEADERS = ["#","발송일","현장명","현장위치","대행사","접점","직급","연락처","조직수",
    "대협팀","컨설턴트","업무담당자","촬영","발주","비고",""];

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Truck size={20} className="text-blue-500" />완판트럭
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">완판트럭 진행 리스트 관리</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-lg font-bold text-blue-600">{trucks.length}</p>
              <p className="text-xs text-blue-500">전체 회차</p>
            </div>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 shadow-sm">
              <Plus size={14} />신규 등록
            </button>
          </div>
        </div>
        {/* 월별 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">월별</span>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={()=>setFilterMonth("")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${!filterMonth?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
              전체
            </button>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <button key={m} onClick={()=>setFilterMonth(String(m))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterMonth===String(m)?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                {m}월
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trucks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Truck size={40} className="mb-3 opacity-30" />
            <p className="text-sm">완판트럭 데이터가 없습니다</p>
            <button onClick={openAdd} className="mt-3 text-xs text-blue-600 underline">첫 번째 회차 등록하기</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {HEADERS.map(h => (
                    <th key={h} className="text-center px-3 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trucks.map((t, i) => {
                  const staffList = parseMembers(t.staff_members);
                  const consultList = parseMembers(t.consultant_members);
                  const taskList = parseJSON<TaskAssignee[]>(t.task_assignees, []);
                  const dispDate = t.dispatch_date
                    ? new Date(t.dispatch_date).toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"}).replace(/\.$/, "")
                    : "-";
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center align-middle text-slate-400 text-xs">{i+1}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-700 font-medium text-xs">{dispDate}</td>
                      {/* 현장명 NEW */}
                      <td className="px-3 py-2.5 text-center align-middle text-xs font-bold text-blue-700">
                        {t.site_name || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle font-semibold text-slate-800 text-xs">{t.location||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-xs">{t.agency||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-xs">{t.contact_point||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-500 text-xs">{t.contact_point_title||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-xs">{t.contact_phone||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-xs font-bold text-slate-700">{t.team_size?`${t.team_size}명`:"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        {staffList.length>0 ? (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {staffList.map(s=>(
                              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{s}</span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        {consultList.length>0 ? (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {consultList.map(s=>(
                              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded-full border border-violet-100">{s}</span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      {/* 업무담당자 NEW */}
                      <td className="px-3 py-2.5 text-center align-middle">
                        {taskList.length > 0 ? (
                          <div className="flex flex-col gap-1 items-center">
                            {taskList.map(a => (
                              <button key={a.name} type="button"
                                onClick={() => toggleTaskDone(t.id, taskList, a.name)}
                                className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-semibold transition-colors ${
                                  a.done
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                                }`}>
                                <span className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${
                                  a.done ? "bg-emerald-500 border-emerald-500" : "border-orange-400 bg-white"
                                }`}>
                                  {a.done && <CheckCircle size={8} className="text-white"/>}
                                </span>
                                {a.name}
                                {a.done && <span className="text-emerald-500 font-bold">완료</span>}
                              </button>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <span className={`text-sm font-black ${t.has_photo?"text-emerald-500":"text-slate-300"}`}>{t.has_photo?"O":"X"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <button onClick={()=>toggleOrder(t.id,t.is_ordered)}
                          className={`flex items-center justify-center gap-1 mx-auto text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${t.is_ordered?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>
                          {t.is_ordered?<CheckCircle size={11}/>:<XCircle size={11}/>}
                          {t.is_ordered?"완료":"미발주"}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle max-w-[100px]">
                        <p className="text-xs text-slate-500 truncate">{t.notes||"-"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <div className="flex justify-center gap-1">
                          <button onClick={()=>openEdit(t)} className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">수정</button>
                          <button onClick={()=>handleDelete(t.id)} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editItem?"완판트럭 수정":"완판트럭 신규 등록"}</h2>
              <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="grid grid-cols-2 gap-3">

                {/* ── 기본 정보 ── */}
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">기본 정보</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>현장명 <span className="text-blue-400">NEW</span></label>
                      <input className={inp} value={form.site_name} onChange={e=>setForm({...form,site_name:e.target.value})} placeholder="예: 힐스테이트 광교"/></div>
                    <div><label className={lbl}>발송일</label>
                      <input type="date" className={inp} value={form.dispatch_date} onChange={e=>setForm({...form,dispatch_date:e.target.value})}/></div>
                    <div><label className={lbl}>현장위치</label>
                      <input className={inp} value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="예: 인천 송도"/></div>
                    <div><label className={lbl}>대행사</label>
                      <input className={inp} value={form.agency} onChange={e=>setForm({...form,agency:e.target.value})}/></div>
                  </div>
                </div>

                {/* ── 소통자 정보 ── */}
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">소통자 정보</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={lbl}>접점 (이름)</label>
                      <input className={inp} value={form.contact_point} onChange={e=>setForm({...form,contact_point:e.target.value})} placeholder="홍길동"/></div>
                    <div><label className={lbl}>직급</label>
                      <input className={inp} value={form.contact_point_title} onChange={e=>setForm({...form,contact_point_title:e.target.value})} placeholder="본부장"/></div>
                    <div><label className={lbl}>연락처</label>
                      <input className={inp} value={form.contact_phone} onChange={e=>setForm({...form,contact_phone:e.target.value})} placeholder="010-0000-0000"/></div>
                  </div>
                </div>

                {/* ── 출장 인원 ── */}
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">출장 인원</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div><label className={lbl}>조직수</label>
                      <input type="number" className={inp} value={form.team_size} onChange={e=>setForm({...form,team_size:e.target.value})} placeholder="명"/></div>
                    <div><label className={lbl}>대협팀 출장 (명수)</label>
                      <input type="number" className={inp} value={form.staff_count} min={0} max={7}
                        onChange={e=>{const n=Number(e.target.value)||0; setForm({...form,staff_count:e.target.value,staff_members:form.staff_members.slice(0,n)});}}/></div>
                    <div><label className={lbl}>컨설턴트 출장 (명수)</label>
                      <input type="number" className={inp} value={form.consultant_count} min={0} max={8}
                        onChange={e=>{const n=Number(e.target.value)||0; setForm({...form,consultant_count:e.target.value,consultant_members:form.consultant_members.slice(0,n)});}}/></div>
                  </div>

                  {Number(form.staff_count)>0 && (
                    <MemberSelector count={Number(form.staff_count)} selected={form.staff_members}
                      options={DAEHYUP_MEMBERS} onChange={v=>setForm({...form,staff_members:v})}
                      label="대협팀 출장인원" color="bg-blue-600"/>
                  )}
                  {Number(form.consultant_count)>0 && (
                    <div className="col-span-2 mt-2">
                      <MemberSelector count={Number(form.consultant_count)} selected={form.consultant_members}
                        options={CONSULTANT_MEMBERS} onChange={v=>setForm({...form,consultant_members:v})}
                        label="컨설턴트 출장인원" color="bg-violet-600"/>
                    </div>
                  )}
                </div>

                {/* ── 업무담당자 NEW ── */}
                <TaskAssigneeSelector
                  selected={form.task_assignees}
                  onChange={v=>setForm({...form,task_assignees:v})}
                />

                {/* ── 컨설턴트 출장전 리포트 NEW ── */}
                {form.consultant_members.length > 0 && (
                  <ConsultantPreReportSection
                    consultants={form.consultant_members}
                    reports={form.consultant_pre_reports}
                    onChange={v=>setForm({...form,consultant_pre_reports:v})}
                  />
                )}

                {/* ── 기타 ── */}
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">기타</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>촬영여부</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={()=>setForm({...form,has_photo:true})}
                          className={`flex-1 py-2 text-sm font-black rounded-lg border transition-colors ${form.has_photo?"bg-emerald-500 text-white border-emerald-500":"bg-slate-50 text-slate-400 border-slate-200"}`}>O</button>
                        <button type="button" onClick={()=>setForm({...form,has_photo:false})}
                          className={`flex-1 py-2 text-sm font-black rounded-lg border transition-colors ${!form.has_photo?"bg-slate-500 text-white border-slate-500":"bg-slate-50 text-slate-400 border-slate-200"}`}>X</button>
                      </div>
                    </div>
                    <div className="flex items-end pb-1">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="is_ordered" checked={form.is_ordered} onChange={e=>setForm({...form,is_ordered:e.target.checked})} className="w-4 h-4"/>
                        <label htmlFor="is_ordered" className="text-sm text-slate-700 font-medium">발주완료</label>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className={lbl}>비고</label>
                      <textarea className={`${inp} resize-none`} rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50">
                <Save size={13}/>{saving?"저장 중...":"저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
