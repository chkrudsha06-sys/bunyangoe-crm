"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, TrendingUp, Download } from "lucide-react";

interface SalesRow {
  월: string; 주차: string; 매출예정: string; 구분: string; 고객경로: string;
  추가경로: string; 고객명: string; 결제유형: string; 금액: number | null;
  확률: string; 컨설턴트특이사항: string; 입금: string;
}

interface ConsultantData { consultant: string; rows: SalesRow[]; }

const 입금_COLORS: Record<string, { bg: string; text: string }> = {
  "확정": { bg: "rgba(59,130,246,0.1)", text: "#3b82f6" },
  "매출": { bg: "rgba(16,185,129,0.1)", text: "#10b981" },
  "완료": { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
  "예정": { bg: "rgba(59,130,246,0.08)", text: "#60a5fa" },
  "시도": { bg: "rgba(245,158,11,0.1)", text: "#f59e0b" },
  "이월": { bg: "rgba(236,72,153,0.1)", text: "#ec4899" },
  "실패": { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
};

const 구분_COLORS: Record<string, { bg: string; text: string }> = {
  "B2B": { bg: "rgba(139,92,246,0.1)", text: "#8b5cf6" },
  "B2C": { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
};

const 확률_COLORS: Record<string, { bg: string; text: string }> = {
  "100%": { bg: "rgba(16,185,129,0.15)", text: "#059669" },
  "80%": { bg: "rgba(59,130,246,0.1)", text: "#3b82f6" },
  "50%": { bg: "rgba(245,158,11,0.1)", text: "#f59e0b" },
  "25%": { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
};

export default function SalesPipelinePage() {
  const [data, setData] = useState<ConsultantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [search, setSearch] = useState("");
  const [filterConsultant, setFilterConsultant] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterWeek, setFilterWeek] = useState("");
  const [filter구분, setFilter구분] = useState("");
  const [filter입금, setFilter입금] = useState("");
  const [filter확률, setFilter확률] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [source, setSource] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/notion-sales", { cache: "no-store" });
      const json = await res.json();
      if (json.error) { setError(json.error); setLoading(false); return; }
      setData(json.data || []);
      setUpdatedAt(json.updatedAt || "");
      setSource(json.source || "");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true); setError("");
    try {
      const res = await fetch("/api/notion-sales", { method: "POST" });
      const json = await res.json();
      if (json.error) { setError(json.error); setSyncing(false); return; }
      await fetchData();
    } catch (e: any) { setError(e.message); }
    setSyncing(false);
  };

  const handleDownload = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("영업부 매전방");

    const headers = ["담당자","월","주차","매출예정 (현장명)","구분","고객경로","추가경로","고객명","결제유형","금액","확률","입금","컨설턴트 특이사항"];
    const headerRow = ws.addRow(headers);

    // 헤더 스타일
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, name: "맑은 고딕", color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });
    headerRow.height = 28;

    // 데이터
    const border = {
      top: { style: "thin" as const, color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin" as const, color: { argb: "FFE5E7EB" } },
      left: { style: "thin" as const, color: { argb: "FFE5E7EB" } },
      right: { style: "thin" as const, color: { argb: "FFE5E7EB" } },
    };

    const 입금Colors: Record<string, string> = { "확정": "FF3B82F6", "매출": "FF10B981", "완료": "FFEF4444", "예정": "FF60A5FA", "시도": "FFF59E0B", "이월": "FFEC4899", "실패": "FF8B5CF6" };
    const 구분Colors: Record<string, string> = { "B2B": "FF8B5CF6", "B2C": "FFEF4444" };
    const 확률Colors: Record<string, string> = { "100%": "FF059669", "80%": "FF3B82F6", "50%": "FFF59E0B", "25%": "FFEF4444" };

    filtered.forEach((r, i) => {
      const row = ws.addRow([
        r.consultant, r.월, r.주차, r.매출예정, r.구분, r.고객경로,
        r.추가경로, r.고객명, r.결제유형,
        r.금액 != null ? r.금액 : "",
        r.확률, r.입금, r.컨설턴트특이사항,
      ]);
      const bgColor = i % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font = { size: 9, name: "맑은 고딕" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.border = border;
        cell.alignment = { vertical: "middle", wrapText: colNum === 13 };

        // 담당자 보라색
        if (colNum === 1) { cell.font = { ...cell.font, bold: true, color: { argb: "FF8B5CF6" } }; }
        // 구분 색상
        if (colNum === 5 && r.구분 && 구분Colors[r.구분]) { cell.font = { ...cell.font, bold: true, color: { argb: 구분Colors[r.구분] } }; }
        // 금액 오른쪽 정렬 + 천단위
        if (colNum === 10) {
          cell.alignment = { ...cell.alignment, horizontal: "right" };
          cell.numFmt = "#,##0";
          if (typeof r.금액 === "number" && r.금액 < 0) cell.font = { ...cell.font, color: { argb: "FFEF4444" } };
        }
        // 확률 색상
        if (colNum === 11 && r.확률 && 확률Colors[r.확률]) { cell.font = { ...cell.font, bold: true, color: { argb: 확률Colors[r.확률] } }; }
        // 입금 색상
        if (colNum === 12 && r.입금 && 입금Colors[r.입금]) { cell.font = { ...cell.font, bold: true, color: { argb: 입금Colors[r.입금] } }; }
      });
    });

    // 열 너비
    ws.columns = [
      { width: 10 }, { width: 10 }, { width: 8 }, { width: 32 }, { width: 6 },
      { width: 12 }, { width: 14 }, { width: 14 }, { width: 8 }, { width: 14 },
      { width: 7 }, { width: 7 }, { width: 40 },
    ];

    // 다운로드
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `영업부_매전방_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 전체 행 + 담당자 라벨 포함
  const allRows = useMemo(() => {
    const rows: (SalesRow & { consultant: string })[] = [];
    data.forEach(d => d.rows.forEach(r => rows.push({ ...r, consultant: d.consultant })));
    return rows;
  }, [data]);

  // 필터
  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (filterConsultant && r.consultant !== filterConsultant) return false;
      if (filterMonth && !r.월.includes(filterMonth)) return false;
      if (filterWeek && r.주차 !== filterWeek) return false;
      if (filter구분 && r.구분 !== filter구분) return false;
      if (filter입금 && r.입금 !== filter입금) return false;
      if (filter확률 && r.확률 !== filter확률) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(r.매출예정.toLowerCase().includes(q) || r.고객명.toLowerCase().includes(q) || r.컨설턴트특이사항.toLowerCase().includes(q) || r.consultant.includes(q))) return false;
      }
      return true;
    });
  }, [allRows, search, filterConsultant, filterMonth, filterWeek, filter구분, filter입금, filter확률]);

  // 옵션 추출
  const consultants = useMemo(() => Array.from(new Set(data.map(d => d.consultant))).sort(), [data]);
  const months = useMemo(() => {
    const set = new Set(allRows.map(r => r.월).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [allRows]);

  // 합계
  const totalAmount = filtered.reduce((s, r) => s + (r.금액 || 0), 0);
  const activeFilters = [filterConsultant, filterMonth, filterWeek, filter구분, filter입금, filter확률, search].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <div className="px-6 py-4 flex-shrink-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <TrendingUp size={20} style={{ color: "#3b82f6" }} />
              영업부 매전방
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              노션 연동 · 전체 {allRows.length}건
              {source && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: source === "notion" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: source === "notion" ? "#10b981" : "#f59e0b" }}>
                {source === "notion" ? "실시간 연동" : "캐시 데이터"}
              </span>}
              {updatedAt && <span className="ml-2" style={{ color: "var(--text-subtle)" }}>동기화: {new Date(updatedAt).toLocaleString("ko-KR")}</span>}
            </p>
          </div>
          <button onClick={handleDownload} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#10b981" }}>
            <Download size={13} /> 엑셀 다운로드
          </button>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#3b82f6" }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> 새로고침
          </button>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg"
            style={{ background: syncing ? "#94a3b8" : "#10b981" }}>
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> {syncing ? "동기화 중..." : "🔄 최신화"}
          </button>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="현장명, 고객명 검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl focus:outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          {[
            { val: filterConsultant, set: setFilterConsultant, opts: consultants, ph: "담당자" },
            { val: filterMonth, set: setFilterMonth, opts: months, ph: "월" },
            { val: filterWeek, set: setFilterWeek, opts: ["1주차","2주차","3주차","4주차","5주차"], ph: "주차" },
            { val: filter구분, set: setFilter구분, opts: ["B2B","B2C"], ph: "구분" },
            { val: filter입금, set: setFilter입금, opts: ["확정","매출","완료","예정","시도","이월","실패"], ph: "입금" },
            { val: filter확률, set: setFilter확률, opts: ["100%","80%","50%","25%"], ph: "확률" },
          ].map(f => (
            <select key={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
              className="appearance-none px-2.5 py-2 text-xs rounded-xl focus:outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", minWidth: 80 }}>
              <option value="">{f.ph}</option>
              {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(""); setFilterConsultant(""); setFilterMonth(""); setFilterWeek(""); setFilter구분(""); setFilter입금(""); setFilter확률(""); }}
              className="px-2.5 py-2 text-xs font-semibold rounded-xl bg-red-500 text-white border border-red-500">↺ 초기화</button>
          )}
        </div>

        {/* 합계 바 */}
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>표시: <b style={{ color: "var(--text)" }}>{filtered.length}건</b></span>
          <span>합계: <b style={{ color: totalAmount >= 0 ? "#10b981" : "#ef4444" }}>{totalAmount.toLocaleString()}원</b></span>
          {filterConsultant && <span>담당: <b style={{ color: "#8b5cf6" }}>{filterConsultant}</b></span>}
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>오류: {error}</p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              {error.includes("NOTION_API_KEY") ? "최신화 버튼은 Notion API 키 설정 후 사용 가능합니다." : "잠시 후 다시 시도해주세요."}
            </p>
          </div>
        ) : (
          <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead className="sticky top-0 z-10">
              <tr style={{ background: "var(--surface)" }}>
                {["담당자","월","주차","매출예정 (현장명)","구분","고객경로","추가경로","고객명","결제유형","금액","확률","입금","컨설턴트 특이사항"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold whitespace-nowrap"
                    style={{ color: "var(--text-muted)", borderBottom: "2px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-10" style={{ color: "var(--text-subtle)" }}>데이터가 없습니다</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={i} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: "#8b5cf6" }}>{r.consultant}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: "var(--text)" }}>{r.월}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.주차 && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{r.주차}</span>}
                  </td>
                  <td className="px-3 py-2.5 font-semibold max-w-[200px] truncate" style={{ color: "var(--text)" }}>{r.매출예정}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.구분 && (() => { const c = 구분_COLORS[r.구분] || { bg: "var(--surface)", text: "var(--text)" }; return (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>{r.구분}</span>
                    ); })()}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.고객경로 && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}>{r.고객경로}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[10px]" style={{ color: "var(--text-muted)" }}>{r.추가경로}</td>
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: "var(--text)" }}>{r.고객명}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.결제유형 && <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>{r.결제유형}</span>}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-right whitespace-nowrap"
                    style={{ color: (r.금액 || 0) < 0 ? "#ef4444" : (r.금액 || 0) > 0 ? "var(--text)" : "var(--text-subtle)" }}>
                    {r.금액 != null ? r.금액.toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.확률 && (() => { const c = 확률_COLORS[r.확률] || { bg: "var(--surface)", text: "var(--text)" }; return (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>{r.확률}</span>
                    ); })()}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.입금 && (() => { const c = 입금_COLORS[r.입금] || { bg: "var(--surface)", text: "var(--text)" }; return (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>{r.입금}</span>
                    ); })()}
                  </td>
                  <td className="px-3 py-2.5 max-w-[250px] truncate" style={{ color: "var(--text-muted)" }}>{r.컨설턴트특이사항}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
