"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

const EXEC_MEMBERS = [
  { name: "조계현", title: "어쏘" },
  { name: "이세호", title: "어쏘" },
  { name: "기여운", title: "어쏘" },
  { name: "최연전", title: "CX" },
];
const FIELDS = [
  { key: "consultant_db", label: "컨설턴트 DB", unit: "개" },
  { key: "second_touch", label: "2차 접점", unit: "개" },
  { key: "new_tm", label: "신규 TM", unit: "개" },
  { key: "manage_tm", label: "관리 TM", unit: "개" },
  { key: "coldtalk", label: "콜드톡 발송", unit: "개" },
] as const;
type AKey = (typeof FIELDS)[number]["key"];
type FV = Record<AKey | "meeting_confirmed", number>;
interface Row { id: number; work_date: string; owner_name: string; is_outside_meeting: boolean;
  goal_consultant_db: number; goal_second_touch: number; goal_new_tm: number; goal_manage_tm: number; goal_coldtalk: number; goal_meeting_confirmed: number;
  result_consultant_db: number; result_second_touch: number; result_new_tm: number; result_manage_tm: number; result_coldtalk: number; result_meeting_confirmed: number; }
const EMPTY: FV = { consultant_db: 0, second_touch: 0, new_tm: 0, manage_tm: 0, coldtalk: 0, meeting_confirmed: 0 };

function todayStr() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`; }
function fmtDate(d: string) { const dt = new Date(d+"T00:00:00"); const days = ["일","월","화","수","목","금","토"]; return `${dt.getMonth()+1}월 ${dt.getDate()}일 (${days[dt.getDay()]})`; }
function monthStart(d: string) { const dt = new Date(d+"T00:00:00"); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-01`; }
function monthEnd(d: string) { const dt = new Date(d+"T00:00:00"); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate()).padStart(2,"0")}`; }
function gv(r: Row|undefined, k: string) { return r ? Number((r as any)[`goal_${k}`] || 0) : 0; }
function rv(r: Row|undefined, k: string) { return r ? Number((r as any)[`result_${k}`] || 0) : 0; }
function pct(r: number, g: number) { return g > 0 ? Math.round(r/g*100) : r > 0 ? 100 : 0; }
function pctColor(p: number) { return p >= 100 ? "#16a34a" : p >= 70 ? "#2563eb" : p >= 40 ? "#ea7c1e" : "#dc2626"; }

export default function DailyActivity() {
  const [user, setUser] = useState<any>(null);
  const [date, setDate] = useState(todayStr());
  const [dailyRows, setDailyRows] = useState<Row[]>([]);
  const [periodRows, setPeriodRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [outside, setOutside] = useState(false);
  const [goal, setGoal] = useState<FV>({...EMPTY});
  const [result, setResult] = useState<FV>({...EMPTY});
  const [selOwner, setSelOwner] = useState(EXEC_MEMBERS[0].name);
  const [viewTab, setViewTab] = useState<"daily"|"weekly"|"monthly">("daily");

  const isAdmin = user?.role === "admin" || user?.role === "ops";
  const isMember = EXEC_MEMBERS.some(m => m.name === user?.name);
  const canEdit = isMember && date === todayStr();

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const u = getCurrentUser(); setUser(u);
    const ms = monthStart(date), me = monthEnd(date);
    const [r1, r2] = await Promise.all([
      supabase.from("daily_activity_goals").select("*").eq("work_date", date),
      supabase.from("daily_activity_goals").select("*").gte("work_date", ms).lte("work_date", me).order("work_date", { ascending: false }),
    ]);
    setDailyRows((r1.data || []) as Row[]);
    setPeriodRows((r2.data || []) as Row[]);
    // 내 데이터 로드
    const myRow = u?.name ? (r1.data || []).find((x: any) => x.owner_name === u.name) as Row|undefined : undefined;
    if (myRow) {
      setOutside(myRow.is_outside_meeting);
      setGoal({ consultant_db: myRow.goal_consultant_db||0, second_touch: myRow.goal_second_touch||0, new_tm: myRow.goal_new_tm||0, manage_tm: myRow.goal_manage_tm||0, coldtalk: myRow.goal_coldtalk||0, meeting_confirmed: myRow.goal_meeting_confirmed||0 });
      setResult({ consultant_db: myRow.result_consultant_db||0, second_touch: myRow.result_second_touch||0, new_tm: myRow.result_new_tm||0, manage_tm: myRow.result_manage_tm||0, coldtalk: myRow.result_coldtalk||0, meeting_confirmed: myRow.result_meeting_confirmed||0 });
    } else { setOutside(false); setGoal({...EMPTY}); setResult({...EMPTY}); }
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { if (user && isMember) setSelOwner(user.name); }, [user]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  const handleSave = async () => {
    if (!user || !isMember) return;
    setSaving(true);
    const member = EXEC_MEMBERS.find(m => m.name === user.name);
    const payload: any = { work_date: date, owner_name: user.name, owner_title: member?.title, owner_role: "exec", is_outside_meeting: outside };
    FIELDS.forEach(f => { payload[`goal_${f.key}`] = outside ? 0 : goal[f.key]; payload[`result_${f.key}`] = outside ? 0 : result[f.key]; });
    payload.goal_meeting_confirmed = outside ? 0 : goal.meeting_confirmed;
    payload.result_meeting_confirmed = outside ? 0 : result.meeting_confirmed;
    const { error } = await supabase.from("daily_activity_goals").upsert(payload, { onConflict: "work_date,owner_name" });
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    showToast("저장 완료"); fetchRows();
  };

  // 팀 요약
  const teamGoalTm = dailyRows.reduce((s, r) => s + gv(r,"new_tm") + gv(r,"manage_tm"), 0);
  const teamResultTm = dailyRows.reduce((s, r) => s + rv(r,"new_tm") + rv(r,"manage_tm"), 0);
  const teamGoalMeeting = dailyRows.reduce((s, r) => s + gv(r,"meeting_confirmed"), 0);
  const teamResultMeeting = dailyRows.reduce((s, r) => s + rv(r,"meeting_confirmed"), 0);
  const enteredGoal = dailyRows.filter(r => FIELDS.some(f => gv(r,f.key) > 0) || gv(r,"meeting_confirmed") > 0 || r.is_outside_meeting).length;
  const enteredResult = dailyRows.filter(r => FIELDS.some(f => rv(r,f.key) > 0) || rv(r,"meeting_confirmed") > 0 || r.is_outside_meeting).length;

  // 선택 담당자 기간 데이터
  const selPeriod = periodRows.filter(r => r.owner_name === selOwner);
  const summaryRows = viewTab === "daily" ? dailyRows : selPeriod;

  const inp = "px-3 py-2 text-sm rounded-lg outline-none font-semibold text-center";
  const inpS = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" };

  if (!user) return null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* 헤더 */}
      <div className="rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "4px solid #7c3aed" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "#7c3aed" }}>🎯 일별활동기록</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{fmtDate(date)} 기준</span>
            {isAdmin && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}>전체 보기</span>}
          </div>
          <h1 className="text-xl font-black" style={{ color: "var(--text)" }}>일별활동기록</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>개인별 활동목표와 결과 기록을 일·주·월 단위로 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 text-xs rounded-full outline-none font-bold" style={inpS} />
          <button onClick={fetchRows} className="px-4 py-2 text-xs font-bold rounded-full" style={{ background: "var(--bg)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>🔄 최신화</button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          {/* 팀 요약 KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "목표 입력", value: `${enteredGoal}/4`, sub: "실행파트", color: "#7c3aed" },
              { label: "결과 입력", value: `${enteredResult}/4`, sub: "실행파트", color: "#2563eb" },
              { label: "팀 TM 합계", value: `${teamResultTm}/${teamGoalTm}`, sub: `달성율 ${pct(teamResultTm,teamGoalTm)}%`, color: pctColor(pct(teamResultTm,teamGoalTm)) },
              { label: "팀 미팅 확정", value: `${teamResultMeeting}/${teamGoalMeeting}`, sub: `달성율 ${pct(teamResultMeeting,teamGoalMeeting)}%`, color: pctColor(pct(teamResultMeeting,teamGoalMeeting)) },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: `4px solid ${k.color}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>{k.label}</p>
                <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* 팀 전체 현황 테이블 */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>👥 팀 전체 현황 — {fmtDate(date)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr style={{ background: "rgba(124,58,237,0.06)" }}>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>담당자</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>상태</th>
                {FIELDS.map(f => <th key={f.key} className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>{f.label}</th>)}
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>미팅확정</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>TM합계</th>
              </tr></thead><tbody>
                {EXEC_MEMBERS.map(m => {
                  const row = dailyRows.find(r => r.owner_name === m.name);
                  const isOut = row?.is_outside_meeting;
                  const hasGoal = row && (FIELDS.some(f => gv(row,f.key)>0) || gv(row,"meeting_confirmed")>0 || isOut);
                  const hasResult = row && (FIELDS.some(f => rv(row,f.key)>0) || rv(row,"meeting_confirmed")>0 || isOut);
                  return (
                    <tr key={m.name} style={{ color: "var(--text)" }}>
                      <td className="px-3 py-2 text-xs text-center font-bold" style={{ borderBottom: "1px solid var(--border)" }}>{m.name}</td>
                      <td className="px-3 py-2 text-xs text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                        {isOut ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(234,124,30,0.1)", color: "#ea7c1e" }}>외근</span> :
                         hasResult ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}>결과입력</span> :
                         hasGoal ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(37,99,235,0.1)", color: "#2563eb" }}>목표입력</span> :
                         <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>미입력</span>}
                      </td>
                      {FIELDS.map(f => (
                        <td key={f.key} className="px-3 py-2 text-xs text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                          {isOut ? "-" : <><span className="font-bold" style={{ color: pctColor(pct(rv(row,f.key),gv(row,f.key))) }}>{rv(row,f.key)}</span><span style={{ color: "var(--text-muted)" }}>/{gv(row,f.key)}</span></>}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                        {isOut ? "-" : <><span className="font-bold" style={{ color: "#d97706" }}>{rv(row,"meeting_confirmed")}</span><span style={{ color: "var(--text-muted)" }}>/{gv(row,"meeting_confirmed")}</span></>}
                      </td>
                      <td className="px-3 py-2 text-xs text-center font-bold" style={{ borderBottom: "1px solid var(--border)", color: pctColor(pct(rv(row,"new_tm")+rv(row,"manage_tm"), gv(row,"new_tm")+gv(row,"manage_tm"))) }}>
                        {isOut ? "-" : `${rv(row,"new_tm")+rv(row,"manage_tm")}/${gv(row,"new_tm")+gv(row,"manage_tm")}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          </div>

          {/* 내 활동 입력 (실행파트만) */}
          {isMember && (
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "2px solid var(--border)" }}>
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>✏️ 내 활동기록 — {user?.name}</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={outside} onChange={e => setOutside(e.target.checked)} disabled={!canEdit} className="w-4 h-4 rounded" />
                  <span className="text-xs font-bold" style={{ color: "#ea7c1e" }}>외근/미팅</span>
                </label>
              </div>
              {outside ? (
                <div className="text-center py-8"><p className="text-sm font-bold" style={{ color: "#ea7c1e" }}>🚗 외근/미팅일입니다</p><p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>활동목표 및 결과 입력이 면제됩니다</p></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 목표 */}
                  <div>
                    <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "#7c3aed" }}>🎯 오늘의 목표</h4>
                    <div className="space-y-2">
                      {FIELDS.map(f => (
                        <div key={f.key} className="flex items-center gap-3">
                          <span className="text-xs font-bold w-[90px]" style={{ color: "var(--text-muted)" }}>{f.label}</span>
                          <input type="number" value={goal[f.key]||""} onChange={e => setGoal(p => ({...p,[f.key]:+e.target.value}))} disabled={!canEdit} className={inp+" w-20"} style={inpS} placeholder="0" />
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{f.unit}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold w-[90px]" style={{ color: "#d97706" }}>미팅 확정</span>
                        <input type="number" value={goal.meeting_confirmed||""} onChange={e => setGoal(p => ({...p,meeting_confirmed:+e.target.value}))} disabled={!canEdit} className={inp+" w-20"} style={inpS} placeholder="0" />
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>건</span>
                      </div>
                    </div>
                  </div>
                  {/* 결과 */}
                  <div>
                    <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: "#16a34a" }}>✅ 오늘의 결과</h4>
                    <div className="space-y-2">
                      {FIELDS.map(f => {
                        const p = pct(result[f.key], goal[f.key]);
                        return (
                          <div key={f.key} className="flex items-center gap-3">
                            <span className="text-xs font-bold w-[90px]" style={{ color: "var(--text-muted)" }}>{f.label}</span>
                            <input type="number" value={result[f.key]||""} onChange={e => setResult(p => ({...p,[f.key]:+e.target.value}))} disabled={!canEdit} className={inp+" w-20"} style={inpS} placeholder="0" />
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 80 }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(p,100)}%`, background: pctColor(p) }} />
                            </div>
                            <span className="text-[10px] font-bold w-10 text-right" style={{ color: pctColor(p) }}>{p}%</span>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold w-[90px]" style={{ color: "#d97706" }}>미팅 확정</span>
                        <input type="number" value={result.meeting_confirmed||""} onChange={e => setResult(p => ({...p,meeting_confirmed:+e.target.value}))} disabled={!canEdit} className={inp+" w-20"} style={inpS} placeholder="0" />
                        {(() => { const p = pct(result.meeting_confirmed, goal.meeting_confirmed); return (
                          <><div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 80 }}><div className="h-full rounded-full" style={{ width: `${Math.min(p,100)}%`, background: pctColor(p) }} /></div><span className="text-[10px] font-bold w-10 text-right" style={{ color: pctColor(p) }}>{p}%</span></>
                        ); })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {canEdit && (
                <div className="mt-5 text-center">
                  <button onClick={handleSave} disabled={saving} className="px-8 py-3 text-sm font-bold text-white rounded-xl" style={{ background: "#7c3aed", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>
                    {saving ? "저장 중..." : "💾 활동기록 저장"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 기간별 조회 (관리자/운영) */}
          {isAdmin && (
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "2px solid var(--border)" }}>
                <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>📊 기간별 조회</h3>
                <div className="flex items-center gap-2">
                  {EXEC_MEMBERS.map(m => (
                    <button key={m.name} onClick={() => setSelOwner(m.name)} className="px-3 py-1.5 text-xs font-bold rounded-full" style={{ background: selOwner === m.name ? "#7c3aed" : "transparent", color: selOwner === m.name ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>{m.name}</button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full"><thead><tr style={{ background: "rgba(124,58,237,0.06)" }}>
                  <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>날짜</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>상태</th>
                  {FIELDS.map(f => <th key={f.key} className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>{f.label}</th>)}
                  <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>미팅</th>
                </tr></thead><tbody>
                  {selPeriod.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>기록 없음</td></tr> :
                    selPeriod.map(r => (
                      <tr key={r.work_date} style={{ color: "var(--text)", background: r.work_date === date ? "rgba(124,58,237,0.04)" : "transparent" }}>
                        <td className="px-3 py-2 text-xs text-center font-semibold" style={{ borderBottom: "1px solid var(--border)" }}>{fmtDate(r.work_date)}</td>
                        <td className="px-3 py-2 text-xs text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                          {r.is_outside_meeting ? <span style={{ color: "#ea7c1e" }}>외근</span> : <span style={{ color: "#16a34a" }}>기록</span>}
                        </td>
                        {FIELDS.map(f => (
                          <td key={f.key} className="px-3 py-2 text-xs text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                            {r.is_outside_meeting ? "-" : <><span className="font-bold" style={{ color: pctColor(pct(rv(r,f.key),gv(r,f.key))) }}>{rv(r,f.key)}</span><span style={{ color: "var(--text-muted)" }}>/{gv(r,f.key)}</span></>}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-xs text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                          {r.is_outside_meeting ? "-" : <><span className="font-bold" style={{ color: "#d97706" }}>{rv(r,"meeting_confirmed")}</span>/{gv(r,"meeting_confirmed")}</>}
                        </td>
                      </tr>
                    ))}
                  {/* 합계 */}
                  {selPeriod.length > 0 && (
                    <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                      <td className="px-3 py-2 text-xs text-center">합계</td><td className="px-3 py-2 text-xs text-center">{selPeriod.length}일</td>
                      {FIELDS.map(f => <td key={f.key} className="px-3 py-2 text-xs text-center" style={{ color: "#7c3aed" }}>{selPeriod.reduce((s,r)=>s+rv(r,f.key),0)}/{selPeriod.reduce((s,r)=>s+gv(r,f.key),0)}</td>)}
                      <td className="px-3 py-2 text-xs text-center" style={{ color: "#d97706" }}>{selPeriod.reduce((s,r)=>s+rv(r,"meeting_confirmed"),0)}/{selPeriod.reduce((s,r)=>s+gv(r,"meeting_confirmed"),0)}</td>
                    </tr>
                  )}
                </tbody></table>
              </div>
            </div>
          )}
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg" style={{ background: "#111827" }}>{toast}</div>}
    </div>
  );
}
