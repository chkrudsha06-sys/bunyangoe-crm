"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Calendar } from "lucide-react";

interface Note {
  id: number;
  contact_id: number;
  note_date: string;
  content: string;
  author: string | null;
}

interface Props {
  contactId: number;
  authorName?: string;
  compact?: boolean; // 파이프라인 카드용 축약 모드
}

export default function ContactNotes({ contactId, authorName, compact }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contact_notes")
      .select("*")
      .eq("contact_id", contactId)
      .order("note_date", { ascending: false });
    setNotes((data || []) as Note[]);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [contactId]);

  const getAuthor = () => {
    if (authorName) return authorName;
    try {
      const raw = localStorage.getItem("crm_user");
      if (raw) return JSON.parse(raw).name || "";
    } catch {}
    return "";
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("contact_notes").insert({
      contact_id: contactId,
      note_date: newDate,
      content: newContent.trim(),
      author: getAuthor() || null,
    });
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    setNewContent("");
    setNewDate(new Date().toISOString().split("T")[0]);
    setAdding(false);
    // 저장 후 즉시 목록 갱신
    await fetchNotes();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("contact_notes").delete().eq("id", id);
    fetchNotes();
  };

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });

  // ── 파이프라인 카드 축약 모드 ──
  if (compact) {
    return (
      <div onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
        {loading ? null : notes.length === 0 ? (
          <p className="text-xs text-slate-300 py-1">활동 노트 없음</p>
        ) : (
          <div className="space-y-1">
            {notes.slice(0, 2).map(n => (
              <div key={n.id} className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                <span className="text-[10px] font-bold text-blue-500 mr-1.5">{formatDate(n.note_date)}</span>
                <span className="text-[11px] text-slate-600 line-clamp-1">{n.content}</span>
              </div>
            ))}
            {notes.length > 2 && (
              <p className="text-[10px] text-slate-400 pl-1">+{notes.length - 2}개 더</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── 일반 모드 (상세 페이지 / 수정 모달) ──
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Calendar size={14} className="text-blue-500" />
          활동 노트
          <span className="text-xs text-slate-400 font-normal ml-1">{notes.length}건</span>
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={12} /> 노트 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {adding && (
        <div className="mb-3 bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-2">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">날짜 선택</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">내용</label>
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder="활동 내용을 입력하세요..." rows={3}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-400 resize-none"/>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setNewContent(""); }}
              className="flex-1 py-1.5 text-xs text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50">취소</button>
            <button onClick={handleAdd} disabled={saving || !newContent.trim()}
              className="flex-1 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {/* 노트 목록 */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 text-slate-300 text-xs">활동 노트가 없습니다</div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600">
                    {new Date(note.note_date + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                  </span>
                  {note.author && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full">{note.author}</span>
                  )}
                </div>
                <button onClick={() => handleDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                  <Trash2 size={12}/>
                </button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
