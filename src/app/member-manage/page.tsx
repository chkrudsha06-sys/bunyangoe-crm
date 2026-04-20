"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Phone, Calendar, Search, Copy, Check, Edit3 } from "lucide-react";
import BankAccountDialog from "@/components/BankAccountDialog";

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
  id: number; name: string; title: string | null; phone: string | null;
  assigned_to: string; meeting_result: string;
  contract_date: string | null; reservation_date: string | null;
  consultant: string | null; memo: string | null;
  bunyanghoe_number: string | null;
  bank_holder: string | null; bank_code: string | null;
  bank_name: string | null; bank_account: string | null;
  regular_payment_date: string | null;
}

// ─── 넘버링 편집 셀 ───
function NumberingCell({ value, contactId, onSaved }: {
  value: string | null; contactId: number; onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const stripPrefix = (v: string | null): string => v ? (v.startsWith("B-") ? v.slice(2) : v) : "";
  const displayValue = value ? (value.startsWith("B-") ? value : `B-${value}`) : null;
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const save = async () => {
    const clean = val.trim().replace(/[^0-9]/g, "");
    await supabase.from("contacts").update({ bunyanghoe_number: clean ? `B-${clean}` : null }).eq("id", contactId);
    setEditing(false); onSaved();
  };
  if (editing) {
    return (
      <div className="flex items-center justify-center gap-0.5">
        <span className="text-sm font-black text-amber-600 flex-shrink-0">B-</span>
        <input ref={inputRef} value={val}
          onChange={e => setVal(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={save} onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(stripPrefix(value)); setEditing(false); } }}
          placeholder="001" className="w-14 px-1 py-0.5 text-sm font-black text-amber-600 border border-amber-400 rounded outline-none bg-white text-center"/>
      </div>
    );
  }
  return (
    <button onClick={() => { setVal(stripPrefix(value)); setEditing(true); }}
      className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-amber-50 transition-colors ${!displayValue ? "border border-dashed border-slate-300" : ""}`}>
      <span className={`text-sm font-black ${displayValue ? "text-amber-600" : "text-slate-300"}`}>{displayValue || "B-___"}</span>
      <Edit3 size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"/>
    </button>
  );
}

// ─── 계좌 필드 셀 ───
function AccountFieldCell({ contact, field, placeholder, onSaved }: {
  contact: VipContact; field: "bank_holder"|"bank_code"|"bank_name"; placeholder: string; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const value = contact[field];
  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`w-full min-w-[80px] px-2 py-1.5 text-xs rounded-lg border text-center transition-colors ${
          value ? "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50 font-semibold"
                : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"}`}>
        {value || placeholder}
      </button>
      <BankAccountDialog open={open} onClose={() => setOpen(false)} contactId={contact.id}
        initial={{ bank_holder: contact.bank_holder, bank_code: contact.bank_code, bank_name: contact.bank_name, bank_account: contact.bank_account }}
        onSaved={onSaved}/>
    </>
  );
}

// ─── 계좌번호 셀 + 복사 ───
function AccountNumberCell({ contact, onSaved }: { contact: VipContact; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const value = contact.bank_account;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); if (!value) return;
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => setOpen(true)}
          className={`min-w-[110px] px-2 py-1.5 text-xs rounded-lg border text-center transition-colors ${
            value ? "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50 font-semibold"
                  : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"}`}>
          {value || "계좌번호"}
        </button>
        {value && (
          <button onClick={handleCopy}
            className={`flex-shrink-0 p-1.5 rounded-lg border transition-colors ${
              copied ? "bg-emerald-50 border-emerald-200 text-emerald-500" : "bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50"}`}>
            {copied ? <Check size={11}/> : <Copy size={11}/>}
          </button>
        )}
      </div>
      <BankAccountDialog open={open} onClose={() => setOpen(false)} contactId={contact.id}
        initial={{ bank_holder: contact.bank_holder, bank_code: contact.bank_code, bank_name: contact.bank_name, bank_account: contact.bank_account }}
        onSaved={onSaved}/>
    </>
  );
}

function bunNumValue(n: string | null): number {
  if (!n) return Infinity;
  const m = n.match(/\d+/);
  return m ? parseInt(m[0], 10) : Infinity;
}

// ─── 납부 상태 판정 ───
// 계약완료 시점 ~ 현재까지 매월 납부해야 할 횟수 vs 실제 납부 횟수
function calcPaymentStatus(c: VipContact, feeCnt: number): "정상"|"이상"|"예약" {
  if (c.meeting_result === "예약완료") return "예약";
  if (!c.contract_date) return "이상";

  const contractDate = new Date(c.contract_date);
  const now = new Date();

  // 계약월 다음달부터 현재월까지 몇 개월인지 계산
  const contractY = contractDate.getFullYear();
  const contractM = contractDate.getMonth(); // 0-based
  const nowY = now.getFullYear();
  const nowM = now.getMonth();

  // 정기출금일 기준: 현재일이 출금일 이전이면 이번 달은 아직 미도래
  const payDay = parseInt(c.regular_payment_date || "0") || 0;
  const todayDay = now.getDate();

  // 예상 납부 횟수 = (현재년월 - 계약년월) + 1 (계약 당월 포함)
  // 단, 이번 달 출금일이 아직 안 지났으면 이번 달은 제외
  let expectedMonths = (nowY - contractY) * 12 + (nowM - contractM) + 1;
  if (payDay > 0 && todayDay < payDay) expectedMonths -= 1;
  if (expectedMonths < 1) expectedMonths = 1;

  if (feeCnt >= expectedMonths) return "정상";
  return "이상";
}

export default function MemberManagePage() {
  const [contacts, setContacts] = useState<VipContact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPayStatus, setFilterPayStatus] = useState("");
  const [filterConsultant, setFilterConsultant] = useState("");
  const [feeCount, setFeeCount] = useState<Record<string, number>>({});

  const TEAM = ["조계현","이세호","기여운","최연전"];

  useEffect(() => { fetchMembers(); }, [filterMember, filterStatus]);

  const fetchMembers = async () => {
    setLoading(true);
    let q = supabase.from("contacts")
      .select("id,name,title,phone,assigned_to,meeting_result,contract_date,reservation_date,consultant,memo,bunyanghoe_number,bank_holder,bank_code,bank_name,bank_account,regular_payment_date")
      .in("meeting_result",["계약완료","예약완료"]);
    if (filterMember) q = q.eq("assigned_to", filterMember);
    if (filterStatus) q = q.eq("meeting_result", filterStatus);
    const { data } = await q;

    const sorted = ((data as VipContact[]) || []).sort((a, b) =>
      bunNumValue(a.bunyanghoe_number) - bunNumValue(b.bunyanghoe_number)
    );
    setContacts(sorted);

    const { data: feeData } = await supabase.from("ad_executions")
      .select("member_name,bunyanghoe_number")
      .eq("channel", "분양회 월회비");
    const counts: Record<string, number> = {};
    ((feeData || []) as any[]).forEach(e => {
      if (e.member_name) counts[e.member_name] = (counts[e.member_name] || 0) + 1;
      if (e.bunyanghoe_number) counts[`num:${e.bunyanghoe_number}`] = (counts[`num:${e.bunyanghoe_number}`] || 0) + 1;
    });
    setFeeCount(counts);
    setLoading(false);
  };

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name.includes(search) ||
      ((c as any).title && (c as any).title.includes(search)) ||
      (c.phone && c.phone.includes(search)) ||
      (c.bunyanghoe_number && c.bunyanghoe_number.includes(search)) ||
      (c.bank_holder && c.bank_holder.includes(search));
    const feeCnt = feeCount[c.name] || (c.bunyanghoe_number ? feeCount[`num:${c.bunyanghoe_number}`] : 0) || 0;
    const payStatus = calcPaymentStatus(c, feeCnt);
    const matchPayStatus = !filterPayStatus || payStatus === filterPayStatus;
    const matchConsultant = !filterConsultant || c.consultant === filterConsultant;
    return matchSearch && matchPayStatus && matchConsultant;
  });
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
            <input type="text" placeholder="고객명, 직급, 연락처, 예금주 검색..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={filterPayStatus} onChange={e=>setFilterPayStatus(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
            <option value="">상태</option>
            <option value="정상">정상</option>
            <option value="이상">이상</option>
            <option value="예약">예약</option>
          </select>
          <select value={filterConsultant} onChange={e=>setFilterConsultant(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
            <option value="">담당컨설턴트</option>
            {["박경화","박혜은","조승현","박민경","백선중","강아름","전정훈","박나라"].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterMember} onChange={e=>setFilterMember(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
            <option value="">대협팀담당자</option>
            {TEAM.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none">
            <option value="">계약상태</option>
            <option value="계약완료">계약완료</option>
            <option value="예약완료">예약완료</option>
          </select>
          <button onClick={()=>{setSearch("");setFilterPayStatus("");setFilterConsultant("");setFilterMember("");setFilterStatus("");}}
            className={`text-xs px-2.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors ${(search||filterPayStatus||filterConsultant||filterMember||filterStatus) ? "bg-red-500 text-white border border-red-500" : "text-red-400 border border-red-200 hover:bg-red-50"}`}>
            ↺ 초기화
          </button>
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
                  {["넘버링","회차","상태","고객명","직급","연락처","담당컨설턴트","대협팀","계약상태","예금주","은행코드","은행명","계좌번호","정기출금일","계약/예약일","메모"].map(h=>(
                    <th key={h} className="text-center px-3 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const feeCnt = feeCount[c.name] || (c.bunyanghoe_number ? feeCount[`num:${c.bunyanghoe_number}`] : 0) || 0;
                  const payStatus = calcPaymentStatus(c, feeCnt);
                  const statusStyle = payStatus === "정상"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : payStatus === "이상"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-blue-100 text-blue-700 border-blue-200";
                  return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center align-middle">
                      <NumberingCell value={c.bunyanghoe_number} contactId={c.id} onSaved={fetchMembers}/>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      {feeCnt > 0
                        ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">{feeCnt}회차</span>
                        : <span className="text-xs text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold border ${statusStyle}`}>{payStatus}</span>
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
                      <span className="text-slate-600 flex items-center justify-center gap-1 text-xs"><Phone size={11}/>{c.phone||"-"}</span>
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
                    <td className="px-3 py-3 text-center align-middle">
                      <AccountNumberCell contact={c} onSaved={fetchMembers}/>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      {c.regular_payment_date
                        ? <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">매월 {c.regular_payment_date}일</span>
                        : <span className="text-xs text-slate-300">-</span>}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
