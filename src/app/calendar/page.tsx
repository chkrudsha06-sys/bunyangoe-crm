"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Phone, MapPin, Truck, X } from "lucide-react";

interface CalEvent { id: number; date: string; title: string; content: string | null; author: string; event_type: string; }
interface Meeting { id: number; name: string; phone: string | null; meeting_date: string; meeting_address: string | null; assigned_to: string; }
interface WanpanItem { id: number; dispatch_date: string | null; site_name: string | null; location: string | null; assigned_to: string | null; agency: string | null; staff_members: string | null; consultant_members: string | null; has_photo: boolean; contact_point: string | null; contact_point_title: string | null; notes: string | null; }

const EV_COLORS: Record<string, string> = {
  연차:    "bg-red-100 text-red-700 border-red-200",
  반차:    "bg-orange-100 text-orange-700 border-orange-200",
  분양회미팅: "bg-violet-100 text-violet-700 border-violet-200",
  기타:    "bg-slate-100 text-slate-600 border-slate-200",
  미팅일정: "bg-violet-100 text-violet-700 border-violet-200",
  완판트럭: "bg-amber-100 text-amber-700 border-amber-200",
};

const TEAM_COLORS: Record<string, string> = {
  조계현:"bg-blue-500", 이세호:"bg-violet-500", 기여운:"bg-amber-500", 최연전:"bg-emerald-500",
  김정후:"bg-rose-500", 김창완:"bg-cyan-500", 최웅:"bg-indigo-500", 김재영:"bg-pink-500", 최은정:"bg-teal-500",
};
const getColor = (name: string) => TEAM_COLORS[name] || "bg-slate-400";

const TEAM_LIST = ["전체", "조계현", "이세호", "기여운", "최연전", "김정후", "김창완", "최웅", "김재영", "최은정"];

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [wanpan, setWanpan] = useState<WanpanItem[]>([]);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [filterAuthor, setFilterAuthor] = useState("");

  const fetchAll = useCallback(async () => {
    const start = `${year}-${String(month).padStart(2,"0")}-01`;
    const end = `${year}-${String(month).padStart(2,"0")}-${new Date(year,month,0).getDate()}`;

    // 전체 캘린더 이벤트
    let evQ = supabase.from("calendar_events").select("*").gte("date",start).lte("date",end);
    if (filterAuthor) evQ = evQ.eq("author", filterAuthor);
    const { data: ev, error: evErr } = await evQ;
    if (evErr) console.error("calendar_events:", evErr.message);
    setEvents((ev||[]) as CalEvent[]);

    let mtQ = supabase.from("contacts").select("id,name,phone,meeting_date,meeting_address,assigned_to")
      .not("meeting_date","is",null).gte("meeting_date",start).lte("meeting_date",end);
    if (filterAuthor) mtQ = mtQ.eq("assigned_to", filterAuthor);
    const { data: mt, error: mtErr } = await mtQ;
    if (mtErr) console.error("contacts meetings:", mtErr.message);
    setMeetings((mt||[]) as Meeting[]);

    let wpQ = supabase.from("wanpan_trucks").select("id,dispatch_date,site_name,location,assigned_to,agency,staff_members,consultant_members,has_photo,contact_point,contact_point_title,notes")
      .not("dispatch_date","is",null).gte("dispatch_date",start).lte("dispatch_date",end);
    if (filterAuthor) wpQ = wpQ.eq("assigned_to", filterAuthor);
    const { data: wp, error: wpErr } = await wpQ;
    if (wpErr) console.error("wanpan_trucks:", wpErr.message);
    setWanpan((wp||[]) as WanpanItem[]);
  }, [year, month, filterAuthor]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toISOString().split("T")[0];
  const getDs = (d: number) => `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const DAYS = ["일","월","화","수","목","금","토"];

  const getItems = (d: number) => {
    const ds = getDs(d);
    return {
      ev: events.filter(e=>e.date===ds),
      mt: meetings.filter(m=>m.meeting_date?.startsWith(ds)),
      wp: wanpan.filter(w=>w.dispatch_date?.startsWith(ds)),
    };
  };

  const selAll = selDate ? {
    ev: events.filter(e=>e.date===selDate),
    mt: meetings.filter(m=>m.meeting_date?.startsWith(selDate)),
    wp: wanpan.filter(w=>w.dispatch_date?.startsWith(selDate)),
  } : { ev:[], mt:[], wp:[] };

  // 이달 통계
  const totalEv = events.length;
  const totalMt = meetings.length;
  const totalWp = wanpan.length;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button onClick={()=>{if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1);}}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"><ChevronLeft size={16}/></button>
              <span className="text-lg font-black text-slate-800 w-32 text-center">{year}년 {month}월</span>
              <button onClick={()=>{if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1);}}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"><ChevronRight size={16}/></button>
            </div>
            {/* 통계 */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs px-2 py-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-100 font-semibold">분양회미팅 {totalMt}건</span>
              <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 font-semibold">완판트럭 {totalWp}건</span>
              <span className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 font-semibold">개인일정 {totalEv}건</span>
            </div>
            {/* 범례 */}
            <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">범례</span>
              {[{l:"분양회미팅",c:"bg-violet-200 text-violet-700"},{l:"완판트럭",c:"bg-amber-200 text-amber-700"},{l:"연차",c:"bg-red-200 text-red-700"},{l:"반차",c:"bg-orange-200 text-orange-700"},{l:"기타",c:"bg-slate-200 text-slate-600"}].map(({l,c})=>(
                <span key={l} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${c}`}>{l}</span>
              ))}
            </div>
          </div>
          {/* 담당자 필터 */}
          <select value={filterAuthor} onChange={e=>setFilterAuthor(e.target.value==="전체"?"":e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none font-semibold">
            {TEAM_LIST.map(t=><option key={t} value={t==="전체"?"":t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* ── 오늘 일정 + 당월 전체일정 요약 배너 ── */}
      <div className="px-4 pt-4 flex gap-3 items-stretch">

        {/* 선택 날짜 상세 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 w-80 flex-shrink-0 min-h-[140px]">
          {selDate ? (<>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"/>
                <span className="text-sm font-bold text-slate-700">
                  {new Date(selDate+"T00:00:00").toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}
                </span>
              </div>
              <button onClick={()=>setSelDate(null)} className="text-slate-300 hover:text-slate-500"><X size={14}/></button>
            </div>
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
              {selAll.wp.map(w=>(
                <div key={`sw${w.id}`} className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                  <Truck size={11} className="text-amber-500 flex-shrink-0"/>
                  <span className="text-xs font-bold text-amber-700 truncate">완판트럭 · {w.site_name||w.location||"-"}</span>
                </div>
              ))}
              {selAll.mt.map(m=>(
                <div key={`sm${m.id}`} className="flex items-center gap-2 px-2 py-1.5 bg-violet-50 rounded-lg border border-violet-100">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getColor(m.assigned_to)}`}/>
                  <span className="text-xs font-bold text-violet-700 truncate">분양회미팅 · {m.name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">{m.assigned_to}</span>
                </div>
              ))}
              {selAll.ev.map(e=>(
                <div key={`se${e.id}`} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${EV_COLORS[e.event_type]||EV_COLORS["기타"]}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getColor(e.author)}`}/>
                  <span className="text-xs font-bold truncate">{e.event_type} · {e.author}</span>
                </div>
              ))}
              {selAll.wp.length===0&&selAll.mt.length===0&&selAll.ev.length===0&&(
                <p className="text-xs text-slate-300 text-center py-2">일정 없음</p>
              )}
            </div>
          </>) : (
            <div className="flex flex-col items-center justify-center h-full py-4">
              <p className="text-xs text-slate-300 text-center">날짜를 클릭하면<br/>일정을 확인할 수 있습니다</p>
            </div>
          )}
        </div>

        {/* 당월 전체일정 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex-1 min-w-0 min-h-[180px]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-slate-700">{month}월 전체 일정</span>
            <span className="text-xs text-slate-400">
              총 {wanpan.length + meetings.length + events.length}건
            </span>
            <div className="flex gap-1.5 ml-auto">
              {wanpan.length > 0 && <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full font-semibold">완판트럭 {wanpan.length}</span>}
              {meetings.length > 0 && <span className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-full font-semibold">분양회미팅 {meetings.length}</span>}
              {events.length > 0 && <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-semibold">개인일정 {events.length}</span>}
            </div>
          </div>
          {(() => {
            // 모든 이벤트를 날짜순으로 합치기
            const allItems: { date: string; type: string; label: string; sub: string; color: string; dotColor: string }[] = [
              ...wanpan.map(w => ({
                date: w.dispatch_date?.split("T")[0] || "",
                type: "완판트럭",
                label: w.site_name || w.location || "-",
                sub: (() => {
                  const s = w.staff_members ? (() => { try { return JSON.parse(w.staff_members) as string[]; } catch { return []; }})() : [];
                  const c = w.consultant_members ? (() => { try { return JSON.parse(w.consultant_members) as string[]; } catch { return []; }})() : [];
                  return [...s, ...c].join(", ") || w.agency || "";
                })(),
                color: "bg-amber-50 border-amber-100",
                dotColor: "bg-amber-400",
              })),
              ...meetings.map(m => ({
                date: m.meeting_date?.split("T")[0] || "",
                type: "분양회미팅",
                label: m.name,
                sub: `${m.assigned_to}${m.meeting_address ? " · " + m.meeting_address : ""}`,
                color: "bg-violet-50 border-violet-100",
                dotColor: getColor(m.assigned_to),
              })),
              ...events.map(e => ({
                date: e.date,
                type: e.event_type,
                label: e.author,
                sub: e.content || "",
                color: "bg-slate-50 border-slate-100",
                dotColor: getColor(e.author),
              })),
            ].sort((a, b) => a.date.localeCompare(b.date));

            if (allItems.length === 0) return (
              <p className="text-xs text-slate-300 text-center py-2">이달 등록된 일정이 없습니다</p>
            );

            return (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allItems.map((item, idx) => {
                  const d = new Date(item.date + "T00:00:00");
                  const isToday = item.date === new Date().toISOString().split("T")[0];
                  return (
                    <div key={idx} className={`flex-shrink-0 rounded-xl border px-3 py-2 min-w-[130px] max-w-[160px] min-h-[90px] ${item.color} ${isToday ? "border-2 border-blue-400" : ""}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.dotColor}`}/>
                        <span className="text-[10px] font-bold text-slate-500">
                          {d.toLocaleDateString("ko-KR",{month:"numeric",day:"numeric",weekday:"short"})}
                          {isToday && <span className="ml-1 text-blue-500">오늘</span>}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mb-0.5">{item.type}</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{item.label}</p>
                      {item.sub && <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.sub}</p>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* 캘린더 본체 */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 요일 */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map((d,i)=>(
              <div key={d} className={`text-center py-3 text-sm font-bold ${i===0?"text-red-400":i===6?"text-blue-400":"text-slate-400"}`}>{d}</div>
            ))}
          </div>
          {/* 날짜 */}
          <div className="grid grid-cols-7">
            {Array.from({length:firstDay}).map((_,i)=>(
              <div key={`e${i}`} className="min-h-[140px] border-r border-b border-slate-50 bg-slate-50/30"/>
            ))}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const d=i+1; const ds=getDs(d);
              const {ev,mt,wp}=getItems(d);
              const isToday=ds===today; const dow=(firstDay+i)%7;
              const isSelected=selDate===ds; const total=ev.length+mt.length+wp.length;
              return (
                <div key={d} onClick={()=>setSelDate(selDate===ds?null:ds)}
                  className={`min-h-[140px] border-r border-b border-slate-50 p-1.5 cursor-pointer transition-colors ${isSelected?"bg-blue-50":isToday?"bg-blue-50/30":"hover:bg-slate-50"} ${(firstDay+i+1)%7===0?"border-r-0":""}`}>
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1 ${isToday?"bg-blue-600 text-white":dow===0?"text-red-400":dow===6?"text-blue-400":"text-slate-500"}`}>{d}</div>
                  <div className="space-y-0.5">
                    {/* 완판트럭 */}
                    {wp.map(w=>(
                      <div key={`w${w.id}`} className="text-xs px-2 py-1 rounded-lg truncate font-semibold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getColor(w.assigned_to||"")}`}/>
                        완판트럭 - {w.site_name || w.location || "-"}
                      </div>
                    ))}
                    {/* 미팅 */}
                    {mt.slice(0,2).map(m=>(
                      <div key={`m${m.id}`} className="text-xs px-2 py-1 rounded-lg truncate font-semibold bg-violet-100 text-violet-700 border border-violet-200 flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getColor(m.assigned_to)}`}/>
                        미팅일정 - {m.assigned_to}
                      </div>
                    ))}
                    {/* 개인일정 */}
                    {ev.slice(0,2).map(e=>(
                      <div key={e.id} className={`text-xs px-2 py-1 rounded-lg truncate font-semibold border flex items-center gap-1 ${EV_COLORS[e.event_type]||EV_COLORS["기타"]}`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getColor(e.author)}`}/>
                        {e.event_type} - {e.author}
                      </div>
                    ))}
                    {total>4&&<p className="text-xs text-slate-400 pl-1 font-semibold">+{total-4}개</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </div>
  );
}
