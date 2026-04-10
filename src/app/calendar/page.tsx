"use client";

import { useState, useEffect } from "react";
import { supabase, TEAM_MEMBERS, SENSITIVITY_COLORS } from "@/lib/supabase";
import { Contact } from "@/types";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export default function CalendarPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // April 2026
  const [filterMember, setFilterMember] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString().split("T")[0];
      const end = new Date(year, month + 1, 0).toISOString().split("T")[0];

      let query = supabase
        .from("contacts")
        .select("*")
        .not("meeting_date", "is", null)
        .gte("meeting_date", start)
        .lte("meeting_date", end)
        .order("meeting_date");

      if (filterMember) query = query.eq("assigned_to", filterMember);
      const { data } = await query;
      setContacts((data as Contact[]) || []);
      setLoading(false);
    };
    fetch();
  }, [currentDate, filterMember]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

  // 날짜별 고객 그룹화
  const byDate: Record<string, Contact[]> = {};
  contacts.forEach((c) => {
    if (!c.meeting_date) return;
    const d = c.meeting_date.split("T")[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(c);
  });

  const selectedContacts = selectedDate ? (byDate[selectedDate] || []) : [];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const MEMBER_COLORS: Record<string, string> = {
    조계현: "bg-blue-500",
    이세호: "bg-purple-500",
    기여운: "bg-amber-500",
    최연전: "bg-emerald-500",
  };

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-brand-text font-bold text-xl">미팅 캘린더</h1>
          <p className="text-brand-muted text-xs mt-0.5">팀 전체 미팅 일정 현황</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg"
          >
            <option value="">전체</option>
            {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* 담당자 범례 */}
          <div className="flex items-center gap-3">
            {TEAM_MEMBERS.map((m) => (
              <div key={m} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${MEMBER_COLORS[m]}`} />
                <span className="text-brand-muted text-xs">{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 캘린더 */}
        <div className="col-span-2 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
          {/* 월 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
            <button onClick={prevMonth} className="text-brand-muted hover:text-brand-text p-1">
              <ChevronLeft size={18} />
            </button>
            <span className="text-brand-text font-semibold">{monthName}</span>
            <button onClick={nextMonth} className="text-brand-muted hover:text-brand-text p-1">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-brand-border">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div
                key={d}
                className={`text-center py-2 text-xs font-medium ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-brand-muted"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {/* 첫 주 빈칸 */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-r border-b border-brand-border/30 last:border-r-0" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayContacts = byDate[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              const dow = (firstDay + i) % 7;
              const isToday = new Date().toISOString().split("T")[0] === dateStr;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[80px] border-r border-b border-brand-border/30 p-1.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-brand-gold/10 border-brand-gold/30" : "hover:bg-brand-navy/50"
                  } ${(firstDay + i + 1) % 7 === 0 ? "border-r-0" : ""}`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                    isToday ? "bg-brand-gold text-brand-navy" :
                    dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-brand-muted"
                  }`}>
                    {day}
                  </div>

                  {/* 미팅 표시 (최대 3개) */}
                  <div className="space-y-0.5">
                    {dayContacts.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MEMBER_COLORS[c.assigned_to]}`} />
                        <span className="text-brand-text truncate text-[10px]">{c.name}</span>
                      </div>
                    ))}
                    {dayContacts.length > 3 && (
                      <p className="text-brand-muted text-[10px] px-1">+{dayContacts.length - 3}개</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 사이드 패널 */}
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-4">
          {selectedDate ? (
            <>
              <h3 className="text-brand-text font-semibold mb-1">
                {new Date(selectedDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
              </h3>
              <p className="text-brand-muted text-xs mb-4">{selectedContacts.length}개 미팅</p>

              {selectedContacts.length === 0 ? (
                <p className="text-brand-muted text-sm">미팅 없음</p>
              ) : (
                <div className="space-y-3">
                  {selectedContacts.map((c) => (
                    <div key={c.id} className="bg-brand-navy border border-brand-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-brand-text font-medium text-sm">{c.name}</p>
                        {c.tm_sensitivity && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${SENSITIVITY_COLORS[c.tm_sensitivity]}`}>
                            {c.tm_sensitivity}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-brand-muted mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${MEMBER_COLORS[c.assigned_to]}`} />
                        {c.assigned_to}
                        {c.meeting_address && <span>· {c.meeting_address}</span>}
                      </div>
                      {c.memo && (
                        <p className="text-xs text-brand-muted line-clamp-2 mt-1">{c.memo}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Calendar size={32} className="text-brand-border mb-3" />
              <p className="text-brand-muted text-sm">날짜를 클릭하면</p>
              <p className="text-brand-muted text-sm">미팅 상세를 확인할 수 있습니다</p>
            </div>
          )}

          {/* 월 요약 */}
          <div className="mt-4 pt-4 border-t border-brand-border">
            <p className="text-brand-muted text-xs mb-2">이달 미팅 합계</p>
            <p className="text-brand-gold font-bold text-xl">{contacts.length}</p>
            <div className="mt-2 space-y-1">
              {TEAM_MEMBERS.map((m) => {
                const cnt = contacts.filter((c) => c.assigned_to === m).length;
                return (
                  <div key={m} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${MEMBER_COLORS[m]}`} />
                      <span className="text-brand-muted text-xs">{m}</span>
                    </div>
                    <span className="text-brand-text text-xs font-medium">{cnt}</span>
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
