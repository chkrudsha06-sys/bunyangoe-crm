"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { ChevronLeft, ChevronRight, Plus, X, Save, Phone, MapPin } from "lucide-react";

interface CalEvent {
  id: number;
  date: string;
  title: string;
  content: string | null;
  author: string;
  event_type: string;
}
interface Meeting {
  id: number;
  name: string;
  phone: string | null;
  meeting_date: string;
  meeting_address: string | null;
  assigned_to: string;
}

const EVENT_COLORS: Record<string, string> = {
  "일정":   "bg-blue-100 text-blue-700 border-blue-200",
  "미팅":   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "완판트럭": "bg-amber-100 text-amber-700 border-amber-200",
  "기타":   "bg-slate-100 text-slate-600 border-slate-200",
};
const MEETING_COLOR = "bg-violet-100 text-violet-700 border-violet-200";

const TEAM_COLORS: Record<string, string> = {
  조계현: "bg-blue-500", 이세호: "bg-violet-500",
  기여운: "bg-amber-500", 최연전: "bg-emerald-500",
  김정후: "bg-rose-500", 김창완: "bg-cyan-500", 최웅: "bg-indigo-500",
  김재영: "bg-pink-500", 최은정: "bg-teal-500",
};

function getColor(name: string) {
  return TEAM_COLORS[name] || "bg-slate-400";
}

export default function CalendarPage() {
  const user = getCurrentUser();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", event_type: "일정" });
  const [saving, setSaving] = useState(false);
  const [filterAuthor, setFilterAuthor] = useState("");

  const TEAM = ["전체", "조계현", "이세호", "기여운", "최연전", "김정후", "김창완", "최웅", "김재영", "최은정"];

  const fetchData = useCallback(async () => {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

    // 캘린더 이벤트
    let evQ = supabase.from("calendar_events").select("*").gte("date", start).lte("date", end);
    if (filterAuthor) evQ = evQ.eq("author", filterAuthor);
    const { data: ev } = await evQ;
    setEvents((ev || []) as CalEvent[]);

    // 미팅 일정 (contacts)
    let mtQ = supabase.from("contacts").select("id,name,phone,meeting_date,meeting_address,assigned_to")
      .not("meeting_date", "is", null).gte("meeting_date", start).lte("meeting_date", end);
    if (filterAuthor) mtQ = mtQ.eq("assigned_to", filterAuthor);
    const { data: mt } = await mtQ;
    setMeetings((mt || []) as Meeting[]);
  }, [year, month, filterAuthor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddEvent = async () => {
    if (!form.title || !selectedDate || !user) return;
    setSaving(true);
    await supabase.from("calendar_events").insert({
      date: selectedDate,
      title: form.title,
      content: form.content || null,
      author: user.name,
      event_type: form.event_type,
    });
    setSaving(false);
    setShowAddModal(false);
    setForm({ title: "", content: "", event_type: "일정" });
    fetchData();
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("calendar_events").delete().eq("id", id);
    fetchData();
  };

  // 캘린더 계산
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const getDateStr = (d: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const getDayEvents = (d: number) => {
    const ds = getDateStr(d);
    const ev = events.filter(e => e.date === ds);
    const mt = meetings.filter(m => m.meeting_date?.startsWith(ds));
    return { ev, mt, total: ev.length + mt.length };
  };

  const getSelectedAll = () => {
    if (!selectedDate) return { ev: [], mt: [] };
    const ev = events.filter(e => e.date === selectedDate);
    const mt = meetings.filter(m => m.meeting_date?.startsWith(selectedDate));
    return { ev, mt };
  };

  const { ev: selEv, mt: selMt } = getSelectedAll();
  const days = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <ChevronLeft size={16} />
              </button>
              <span className="text-lg font-black text-slate-800 w-32 text-center">{year}년 {month}월</span>
              <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <ChevronRight size={16} />
              </button>
            </div>
            <button onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth() + 1); }}
              className="px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-100">
              오늘
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value === "전체" ? "" : e.target.value)}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none">
              {TEAM.map(t => <option key={t} value={t === "전체" ? "" : t}>{t}</option>)}
            </select>
            {user && (
              <button onClick={() => { setSelectedDate(today); setShowAddModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-blue-800 shadow-sm">
                <Plus size={13} /> 일정 추가
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 캘린더 + 사이드 */}
      <div className="flex-1 overflow-auto p-4 flex gap-4">

        {/* 캘린더 */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {days.map((d, i) => (
              <div key={d} className={`text-center py-3 text-xs font-bold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>{d}</div>
            ))}
          </div>

          {/* 날짜 격자 */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[110px] border-r border-b border-slate-50 bg-slate-50/30" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const ds = getDateStr(d);
              const { ev, mt, total } = getDayEvents(d);
              const isToday = ds === today;
              const isSelected = ds === selectedDate;
              const dow = (firstDay + i) % 7;

              return (
                <div key={d}
                  onClick={() => { setSelectedDate(ds); setShowDayModal(true); }}
                  className={`min-h-[110px] border-r border-b border-slate-50 p-1.5 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : isToday ? "bg-blue-50/40" : "hover:bg-slate-50"} ${(firstDay + i + 1) % 7 === 0 ? "border-r-0" : ""}`}
                >
                  {/* 날짜 숫자 */}
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${
                    isToday ? "bg-blue-600 text-white" :
                    dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-slate-500"
                  }`}>{d}</div>

                  {/* 이벤트 미리보기 */}
                  <div className="space-y-0.5">
                    {ev.slice(0, 2).map(e => (
                      <div key={e.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate border font-medium flex items-center gap-1 ${EVENT_COLORS[e.event_type] || EVENT_COLORS["기타"]}`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getColor(e.author)}`} />
                        {e.title}
                      </div>
                    ))}
                    {mt.slice(0, mt.length > 2 ? 1 : 2).map(m => (
                      <div key={`mt-${m.id}`} className={`text-[10px] px-1.5 py-0.5 rounded truncate border font-medium flex items-center gap-1 ${MEETING_COLOR}`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getColor(m.assigned_to)}`} />
                        {m.name}
                      </div>
                    ))}
                    {total > 3 && <p className="text-[10px] text-slate-400 pl-1">+{total - 3}개 더</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 범례 */}
        <div className="w-44 flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
            <p className="text-xs font-bold text-slate-500 mb-2">일정 유형</p>
            <div className="space-y-1.5">
              {Object.entries(EVENT_COLORS).map(([k, v]) => (
                <div key={k} className={`text-xs px-2 py-1 rounded-lg border font-medium ${v}`}>{k}</div>
              ))}
              <div className={`text-xs px-2 py-1 rounded-lg border font-medium ${MEETING_COLOR}`}>미팅 (자동)</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
            <p className="text-xs font-bold text-slate-500 mb-2">담당자</p>
            <div className="space-y-1">
              {Object.entries(TEAM_COLORS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-xs text-slate-600">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 날짜 클릭 → 일정 팝업 */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowDayModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowDayModal(false); setShowAddModal(true); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus size={12} /> 추가
                </button>
                <button onClick={() => setShowDayModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {selEv.length === 0 && selMt.length === 0 && (
                <div className="text-center py-8 text-slate-300 text-sm">일정이 없습니다</div>
              )}
              {selMt.map(m => (
                <div key={`m${m.id}`} className={`rounded-xl p-3 border ${MEETING_COLOR}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">미팅</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getColor(m.assigned_to)}`}>{m.assigned_to}</span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                  {m.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={10} />{m.phone}</p>}
                  {m.meeting_address && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} />{m.meeting_address}</p>}
                </div>
              ))}
              {selEv.map(e => (
                <div key={e.id} className={`rounded-xl p-3 border ${EVENT_COLORS[e.event_type] || EVENT_COLORS["기타"]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{e.event_type}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getColor(e.author)}`}>{e.author}</span>
                      {user && (user.name === e.author || user.role === "admin") && (
                        <button onClick={() => handleDeleteEvent(e.id)} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{e.title}</p>
                  {e.content && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{e.content}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 일정 추가 모달 */}
      {showAddModal && selectedDate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-black text-slate-800">
                일정 추가 · {new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">날짜</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">유형</label>
                <div className="flex gap-1.5">
                  {["일정", "미팅", "완판트럭", "기타"].map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, event_type: t }))}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${form.event_type === t ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">제목 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="일정 제목" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">내용</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={3} placeholder="상세 내용 (선택)" className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={handleAddEvent} disabled={saving || !form.title}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50">
                <Save size={13} />{saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
