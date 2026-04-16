"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, CRMUser } from "@/lib/auth";
import { Clock, ChevronLeft, ChevronRight, Plus, X, Save, Trash2 } from "lucide-react";

// ── 타입 ──
interface Stats {
  totalRevenue: number;
  joinCount: number; contractCount: number; reservationCount: number;
  hotProspect: number; meetingProspect: number; linkedProspect: number;
  upcomingMeetings: number; meetingDone: number;
  membershipFeeAmt: number; membershipCount: number;
  monthlyFeeAmt: number; monthlyFeeCount: number;
  linkedRevenue: number; linkedCount: number;
}
// 누적용 별도 Stats (동일 구조 재활용)
const EMPTY: Stats = {
  totalRevenue:0, joinCount:0, contractCount:0, reservationCount:0,
  hotProspect:0, meetingProspect:0, linkedProspect:0,
  upcomingMeetings:0, meetingDone:0, membershipFeeAmt:0, membershipCount:0, monthlyFeeAmt:0, monthlyFeeCount:0, linkedRevenue:0, linkedCount:0,
};
interface MonthlyRevenue { month: string; hightarget: number; special: number; }
interface TodayEvent { id: number; name: string; phone: string | null; meeting_date: string; meeting_address: string | null; assigned_to: string; }

function fw(n: number) {
  if (!n) return "0원";
  return n.toLocaleString() + "원";
}

async function fetchStats(user: CRMUser, start: string, end: string, isAll = false): Promise<Stats> {
  // exec=개인별, admin/ops=팀전체
  const isExec = user.role === "exec";
  const today  = new Date().toISOString().split("T")[0];
  const monthStart = start;
  const monthEnd   = end;

  // ── 1. 분양회 입회 (계약/예약완료, 완료일 기준) ──────────────
  let joinQ = supabase.from("contacts")
    .select("meeting_result,tm_sensitivity,contract_date,reservation_date,meeting_date,assigned_to");
  if (isExec) joinQ = joinQ.eq("assigned_to", user.name);
  const { data: allContacts = [] } = await joinQ;

  // 당월 계약/예약완료 (완료일 기준)
  const monthJoined = (allContacts||[]).filter((x:any) => {
    const d = x.meeting_result === "계약완료" ? x.contract_date : x.reservation_date;
    if (!d) return false;
    return !isAll && d >= monthStart && d <= monthEnd;
  });
  const allJoined = (allContacts||[]).filter((x:any) =>
    ["계약완료","예약완료"].includes(x.meeting_result||"")
  );

  // 가망고객 (파이프라인 - 계약/예약완료 제외)
  const prospects = (allContacts||[]).filter((x:any) =>
    !["계약완료","예약완료"].includes(x.meeting_result||"")
  );

  // 당월 미팅예정 (미팅일정이 당월, 계약/예약완료 제외)
  const monthMeetings = (allContacts||[]).filter((x:any) => {
    if (["계약완료","예약완료"].includes(x.meeting_result||"")) return false;
    if (!x.meeting_date) return false;
    return !isAll && x.meeting_date >= monthStart && x.meeting_date <= monthEnd;
  });
  // 누적 총미팅 (계약/예약완료 포함 전체)
  const totalMeetings = (allContacts||[]).filter((x:any) => x.meeting_date).length;

  // ── 2. 광고 집행 (VAT 포함 실효금액) ──────────────────────────
  let adQ = supabase.from("ad_executions")
    .select("execution_amount,vat_amount,channel,team_member,refund_amount,contract_route,payment_date");
  if (isExec) adQ = adQ.eq("team_member", user.name);
  const { data: allAd = [] } = await adQ;

  const effAmt = (x:any) => (x.vat_amount && x.vat_amount !== x.execution_amount) ? (x.vat_amount||0) : (x.execution_amount||0);

  // 당월 광고 (분양회, 광고채널 하이타겟+호갱노노+LMS)
  const AD_CHANNELS = ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];
  const monthAd = (allAd||[]).filter((x:any) => {
    if (isAll) return false;
    return x.payment_date >= monthStart && x.payment_date <= monthEnd;
  });

  // 당월 총매출 (광고특전 = 분양회의 AD_CHANNELS)
  const monthAdSpecial = monthAd.filter((x:any) =>
    x.contract_route === "분양회" && AD_CHANNELS.includes(x.channel)
  );
  const totalRevenue = monthAdSpecial.reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  // 당월 입회비 / 월회비
  const membershipFeeAmt = monthAd
    .filter((x:any) => x.channel === "분양회 입회비")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);
  const monthlyFeeAmt = monthAd
    .filter((x:any) => x.channel === "분양회 월회비")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  // 누적 입회비 / 월회비
  const cumMembershipFee = (allAd||[])
    .filter((x:any) => x.channel === "분양회 입회비")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);
  const cumMonthlyFee = (allAd||[])
    .filter((x:any) => x.channel === "분양회 월회비")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  // 당월 하이타겟 연계매출 (환불 차감)
  const linkedRevenue = monthAd
    .filter((x:any) => x.channel === "하이타겟")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  // 누적 하이타겟
  const cumLinkedRevenue = (allAd||[])
    .filter((x:any) => x.channel === "하이타겟")
    .reduce((s:number,x:any) => s + effAmt(x) - (x.refund_amount||0), 0);

  // 미팅완료 = 계약완료/예약완료 중 미팅일정 있는 건 (당월)
  const monthMeetingDone = (allContacts||[]).filter((x:any) => {
    if (!["계약완료","예약완료"].includes(x.meeting_result||"")) return false;
    if (!x.meeting_date) return false;
    return !isAll && x.meeting_date >= monthStart && x.meeting_date <= monthEnd;
  });
  const totalMeetingDone = (allContacts||[]).filter((x:any) =>
    ["계약완료","예약완료"].includes(x.meeting_result||"") && x.meeting_date
  ).length;

  // 입회비/월회비 건수
  const membershipCount = (isAll
    ? (allAd||[]).filter((x:any)=>x.channel==="분양회 입회비")
    : monthAd.filter((x:any)=>x.channel==="분양회 입회비")).length;
  const monthlyFeeCount = (isAll
    ? (allAd||[]).filter((x:any)=>x.channel==="분양회 월회비")
    : monthAd.filter((x:any)=>x.channel==="분양회 월회비")).length;

  // 하이타겟 건수
  const linkedCount = (isAll
    ? (allAd||[]).filter((x:any)=>x.channel==="하이타겟")
    : monthAd.filter((x:any)=>x.channel==="하이타겟")).length;

  return {
    totalRevenue,
    joinCount: isAll ? allJoined.length : monthJoined.length,
    contractCount: isAll
      ? allJoined.filter((x:any)=>x.meeting_result==="계약완료").length
      : monthJoined.filter((x:any)=>x.meeting_result==="계약완료").length,
    reservationCount: isAll
      ? allJoined.filter((x:any)=>x.meeting_result==="예약완료").length
      : monthJoined.filter((x:any)=>x.meeting_result==="예약완료").length,
    hotProspect: prospects.filter((x:any)=>x.tm_sensitivity==="즉가입가망").length,
    meetingProspect: prospects.filter((x:any)=>x.tm_sensitivity==="미팅예정가망").length,
    linkedProspect: prospects.filter((x:any)=>x.tm_sensitivity==="연계매출가망").length,
    upcomingMeetings: isAll ? totalMeetings : monthMeetings.length,
    meetingDone: isAll ? totalMeetingDone : monthMeetingDone.length,
    membershipFeeAmt: isAll ? cumMembershipFee : membershipFeeAmt,
    membershipCount,
    monthlyFeeAmt: isAll ? cumMonthlyFee : monthlyFeeAmt,
    monthlyFeeCount,
    linkedRevenue: isAll ? cumLinkedRevenue : linkedRevenue,
    linkedCount,
  };
}

async function fetchMonthlyRevenue(user: CRMUser, year: number, month: number): Promise<MonthlyRevenue[]> {
  const isExec = user.role === "exec";
  const months = [-2,-1,0].map(offset => {
    const d = new Date(year, month - 1 + offset, 1);
    const s = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
    const e = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split("T")[0];
    return { label: `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}`, s, e };
  });
  const results: MonthlyRevenue[] = [];
  for (const m of months) {
    let q = supabase.from("ad_executions").select("execution_amount,channel")
      .gte("payment_date", m.s).lte("payment_date", m.e);
    if (isExec) q = q.eq("team_member", user.name);
    const { data: a = [] } = await q;
    results.push({
      month: m.label,
      hightarget: (a||[]).filter((x:any)=>x.channel==="하이타겟").reduce((s:number,x:any)=>s+(x.execution_amount||0),0),
      special: (a||[]).reduce((s:number,x:any)=>s+(x.execution_amount||0),0),
    });
  }
  return results;
}

async function fetchTodayEvents(user: CRMUser, date: string): Promise<TodayEvent[]> {
  const isExec = user.role === "exec";
  let q = supabase.from("contacts").select("id,name,phone,meeting_date,meeting_address,assigned_to")
    .eq("meeting_date", date).order("meeting_date");
  if (isExec) q = q.eq("assigned_to", user.name);
  const { data = [] } = await q;
  return (data || []) as TodayEvent[];
}

// ── 카드 컴포넌트 ──
function DashCard({ icon, label, main, subs, cumLabel }: {
  icon: string; label: string; main: string;
  subs?: { label: string; value: string; color?: string }[];
  cumLabel: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col" style={{ minWidth: 148, flex: "1 1 0" }}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2 bg-slate-50`}>{icon}</div>
      <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800 leading-tight">{main}</p>
      {subs && subs.length > 0 && (
        <div className="mt-1.5 space-y-0.5 flex-1">
          {subs.map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">{s.label}</span>
              <span className={`text-[11px] font-bold ${s.color || "text-slate-600"}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {!subs && <div className="flex-1" />}
      {/* 누적 - 항상 하단 고정 */}
      <div className="mt-3 pt-2.5 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 font-medium">누적 {cumLabel}</p>
      </div>
    </div>
  );
}

// ── 바 차트 ──
function BarChart({ data }: { data: MonthlyRevenue[] }) {
  const max = Math.max(...data.flatMap(d => [d.hightarget, d.special]), 1);
  const bar = (v: number) => Math.max(4, Math.round((v / max) * 100));
  return (
    <div className="flex items-end justify-around gap-4 h-32 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
          <div className="flex items-end gap-1.5 w-full justify-center">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-blue-600 font-bold">{d.hightarget > 0 ? fw(d.hightarget) : ""}</span>
              <div className="w-7 rounded-t-md bg-blue-500" style={{ height: `${bar(d.hightarget)}px` }} />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-indigo-500 font-bold">{d.special > 0 ? fw(d.special) : ""}</span>
              <div className="w-7 rounded-t-md bg-indigo-300" style={{ height: `${bar(d.special)}px` }} />
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ── 이벤트 타입 ──
const EV_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  연차:   { bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-400" },
  반차:   { bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-400" },
  미팅:   { bg: "bg-blue-50",   text: "text-blue-600",   dot: "bg-blue-400" },
  기타:   { bg: "bg-slate-50",  text: "text-slate-500",  dot: "bg-slate-400" },
  // 자동 표시용
  미팅일정:   { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-400" },
};

interface CalEventItem {
  id: number;
  date: string;
  title: string;
  content: string | null;
  author: string;
  event_type: string;
}

// ── 캘린더 컴포넌트 ──
function DashCalendar({ user: userProp }: { user: CRMUser | null }) {
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [events, setEvents] = useState<CalEventItem[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [wanpans, setWanpans] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showDayPopup, setShowDayPopup] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [form, setForm] = useState({ event_type: "미팅", content: "" });
  const [saving, setSaving] = useState(false);

  // localStorage에서 직접 유저명 가져오기
  const getAuthorName = (): string => {
    try {
      const raw = localStorage.getItem("crm_user");
      if (raw) return JSON.parse(raw).name || "";
    } catch {}
    return userProp?.name || "";
  };

  const fetchCalData = useCallback(async () => {
    const authorName = getAuthorName();
    if (!authorName) return;
    const start = `${calYear}-${String(calMonth).padStart(2,"0")}-01`;
    const end = `${calYear}-${String(calMonth).padStart(2,"0")}-${new Date(calYear, calMonth, 0).getDate()}`;

    const { data: ev, error: evErr } = await supabase.from("calendar_events")
      .select("*").gte("date", start).lte("date", end).eq("author", authorName);
    if (evErr) console.error("calendar_events 오류:", evErr.message);
    setEvents((ev || []) as CalEventItem[]);

    const { data: mt } = await supabase.from("contacts")
      .select("id,name,meeting_date,assigned_to")
      .not("meeting_date","is",null).gte("meeting_date",start).lte("meeting_date",end)
      .eq("assigned_to", authorName);
    setMeetings(mt || []);

    // 완판트럭 (본인이 포함된 것)
    const { data: wp } = await supabase.from("wanpan_trucks")
      .select("id,dispatch_date,location,staff_members")
      .not("dispatch_date","is",null).gte("dispatch_date",start).lte("dispatch_date",end);
    // staff_members에 본인 이름이 포함된 것만 필터
    const wpFiltered = (wp || []).filter((w: any) => {
      try { return JSON.parse(w.staff_members || "[]").includes(authorName); } catch { return false; }
    });
    setWanpans(wpFiltered);
  }, [calYear, calMonth, userProp, refreshKey]);

  useEffect(() => { fetchCalData(); }, [fetchCalData]);

  const handleAdd = async () => {
    if (!selDate) { alert("날짜를 선택해주세요."); return; }
    const authorName = getAuthorName();
    if (!authorName) { alert("로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요."); return; }
    setSaving(true);
    const { error } = await supabase.from("calendar_events").insert({
      date: selDate,
      title: form.event_type,
      content: form.content || null,
      author: authorName,
      event_type: form.event_type,
    });
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    setShowAdd(false);
    setForm({ event_type: "미팅", content: "" });
    setRefreshKey(k => k + 1);
  };

  const handleDelete = async (id: number) => {
    const authorName = getAuthorName();
    await supabase.from("calendar_events").delete().eq("id", id);
    setRefreshKey(k => k + 1);
  };

  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const today = new Date().toISOString().split("T")[0];
  const getDs = (d: number) => `${calYear}-${String(calMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const days = ["일","월","화","수","목","금","토"];

  const getItems = (d: number) => {
    const ds = getDs(d);
    return {
      ev: events.filter(e => e.date === ds),
      mt: meetings.filter(m => m.meeting_date?.startsWith(ds)),
      wp: wanpans.filter(w => w.dispatch_date?.startsWith(ds)),
    };
  };

  const selItems = selDate ? {
    ev: events.filter(e => e.date === selDate),
    mt: meetings.filter(m => m.meeting_date?.startsWith(selDate || "")),
    wp: wanpans.filter(w => w.dispatch_date?.startsWith(selDate || "")),
  } : { ev: [], mt: [], wp: [] };

  return (
    <>
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={()=>{ if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400"><ChevronLeft size={13}/></button>
          <span className="text-sm font-bold text-slate-700">{calYear}년 {calMonth}월</span>
          <button onClick={()=>{ if(calMonth===12){setCalMonth(1);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400"><ChevronRight size={13}/></button>
        </div>
        <button
          onClick={()=>{
            const ds = today;
            setSelDate(ds);
            setShowAdd(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={11}/> 일정 추가
        </button>
      </div>

      {/* 요일 */}
      <div className="grid grid-cols-7 border-b border-slate-50">
        {days.map((d,i)=>(
          <div key={d} className={`text-center py-1.5 text-[10px] font-semibold ${i===0?"text-red-400":i===6?"text-blue-400":"text-slate-400"}`}>{d}</div>
        ))}
      </div>

      {/* 날짜 */}
      <div className="grid grid-cols-7">
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} className="min-h-[72px] border-r border-b border-slate-50 bg-slate-50/20"/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const d = i+1; const ds = getDs(d);
          const {ev,mt,wp} = getItems(d);
          const isToday = ds===today; const dow=(firstDay+i)%7;
          const isSelected = selDate===ds && !showAdd;
          const total = ev.length+mt.length+wp.length;
          return (
            <div key={d}
              onClick={()=>{ setSelDate(ds); setShowDayPopup(true); setShowAdd(false); }}
              onDoubleClick={()=>{ setSelDate(ds); setShowAdd(true); setShowDayPopup(false); }}
              className={`min-h-[72px] border-r border-b border-slate-50 p-1 cursor-pointer transition-colors ${isSelected?"bg-blue-50/60":"hover:bg-slate-50"} ${(firstDay+i+1)%7===0?"border-r-0":""}`}
              title="더블클릭: 일정 추가">
              <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold mb-0.5 ${isToday?"bg-blue-600 text-white":dow===0?"text-red-400":dow===6?"text-blue-400":"text-slate-500"}`}>{d}</div>
              <div className="space-y-0.5">
                {wp.map(w=>(
                  <div key={`w${w.id}`} className="text-[9px] px-1 py-0.5 rounded truncate font-semibold bg-amber-100 text-amber-700">🚚 완판트럭</div>
                ))}
                {mt.slice(0,1).map(m=>(
                  <div key={`m${m.id}`} className="text-[9px] px-1 py-0.5 rounded truncate font-semibold bg-violet-50 text-violet-600">미팅 - {m.assigned_to}</div>
                ))}
                {ev.slice(0,2).map(e=>{
                  const c = EV_COLORS[e.event_type]||EV_COLORS["기타"];
                  return <div key={e.id} className={`text-[9px] px-1 py-0.5 rounded truncate font-semibold ${c.bg} ${c.text}`}>{e.event_type}</div>;
                })}
                {total>3&&<p className="text-[9px] text-slate-400 pl-0.5">+{total-3}</p>}
              </div>
            </div>
          );
        })}
      </div>



    </div>

    {/* 날짜 일정 팝업 */}
    {showDayPopup && selDate && !showAdd && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{background:"rgba(0,0,0,0.35)"}}
        onClick={()=>setShowDayPopup(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col"
          onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">
              {new Date(selDate+"T00:00:00").toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={()=>{setShowDayPopup(false);setShowAdd(true);}}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus size={12}/> 추가
              </button>
              <button onClick={()=>setShowDayPopup(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {selItems.wp.length===0 && selItems.mt.length===0 && selItems.ev.length===0 && (
              <p className="text-center py-6 text-slate-300 text-sm">일정이 없습니다</p>
            )}
            {selItems.wp.map(w=>(
              <div key={`w${w.id}`} className="rounded-xl p-3 bg-amber-50 border border-amber-100">
                <p className="text-xs font-bold text-amber-700 mb-1">🚚 완판트럭</p>
                <p className="text-sm font-bold text-slate-800">{w.location||"-"}</p>
              </div>
            ))}
            {selItems.mt.map(m=>(
              <div key={`m${m.id}`} className="rounded-xl p-3 bg-violet-50 border border-violet-100">
                <p className="text-xs font-bold text-violet-700 mb-1">미팅일정</p>
                <p className="text-sm font-bold text-slate-800">{m.name}</p>
              </div>
            ))}
            {selItems.ev.map(e=>{
              const c = EV_COLORS[e.event_type]||EV_COLORS["기타"];
              return (
                <div key={e.id} className={`rounded-xl p-3 border ${c.bg} border-slate-100`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${c.text}`}>{e.event_type}</span>
                    <button onClick={()=>{handleDelete(e.id);}}
                      className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                  {e.content&&<p className="text-sm text-slate-600 leading-relaxed">{e.content}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {/* 일정 추가 모달 - fixed로 항상 화면 중앙에 */}
    {showAdd && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        onClick={()=>setShowAdd(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
          onClick={e=>e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">일정 추가</h3>
            <button onClick={()=>setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">날짜</p>
              <input type="date" value={selDate||today} onChange={e=>setSelDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400"/>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">유형 선택</p>
              <div className="grid grid-cols-4 gap-2">
                {["연차","반차","미팅","기타"].map(t=>{
                  const c = EV_COLORS[t];
                  return (
                    <button key={t} onClick={()=>setForm((f: any)=>({...f,event_type:t}))}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors ${form.event_type===t?`${c.bg} ${c.text} border-current`:"bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">상세내용 <span className="text-slate-300">(선택)</span></p>
              <textarea value={form.content} onChange={e=>setForm((f: any)=>({...f,content:e.target.value}))}
                rows={3} placeholder="내용을 입력하세요"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none"/>
            </div>
          </div>
          <div className="flex gap-2 px-5 pb-5">
            <button onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Save size={13}/>{saving?"저장 중...":"저장"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}


// ── 메인 ──
export default function DashboardPage() {
  const [user, setUser] = useState<CRMUser|null>(null);
  const [current, setCurrent] = useState<Stats>(EMPTY);
  const [cumulative, setCumulative] = useState<Stats>(EMPTY);
  const [monthlyRev, setMonthlyRev] = useState<MonthlyRevenue[]>([]);
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);

  // 기간 필터
  const initStart = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
  };
  const initEnd = () => new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(initStart);
  const [endDate, setEndDate] = useState(initEnd);
  const [selMonth, setSelMonth] = useState(new Date().getMonth()+1);

  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{setUser(getCurrentUser());},[]);

  useEffect(()=>{
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchStats(user, startDate, endDate, false),
      fetchStats(user, startDate, endDate, true),
      fetchMonthlyRevenue(user, new Date().getFullYear(), new Date().getMonth()+1),
      fetchTodayEvents(user, eventDate),
    ]).then(([c,cum,rev,ev])=>{
      setCurrent(c); setCumulative(cum); setMonthlyRev(rev); setTodayEvents(ev); setLoading(false);
    });
  },[user, startDate, endDate, eventDate]);

  const applyMonth = (m: number) => {
    setSelMonth(m);
    const y = new Date().getFullYear();
    const s = `${y}-${String(m).padStart(2,"0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const e = `${y}-${String(m).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
    setStartDate(s); setEndDate(e);
  };

  const timeStr = now.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
  const dateStr = now.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  const isExec = user?.role === "exec";

 const CARDS = [
    {
      icon:"💰", label:"총매출(광고특전)",
      main: current.totalRevenue.toLocaleString()+"원",
      subs: undefined,
      cumLabel: cumulative.totalRevenue.toLocaleString()+"원",
    },
    {
      icon:"⚡", label:"연계매출(하이타겟)",
      main: current.linkedRevenue.toLocaleString()+"원",
      subs: undefined,
      cumLabel: `${cumulative.linkedCount}건`,
    },
    {
      icon:"💳", label:"분양회 입회비",
      main: current.membershipFeeAmt.toLocaleString()+"원",
      subs:[{label:"당월", value:`${current.membershipCount}건`, color:"text-slate-600"}],
      cumLabel: cumulative.membershipFeeAmt.toLocaleString()+"원",
    },
    {
      icon:"🔄", label:"분양회 월회비",
      main: current.monthlyFeeAmt.toLocaleString()+"원",
      subs:[{label:"당월", value:`${current.monthlyFeeCount}건`, color:"text-slate-600"}],
      cumLabel: cumulative.monthlyFeeAmt.toLocaleString()+"원",
    },
    {
      icon:"🎯", label:"가망고객",
      main:`${current.hotProspect+current.meetingProspect+current.linkedProspect}명`,
      subs:[
        {label:"즉가입가망",   value:`${current.hotProspect}명`,    color:"text-red-500"},
        {label:"미팅예정가망", value:`${current.meetingProspect}명`, color:"text-amber-500"},
        {label:"연계매출가망", value:`${current.linkedProspect}명`,  color:"text-slate-500"},
      ],
      cumLabel:`${cumulative.hotProspect+cumulative.meetingProspect+cumulative.linkedProspect}명`,
    },
    {
      icon:"📅", label:"미팅",
      main:`${current.upcomingMeetings}건`,
      subs:[
        {label:"미팅예정", value:`${current.upcomingMeetings}건`, color:"text-blue-500"},
        {label:"미팅완료", value:`${current.meetingDone}건`,       color:"text-emerald-500"},
      ],
      cumLabel:`${cumulative.upcomingMeetings + cumulative.meetingDone}건`,
    },
  ];
