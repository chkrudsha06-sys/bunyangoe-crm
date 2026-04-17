"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Phone, Calendar, Search, Copy, Check } from "lucide-react";
import BankAccountDialog from "@/components/BankAccountDialog";

// 성씨 스티커 색상 — 분양회 입회자와 동일하게 통일
const SURNAME_COLORS: Record<string,string> = {
  "김":"bg-blue-500","이":"bg-violet-500","박":"bg-emerald-500","최":"bg-rose-500","정":"bg-amber-500","강":"bg-cyan-500",
  "조":"bg-indigo-500","윤":"bg-pink-500","장":"bg-orange-500","임":"bg-teal-500","한":"bg-sky-500","오":"bg-purple-500",
  "서":"bg-red-500","신":"bg-lime-600","권":"bg-fuchsia-500","황":"bg-yellow-600","안":"bg-blue-600","송":"bg-green-600",
  "류":"bg-indigo-600","전":"bg-rose-600","홍":"bg-red-400","고":"bg-cyan-600","문":"bg-violet-600","양":"bg-amber-600",
  "손":"bg-emerald-600","배":"bg-sky-600","백":"bg-slate-500","허":"bg-pink-600","남":"bg-teal-600","유":"bg-orange-600",
};
function getAvatarColor(n: string): string {
  return (n && SURNAME_COLORS[n[0]]) ? SURNAME_COLORS[n[0]] : "bg-slate-400";
}

interface VipContact {
  id: number;
  name: string;
  phone: string | null;
  assigned_to: string;
  meeting_result: string;
  contract_date: string | null;
  reservation_date: string | null;
  consultant: string | null;
  memo: string | null;
  bunyanghoe_number: string | null;
  bank_holder: string | null;
  bank_code: string | null;
  bank_name: string | null;
  bank_account: string | null;
}

// 계좌 필드 셀 (예금주/은행코드/은행명): 클릭 시 팝업 오픈
function AccountFieldCell({
  contact, field, placeholder, onSaved,
}: {
  contact: VipContact;
  field: "bank_holder" | "bank_code" | "bank_name";
  placeholder: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const value = contact[field];
  const hasValue = !!value;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full min-w-[80px] px-2 py-1.5 text-xs rounded-lg border text-center transition-colors ${
          hasValue
            ? "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50 font-semibold"
            : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"
        }`}
        title="클릭하여 계좌정보 입력/편집"
      >
        {hasValue ? value : placeholder}
      </button>

      <BankAccountDialog
        open={open}
        onClose={() => setOpen(false)}
        contactId={contact.id}
        initial={{
          bank_holder:  contact.bank_holder,
          bank_code:    contact.bank_code,
          bank_name:    contact.bank_name,
          bank_account: contact.bank_account,
        }}
        onSaved={onSaved}
      />
    </>
  );
}

// 계좌번호 셀: 클릭 시 팝업 + 복사 버튼
function AccountNumberCell({
  contact, onSaved,
}: { contact: VipContact; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const value = contact.bank_account;
  const hasValue = !!value;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => setOpen(true)}
          className={`min-w-[110px] px-2 py-1.5 text-xs rounded-lg border text-center transition-colors font-mono ${
            hasValue
              ? "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50 font-semibold"
              : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"
          }`}
          title="클릭하여 계좌정보 입력/편집"
        >
          {hasValue ? value : "계좌번호"}
        </button>

        {/* 복사 버튼 - 계좌번호 있을 때만 표시 */}
        {hasValue && (
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 p-1.5 rounded-lg border transition-colors ${
              copied
                ? "bg-emerald-50 border-emerald-200 text-emerald-500"
                : "bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50"
            }`}
            title="계좌번호 복사"
          >
            {copied ? <Check size={11}/> : <Copy size={11}/>}
          </button>
        )}
      </div>

      <BankAccountDialog
        open={open}
        onClose={() => setOpen(false)}
        contactId={contact.id}
        initial={{
          bank_holder:  contact.bank_holder,
          bank_code:    contact.bank_code,
          bank_name:    contact.bank_name,
          bank_account: contact.bank_account,
        }}
        onSaved={onSaved}
      />
    </>
  );
}

export default function MemberManagePage() {
  const [contacts, setContacts] = useState<VipContact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const TEAM = ["조계현","이세호","기여운","최연전"];

  useEffect(() => { fetchMembers(); }, [filterMember, filterStatus]);

  const fetchMembers = async () => {
    setLoading(true);
    let q = supabase.from("contacts")
      .select("id,name,phone,assigned_to,meeting_result,contract_date,reservation_date,consultant,memo,bunyanghoe_number,bank_holder,bank_code,bank_name,bank_account")
      .in("meeting_result",["계약완료","예약완료"])
      .order("bunyanghoe_number",{ascending:true});
    if (filterMember) q = q.eq("assigned_to", filterMember);
    if (filterStatus) q = q.eq("meeting_result", filterStatus);
    const { data } = await q;
    setContacts((data as VipContact[]) || []);
    setLoading(false);
  };

  const filtered = contacts.filter(c =>
    !search || c.name.includes(search) ||
    (c.phone && c.phone.includes(search)) ||
    (c.bunyanghoe_number && c.bunyanghoe_number.includes(search)) ||
    (c.bank_holder && c.bank_holder.includes(search))
  );
  const contracts    = filtered.filter(c=>c.meeting_result==="계약완료");
  const reservations = filtered.filter(c=>c.meeting_result==="예약완료");

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield size={20} className="text-blue-500"/>분양회 회원관리
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">분양회 입회자 계좌 및 회원 정보 관리</p>
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
            <input type="text" placeholder="이름, 연락처, 예금주 검색..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 상태</option>
            <option value="계약완료">계약완료</option>
            <option value="예약완료">예약완료</option>
          </select>
          <select value={filterMember} onChange={e=>setFilterMember(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 담당자</option>
            {TEAM.map(m=><option key={m} value={m}>{m}</option>)}
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
            <Shield size={40} className="mb-3 opacity-30"/>
            <p className="text-sm">회원 데이터가 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["넘버링","고객명","연락처","담당컨설턴트","대협팀","상태","예금주","은행코드","은행명","계좌번호","계약/예약일","메모"].map(h=>(
                    <th key={h} className="text-center px-3 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-sm font-black text-amber-600">
                        {c.bunyanghoe_number ? (c.bunyanghoe_number.startsWith("B-") ? c.bunyanghoe_number : `B-${c.bunyanghoe_number}`) : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-7 h-7 ${getAvatarColor(c.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-xs font-black">{c.name[0]}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-slate-600 flex items-center justify-center gap-1 text-xs">
                        <Phone size={11}/>{c.phone||"-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-xs text-slate-600">{c.consultant||"-"}</td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{c.assigned_to}</span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.meeting_result==="계약완료"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>
                        {c.meeting_result}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <AccountFieldCell contact={c} field="bank_holder" placeholder="예금주" onSaved={fetchMembers}/>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <AccountFieldCell contact={c} field="bank_code" placeholder="코드" onSaved={fetchMembers}/>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <AccountFieldCell contact={c} field="bank_name" placeholder="은행명" onSaved={fetchMembers}/>
                    </td>
                    {/* 계좌번호 + 복사 버튼 */}
                    <td className="px-3 py-3 text-center align-middle">
                      <AccountNumberCell contact={c} onSaved={fetchMembers}/>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-slate-600 flex items-center justify-center gap-1 text-xs">
                        <Calendar size={11}/>
                        {c.meeting_result==="계약완료" && c.contract_date
                          ? new Date(c.contract_date).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"})
                          : c.meeting_result==="예약완료" && c.reservation_date
                          ? new Date(c.reservation_date).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"})
                          : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle max-w-[160px]">
                      <p className="text-xs text-slate-500 truncate">{c.memo||"-"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
