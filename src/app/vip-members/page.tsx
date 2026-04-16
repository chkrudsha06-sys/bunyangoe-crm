"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Award, Phone, Calendar, Search, Copy, Check } from "lucide-react";

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
  bank_name: string | null;
  bank_account: string | null;
}

function EditableCell({ value, contactId, field, placeholder, onSaved }: {
  value: string | null; contactId: number; field: string; placeholder: string; onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const save = async () => {
    await supabase.from("contacts").update({ [field]: val || null }).eq("id", contactId);
    setEditing(false); onSaved();
  };
  if (editing) return (
    <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key==="Enter") save(); if (e.key==="Escape") setEditing(false); }}
      placeholder={placeholder}
      className="w-full min-w-[80px] px-2 py-1 text-sm border border-blue-400 rounded-lg outline-none bg-white"/>
  );
  return (
    <span onClick={() => { setVal(value||""); setEditing(true); }}
      className={`text-sm cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 ${value?"text-slate-700":"text-slate-300"}`}>
      {value || placeholder}
    </span>
  );
}

function AccountCell({ value, contactId, onSaved }: { value: string|null; contactId: number; onSaved: ()=>void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500); });
  };
  return (
    <div className="flex items-center justify-center gap-1">
      <EditableCell value={value} contactId={contactId} field="bank_account" placeholder="계좌번호" onSaved={onSaved}/>
      {value && (
        <button onClick={handleCopy} className={`p-1 rounded ${copied?"text-emerald-500":"text-slate-400 hover:text-blue-500"}`}>
          {copied ? <Check size={11}/> : <Copy size={11}/>}
        </button>
      )}
    </div>
  );
}

export default function VipMembersPage() {
  const [contacts, setContacts] = useState<VipContact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const TEAM = ["조계현","이세호","기여운","최연전"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem("crm_user");
      if (raw) { const u = JSON.parse(raw); if (u.role==="exec") setFilterMember(u.name); }
    } catch {}
  }, []);

  useEffect(() => { fetchVipMembers(); }, [filterMember, filterStatus]);

  const fetchVipMembers = async () => {
    setLoading(true);
    let q = supabase.from("contacts")
      .select("id,name,phone,assigned_to,meeting_result,contract_date,reservation_date,consultant,memo,bunyanghoe_number,bank_holder,bank_name,bank_account")
      .in("meeting_result",["계약완료","예약완료"])
      .order("created_at",{ascending:false});
    if (filterMember) q = q.eq("assigned_to", filterMember);
    if (filterStatus) q = q.eq("meeting_result", filterStatus);
    const { data } = await q;
    setContacts((data as VipContact[])||[]);
    setLoading(false);
  };

  const filtered = contacts.filter(c =>
    !search || c.name.includes(search) || (c.phone && c.phone.includes(search))
  );
  const contracts    = filtered.filter(c=>c.meeting_result==="계약완료");
  const reservations = filtered.filter(c=>c.meeting_result==="예약완료");

  const fmtBun = (n: string|null) => n ? (n.startsWith("B-") ? n : `B-${n}`) : "-";
  const TH = (h: string) => <th key={h} className="text-center px-3 py-3 text-slate-600 text-sm font-semibold whitespace-nowrap">{h}</th>;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Award size={20} className="text-amber-500"/>분양회 입회자
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">계약완료 및 예약완료 고객 목록</p>
          </div>
          <div className="flex items-center gap-3">
            {[{v:contracts.length,l:"계약완료",bg:"bg-emerald-50",tb:"text-emerald-600",ts:"text-emerald-500",b:"border-emerald-100"},
              {v:reservations.length,l:"예약완료",bg:"bg-blue-50",tb:"text-blue-600",ts:"text-blue-500",b:"border-blue-100"},
              {v:filtered.length,l:"전체",bg:"bg-amber-50",tb:"text-amber-600",ts:"text-amber-500",b:"border-amber-100"},
            ].map(({v,l,bg,tb,ts,b})=>(
              <div key={l} className={`text-center px-4 py-2 ${bg} rounded-xl border ${b}`}>
                <p className={`text-xl font-bold ${tb}`}>{v}</p>
                <p className={`text-sm ${ts}`}>{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="이름, 연락처 검색..." value={search}
              onChange={e=>setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <option value="">전체 상태</option>
            <option value="계약완료">계약완료</option>
            <option value="예약완료">예약완료</option>
          </select>
          <select value={filterMember} onChange={e=>setFilterMember(e.target.value)}
            className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <option value="">담당자</option>
            <option value="">전체</option>
            {TEAM.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Award size={40} className="mb-3 opacity-30"/>
            <p className="text-sm">입회자 데이터가 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["넘버링","고객명","연락처","담당컨설턴트","대협팀담당자","상태","예금주","은행명","계좌번호","계약/예약 완료일","메모"].map(TH)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c=>(
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-sm font-black text-amber-600">{fmtBun(c.bunyanghoe_number)}</span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-9 h-9 ${getAvatarColor(c.name)} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className="text-white text-sm font-black">{c.name[0]}</span>
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-slate-600 flex items-center justify-center gap-1 text-sm">
                        <Phone size={13}/>{c.phone||"-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-sm text-slate-600">{c.consultant||"-"}</td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-sm px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{c.assigned_to}</span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className={`text-sm px-2 py-1 rounded-full font-medium ${c.meeting_result==="계약완료"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>
                        {c.meeting_result}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <EditableCell value={c.bank_holder} contactId={c.id} field="bank_holder" placeholder="예금주" onSaved={fetchVipMembers}/>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <EditableCell value={c.bank_name} contactId={c.id} field="bank_name" placeholder="은행명" onSaved={fetchVipMembers}/>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <AccountCell value={c.bank_account} contactId={c.id} onSaved={fetchVipMembers}/>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-slate-600 flex items-center justify-center gap-1 text-sm">
                        <Calendar size={13}/>
                        {c.meeting_result==="계약완료"&&c.contract_date
                          ? new Date(c.contract_date).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"})
                          : c.meeting_result==="예약완료"&&c.reservation_date
                          ? new Date(c.reservation_date).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"})
                          : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle max-w-[160px]">
                      <p className="text-sm text-slate-500 truncate">{c.memo||"-"}</p>
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
