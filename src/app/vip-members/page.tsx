"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Award, Phone, Calendar, Search } from "lucide-react";

interface VipContact {
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
  bunyanghoe_number: string | null;
}

const AVATAR_COLORS = ["bg-amber-400","bg-emerald-500","bg-blue-500","bg-violet-500","bg-rose-500","bg-cyan-500"];
function getAvatarColor(name: string) {
  let s = 0; for (const c of name) s += c.charCodeAt(0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

export default function VipMembersPage() {
  const [contacts, setContacts] = useState<VipContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const TEAM = ["조계현", "이세호", "기여운", "최연전"];

  useEffect(() => { fetchVipMembers(); }, [filterMember, filterStatus]);

  const fetchVipMembers = async () => {
    setLoading(true);
    let query = supabase.from("contacts").select("*")
      .in("meeting_result", ["계약완료", "예약완료"])
      .order("created_at", { ascending: false });
    if (filterMember) query = query.eq("assigned_to", filterMember);
    if (filterStatus) query = query.eq("meeting_result", filterStatus);
    const { data } = await query;
    setContacts((data as VipContact[]) || []);
    setLoading(false);
  };

  const filtered = contacts.filter(c =>
    !search || c.name.includes(search) || (c.phone && c.phone.includes(search))
  );
  const contracts   = filtered.filter(c => c.meeting_result === "계약완료");
  const reservations = filtered.filter(c => c.meeting_result === "예약완료");

  const HEADERS = ["#", "분양회넘버링", "고객명", "직급", "연락처", "담당컨설턴트", "대협팀담당자", "상태", "계약/예약 완료일", "메모"];

  const renderRow = (c: VipContact, i: number) => (
    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-center align-middle text-slate-400 text-xs">{i + 1}</td>
      {/* 분양회 넘버링 (읽기전용) */}
      <td className="px-4 py-3 text-center align-middle">
        {c.bunyanghoe_number
          ? <span className="text-xs font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">B-{c.bunyanghoe_number}</span>
          : <span className="text-xs text-slate-300">-</span>}
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
      {/* 직급 (별도 컬럼) */}
      <td className="px-4 py-3 text-center align-middle">
        {c.title
          ? <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{c.title}</span>
          : <span className="text-xs text-slate-300">-</span>}
      </td>
      <td className="px-4 py-3 text-center align-middle">
        <span className="text-slate-600 flex items-center justify-center gap-1 text-xs"><Phone size={11}/>{c.phone || "-"}</span>
      </td>
      <td className="px-4 py-3 text-center align-middle text-slate-600 text-xs">{c.consultant || "-"}</td>
      <td className="px-4 py-3 text-center align-middle">
        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{c.assigned_to}</span>
      </td>
      <td className="px-4 py-3 text-center align-middle">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.meeting_result === "계약완료" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
          {c.meeting_result}
        </span>
      </td>
      <td className="px-4 py-3 text-center align-middle">
        <span className="text-slate-600 flex items-center justify-center gap-1 text-xs">
          <Calendar size={11}/>
          {c.meeting_result === "계약완료" && c.contract_date
            ? new Date(c.contract_date).toLocaleDateString("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" })
            : c.meeting_result === "예약완료" && c.reservation_date
            ? new Date(c.reservation_date).toLocaleDateString("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" })
            : "-"}
        </span>
      </td>
      <td className="px-4 py-3 text-center align-middle max-w-[180px]">
        <p className="text-xs text-slate-500 truncate">{c.memo || "-"}</p>
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Award size={20} className="text-amber-500"/>분양회 입회자
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">계약완료 및 예약완료 고객 목록</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-lg font-bold text-emerald-600">{contracts.length}</p>
              <p className="text-xs text-emerald-500">계약완료</p>
            </div>
            <div className="text-center px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-lg font-bold text-blue-600">{reservations.length}</p>
              <p className="text-xs text-blue-500">예약완료</p>
            </div>
            <div className="text-center px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-lg font-bold text-amber-600">{filtered.length}</p>
              <p className="text-xs text-amber-500">전체</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="이름, 연락처 검색..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <option value="">전체 상태</option>
            <option value="계약완료">계약완료</option>
            <option value="예약완료">예약완료</option>
          </select>
          <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <option value="">전체 담당자</option>
            {TEAM.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Award size={40} className="mb-3 opacity-30"/>
            <p className="text-sm">입회자 데이터가 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{HEADERS.map(h => <th key={h} className="text-center px-4 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => renderRow(c, i))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
