"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

const EXEC_MEMBERS = ["조계현", "이세호", "기여운", "최연전"];
const MEMBER_MAP: Record<string, string[]> = {
  "조계현": ["백민엽","김나윤","김성호","박수근","김영성","이정재","김부성","신승훈","이인영","홍완호","이민경"],
  "이세호": ["위성민","김이태","임순석","장은경"],
  "기여운": ["최준호","김선호","허덕연","오정연","윤민","김정환","어수지","박홍배","이연수"],
  "최연전": ["최두식","김건하","신우진","윤권","김윤아","한세이","오세혁","윤지민"],
};
interface FeeRow { name: string; paid: string; expected: string; churn: string; note: string; }
const ROUTES = [
  { key: "route_vip", label: "컨설턴트 VIP", color: "#2563eb" },
  { key: "route_cross", label: "컨설턴트 교차소개", color: "#ea7c1e" },
  { key: "route_tm", label: "신규 TM", color: "#16a34a" },
  { key: "route_truck", label: "완판트럭", color: "#d97706" },
  { key: "route_mgm", label: "분양회 MGM", color: "#7c3aed" },
];
const FUNNELS = [
  { key: "funnel_lead", label: "리드", color: "#9ca3af" },
  { key: "funnel_prospect", label: "프로스펙팅", color: "#ea7c1e" },
  { key: "funnel_closing", label: "딜클로징", color: "#2563eb" },
  { key: "funnel_reserve", label: "예약완료", color: "#d97706" },
  { key: "funnel_contract", label: "계약완료", color: "#16a34a" },
];
interface PipelineRow { id: string; customer: string; amount: number; adType: string; prob: number; manager: string; note: string; }
const emptyRow = (): PipelineRow => ({ id: Date.now().toString(), customer: "", amount: 0, adType: "하이타겟", prob: 50, manager: "", note: "" });

export default function SalesStatus() {
  const [user, setUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState("");
  const [month, setMonth] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; });
  const [data, setData] = useState<any>({});
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [feeStatus, setFeeStatus] = useState<FeeRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [showInsight, setShowInsight] = useState(false);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"my"|"team">("my");

  useEffect(() => { const u = getCurrentUser(); setUser(u); if (u) setViewUser(u.name); }, []);
  useEffect(() => { if (viewUser && month) loadData(); }, [viewUser, month]);
  useEffect(() => { if (user && month && (user.role === "admin" || user.role === "ops")) loadTeamData(); }, [user, month]);

  const loadData = async () => {
    const { data: d } = await supabase.from("sales_status").select("*").eq("user_name", viewUser).eq("month", month).maybeSingle();
    if (d) { setData(d); setPipeline(Array.isArray(d.pipeline) ? d.pipeline : []); const fs = Array.isArray(d.fee_status) && d.fee_status.length > 0 ? d.fee_status : initFee(viewUser); setFeeStatus(fs); }
    else { setData({}); setPipeline([]); setFeeStatus(initFee(viewUser)); }
  };
  const initFee = (name: string): FeeRow[] => (MEMBER_MAP[name] || []).map(n => ({ name: n, paid: "X", expected: "X", churn: "X", note: "" }));
  const loadTeamData = async () => {
    const { data: d } = await supabase.from("sales_status").select("*").eq("month", month).in("user_name", EXEC_MEMBERS);
    setTeamData(d || []);
  };

  const val = (key: string) => data[key] || 0;
  const setVal = (key: string, v: number) => setData((p: any) => ({ ...p, [key]: v }));
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const saveData = async () => {
    setSaving(true);
    const payload = {
      user_name: viewUser, month, total_db: val("total_db"),
      route_vip: val("route_vip"), route_cross: val("route_cross"), route_tm: val("route_tm"), route_truck: val("route_truck"), route_mgm: val("route_mgm"),
      funnel_lead: val("funnel_lead"), funnel_prospect: val("funnel_prospect"), funnel_closing: val("funnel_closing"), funnel_reserve: val("funnel_reserve"), funnel_contract: val("funnel_contract"),
      ht_goal: val("ht_goal"), ht_current: val("ht_current"), member_goal: val("member_goal"), member_current: val("member_current"),
      pipeline, fee_status: feeStatus, updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("sales_status").upsert(payload, { onConflict: "user_name,month" });
    setSaving(false);
    if (error) showToast("저장 실패: " + error.message); else { showToast("저장 완료"); loadTeamData(); }
  };

  const isAdmin = user?.role === "admin" || user?.role === "ops";
  const canEdit = viewUser === user?.name;
  const routeTotal = ROUTES.reduce((s, r) => s + val(r.key), 0);
  const funnelTotal = FUNNELS.reduce((s, f) => s + val(f.key), 0);
  const htPct = val("ht_goal") > 0 ? (val("ht_current") / val("ht_goal") * 100) : 0;
  const pColor = (p: number) => p >= 80 ? "#16a34a" : p >= 50 ? "#ea7c1e" : "#dc2626";
  const weighted = pipeline.reduce((s, r) => s + (r.amount * r.prob / 100), 0);
  const confirmed = pipeline.filter(r => r.prob === 100).reduce((s, r) => s + r.amount, 0);
  const teamSum = (key: string) => teamData.reduce((s, d) => s + (d[key] || 0), 0);

  const inp = "px-3 py-2.5 text-sm rounded-lg outline-none font-semibold";
  const inpS = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" };

  if (!user) return null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* 헤더 */}
      <div className="rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "4px solid #2563eb" }}>
        <div>
          <h1 className="text-2xl font-black tracking-wider" style={{ color: "#2563eb" }}>SALES STATUS</h1>
          <p className="text-xs font-semibold mt-1" style={{ color: "var(--text-muted)" }}>영업현황 대시보드 · {viewUser}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <button onClick={() => setViewMode("team")} className="px-3 py-1.5 text-xs font-bold rounded-full" style={{ background: viewMode === "team" ? "#2563eb" : "transparent", color: viewMode === "team" ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>팀 전체</button>
              {EXEC_MEMBERS.map(n => (
                <button key={n} onClick={() => { setViewUser(n); setViewMode("my"); }} className="px-3 py-1.5 text-xs font-bold rounded-full" style={{ background: viewUser === n && viewMode === "my" ? "#2563eb" : "transparent", color: viewUser === n && viewMode === "my" ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>{n}</button>
              ))}
            </>
          )}
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-3 py-1.5 text-xs rounded-lg outline-none" style={inpS} />
        </div>
      </div>

      {viewMode === "team" && isAdmin ? (
        <>
          {/* 팀 KPI */}
          <div className="grid grid-cols-4 gap-4">
            {[{ l: "팀 전체 DB", v: teamSum("total_db"), c: "#2563eb" }, { l: "팀 퍼널 합계", v: FUNNELS.reduce((s,f) => s + teamSum(f.key), 0), c: "#ea7c1e" }, { l: "팀 HT 달성", v: teamSum("ht_current"), c: "#16a34a", sub: `목표 ${teamSum("ht_goal").toLocaleString()}만` }, { l: "팀 가중 예상매출", v: Math.round(teamData.reduce((s,d) => s + (Array.isArray(d.pipeline) ? d.pipeline.reduce((s2: number,r: any) => s2 + ((r.amount||0)*(r.prob||0)/100), 0) : 0), 0)), c: "#d97706" }].map(k => (
              <div key={k.l} className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: `4px solid ${k.c}` }}>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>{k.l}</p>
                <p className="text-3xl font-black" style={{ color: k.c }}>{k.v.toLocaleString()}</p>
                {k.sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{k.sub}</p>}
              </div>
            ))}
          </div>
          {/* 담당자별 비교 테이블 */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>📊 담당자별 현황 비교</h3>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.06)" }}>
              {["담당자","전체DB",...FUNNELS.map(f=>f.label),"HT목표","HT달성","달성율","가중예상"].map(h => <th key={h} className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>{h}</th>)}
            </tr></thead><tbody>
              {EXEC_MEMBERS.map(name => {
                const d: any = teamData.find(x => x.user_name === name) || {};
                const pct = (d.ht_goal||0) > 0 ? ((d.ht_current||0)/d.ht_goal*100) : 0;
                const wt = Array.isArray(d.pipeline) ? d.pipeline.reduce((s: number,r: any) => s+((r.amount||0)*(r.prob||0)/100), 0) : 0;
                return (<tr key={name} style={{ color: "var(--text)" }}>
                  <td className="px-3 py-2 text-xs text-center font-bold">{name}</td>
                  <td className="px-3 py-2 text-xs text-center">{(d.total_db||0).toLocaleString()}</td>
                  {FUNNELS.map(f => <td key={f.key} className="px-3 py-2 text-xs text-center font-bold" style={{ color: f.color }}>{(d[f.key]||0)}</td>)}
                  <td className="px-3 py-2 text-xs text-center">{(d.ht_goal||0).toLocaleString()}만</td>
                  <td className="px-3 py-2 text-xs text-center font-bold">{(d.ht_current||0).toLocaleString()}만</td>
                  <td className="px-3 py-2 text-xs text-center font-black" style={{ color: pColor(pct) }}>{pct.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-xs text-center font-bold" style={{ color: "#d97706" }}>{Math.round(wt).toLocaleString()}만</td>
                </tr>);
              })}
            </tbody></table></div>
          </div>
        </>
      ) : (
        <>
          {/* 개인 뷰 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 전체 관리 DB */}
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4 pb-3" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>📋 전체 관리 DB</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>전체 DB 수</span>
                <input type="number" value={val("total_db")||""} onChange={e => setVal("total_db",+e.target.value)} disabled={!canEdit} className={inp} style={inpS} placeholder="0" />
                <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>건</span>
              </div>
            </div>
            {/* DB 경로별 */}
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4 pb-3" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>🔀 DB 유치대상 경로별 <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>합계 {routeTotal}건</span></h3>
              <div className="space-y-3">
                {ROUTES.map(r => (
                  <div key={r.key} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="text-xs font-bold flex-shrink-0 w-[110px]" style={{ color: "var(--text-muted)" }}>{r.label}</span>
                    <input type="number" value={val(r.key)||""} onChange={e => setVal(r.key,+e.target.value)} disabled={!canEdit} className={inp+" w-[100px]"} style={inpS} placeholder="0" />
                    <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>건</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 세일즈 퍼널 */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold mb-4 pb-3" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>🔽 세일즈 퍼널 <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>합계 {funnelTotal}건</span></h3>
            <div className="grid grid-cols-5 gap-3">
              {FUNNELS.map(f => (
                <div key={f.key} className="rounded-xl p-3 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: f.color }}>{f.label}</p>
                  <input type="number" value={val(f.key)||""} onChange={e => setVal(f.key,+e.target.value)} disabled={!canEdit} className="w-full px-2 py-2 text-center text-sm font-bold rounded-lg outline-none" style={inpS} placeholder="0" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* HT 진척율 */}
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4 pb-3" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>📈 하이타겟 매출 진척율</h3>
              <div className="space-y-3">
                {[{l:"월 목표",k:"ht_goal",u:"만원"},{l:"현재 달성",k:"ht_current",u:"만원"}].map(i => (
                  <div key={i.k} className="flex items-center gap-3">
                    <span className="text-xs font-bold" style={{ color: "var(--text-muted)", minWidth: 70 }}>{i.l}</span>
                    <input type="number" value={val(i.k)||""} onChange={e => setVal(i.k,+e.target.value)} disabled={!canEdit} className={inp+" flex-1"} style={inpS} placeholder="0" />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{i.u}</span>
                  </div>
                ))}
                <div><div className="flex justify-between text-xs font-bold mb-1"><span style={{ color: "var(--text-muted)" }}>달성율</span><span style={{ color: pColor(htPct) }}>{htPct.toFixed(1)}%</span></div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(htPct,100)}%`, background: pColor(htPct) }} /></div></div>
              </div>
            </div>
            {/* 분양회 모집 */}
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold mb-4 pb-3" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>🏆 분양회 모집 현황</h3>
              <div className="space-y-3">
                {[{l:"월 목표",k:"member_goal",u:"명"},{l:"현재 모집",k:"member_current",u:"명"}].map(i => (
                  <div key={i.k} className="flex items-center gap-3">
                    <span className="text-xs font-bold" style={{ color: "var(--text-muted)", minWidth: 70 }}>{i.l}</span>
                    <input type="number" value={val(i.k)||""} onChange={e => setVal(i.k,+e.target.value)} disabled={!canEdit} className={inp+" flex-1"} style={inpS} placeholder="0" />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{i.u}</span>
                  </div>
                ))}
                {val("member_goal") > 0 && (() => { const r = val("member_current")/val("member_goal")*100; return (
                  <div><div className="flex justify-between text-xs font-bold mb-1"><span style={{ color: "var(--text-muted)" }}>달성율</span><span style={{ color: pColor(r) }}>{r.toFixed(1)}%</span></div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(r,100)}%`, background: pColor(r) }} /></div></div>
                ); })()}
              </div>
            </div>
          </div>

          {/* 파이프라인 */}
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "2px solid var(--border)" }}>
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>💰 예상 매출 파이프라인 <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>가중 {Math.round(weighted).toLocaleString()}만 / 확정 {confirmed.toLocaleString()}만</span></h3>
              {canEdit && <button onClick={() => setPipeline(p => [...p, emptyRow()])} className="px-3 py-1.5 text-xs font-bold rounded-lg" style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb", border: "1px solid rgba(37,99,235,0.15)" }}>+ 추가</button>}
            </div>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.06)" }}>
              {["고객/현장","금액(만)","광고구분","성사확률","담당자","비고",canEdit?"":""].filter(Boolean).map(h => <th key={h} className="px-2 py-2 text-xs font-bold text-center" style={{ color: "var(--text)" }}>{h}</th>)}
            </tr></thead><tbody>
              {pipeline.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>항목을 추가해주세요</td></tr> :
                pipeline.map((r, i) => (
                  <tr key={r.id} style={{ color: "var(--text)" }}>
                    <td className="px-2 py-1.5"><input type="text" value={r.customer} onChange={e => { const n=[...pipeline]; n[i].customer=e.target.value; setPipeline(n); }} disabled={!canEdit} className="w-full px-2 py-1.5 text-xs rounded-lg outline-none" style={inpS} /></td>
                    <td className="px-2 py-1.5"><input type="number" value={r.amount||""} onChange={e => { const n=[...pipeline]; n[i].amount=+e.target.value; setPipeline(n); }} disabled={!canEdit} className="w-20 px-2 py-1.5 text-xs text-center rounded-lg outline-none" style={inpS} /></td>
                    <td className="px-2 py-1.5"><select value={r.adType} onChange={e => { const n=[...pipeline]; n[i].adType=e.target.value; setPipeline(n); }} disabled={!canEdit} className="px-2 py-1.5 text-xs rounded-lg outline-none" style={inpS}>
                      {["하이타겟","LMS","호갱노노","메타","기타"].map(o => <option key={o}>{o}</option>)}</select></td>
                    <td className="px-2 py-1.5"><select value={r.prob} onChange={e => { const n=[...pipeline]; n[i].prob=+e.target.value; setPipeline(n); }} disabled={!canEdit} className="px-2 py-1.5 text-xs rounded-lg outline-none" style={inpS}>
                      {[10,20,30,40,50,60,70,80,90,100].map(o => <option key={o} value={o}>{o}%</option>)}</select></td>
                    <td className="px-2 py-1.5"><input type="text" value={r.manager} onChange={e => { const n=[...pipeline]; n[i].manager=e.target.value; setPipeline(n); }} disabled={!canEdit} className="w-20 px-2 py-1.5 text-xs rounded-lg outline-none" style={inpS} /></td>
                    <td className="px-2 py-1.5"><input type="text" value={r.note} onChange={e => { const n=[...pipeline]; n[i].note=e.target.value; setPipeline(n); }} disabled={!canEdit} className="w-full px-2 py-1.5 text-xs rounded-lg outline-none" style={inpS} /></td>
                    {canEdit && <td className="px-2 py-1.5"><button onClick={() => setPipeline(p => p.filter((_,j)=>j!==i))} className="text-xs px-2 py-1 rounded" style={{ color: "#ef4444" }}>삭제</button></td>}
                  </tr>))}
            </tbody></table></div>
          </div>

          {/* 저장 + 분석 */}
          <div className="flex items-center justify-center gap-4">

          {/* 회비 납부 현황 */}
          <div className="w-full rounded-2xl p-5 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold mb-4 pb-3" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
              💳 {month.split("-")[1]}월 회비 납부 현황 — {viewUser}
              <span className="font-normal text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                납부 {feeStatus.filter(r=>r.paid==="O").length}명 / 전체 {feeStatus.length}명
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.06)" }}>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)", width: 50 }}>No</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)", width: 90 }}>고객명</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "#16a34a", width: 90 }}>납부여부</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "#2563eb", width: 90 }}>납부예정</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "#dc2626", width: 90 }}>이탈확정</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold" style={{ color: "var(--text)" }}>특이사항</th>
              </tr></thead><tbody>
                {feeStatus.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>담당 회원이 없습니다</td></tr> :
                  feeStatus.map((r, i) => (
                    <tr key={i} style={{ color: "var(--text)", background: r.churn === "O" ? "rgba(220,38,38,0.04)" : r.paid === "O" ? "rgba(22,163,74,0.03)" : "transparent" }}>
                      <td className="px-3 py-2 text-xs text-center font-bold" style={{ borderBottom: "1px solid var(--border)" }}>{i + 1}</td>
                      <td className="px-3 py-2 text-xs text-center font-bold" style={{ borderBottom: "1px solid var(--border)" }}>{r.name}</td>
                      <td className="px-3 py-2 text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                        <select value={r.paid} onChange={e => { const n = [...feeStatus]; n[i].paid = e.target.value; setFeeStatus(n); }} disabled={!canEdit}
                          className="px-2 py-1.5 text-xs font-bold rounded-lg outline-none text-center" style={{ ...inpS, color: r.paid === "O" ? "#16a34a" : "var(--text-muted)", minWidth: 60 }}>
                          <option value="O">O</option><option value="X">X</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                        <select value={r.expected} onChange={e => { const n = [...feeStatus]; n[i].expected = e.target.value; setFeeStatus(n); }} disabled={!canEdit}
                          className="px-2 py-1.5 text-xs font-bold rounded-lg outline-none text-center" style={{ ...inpS, color: r.expected === "O" ? "#2563eb" : "var(--text-muted)", minWidth: 60 }}>
                          <option value="O">O</option><option value="X">X</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center" style={{ borderBottom: "1px solid var(--border)" }}>
                        <select value={r.churn} onChange={e => { const n = [...feeStatus]; n[i].churn = e.target.value; setFeeStatus(n); }} disabled={!canEdit}
                          className="px-2 py-1.5 text-xs font-bold rounded-lg outline-none text-center" style={{ ...inpS, color: r.churn === "O" ? "#dc2626" : "var(--text-muted)", minWidth: 60 }}>
                          <option value="O">O</option><option value="X">X</option>
                        </select>
                      </td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                        <input type="text" value={r.note} onChange={e => { const n = [...feeStatus]; n[i].note = e.target.value; setFeeStatus(n); }} disabled={!canEdit}
                          className="w-full px-2 py-1.5 text-xs rounded-lg outline-none" style={inpS} placeholder="특이사항 입력" />
                      </td>
                    </tr>
                  ))}
              </tbody></table>
            </div>
            {feeStatus.length > 0 && (
              <div className="mt-3 flex gap-4 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                <span>✅ 납부완료 <strong style={{ color: "#16a34a" }}>{feeStatus.filter(r=>r.paid==="O").length}명</strong></span>
                <span>📋 납부예정 <strong style={{ color: "#2563eb" }}>{feeStatus.filter(r=>r.expected==="O").length}명</strong></span>
                <span>🚨 이탈확정 <strong style={{ color: "#dc2626" }}>{feeStatus.filter(r=>r.churn==="O").length}명</strong></span>
                <span>⏳ 미정 <strong>{feeStatus.filter(r=>r.paid==="X"&&r.expected==="X"&&r.churn==="X").length}명</strong></span>
              </div>
            )}
          </div>
            {canEdit && <button onClick={saveData} disabled={saving} className="px-8 py-3.5 text-sm font-bold text-white rounded-xl" style={{ background: "#2563eb", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}>{saving ? "저장 중..." : "💾 데이터 저장"}</button>}
            <button onClick={() => setShowInsight(v => !v)} className="px-8 py-3.5 text-sm font-bold rounded-xl" style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a", border: "1.5px solid #16a34a" }}>📊 분석 실행</button>
          </div>

          {/* 인사이트 */}
          {showInsight && (
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>📊 분석 인사이트</h3>
              <div className="grid grid-cols-4 gap-3">
                {[{l:"전체 DB",v:val("total_db"),c:"#2563eb"},{l:"퍼널 합계",v:funnelTotal,c:"#ea7c1e"},{l:"HT 진척율",v:`${htPct.toFixed(1)}%`,c:pColor(htPct)},{l:"가중 예상매출",v:`${Math.round(weighted).toLocaleString()}만`,c:"#d97706"}].map(k => (
                  <div key={k.l} className="rounded-xl p-4" style={{ background: "var(--bg)", borderTop: `4px solid ${k.c}` }}>
                    <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>{k.l}</p>
                    <p className="text-2xl font-black" style={{ color: k.c }}>{typeof k.v==="number"?k.v.toLocaleString():k.v}</p>
                  </div>))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>📋 DB 경로별</p>
                  {ROUTES.map(r => (<div key={r.key} className="flex items-center gap-2 mb-2"><span className="text-[10px] font-bold" style={{ color: "var(--text-muted)", minWidth: 80 }}>{r.label}</span><div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}><div className="h-full rounded-full" style={{ width: `${routeTotal>0?val(r.key)/routeTotal*100:0}%`, background: r.color }} /></div><span className="text-xs font-bold" style={{ color: "var(--text)" }}>{val(r.key)}</span></div>))}
                </div>
                <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>🔽 세일즈 퍼널</p>
                  <div className="flex items-center gap-1">{FUNNELS.map(f => (<div key={f.key} className="flex-1 text-center"><p className="text-[10px] font-bold" style={{ color: f.color }}>{f.label}</p><p className="text-lg font-black" style={{ color: f.color }}>{val(f.key)}</p></div>))}</div>
                  {funnelTotal>0&&val("funnel_contract")>0&&<p className="text-xs mt-3 font-semibold" style={{ color: "var(--text-muted)" }}>계약 전환율: <span style={{ color: "#16a34a", fontWeight: 800 }}>{(val("funnel_contract")/funnelTotal*100).toFixed(1)}%</span></p>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg" style={{ background: "#111827" }}>{toast}</div>}
    </div>
  );
}
