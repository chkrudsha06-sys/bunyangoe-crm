"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Award, Phone, Calendar, Search, CreditCard, Copy, Check, Trash2 } from "lucide-react";
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

function bunNumValue(n: string | null): number {
  if (!n) return Infinity;
  const m = n.match(/\d+/);
  if (!m) return Infinity;
  return parseInt(m[0], 10);
}

// 계좌정보 셀 — 글씨체 통일 + 복사 버튼
function AccountInfoCell({ contact, onSaved }: { contact: VipContact; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasAccount = !!(contact.bank_holder || contact.bank_name || contact.bank_account);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contact.bank_account) return;
    navigator.clipboard.writeText(contact.bank_account).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <>
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={() => setOpen(true)}
          className={`min-w-[170px] max-w-[240px] px-3 py-2 text-xs rounded-lg border text-left transition-colors ${
            hasAccount
              ? "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50"
              : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"
          }`}
          title="클릭하여 계좌정보 입력/편집"
        >
          {hasAccount ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <CreditCard size={11} className="text-blue-500"/>
                <span>{contact.bank_holder || "예금주 미입력"}</span>
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {contact.bank_name || "-"} {contact.bank_account || ""}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-slate-400">
              <CreditCard size={12}/>
              <span>계좌정보 입력</span>
            </div>
          )}
        </button>

        {contact.bank_account && (
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 p-1.5 rounded-lg border transition-colors ${
              copied
                ? "bg-emerald-50 border-emerald-200 text-emerald-500"
                : "bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50"
            }`}
            title="계좌번호 복사"
          >
            {copied ? <Check size={13}/> : <Copy size={13}/>}
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

const TH_COLS = ["넘버링","고객명","연락처","담당컨설턴트","대협팀담당자","완료일","계좌정보","메모",""];

function VipTable({ title, color, rows, onSaved, fmtBun }: {
  title: string; color: "emerald"|"blue";
  rows: VipContact[]; onSaved: ()=>void; fmtBun: (n:string|null)=>string;
}) {
  const colorMap = {
    emerald: { dot:"bg-emerald-500", badge:"bg-emerald-100 text-emerald-700", header:"border-l-4 border-emerald-500" },
    blue:    { dot:"bg-blue-500",    badge:"bg-blue-100 text-blue-700",       header:"border-l-4 border-blue-500" },
  };
  const cc = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className={`flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 ${cc.header} flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${cc.dot}`}/>
          <span className="text-sm font-bold text-slate-700">{title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cc.badge}`}>{rows.length}명</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-slate-300 text-sm">데이터가 없습니다</div>
      ) : (
        <div className="overflow-auto max-h-[480px]">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {[["넘버링","w-[70px]"],["고객명","w-[140px]"],["연락처","w-[140px]"],["담당컨설턴트","w-[100px]"],["대협팀담당자","w-[100px]"],["완료일","w-[110px]"],["계좌정보","w-[180px]"],["메모","w-[160px]"],["","w-[40px]"]].map(([h,w])=>(
                  <th key={h} className={`text-center px-3 py-3 text-slate-600 text-sm font-semibold whitespace-nowrap ${w}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(c=>(
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
                  <td className="px-3 py-3 text-center align-middle text-sm text-slate-700">{c.assigned_to}</td>
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
                  <td className="px-3 py-3 text-center align-middle">
                    <AccountInfoCell contact={c} onSaved={onSaved}/>
                  </td>
                  <td className="px-3 py-3 text-center align-middle max-w-[160px]">
                    <p className="text-sm text-slate-500 truncate">{c.memo||"-"}</p>
                  </td>
                  <td className="px-3 py-3 text-center align-middle">
                    <button onClick={async()=>{
                      if(!confirm(`${c.name} 회원을 삭제하시겠습니까?\n(고객DB에서 미팅결과가 초기화됩니다)`)) return;
                      const { error } = await supabase.from("contacts").update({meeting_result:"",contract_date:null,reservation_date:null,bunyanghoe_number:null}).eq("id",c.id);
                      if (error) { alert(`삭제 실패: ${error.message}`); return; }
                      onSaved();
                    }} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                      <Trash2 size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const [filterConsultant, setFilterConsultant] = useState("");
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
      .select("id,name,phone,assigned_to,meeting_result,contract_date,reservation_date,consultant,memo,bunyanghoe_number,bank_holder,bank_code,bank_name,bank_account")
      .in("meeting_result",["계약완료","예약완료"]);
    if (filterMember) q = q.eq("assigned_to", filterMember);
    if (filterStatus) q = q.eq("meeting_result", filterStatus);
    const { data } = await q;

    const sorted = ((data as VipContact[]) || []).sort((a, b) =>
      bunNumValue(a.bunyanghoe_number) - bunNumValue(b.bunyanghoe_number)
    );
    setContacts(sorted);
    setLoading(false);
  };

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name.includes(search) || (c.phone&&c.phone.includes(search)) || (c.bunyanghoe_number&&c.bunyanghoe_number.includes(search)) || (c.assigned_to&&c.assigned_to.includes(search));
    const matchAssigned = !filterMember || c.assigned_to === filterMember;
    const matchConsultant = !filterConsultant || c.consultant === filterConsultant;
    return matchSearch && matchAssigned && matchConsultant;
  });
  const contracts    = filtered.filter(c=>c.meeting_result==="계약완료");
  const reservations = filtered.filter(c=>c.meeting_result==="예약완료");

  const fmtBun = (n: string|null) => n ? (n.startsWith("B-") ? n : `B-${n}`) : "-";
  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="mb-1">
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              ⭐ 분양회 입회자
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">계약완료 및 예약완료 고객 목록</p>
          </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="넘버링, 고객명, 연락처, 담당자 검색..." value={search}
              onChange={e=>setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
            <option value="">전체 상태</option>
            <option value="계약완료">계약완료</option>
            <option value="예약완료">예약완료</option>
          </select>
          <select value={filterMember} onChange={e=>setFilterMember(e.target.value)}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
            <option value="">담당자</option>
            <option value="">전체</option>
            {TEAM.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex items-center gap-2 ml-auto">
            {[{val:contracts.length,l:"계약완료",bg:"bg-emerald-50",tb:"text-emerald-600",b:"border-emerald-100"},
              {val:reservations.length,l:"예약완료",bg:"bg-blue-50",tb:"text-blue-600",b:"border-blue-100"},
              {val:filtered.length,l:"전체",bg:"bg-amber-50",tb:"text-amber-600",b:"border-amber-100"},
            ].map(({val,l,bg,tb,b})=>(
              <div key={l} className={`flex items-center gap-1.5 px-3 py-2 ${bg} rounded-lg border ${b}`}>
                <span className={`text-sm font-bold ${tb}`}>{val}</span>
                <span className={`text-xs ${tb} opacity-80`}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <>
            <VipTable
              title="계약완료" color="emerald" rows={contracts}
              onSaved={fetchVipMembers} fmtBun={fmtBun}
            />
            <VipTable
              title="예약완료" color="blue" rows={reservations}
              onSaved={fetchVipMembers} fmtBun={fmtBun}
            />
          </>
        )}
      </div>
    </div>
  );
}
