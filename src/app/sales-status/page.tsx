"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

const EXEC_MEMBERS = ["조계현", "이세호", "기여운", "최연전"];
const DB_FIELDS = [
  { key: "db_total", label: "전체 관리 DB" },
  { key: "db_vip", label: "컨설턴트 VIP DB" },
  { key: "db_cross", label: "컨설턴트 교차 DB" },
  { key: "db_tm", label: "신규 TM DB" },
  { key: "db_truck", label: "완판트럭 DB" },
  { key: "db_mgm", label: "분양회 MGM DB" },
];
const FUNNEL = [
  { key: "fn_lead", label: "리드", color: "#94a3b8" },
  { key: "fn_prospect", label: "프로스펙팅", color: "#3b82f6" },
  { key: "fn_closing", label: "딜 클로징", color: "#f59e0b" },
  { key: "fn_reserve", label: "예약 완료", color: "#8b5cf6" },
  { key: "fn_contract", label: "계약 완료", color: "#10b981" },
];

interface RevItem { name: string; ad_type: string; amount: number; prob: number }
interface FeeRow { name: string; paid: string; plan: string; churn: string; note: string }
interface SData {
  user_name: string; month: string;
  db_total: number; db_vip: number; db_cross: number; db_tm: number; db_truck: number; db_mgm: number;
  fn_lead: number; fn_prospect: number; fn_closing: number; fn_reserve: number; fn_contract: number;
  rev_goal: number; rev_current: number; rev_items: RevItem[]; fee_data: FeeRow[];
}
const empty = (n: string, m: string): SData => ({
  user_name: n, month: m, db_total: 0, db_vip: 0, db_cross: 0, db_tm: 0, db_truck: 0, db_mgm: 0,
  fn_lead: 0, fn_prospect: 0, fn_closing: 0, fn_reserve: 0, fn_contract: 0,
  rev_goal: 0, rev_current: 0, rev_items: [], fee_data: [],
});
const fmt = (n: number) => n.toLocaleString();

export default function SalesStatus() {
  const [user, setUser] = useState<any>(null);
  const [selMonth, setSelMonth] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; });
  const [view, setView] = useState("");
  const [data, setData] = useState<Record<string, SData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };
  const isAdm = user?.role === "admin" || user?.role === "ops";

  useEffect(() => { const u = getCurrentUser(); setUser(u); if (u) setView(u.role === "exec" ? u.name : "전체"); }, []);
  useEffect(() => { if (user) load(); }, [user, selMonth]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase.from("sales_status").select("*").eq("month", selMonth);
      const m: Record<string, SData> = {};
      (rows || []).forEach((r: any) => { m[r.user_name] = { ...r, rev_items: r.rev_items || [], fee_data: r.fee_data || [] }; });
      EXEC_MEMBERS.forEach(n => { if (!m[n]) m[n] = empty(n, selMonth); });
      setData(m);
    } finally { setLoading(false); }
  };

  const save = async (name: string) => {
    setSaving(true);
    const d = data[name]; if (!d) { setSaving(false); return; }
    const p = { ...d, month: selMonth, updated_at: new Date().toISOString() };
    delete (p as any).id;
    const { error } = await supabase.from("sales_status").upsert(p, { onConflict: "user_name,month" });
    setSaving(false);
    showToast(error ? "저장 실패" : "저장 완료 ✓");
  };

  const upd = (n: string, f: string, v: number) => setData(p => ({ ...p, [n]: { ...p[n], [f]: v } }));
  const addRev = (n: string) => setData(p => ({ ...p, [n]: { ...p[n], rev_items: [...p[n].rev_items, { name: "", ad_type: "하이타겟", amount: 0, prob: 80 }] } }));
  const delRev = (n: string, i: number) => setData(p => ({ ...p, [n]: { ...p[n], rev_items: p[n].rev_items.filter((_, j) => j !== i) } }));
  const updRev = (n: string, i: number, f: string, v: any) => setData(p => { const items = [...p[n].rev_items]; items[i] = { ...items[i], [f]: v }; return { ...p, [n]: { ...p[n], rev_items: items } }; });
  const addFee = (n: string) => setData(p => ({ ...p, [n]: { ...p[n], fee_data: [...p[n].fee_data, { name: "", paid: "", plan: "", churn: "", note: "" }] } }));
  const delFee = (n: string, i: number) => setData(p => ({ ...p, [n]: { ...p[n], fee_data: p[n].fee_data.filter((_, j) => j !== i) } }));
  const updFee = (n: string, i: number, f: string, v: string) => setData(p => { const rows = [...p[n].fee_data]; rows[i] = { ...rows[i], [f]: v }; return { ...p, [n]: { ...p[n], fee_data: rows } }; });

  const renderMember = (name: string, edit: boolean) => {
    const d = data[name] || empty(name, selMonth);
    const revW = d.rev_items.reduce((s, r) => s + r.amount * r.prob / 100, 0);
    const rate = d.rev_goal > 0 ? d.rev_current / d.rev_goal * 100 : 0;
    const paidCnt = d.fee_data.filter(f => f.paid === "O").length;

    const inp = (field: string, val: number) => edit ? (
      <input type="number" value={val || ""} onChange={e => upd(name, field, parseInt(e.target.value) || 0)}
        className="w-full px-3 py-2 text-sm font-semibold rounded-lg outline-none text-center"
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
    ) : <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{fmt(val)}</span>;

    return (
      <div key={name} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black" style={{ color: "var(--text)" }}>{name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>실행파트</span>
          </div>
          {edit && <button onClick={() => save(name)} disabled={saving} className="px-5 py-2 text-sm font-bold text-white rounded-lg disabled:opacity-50" style={{ background: "#3b82f6" }}>{saving ? "저장 중..." : "💾 저장"}</button>}
        </div>

        {/* ① 고객 DB */}
        <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="text-sm font-bold mb-4 pb-2" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>① 고객 DB 현황</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {DB_FIELDS.map(f => (
              <div key={f.key} className="rounded-xl p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <p className="text-[10px] font-bold mb-1.5" style={{ color: "var(--text-muted)" }}>{f.label}</p>
                <div className="flex items-center gap-2">{inp(f.key, (d as any)[f.key])}<span className="text-xs" style={{ color: "var(--text-muted)" }}>건</span></div>
              </div>
            ))}
          </div>
          <h4 className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>세일즈 퍼널</h4>
          <div className="grid grid-cols-5 gap-2">
            {FUNNEL.map(f => (
              <div key={f.key} className="rounded-xl p-3 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <p className="text-[10px] font-bold mb-1.5" style={{ color: f.color }}>{f.label}</p>
                {inp(f.key, (d as any)[f.key])}
              </div>
            ))}
          </div>
        </section>

        {/* ② 매출 */}
        <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="text-sm font-bold mb-4 pb-2" style={{ color: "var(--text)", borderBottom: "2px solid var(--border)" }}>② 매출 현황 (하이타겟)</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>목표 (만원)</p>{inp("rev_goal", d.rev_goal)}
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold mb-2" style={{ color: "var(--text-muted)" }}>달성 (만원)</p>{inp("rev_current", d.rev_current)}
            </div>
          </div>
          {d.rev_goal > 0 && <div className="mb-4"><div className="flex justify-between mb-1"><span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>달성율</span><span className="text-lg font-black" style={{ color: rate >= 100 ? "#10b981" : "#3b82f6" }}>{rate.toFixed(1)}%</span></div><div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: rate >= 100 ? "#10b981" : "#3b82f6" }} /></div></div>}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>예상 매출액</h4>
            {edit && <button onClick={() => addRev(name)} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>+ 추가</button>}
          </div>
          {d.rev_items.map((r, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 rounded-lg p-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <input value={r.name} onChange={e => updRev(name, i, "name", e.target.value)} placeholder="회원명" disabled={!edit} className="flex-1 px-2 py-1.5 text-xs rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <select value={r.ad_type} onChange={e => updRev(name, i, "ad_type", e.target.value)} disabled={!edit} className="px-2 py-1.5 text-xs rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                <option>하이타겟</option><option>LMS</option><option>호갱노노</option><option>메타</option>
              </select>
              <input type="number" value={r.amount || ""} onChange={e => updRev(name, i, "amount", parseInt(e.target.value) || 0)} placeholder="만원" disabled={!edit} className="w-20 px-2 py-1.5 text-xs rounded-lg outline-none text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <select value={r.prob} onChange={e => updRev(name, i, "prob", parseInt(e.target.value))} disabled={!edit} className="px-2 py-1.5 text-xs rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {[100, 80, 60, 40, 20].map(p => <option key={p} value={p}>{p}%</option>)}
              </select>
              {edit && <button onClick={() => delRev(name, i)} className="text-xs" style={{ color: "#ef4444" }}>✕</button>}
            </div>
          ))}
          {d.rev_items.length > 0 && <p className="text-xs font-bold mt-2" style={{ color: "var(--text-muted)" }}>가중 예상: <span style={{ color: "#3b82f6" }}>{fmt(revW)}만원</span></p>}
        </section>

        {/* ③ 월회비 */}
        <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: "2px solid var(--border)" }}>
            <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>③ 월회비 납부 현황</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>납부 {paidCnt}/{d.fee_data.length}명</span>
              {edit && <button onClick={() => addFee(name)} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>+ 추가</button>}
            </div>
          </div>
          {d.fee_data.length === 0 ? <p className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>회원을 추가해주세요</p> : (
            <div className="space-y-2">
              {d.fee_data.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: f.churn === "O" ? "rgba(239,68,68,0.05)" : "var(--bg)", border: "1px solid var(--border)" }}>
                  {edit ? <input value={f.name} onChange={e => updFee(name, i, "name", e.target.value)} placeholder="고객명" className="w-20 px-2 py-1 text-xs font-bold rounded outline-none text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} /> : <span className="text-xs font-bold w-20 text-center" style={{ color: "var(--text)" }}>{f.name}</span>}
                  {[{k:"paid",l:"납부"},{k:"plan",l:"예정"},{k:"churn",l:"이탈"}].map(c => (
                    <div key={c.k} className="text-center">
                      <p className="text-[8px] font-bold mb-0.5" style={{ color: "var(--text-muted)" }}>{c.l}</p>
                      {edit ? <select value={(f as any)[c.k]} onChange={e => updFee(name, i, c.k, e.target.value)} className="px-1.5 py-1 text-xs rounded outline-none text-center font-bold" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: (f as any)[c.k] === "O" ? (c.k === "churn" ? "#ef4444" : "#10b981") : "var(--text)", width: 44 }}><option value="">-</option><option value="O">O</option><option value="X">X</option></select>
                      : <span className="text-xs font-bold" style={{ color: (f as any)[c.k] === "O" ? (c.k === "churn" ? "#ef4444" : "#10b981") : "var(--text-muted)" }}>{(f as any)[c.k] || "-"}</span>}
                    </div>
                  ))}
                  {edit ? <input value={f.note} onChange={e => updFee(name, i, "note", e.target.value)} placeholder="특이사항" className="flex-1 px-2 py-1 text-xs rounded outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} /> : <span className="flex-1 text-[10px]" style={{ color: "var(--text-muted)" }}>{f.note || ""}</span>}
                  {edit && <button onClick={() => delFee(name, i)} className="text-xs" style={{ color: "#ef4444" }}>✕</button>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderTeam = () => {
    const team: Record<string, number> = {};
    EXEC_MEMBERS.forEach(n => { const d = data[n] || empty(n, selMonth); [...DB_FIELDS, ...FUNNEL].forEach(f => { team[f.key] = (team[f.key] || 0) + (d as any)[f.key]; }); team.rev_goal = (team.rev_goal || 0) + d.rev_goal; team.rev_current = (team.rev_current || 0) + d.rev_current; });
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {EXEC_MEMBERS.map(n => {
            const d = data[n] || empty(n, selMonth);
            const r = d.rev_goal > 0 ? d.rev_current / d.rev_goal * 100 : 0;
            return (
              <div key={n} className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => setView(n)}
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>{n}</p>
                <p className="text-xl font-black mb-1" style={{ color: "var(--text)" }}>{fmt(d.rev_current)}만</p>
                <div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(r, 100)}%`, background: r >= 100 ? "#10b981" : "#3b82f6" }} /></div><span className="text-[10px] font-bold" style={{ color: r >= 100 ? "#10b981" : "#3b82f6" }}>{r.toFixed(0)}%</span></div>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>DB {fmt(d.db_total)} · 계약 {d.fn_contract}</p>
              </div>
            );
          })}
        </div>
        <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>팀 전체 세일즈 퍼널</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {FUNNEL.map((f, i) => (
              <div key={f.key} className="flex items-center gap-2">
                <div className="rounded-xl px-5 py-3 text-center" style={{ background: "var(--bg)", border: `2px solid ${f.color}` }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: f.color }}>{f.label}</p>
                  <p className="text-xl font-black" style={{ color: "var(--text)" }}>{team[f.key] || 0}</p>
                </div>
                {i < FUNNEL.length - 1 && <span style={{ color: "var(--text-muted)" }}>→</span>}
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text)" }}>담당자별 매출 비교</h3>
          {EXEC_MEMBERS.map(n => { const d = data[n] || empty(n, selMonth); const r = d.rev_goal > 0 ? d.rev_current / d.rev_goal * 100 : 0; return (
            <div key={n} className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold w-16" style={{ color: "var(--text)" }}>{n}</span>
              <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "var(--border)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(r, 100)}%`, background: r >= 100 ? "#10b981" : r >= 50 ? "#3b82f6" : "#f59e0b" }} /></div>
              <span className="text-xs font-bold w-28 text-right" style={{ color: "var(--text)" }}>{fmt(d.rev_current)}/{fmt(d.rev_goal)}만</span>
              <span className="text-xs font-black w-12 text-right" style={{ color: r >= 100 ? "#10b981" : "#3b82f6" }}>{r.toFixed(0)}%</span>
            </div>
          ); })}
        </section>
      </div>
    );
  };

  if (!user) return null;
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>📊 영업현황 대시보드</h1><p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>SALES DASHBOARD · {selMonth}</p></div>
        <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)} className="px-3 py-2 text-sm rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {isAdm && <button onClick={() => setView("전체")} className="px-4 py-2 text-xs font-bold rounded-full" style={{ background: view === "전체" ? "#3b82f6" : "var(--surface)", color: view === "전체" ? "#fff" : "var(--text-muted)", border: `1px solid ${view === "전체" ? "#3b82f6" : "var(--border)"}` }}>팀 전체</button>}
        {(isAdm ? EXEC_MEMBERS : [user.name]).map(n => (
          <button key={n} onClick={() => setView(n)} className="px-4 py-2 text-xs font-bold rounded-full" style={{ background: view === n ? "#3b82f6" : "var(--surface)", color: view === n ? "#fff" : "var(--text-muted)", border: `1px solid ${view === n ? "#3b82f6" : "var(--border)"}` }}>{n}</button>
        ))}
      </div>
      {loading ? <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      : view === "전체" ? renderTeam() : renderMember(view, (user.role === "exec" && view === user.name) || isAdm)}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 shadow-lg">{toast}</div>}
    </div>
  );
}
