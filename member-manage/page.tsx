"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Phone, Calendar, Search } from "lucide-react";

interface Member {
  id: number;
  name: string;
  title: string | null;
  phone: string | null;
  assigned_to: string;
  meeting_result: string;
  contract_date: string | null;
  reservation_date: string | null;
  consultant: string | null;
  memo: string | null;
}

const HEADERS = ["#", "고객명", "직급", "연락처", "담당컨설턴트", "대협팀 담당자", "상태", "완료일", "메모"];

const AVATAR_COLORS = [
  "bg-emerald-500","bg-blue-500","bg-violet-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-indigo-500","bg-teal-500",
];
function getAvatarColor(name: string) {
  let s = 0; for (const c of name) s += c.charCodeAt(0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

function MemberTable({ members, emptyText, accentClass }: {
  members: Member[];
  emptyText: string;
  accentClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {members.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <p className="text-sm">{emptyText}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {HEADERS.map(h => (
                <th key={h} className="text-center px-4 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((c, i) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-center align-middle text-slate-400 text-xs">{i + 1}</td>
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
                {/* 연락처 */}
                <td className="px-4 py-3 text-center align-middle">
                  <span className="text-slate-600 flex items-center justify-center gap-1 text-xs">
                    <Phone size={11}/>{c.phone || "-"}
                  </span>
                </td>
                {/* 담당컨설턴트 */}
                <td className="px-4 py-3 text-center align-middle text-slate-600 text-xs">
                  {c.consultant || <span className="text-slate-300">-</span>}
                </td>
                {/* 대협팀 담당자 */}
                <td className="px-4 py-3 text-center align-middle">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    {c.assigned_to}
                  </span>
                </td>
                {/* 상태 */}
                <td className="px-4 py-3 text-center align-middle">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${accentClass}`}>
                    {c.meeting_result}
                  </span>
                </td>
                {/* 완료일 */}
                <td className="px-4 py-3 text-center align-middle">
                  <span className="text-slate-600 flex items-center justify-center gap-1 text-xs">
                    <Calendar size={11}/>
                    {c.meeting_result === "계약완료" && c.contract_date
                      ? new Date(c.contract_date).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
                      : c.meeting_result === "예약완료" && c.reservation_date
                      ? new Date(c.reservation_date).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
                      : "-"}
                  </span>
                </td>
                {/* 메모 */}
                <td className="px-4 py-3 text-center align-middle max-w-[180px]">
                  <p className="text-xs text-slate-500 truncate">{c.memo || "-"}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function MemberManagePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractSearch, setContractSearch] = useState("");
  const [reserveSearch, setReserveSearch] = useState("");

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .in("meeting_result", ["계약완료", "예약완료"])
      .order("created_at", { ascending: false });
    setMembers((data as Member[]) || []);
    setLoading(false);
  };

  const filterBySearch = (list: Member[], q: string) => {
    if (!q.trim()) return list;
    const lq = q.toLowerCase();
    return list.filter(c =>
      c.name.includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.title && c.title.includes(q)) ||
      (c.consultant && c.consultant.includes(q)) ||
      c.assigned_to.includes(q)
    );
  };

  const contracts  = filterBySearch(members.filter(m => m.meeting_result === "계약완료"), contractSearch);
  const reservations = filterBySearch(members.filter(m => m.meeting_result === "예약완료"), reserveSearch);
  const totalContracts   = members.filter(m => m.meeting_result === "계약완료").length;
  const totalReservations = members.filter(m => m.meeting_result === "예약완료").length;

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
              <p className="text-lg font-bold text-emerald-600">{totalContracts}</p>
              <p className="text-xs text-emerald-500">계약완료</p>
            </div>
            <div className="text-center px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-lg font-bold text-blue-600">{totalReservations}</p>
              <p className="text-xs text-blue-500">예약완료</p>
            </div>
            <div className="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-lg font-bold text-slate-700">{totalContracts + totalReservations}</p>
              <p className="text-xs text-slate-500">전체</p>
            </div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto p-5 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <>
            {/* ── 계약완료 섹션 ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"/>
                    <h2 className="text-sm font-bold text-slate-700">계약완료</h2>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {contracts.length}명
                      {contractSearch && ` / 전체 ${totalContracts}명`}
                    </span>
                  </div>
                </div>
                {/* 검색 */}
                <div className="relative w-64">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    type="text"
                    placeholder="이름, 연락처, 담당자 검색..."
                    value={contractSearch}
                    onChange={e => setContractSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
              <MemberTable
                members={contracts}
                emptyText={contractSearch ? "검색 결과가 없습니다" : "계약완료 회원이 없습니다"}
                accentClass="bg-emerald-100 text-emerald-700"
              />
            </div>

            {/* 구분선 */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"/>
              <span className="text-xs text-slate-400 font-semibold">예약완료</span>
              <div className="flex-1 h-px bg-slate-200"/>
            </div>

            {/* ── 예약완료 섹션 ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"/>
                  <h2 className="text-sm font-bold text-slate-700">예약완료</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {reservations.length}명
                    {reserveSearch && ` / 전체 ${totalReservations}명`}
                  </span>
                </div>
                {/* 검색 */}
                <div className="relative w-64">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    type="text"
                    placeholder="이름, 연락처, 담당자 검색..."
                    value={reserveSearch}
                    onChange={e => setReserveSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <MemberTable
                members={reservations}
                emptyText={reserveSearch ? "검색 결과가 없습니다" : "예약완료 회원이 없습니다"}
                accentClass="bg-blue-100 text-blue-700"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
