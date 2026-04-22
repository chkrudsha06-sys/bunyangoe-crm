"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Search, TrendingUp, AlertTriangle } from "lucide-react";

interface AdSite {
  region: string; city: string; siteName: string;
  performance: string; support: string;
  totalAdBudget: number; operatingAmount: number; reservationAmount: number;
  adCount: number; customers: string[];
  suspended: boolean; suspendedDate: string;
  competition: "심화" | "적정" | "보통" | "여유";
}
interface SyncResult {
  sites: AdSite[];
  summary?: { totalSites: number; totalBudget: number; totalOperating: number; totalReservation: number; totalOutstanding: number; totalAdUsers: number; };
  lastSync?: string;
  error?: string;
}

const COMP_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  "심화": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500", label: "🔴 심화" },
  "적정": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500", label: "🟡 적정" },
  "보통": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500", label: "🟢 보통" },
  "여유": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", label: "🔵 여유" },
};

const fw = (n: number) => n.toLocaleString();

export default function AdSitesPage() {
  const [data, setData] = useState<SyncResult>({ sites: [] });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("전체");
  const [filterComp, setFilterComp] = useState("전체");
  const [filterSuspended, setFilterSuspended] = useState("all");
  const [sortBy, setSortBy] = useState<"budget" | "adCount" | "name">("budget");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fetch-ad-sites");
      const json = await res.json();
      setData(json);
    } catch { setData({ sites: [], error: "데이터를 불러올 수 없습니다" }); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const regions = useMemo(() => {
    const set = new Set(data.sites.map(s => s.region));
    return ["전체", ...Array.from(set)];
  }, [data.sites]);

  const filtered = useMemo(() => {
    let list = [...data.sites];
    if (filterRegion !== "전체") list = list.filter(s => s.region === filterRegion);
    if (filterComp !== "전체") list = list.filter(s => s.competition === filterComp);
    if (filterSuspended === "active") list = list.filter(s => !s.suspended);
    if (filterSuspended === "suspended") list = list.filter(s => s.suspended);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.siteName.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.customers.some(c => c.toLowerCase().includes(q))
      );
    }
    if (sortBy === "budget") list.sort((a, b) => b.totalAdBudget - a.totalAdBudget);
    else if (sortBy === "adCount") list.sort((a, b) => b.adCount - a.adCount);
    else list.sort((a, b) => a.siteName.localeCompare(b.siteName));
    return list;
  }, [data.sites, filterRegion, filterComp, filterSuspended, search, sortBy]);

  const compCounts = useMemo(() => ({
    total: data.sites.length,
    심화: data.sites.filter(s => s.competition === "심화").length,
    적정: data.sites.filter(s => s.competition === "적정").length,
    보통: data.sites.filter(s => s.competition === "보통").length,
    여유: data.sites.filter(s => s.competition === "여유").length,
  }), [data.sites]);

  const s = data.summary;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <div className="px-4 sm:px-6 py-4 sticky top-0 z-10" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-black flex items-center gap-2" style={{ color: "var(--text)" }}>
              📡 광고 현운예지
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              전국광고운영지도 · 현장 경쟁도 분석
              {data.lastSync && <span className="ml-2 opacity-60">마지막 동기화: {new Date(data.lastSync).toLocaleString("ko-KR")}</span>}
            </p>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            style={{ background: "var(--info)", color: "#fff" }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "동기화 중..." : "시트 동기화"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
        {/* 에러 메시지 */}
        {data.error && (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-600">{data.error}</p>
              <p className="text-xs text-red-400 mt-1">구글시트 → 파일 → 공유 → 웹에 게시 → [영업부용] 현운예지 탭 → CSV 형식 → 게시 후 다시 동기화해주세요.</p>
            </div>
          </div>
        )}

        {/* 요약 카드 */}
        {s && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>총 현장</p>
              <p className="text-lg font-black" style={{ color: "var(--text)" }}>{s.totalSites}개</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>총 광고주</p>
              <p className="text-lg font-black" style={{ color: "var(--info)" }}>{s.totalAdUsers}명</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>총광고비</p>
              <p className="text-sm font-black" style={{ color: "var(--text)" }}>{fw(s.totalBudget)}원</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>운영금액</p>
              <p className="text-sm font-black text-emerald-500">{fw(s.totalOperating)}원</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>예약금액</p>
              <p className="text-sm font-black text-blue-500">{fw(s.totalReservation)}원</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>미수금액</p>
              <p className="text-sm font-black text-red-500">{fw(s.totalOutstanding)}원</p>
            </div>
          </div>
        )}

        {/* 경쟁도 요약 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(["전체", "심화", "적정", "보통", "여유"] as const).map(comp => {
            const active = filterComp === comp;
            const style = comp === "전체" ? null : COMP_STYLE[comp];
            const count = comp === "전체" ? compCounts.total : compCounts[comp];
            return (
              <button key={comp} onClick={() => setFilterComp(comp === filterComp ? "전체" : comp)}
                className={`rounded-xl p-3 text-left transition-all ${active ? "ring-2 ring-blue-400" : ""}`}
                style={{ background: active ? "var(--sidebar-active-bg)" : "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  {style && <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />}
                  <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                    {comp === "전체" ? "📊 전체" : style?.label}
                  </span>
                </div>
                <p className="text-lg font-black mt-1" style={{ color: "var(--text)" }}>{count}개</p>
              </button>
            );
          })}
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="현장명, 도시, 고객명 검색..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg outline-none"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg outline-none cursor-pointer"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterSuspended} onChange={e => setFilterSuspended(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg outline-none cursor-pointer"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="all">전체 상태</option>
            <option value="active">운영중</option>
            <option value="suspended">수주중단</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="text-xs px-3 py-2 rounded-lg outline-none cursor-pointer"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
            <option value="budget">총광고비순</option>
            <option value="adCount">광고수순</option>
            <option value="name">이름순</option>
          </select>
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{filtered.length}건</span>
        </div>

        {/* 테이블 */}
        {loading && data.sites.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl mb-2">📡</p>
            <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              {data.sites.length === 0 ? "동기화 버튼을 눌러 데이터를 가져오세요" : "검색 결과가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: "900px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)" }}>
                    <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--text-muted)", width: "70px" }}>경쟁도</th>
                    <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--text-muted)" }}>지역</th>
                    <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--text-muted)" }}>도시</th>
                    <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--text-muted)" }}>현장명</th>
                    <th className="px-3 py-2.5 text-right font-bold" style={{ color: "var(--text-muted)" }}>총광고비</th>
                    <th className="px-3 py-2.5 text-right font-bold" style={{ color: "var(--text-muted)" }}>운영금액</th>
                    <th className="px-3 py-2.5 text-right font-bold" style={{ color: "var(--text-muted)" }}>예약금</th>
                    <th className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text-muted)" }}>광고수</th>
                    <th className="px-3 py-2.5 text-left font-bold" style={{ color: "var(--text-muted)" }}>광고주</th>
                    <th className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text-muted)" }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((site, idx) => {
                    const cs = COMP_STYLE[site.competition];
                    return (
                      <tr key={idx} className="transition-colors hover:brightness-95" style={{ borderBottom: "1px solid var(--border)", opacity: site.suspended ? 0.5 : 1 }}>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cs.bg} ${cs.text} ${cs.border} border`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />{site.competition}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: "var(--text)" }}>{site.region}</td>
                        <td className="px-3 py-2.5" style={{ color: "var(--text-muted)" }}>{site.city}</td>
                        <td className="px-3 py-2.5 font-bold" style={{ color: "var(--text)" }}>{site.siteName}</td>
                        <td className="px-3 py-2.5 text-right font-black" style={{ color: "var(--text)" }}>{fw(site.totalAdBudget)}</td>
                        <td className="px-3 py-2.5 text-right" style={{ color: "var(--text)" }}>{site.operatingAmount ? fw(site.operatingAmount) : "-"}</td>
                        <td className="px-3 py-2.5 text-right" style={{ color: "var(--info)" }}>{site.reservationAmount ? fw(site.reservationAmount) : "-"}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black"
                            style={{ background: site.adCount >= 5 ? "rgba(239,68,68,0.15)" : site.adCount >= 3 ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.1)", color: site.adCount >= 5 ? "#ef4444" : site.adCount >= 3 ? "#f59e0b" : "var(--info)" }}>
                            {site.adCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {site.customers.slice(0, 3).map((c, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--sidebar-active-bg)", color: "var(--text-muted)" }}>{c}</span>
                            ))}
                            {site.customers.length > 3 && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{site.customers.length - 3}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {site.suspended ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold border border-red-200">중단</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold border border-emerald-200">운영</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
