"use client";

import { useState, useEffect } from "react";
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
}

const AVATAR_COLORS = ["bg-emerald-500","bg-blue-500","bg-violet-500","bg-amber-500","bg-rose-500","bg-cyan-500"];
function getAvatarColor(name: string) {
  let s = 0; for (const c of name) s += c.charCodeAt(0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

const HEADERS = ["#","고객명","직급","연락처","담당컨설턴트","대협팀 담당자","상태","완료일","메모"];

function MemberTable({ members, emptyText, accentClass }: {
  members: Member[]; emptyText: string; accentClass: string;
}) {
  if (members.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-10">
        <p className="text-sm text-slate-400">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>{HEADERS.map(h => <th key={h} className="text-center px-4 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {members.map((c, i) => (
            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 text-center text-slate-400 text-xs">{i + 1}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-7 h-7 ${getAvatarColor(c.name)} rounded-full flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{c.name[0]}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{c.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                {c.title ? <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{c.title}</span> : <span className="text-slate-300 text-xs">-</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="flex items-center justify-center gap-1 text-xs text-slate-600">
                  <Phone size={11}/>{c.phone || "-"}
                </span>
              </td>
              <td className="px-4 py-3 text-center text-slate-600 text-xs">{c.consultant || "-"}</td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{c.assigned_to}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${accentClass}`}>{c.meeting_result}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="flex items-center justify-center gap-1 text-xs text-slate-600">
                  <Calendar size={11}/>
                  {c.meeting_result === "계약완료" && c.contract_date
                    ? new Date(c.contract_date).toLocaleDateString("ko-KR")
                    : c.meeting_result === "예약완료" && c.reservation_date
                    ? new Date(c.reservation_date).toLocaleDateString("ko-KR")
                    : "-"}
                </span>
              </td>
              <td className="px-4 py-3 text-center max-w-[180px]">
                <p className="text-xs text-slate-500 truncate">{c.memo || "-"}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MemberManagePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractSearch, setContractSearch] = useState("");
  const [reserveSearch, setReserveSearch] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from("contacts")
        .select("*")
        .in("meeting_result", ["계약완료", "예약완료"])
        .order("created_at", { ascending: false });

      if (sbError) {
        setError(`Supabase 오류: ${sbError.message}`);
        setLoading(false);
        return;
      }
      setMembers((data as Member[]) || []);
    } catch (e: any) {
      setError(`예외 발생: ${e?.message || String(e)}`);
    }
    setLoading(false);
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

      {/* 본문 */}
      <div className="flex-1 overflow-auto p-5 space-y-6">

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <p className="font-bold mb-1">⚠️ 데이터 로딩 오류</p>
            <p className="font-mono text-xs">{error}</p>
            <button onClick={fetchMembers} className="mt-2 text-xs px-3 py-1 bg-red-100 rounded-lg hover:bg-red-200">
              다시 시도
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
            <p className="text-xs text-slate-400">데이터 불러오는 중...</p>
          </div>
        ) : !error && (
          <>
            {/* 계약완료 */}
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
                emptyText={contractSearch ? "검색 결과가 없습니다" : "계약완료 회원이 없습니다"}
                accentClass="bg-emerald-100 text-emerald-700"/>
            </div>

            {/* 구분선 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"/>
              <span className="text-xs text-slate-400 font-semibold px-2">예약완료</span>
              <div className="flex-1 h-px bg-slate-200"/>
            </div>

            {/* 예약완료 */}
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
                emptyText={reserveSearch ? "검색 결과가 없습니다" : "예약완료 회원이 없습니다"}
                accentClass="bg-blue-100 text-blue-700"/>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
