"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Phone, Calendar, Search } from "lucide-react";

interface Member {
  id: number;
  name: string;
  title?: string | null;
  phone?: string | null;
  assigned_to: string;
  meeting_result: string;
  contract_date?: string | null;
  reservation_date?: string | null;
  consultant?: string | null;
  memo?: string | null;
  bunyanghoe_number?: string | null;
}

const AVATAR_COLORS = ["bg-emerald-500","bg-blue-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-cyan-500"];
function getAvatarColor(name: string) {
  let s = 0; for (const c of name) s += c.charCodeAt(0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

// MIN_ROWS 제거 // 최소 표시 행 수

// ─── 인라인 넘버링 입력 셀 ─────────────────────────────────────
function NumberingCell({ contactId, value, onSaved }: {
  contactId: number;
  value: string | null | undefined;
  onSaved: (id: number, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("contacts")
      .update({ bunyanghoe_number: input || null })
      .eq("id", contactId);
    setSaving(false);
    if (!error) {
      onSaved(contactId, input);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <span className="text-xs font-bold text-amber-600">B-</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          className="w-12 text-xs text-center border border-amber-300 rounded px-1 py-0.5 focus:outline-none focus:border-amber-500"
          placeholder="숫자"
          disabled={saving}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center justify-center gap-0.5 cursor-pointer"
      title="클릭해서 넘버링 입력"
    >
      {input
        ? <span className="text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200 group-hover:bg-amber-100 transition-colors">B-{input}</span>
        : <span className="text-[10px] text-slate-300 border border-dashed border-slate-200 px-2 py-0.5 rounded-full group-hover:border-amber-300 group-hover:text-amber-400 transition-colors">입력</span>
      }
    </button>
  );
}

// ─── 멤버 테이블 ──────────────────────────────────────────────
function MemberTable({ members, emptyText, accentClass, onNumberSaved }: {
  members: Member[];
  emptyText: string;
  accentClass: string;
  onNumberSaved: (id: number, val: string) => void;
}) {
  const HEADERS = ["#", "넘버링 부여", "고객명", "직급", "연락처", "담당컨설턴트", "대협팀 담당자", "상태", "완료일", "메모"];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="max-h-[460px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>{HEADERS.map(h => <th key={h} className="text-center px-4 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {members.map((c, i) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-center align-middle text-slate-400 text-xs">{i + 1}</td>
                {/* 넘버링 부여 */}
                <td className="px-4 py-3 text-center align-middle">
                  <NumberingCell
                    contactId={c.id}
                    value={c.bunyanghoe_number}
                    onSaved={onNumberSaved}
                  />
                </td>
                {/* 고객명 */}
                <td className="px-4 py-3 text-center align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-7 h-7 ${getAvatarColor(c.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-xs font-bold">{c.name[0]}</span>
                    </div>
                    <span className="font-semibold text-slate-800 whitespace-nowrap">{c.name}</span>
                  </div>
                </td>
                {/* 직급 */}
                <td className="px-4 py-3 text-center align-middle">
                  {c.title
                    ? <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{c.title}</span>
                    : <span className="text-xs text-slate-300">-</span>}
                </td>
                <td className="px-4 py-3 text-center align-middle">
                  <span className="flex items-center justify-center gap-1 text-xs text-slate-600">
                    <Phone size={11}/>{c.phone || "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center align-middle text-slate-600 text-xs">{c.consultant || "-"}</td>
                <td className="px-4 py-3 text-center align-middle">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{c.assigned_to}</span>
                </td>
                <td className="px-4 py-3 text-center align-middle">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${accentClass}`}>{c.meeting_result}</span>
                </td>
                <td className="px-4 py-3 text-center align-middle">
                  <span className="flex items-center justify-center gap-1 text-xs text-slate-600">
                    <Calendar size={11}/>
                    {c.meeting_result === "계약완료" && c.contract_date
                      ? new Date(c.contract_date).toLocaleDateString("ko-KR")
                      : c.meeting_result === "예약완료" && c.reservation_date
                      ? new Date(c.reservation_date).toLocaleDateString("ko-KR")
                      : "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center align-middle max-w-[160px]">
                  <p className="text-xs text-slate-500 truncate">{c.memo || "-"}</p>
                </td>
              </tr>
            ))}

          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────
export default function MemberManagePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractSearch, setContractSearch] = useState("");
  const [reserveSearch, setReserveSearch] = useState("");

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    const { data, error: sbError } = await supabase
      .from("contacts")
      .select("*")
      .in("meeting_result", ["계약완료", "예약완료"])
      .order("created_at", { ascending: false });
    if (sbError) { setError(sbError.message); setLoading(false); return; }
    setMembers((data as Member[]) || []);
    setLoading(false);
  };

  // 넘버링 저장 시 로컬 상태 즉시 반영
  const handleNumberSaved = (id: number, val: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, bunyanghoe_number: val || null } : m));
  };

  const filterList = (list: Member[], q: string) => {
    if (!q.trim()) return list;
    return list.filter(c =>
      c.name.includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.title && c.title.includes(q)) ||
      (c.consultant && c.consultant.includes(q)) ||
      c.assigned_to.includes(q)
    );
  };

  const allContracts    = members.filter(m => m.meeting_result === "계약완료");
  const allReservations = members.filter(m => m.meeting_result === "예약완료");
  const contracts    = filterList(allContracts, contractSearch);
  const reservations = filterList(allReservations, reserveSearch);

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield size={20} className="text-blue-500"/>분양회 회원관리
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">계약완료 및 예약완료 분양회 회원 통합 관리</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-lg font-bold text-emerald-600">{allContracts.length}</p>
              <p className="text-xs text-emerald-500">계약완료</p>
            </div>
            <div className="text-center px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-lg font-bold text-blue-600">{allReservations.length}</p>
              <p className="text-xs text-blue-500">예약완료</p>
            </div>
            <div className="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-lg font-bold text-slate-700">{members.length}</p>
              <p className="text-xs text-slate-500">전체</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 font-mono">{error}</div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : !error && (
          <>
            {/* ── 계약완료 ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"/>
                  <h2 className="text-sm font-bold text-slate-700">계약완료</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {contracts.length}명{contractSearch ? ` / 전체 ${allContracts.length}명` : ""}
                  </span>
                </div>
                <div className="relative w-64">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type="text" placeholder="이름, 연락처, 담당자 검색..."
                    value={contractSearch} onChange={e => setContractSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"/>
                </div>
              </div>
              <MemberTable members={contracts}
                emptyText="계약완료 회원이 없습니다"
                accentClass="bg-emerald-100 text-emerald-700"
                onNumberSaved={handleNumberSaved}/>
            </div>

            {/* 구분선 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"/>
              <span className="text-xs text-slate-400 font-semibold px-2">예약완료</span>
              <div className="flex-1 h-px bg-slate-200"/>
            </div>

            {/* ── 예약완료 ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"/>
                  <h2 className="text-sm font-bold text-slate-700">예약완료</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {reservations.length}명{reserveSearch ? ` / 전체 ${allReservations.length}명` : ""}
                  </span>
                </div>
                <div className="relative w-64">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type="text" placeholder="이름, 연락처, 담당자 검색..."
                    value={reserveSearch} onChange={e => setReserveSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
                </div>
              </div>
              <MemberTable members={reservations}
                emptyText="예약완료 회원이 없습니다"
                accentClass="bg-blue-100 text-blue-700"
                onNumberSaved={handleNumberSaved}/>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
