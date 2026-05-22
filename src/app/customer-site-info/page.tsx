"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

interface SiteRow {
  contact_id: string; name: string; title: string; assigned_to: string; consultant: string;
  site_name: string; site_condition: string; has_relocation: boolean; relocation_site: string; relocation_month: string; keep_current: boolean;
  region: string; population: string; contract_terms: string; sales_rate: string; agency_info: string; ad_schedule: string; relocation_plan: string;
  org_chart: string; org_count: string; rt: string;
  ad_cost_type: string; ad_total_cost: string; ad_items: string;
  latest_date: string;
}

export default function CustomerSiteInfo() {
  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SiteRow | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterMove, setFilterMove] = useState("");

  useEffect(() => { setUser(getCurrentUser()); loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    // 모든 customer_analysis 레코드에서 최신 데이터만 추출
    const { data: analyses } = await supabase.from("customer_analysis").select("*").order("created_at", { ascending: false });
    const { data: contacts } = await supabase.from("contacts").select("id,name,title,assigned_to,consultant").in("meeting_result", ["계약완료", "예약완료"]);

    if (!analyses || !contacts) { setLoading(false); return; }

    // contact_id별 최신 레코드만 추출
    const latestMap = new Map<string, any>();
    analyses.forEach((a: any) => {
      if (!latestMap.has(a.contact_id)) latestMap.set(a.contact_id, a);
    });

    // 현장정보가 있는 고객만 필터
    const siteRows: SiteRow[] = [];
    latestMap.forEach((a, contactId) => {
      if (!a.site_name && !a.region && !a.site_condition && !a.relocation_month && !a.keep_current) return;
      const c = contacts.find((c: any) => c.id === contactId);
      if (!c) return;
      siteRows.push({
        contact_id: contactId, name: c.name, title: c.title || "", assigned_to: c.assigned_to || "", consultant: c.consultant || "",
        site_name: a.site_name || "", site_condition: a.site_condition || "", region: a.region || "",
        has_relocation: !!(a.relocation_month || a.relocation_site) && !a.keep_current,
        relocation_site: a.relocation_site || "", relocation_month: a.relocation_month || "",
        keep_current: a.keep_current || false,
        population: a.population || "", contract_terms: a.contract_terms || "", sales_rate: a.sales_rate || "",
        agency_info: a.agency_info || "", ad_schedule: a.ad_schedule || "", relocation_plan: a.relocation_plan || "",
        org_chart: a.org_chart || "", org_count: a.org_count || "", rt: a.rt || "",
        ad_cost_type: a.ad_cost_type || "", ad_total_cost: a.ad_total_cost || "", ad_items: a.ad_items || "",
        latest_date: a.created_at ? new Date(a.created_at).toLocaleDateString("ko-KR") : "",
      });
    });
    setRows(siteRows.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  const openPanel = async (row: SiteRow) => {
    setSelected(row);
    const { data } = await supabase.from("customer_analysis").select("*").eq("contact_id", row.contact_id).order("created_at", { ascending: false });
    setHistory(data || []);
  };

  const filtered = rows.filter(r => {
    if (search && !r.name.includes(search) && !r.site_name.includes(search) && !r.assigned_to.includes(search)) return false;
    if (filterCondition && r.site_condition !== filterCondition) return false;
    if (filterMove === "O" && !r.has_relocation) return false;
    if (filterMove === "X" && r.has_relocation) return false;
    if (filterMove === "유지" && !r.keep_current) return false;
    return true;
  });

  const th = "px-3 py-2.5 text-center text-xs font-bold";
  const td = "px-3 py-2 text-xs text-center";
  const inpS = { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" };

  if (!user) return null;

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderBottom: "4px solid #3b82f6" }}>
        <h1 className="text-xl font-black" style={{ color: "var(--text)" }}>🏗️ 고객현장정보</h1>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>현장정보가 기입된 고객들의 현장 현황을 한 눈에 확인합니다</p>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="고객명 / 현장명 / 담당자 검색"
          className="px-4 py-2 text-xs rounded-lg outline-none w-60" style={inpS} />
        <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)} className="px-3 py-2 text-xs rounded-lg outline-none" style={inpS}>
          <option value="">현장컨디션 전체</option>
          <option value="그랜드오픈">그랜드오픈</option>
          <option value="정체기">정체기</option>
          <option value="설거지">설거지</option>
        </select>
        <select value={filterMove} onChange={e => setFilterMove(e.target.value)} className="px-3 py-2 text-xs rounded-lg outline-none" style={inpS}>
          <option value="">이동계획 전체</option>
          <option value="O">이동예정 O</option>
          <option value="X">이동예정 X</option>
          <option value="유지">기존현장 유지</option>
        </select>
        <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>총 {filtered.length}명</span>
      </div>

      {/* 테이블 */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {loading ? <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.06)" }}>
              <th className={th} style={{ color: "var(--text)" }}>고객명</th>
              <th className={th} style={{ color: "var(--text)" }}>직급</th>
              <th className={th} style={{ color: "var(--text)" }}>대협팀</th>
              <th className={th} style={{ color: "var(--text)" }}>컨설턴트</th>
              <th className={th} style={{ color: "var(--text)" }}>현재현장명</th>
              <th className={th} style={{ color: "var(--text)" }}>현장컨디션</th>
              <th className={th} style={{ color: "var(--text)" }}>이동계획</th>
              <th className={th} style={{ color: "var(--text)" }}>이동현장명</th>
              <th className={th} style={{ color: "var(--text)" }}>이동일정</th>
            </tr></thead><tbody>
              {filtered.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-xs" style={{ color: "var(--text-muted)" }}>현장정보가 기입된 고객이 없습니다</td></tr> :
                filtered.map(r => (
                  <tr key={r.contact_id} onClick={() => openPanel(r)} className="cursor-pointer transition-all" style={{ color: "var(--text)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className={td + " font-bold"} style={{ borderBottom: "1px solid var(--border)" }}>{r.name}</td>
                    <td className={td} style={{ borderBottom: "1px solid var(--border)" }}>{r.title}</td>
                    <td className={td} style={{ borderBottom: "1px solid var(--border)" }}>{r.assigned_to}</td>
                    <td className={td} style={{ borderBottom: "1px solid var(--border)" }}>{r.consultant}</td>
                    <td className={td + " font-semibold"} style={{ borderBottom: "1px solid var(--border)", color: "#3b82f6" }}>{r.site_name || "-"}</td>
                    <td className={td} style={{ borderBottom: "1px solid var(--border)" }}>
                      {r.site_condition ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                        background: r.site_condition === "그랜드오픈" ? "rgba(22,163,74,0.1)" : r.site_condition === "정체기" ? "rgba(234,124,30,0.1)" : "rgba(220,38,38,0.1)",
                        color: r.site_condition === "그랜드오픈" ? "#16a34a" : r.site_condition === "정체기" ? "#ea7c1e" : "#dc2626"
                      }}>{r.site_condition}</span> : "-"}
                    </td>
                    <td className={td} style={{ borderBottom: "1px solid var(--border)" }}>
                      {r.keep_current ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}>유지</span> :
                       r.has_relocation ? <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(234,124,30,0.1)", color: "#ea7c1e" }}>O</span> :
                       <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>-</span>}
                    </td>
                    <td className={td + " font-semibold"} style={{ borderBottom: "1px solid var(--border)", color: r.relocation_site ? "#ea7c1e" : "var(--text-muted)" }}>{r.relocation_site || "-"}</td>
                    <td className={td} style={{ borderBottom: "1px solid var(--border)", color: r.relocation_month ? "#7c3aed" : "var(--text-muted)" }}>{r.relocation_month || "-"}</td>
                  </tr>
                ))}
            </tbody></table>
          </div>
        )}
      </div>

      {/* 슬라이드 패널 */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full z-50 overflow-y-auto shadow-2xl" style={{ width: "min(600px, 85vw)", background: "var(--bg)", borderLeft: "1px solid var(--border)", animation: "slideIn .25s ease" }}>
            <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
            <div className="sticky top-0 z-10 p-4 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <div>
                <h2 className="text-sm font-black" style={{ color: "var(--text)" }}>{selected.name} <span className="font-normal" style={{ color: "var(--text-muted)" }}>{selected.title}</span></h2>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>담당: {selected.assigned_to} / 컨설턴트: {selected.consultant}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>×</button>
            </div>

            {/* 현재 현장 요약 */}
            <div className="p-4">
              <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3 pb-2" style={{ color: "#3b82f6", borderBottom: "1px solid var(--border)" }}>🏗️ 현재 현장 요약</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span style={{ color: "var(--text-muted)" }}>현장명</span> <b className="block" style={{ color: "#3b82f6" }}>{selected.site_name || "-"}</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>현장컨디션</span> <b className="block" style={{ color: "var(--text)" }}>{selected.site_condition || "-"}</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>지역</span> <b className="block" style={{ color: "var(--text)" }}>{selected.region || "-"}</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>인구수</span> <b className="block" style={{ color: "var(--text)" }}>{selected.population || "-"}</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>분양률</span> <b className="block" style={{ color: "var(--text)" }}>{selected.sales_rate || "-"}</b></div>
                  <div><span style={{ color: "var(--text-muted)" }}>계약조건</span> <b className="block" style={{ color: "var(--text)" }}>{selected.contract_terms || "-"}</b></div>
                  <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>대행사</span> <b className="block" style={{ color: "var(--text)" }}>{selected.agency_info || "-"}</b></div>
                  <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>광고스케줄</span> <b className="block" style={{ color: "var(--text)" }}>{selected.ad_schedule || "-"}</b></div>
                  <div className="col-span-2 mt-2 pt-2" style={{ borderTop: "1px dashed var(--border)" }}>
                    <span style={{ color: "var(--text-muted)" }}>이동계획</span>
                    <b className="block" style={{ color: selected.keep_current ? "#16a34a" : selected.has_relocation ? "#ea7c1e" : "var(--text)" }}>
                      {selected.keep_current ? "기존현장 유지" : selected.has_relocation ? `${selected.relocation_month} → ${selected.relocation_site}` : "-"}
                    </b>
                    {selected.relocation_plan && <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{selected.relocation_plan}</p>}
                  </div>
                </div>
              </div>

              {/* 조직정보 */}
              {(selected.org_chart || selected.org_count || selected.rt) && (
                <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h3 className="text-xs font-bold mb-3 pb-2" style={{ color: "#8b5cf6", borderBottom: "1px solid var(--border)" }}>👥 조직정보</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span style={{ color: "var(--text-muted)" }}>조직도</span> <b className="block" style={{ color: "var(--text)" }}>{selected.org_chart || "-"}</b></div>
                    <div><span style={{ color: "var(--text-muted)" }}>인원수</span> <b className="block" style={{ color: "var(--text)" }}>{selected.org_count || "-"}</b></div>
                    {selected.rt && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>RT</span> <b className="block" style={{ color: "var(--text)" }}>{selected.rt}</b></div>}
                  </div>
                </div>
              )}

              {/* 광고정보 */}
              {(selected.ad_cost_type || selected.ad_total_cost || selected.ad_items || selected.ad_schedule) && (
                <div className="rounded-xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h3 className="text-xs font-bold mb-3 pb-2" style={{ color: "#10b981", borderBottom: "1px solid var(--border)" }}>📡 광고정보</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span style={{ color: "var(--text-muted)" }}>광고비용 유형</span> <b className="block" style={{ color: "var(--text)" }}>{selected.ad_cost_type || "-"}</b></div>
                    <div><span style={{ color: "var(--text-muted)" }}>광고 총액</span> <b className="block" style={{ color: "var(--text)" }}>{selected.ad_total_cost || "-"}</b></div>
                    {selected.ad_items && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>광고 품목</span> <b className="block" style={{ color: "var(--text)" }}>{selected.ad_items}</b></div>}
                    {selected.ad_schedule && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>광고 스케줄</span> <b className="block" style={{ color: "var(--text)" }}>{selected.ad_schedule}</b></div>}
                  </div>
                </div>
              )}

              {/* 히스토리 */}
              <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text)" }}>📜 현장정보 기록 ({history.length}건)</h3>
              {history.length === 0 ? <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>기록 없음</p> :
                <div className="space-y-3">
                  {history.map((h: any, i: number) => (
                    <details key={h.id || i} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} open={i === 0}>
                      <summary className="px-4 py-2.5 cursor-pointer flex items-center justify-between text-xs font-bold" style={{ color: "var(--text)" }}>
                        <span>{new Date(h.created_at).toLocaleDateString("ko-KR")} {new Date(h.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <div className="flex gap-2">
                          {h.site_name && <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{h.site_name}</span>}
                          {h.site_condition && <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>{h.site_condition}</span>}
                        </div>
                      </summary>
                      <div className="px-4 pb-3 pt-2 space-y-3 text-xs" style={{ borderTop: "1px solid var(--border)" }}>
                        {/* 현장정보 */}
                        {(h.site_name || h.region || h.population || h.site_condition) && (
                          <div>
                            <p className="text-[11px] font-bold mb-1.5 pb-1" style={{ color: "#3b82f6", borderBottom: "1px dashed var(--border)" }}>🏗️ 현장정보</p>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              {h.site_name && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>현장명:</span> <b style={{ color: "#3b82f6" }}>{h.site_name}</b></div>}
                              {h.region && <div><span style={{ color: "var(--text-muted)" }}>지역:</span> <b>{h.region}</b></div>}
                              {h.population && <div><span style={{ color: "var(--text-muted)" }}>인구:</span> <b>{h.population}</b></div>}
                              {h.site_condition && <div><span style={{ color: "var(--text-muted)" }}>컨디션:</span> <b>{h.site_condition}</b></div>}
                              {h.contract_terms && <div><span style={{ color: "var(--text-muted)" }}>계약:</span> <b>{h.contract_terms}</b></div>}
                              {h.sales_rate && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>분양률:</span> <b>{h.sales_rate}</b></div>}
                              {h.agency_info && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>대행사:</span> <b>{h.agency_info}</b></div>}
                              {h.ad_schedule && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>광고:</span> <b>{h.ad_schedule}</b></div>}
                              {(h.relocation_month || h.keep_current || h.relocation_plan) && (
                                <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>이동:</span> <b style={{ color: h.keep_current ? "#16a34a" : "#ea7c1e" }}>
                                  {h.keep_current ? "기존현장 유지" : h.relocation_month ? `${h.relocation_month} 이동` : ""}{h.relocation_site ? ` → ${h.relocation_site}` : ""}
                                </b>{h.relocation_plan && <span style={{ color: "var(--text-muted)" }}> · {h.relocation_plan}</span>}</div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* 조직정보 */}
                        {(h.org_chart || h.org_count || h.rt) && (
                          <div>
                            <p className="text-[11px] font-bold mb-1.5 pb-1" style={{ color: "#8b5cf6", borderBottom: "1px dashed var(--border)" }}>👥 조직정보</p>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              {h.org_chart && <div><span style={{ color: "var(--text-muted)" }}>조직도:</span> <b>{h.org_chart}</b></div>}
                              {h.org_count && <div><span style={{ color: "var(--text-muted)" }}>인원:</span> <b>{h.org_count}</b></div>}
                              {h.rt && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>RT:</span> <b>{h.rt}</b></div>}
                            </div>
                          </div>
                        )}
                        {/* 광고정보 */}
                        {(h.ad_cost_type || h.ad_total_cost || h.ad_items) && (
                          <div>
                            <p className="text-[11px] font-bold mb-1.5 pb-1" style={{ color: "#10b981", borderBottom: "1px dashed var(--border)" }}>📡 광고정보</p>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              {h.ad_cost_type && <div><span style={{ color: "var(--text-muted)" }}>비용:</span> <b>{h.ad_cost_type}</b></div>}
                              {h.ad_total_cost && <div><span style={{ color: "var(--text-muted)" }}>총액:</span> <b>{h.ad_total_cost}</b></div>}
                              {h.ad_items && <div className="col-span-2"><span style={{ color: "var(--text-muted)" }}>품목:</span> <b>{h.ad_items}</b></div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
