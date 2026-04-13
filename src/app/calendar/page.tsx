"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface CalEvent {
  id: number;
  date: string;
  title: string;
  type: "meeting" | "wanpan";
  assigned_to?: string;
  detail?: string;
}

const TYPE_COLORS = {
  meeting: { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700 border-blue-200", label: "미팅" },
  wanpan: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-200", label: "완판트럭" },
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");

  useEffect(() => { fetchEvents(); }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1).toISOString().split("T")[0];
    const end = new Date(year, month + 1, 0).toISOString().split("T")[0];

    // 미팅 일정
    const { data: meetings } = await supabase
      .from("contacts")
      .select("id, name, meeting_date, assigned_to, meeting_address, tm_sensitivity")
      .not("meeting_date", "is", null)
      .gte("meeting_date", start)
      .lte("meeting_date", end);

    // 완판트럭 일정
    const { data: trucks } = await supabase
      .from("wanpan_trucks")
      .select("id, location, dispatch_date, assigned_to, agency")
      .not("dispatch_date", "is", null)
      .gte("dispatch_date", start)
      .lte("dispatch_date", end);

    const allEvents: CalEvent[] = [
      ...((meetings || []).map((m: any) => ({
        id: m.id,
        date: m.meeting_date.split("T")[0],
        title: m.name,
        type: "meeting" as const,
        assigned_to: m.assigned_to,
        detail: `${m.meeting_address || "장소미정"} · ${m.tm_sensitivity || ""} · ${m.assigned_to}`,
      }))),
      ...((trucks || []).map((t: any) => ({
        id: t.id + 100000,
        date: t.dispatch_date.split("T")[0],
        title: `완판트럭 - ${t.location || ""}`,
        type: "wanpan" as const,
        assigned_to: t.assigned_to,
        detail: `${t.location || ""} · ${t.agency || ""} · ${t.assigned_to || ""}`,
      }))),
    ];
    setEvents(allEvents);
    setLoading(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate: Record<string, CalEvent[]> = {};
  events.forEach((e) => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });

  const filtered = selectedDate
    ? (byDate[selectedDate] || []).filter((e) => !filterType || e.type === filterType)
    : [];

  const totalMeetings = events.filter((e) => e.type === "meeting").length;
  const totalWanpan = events.filter((e) => e.type === "wanpan").length;

  return (
    <div className="p-6 bg-[#F1F5F9] min-h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays size={20} className="text-blue-500" />
            운영 캘린더
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">미팅 일정 · 완판트럭 일정 통합 관리</p>
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-4">
          {Object.entries(TYPE_COLORS).map(([type, c]) => (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? "" : type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                filterType === type ? c.badge + " border" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${c.dot}`} />
              {c.label}
              <span className="ml-1 font-bold">{type === "meeting" ? totalMeetings : totalWanpan}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 캘린더 */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* 월 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-slate-800">
              {currentDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
            </span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 요일 */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div key={d} className={`text-center py-2 text-xs font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>{d}</div>
            ))}
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-r border-b border-slate-50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = (byDate[dateStr] || []).filter((e) => !filterType || e.type === filterType);
              const isSelected = selectedDate === dateStr;
              const dow = (firstDay + i) % 7;
              const isToday = new Date().toISOString().split("T")[0] === dateStr;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[80px] border-r border-b border-slate-50 p-1.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-slate-50"
                  } ${(firstDay + i + 1) % 7 === 0 ? "border-r-0" : ""}`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                    isToday ? "bg-blue-600 text-white" :
                    dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-slate-500"
                  }`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div key={e.id} className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TYPE_COLORS[e.type].dot}`} />
                        <span className="truncate text-slate-600">{e.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3}개</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 사이드 패널 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
          {selectedDate ? (
            <>
              <h3 className="font-bold text-slate-800 mb-1">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
              </h3>
              <p className="text-xs text-slate-400 mb-3">{filtered.length}개 일정</p>
              <div className="space-y-2 flex-1 overflow-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">일정 없음</p>
                ) : (
                  filtered.map((e) => (
                    <div key={e.id} className={`rounded-xl p-3 border ${TYPE_COLORS[e.type].badge}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[e.type].dot}`} />
                        <span className="text-xs font-semibold">{TYPE_COLORS[e.type].label}</span>
                      </div>
                      <p className="font-semibold text-sm text-slate-800">{e.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{e.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <CalendarDays size={36} className="text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">날짜를 클릭하면</p>
              <p className="text-xs text-slate-300 mt-1">해당 일정을 확인할 수 있습니다</p>
            </div>
          )}

          {/* 월 통계 */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 mb-2">이달 일정 합계</p>
            <div className="space-y-1.5">
              {Object.entries(TYPE_COLORS).map(([type, c]) => {
                const cnt = events.filter((e) => e.type === type).length;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <span className="text-xs text-slate-500">{c.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{cnt}건</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
