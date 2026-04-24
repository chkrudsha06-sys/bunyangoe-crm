"use client";

import { useState, useEffect } from "react";
import { Save, Trash2, FileText, Grid3X3, Clock, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

// ── 타입 ──
interface Memo {
  id: number;
  title: string;
  content: string;
  memo_type: "text" | "sheet";
  sheet_data: string[][] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── 스프레드시트 컴포넌트 ──
function SheetEditor({ data, onChange }: { data: string[][]; onChange: (d: string[][]) => void }) {
  const [editCell, setEditCell] = useState<[number, number] | null>(null);
  const [editVal, setEditVal] = useState("");

  const COLS = data[0]?.length || 10;
  const colLabel = (i: number) => String.fromCharCode(65 + i);

  const startEdit = (r: number, c: number) => {
    setEditCell([r, c]);
    setEditVal(data[r]?.[c] || "");
  };
  const endEdit = () => {
    if (editCell) {
      const [r, c] = editCell;
      const nd = data.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c) ? editVal : cell));
      onChange(nd);
    }
    setEditCell(null);
  };
  const addRow = () => onChange([...data, Array(COLS).fill("")]);
  const addCol = () => onChange(data.map(row => [...row, ""]));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={addRow} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <Plus size={12} /> 행 추가
        </button>
        <button onClick={addCol} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <Plus size={12} /> 열 추가
        </button>
        <span className="text-xs" style={{ color: "var(--text-subtle)" }}>{data.length}행 × {COLS}열</span>
      </div>
      <div className="overflow-auto rounded-xl flex-1" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse text-sm" style={{ minWidth: COLS * 100 }}>
          <thead>
            <tr>
              <th className="w-10 text-center text-[10px] font-semibold py-2 sticky top-0 z-10"
                style={{ background: "var(--bg)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>#</th>
              {Array.from({ length: COLS }, (_, i) => (
                <th key={i} className="text-center text-[10px] font-semibold py-2 sticky top-0 z-10"
                  style={{ background: "var(--bg)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", minWidth: 100 }}>
                  {colLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri}>
                <td className="text-center text-[10px] py-1" style={{ background: "var(--bg)", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci} onClick={() => startEdit(ri, ci)} className="cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", padding: 0 }}>
                    {editCell && editCell[0] === ri && editCell[1] === ci ? (
                      <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                        onBlur={endEdit} onKeyDown={e => { if (e.key === "Enter") endEdit(); if (e.key === "Tab") { e.preventDefault(); endEdit(); if (ci < COLS - 1) startEdit(ri, ci + 1); } }}
                        className="w-full px-2 py-1.5 text-sm outline-none"
                        style={{ background: "rgba(59,130,246,0.1)", color: "var(--text)", border: "2px solid #3b82f6" }} />
                    ) : (
                      <div className="px-2 py-1.5 min-h-[32px] text-sm" style={{ color: cell ? "var(--text)" : "transparent" }}>
                        {cell || "."}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 메인 페이지 ──
export default function MemoPage() {
  const [tab, setTab] = useState<"text" | "sheet" | "history">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sheetData, setSheetData] = useState<string[][]>(
    Array.from({ length: 10 }, () => Array(8).fill(""))
  );
  const [memos, setMemos] = useState<Memo[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [userName, setUserName] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const u = getCurrentUser();
    if (u) setUserName(u.name);
    fetchMemos();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const fetchMemos = async () => {
    setLoading(true);
    const { data } = await supabase.from("memos")
      .select("*").order("updated_at", { ascending: false }).limit(50);
    setMemos((data || []) as Memo[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { showToast("제목을 입력해주세요"); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      content: tab === "text" ? content : "",
      memo_type: tab === "text" ? "text" : "sheet",
      sheet_data: tab === "sheet" ? sheetData : null,
      created_by: userName,
      updated_at: new Date().toISOString(),
    };

    if (editId) {
      await supabase.from("memos").update(payload).eq("id", editId);
      showToast("수정 완료");
    } else {
      await supabase.from("memos").insert({ ...payload, created_at: new Date().toISOString() });
      showToast("저장 완료");
    }
    setSaving(false);
    setEditId(null);
    resetForm();
    fetchMemos();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("memos").delete().eq("id", id);
    showToast("삭제 완료");
    fetchMemos();
  };

  const handleLoad = (memo: Memo) => {
    setTitle(memo.title);
    setEditId(memo.id);
    if (memo.memo_type === "text") {
      setTab("text");
      setContent(memo.content || "");
    } else {
      setTab("sheet");
      setSheetData(memo.sheet_data || Array.from({ length: 10 }, () => Array(8).fill("")));
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSheetData(Array.from({ length: 10 }, () => Array(8).fill("")));
    setEditId(null);
  };

  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  };

  const tabs = [
    { key: "text", label: "메모", icon: FileText },
    { key: "sheet", label: "스프레드시트", icon: Grid3X3 },
    { key: "history", label: "저장 기록", icon: Clock },
  ] as const;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>📝 메모장</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>텍스트 메모, 스프레드시트</p>
      </div>

      {/* 탭 */}
      <div className="px-6 py-3 flex gap-2 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all"
              style={{
                background: active ? "#3b82f6" : "var(--surface)",
                color: active ? "#fff" : "var(--text-muted)",
                border: active ? "none" : "1px solid var(--border)",
              }}>
              <Icon size={14} />
              {t.label}
              {t.key === "history" && memos.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-1"
                  style={{ background: active ? "rgba(255,255,255,0.2)" : "var(--bg)", color: active ? "#fff" : "var(--text-muted)" }}>
                  {memos.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {/* 메모 / 스프레드시트 */}
        {(tab === "text" || tab === "sheet") && (
          <div className="flex-1 flex flex-col space-y-3">
            {/* 제목 + 저장 */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl outline-none focus:ring-1 focus:ring-blue-400"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Save size={14} />
                {saving ? "저장 중..." : editId ? "수정" : "저장"}
              </button>
              {editId && (
                <button onClick={resetForm} className="px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  새로 작성
                </button>
              )}
            </div>

            {/* 편집 영역 - 전체 화면 */}
            {tab === "text" ? (
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="메모 내용을 입력하세요..."
                className="flex-1 w-full rounded-xl outline-none focus:ring-1 focus:ring-blue-400 resize-none text-sm leading-relaxed"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", padding: 20, minHeight: 0 }} />
            ) : (
              <div className="flex-1">
                <SheetEditor data={sheetData} onChange={setSheetData} />
              </div>
            )}
          </div>
        )}

        {/* 저장 기록 */}
        {tab === "history" && (
          <div className="max-w-3xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : memos.length === 0 ? (
              <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">저장된 메모가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {memos.map(m => (
                  <div key={m.id} className="rounded-xl overflow-hidden transition-all"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {/* 헤더 */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: m.memo_type === "text" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)" }}>
                        {m.memo_type === "text" ? <FileText size={14} style={{ color: "#3b82f6" }} /> : <Grid3X3 size={14} style={{ color: "#10b981" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{m.title}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {m.created_by} · {fmtDate(m.updated_at || m.created_at)}
                          {m.memo_type === "sheet" && " · 스프레드시트"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={e => { e.stopPropagation(); handleLoad(m); }}
                          className="p-2 rounded-lg transition-colors hover:bg-blue-50"
                          style={{ color: "#3b82f6" }} title="편집">
                          <FileText size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(m.id); }}
                          className="p-2 rounded-lg transition-colors hover:bg-red-50"
                          style={{ color: "#ef4444" }} title="삭제">
                          <Trash2 size={14} />
                        </button>
                        {expandedId === m.id ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
                      </div>
                    </div>
                    {/* 미리보기 */}
                    {expandedId === m.id && (
                      <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
                        {m.memo_type === "text" ? (
                          <pre className="text-sm mt-3 whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text)" }}>
                            {m.content || "(내용 없음)"}
                          </pre>
                        ) : m.sheet_data ? (
                          <div className="overflow-auto mt-3 rounded-lg" style={{ border: "1px solid var(--border)", maxHeight: 300 }}>
                            <table className="w-full border-collapse text-xs">
                              <tbody>
                                {m.sheet_data.map((row, ri) => (
                                  <tr key={ri}>
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="px-2 py-1.5" style={{ borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", color: "var(--text)", minWidth: 60 }}>
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>(데이터 없음)</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
