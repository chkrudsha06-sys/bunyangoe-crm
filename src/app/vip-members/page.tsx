"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Award, Phone, Calendar, Search, Copy, Check, Link, Upload, X } from "lucide-react";

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
  client_token: string | null;
}

// ── 인라인 편집 셀 ──────────────────────────────────────────
function EditableCell({ value, contactId, field, placeholder, onSaved }: {
  value: string | null; contactId: number; field: string;
  placeholder: string; onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    await supabase.from("contacts").update({ [field]: val || null }).eq("id", contactId);
    setEditing(false);
    onSaved();
  };

  if (editing) {
    return (
      <input ref={inputRef} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        placeholder={placeholder}
        className="w-full min-w-[80px] px-2 py-1 text-xs border border-blue-400 rounded-lg outline-none bg-white text-slate-800"/>
    );
  }
  return (
    <span onClick={() => { setVal(value || ""); setEditing(true); }}
      className={`text-xs cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors ${value ? "text-slate-700" : "text-slate-300"}`}
      title="클릭하여 편집">
      {value || placeholder}
    </span>
  );
}

// ── 계좌번호 + 복사 ──────────────────────────────────────────
function AccountCell({ value, contactId, onSaved }: {
  value: string | null; contactId: number; onSaved: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center justify-center gap-1">
      <EditableCell value={value} contactId={contactId} field="bank_account" placeholder="계좌번호" onSaved={onSaved}/>
      {value && (
        <button onClick={handleCopy}
          className={`flex-shrink-0 p-1 rounded transition-colors ${copied ? "text-emerald-500" : "text-slate-400 hover:text-blue-500 hover:bg-blue-50"}`}>
          {copied ? <Check size={11}/> : <Copy size={11}/>}
        </button>
      )}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────
export default function VipMembersPage() {
  const [contacts, setContacts] = useState<VipContact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [copiedToken, setCopiedToken]   = useState<number|null>(null);

  // 리포트 모달
  const [reportModal, setReportModal] = useState<VipContact|null>(null);
  const [reportForm, setReportForm]   = useState({ title:"", report_month:"", quarter:"", memo:"", file_url:"" });
  const [reportSaving, setReportSaving] = useState(false);

  const TEAM = ["조계현","이세호","기여운","최연전"];
  const quarters = ["2026-Q1","2026-Q2","2026-Q3","2026-Q4"];

  useEffect(() => { fetchVipMembers(); }, [filterMember, filterStatus]);

  const fetchVipMembers = async () => {
    setLoading(true);
    let query = supabase.from("contacts")
      .select("id,name,phone,assigned_to,meeting_result,contract_date,reservation_date,consultant,memo,bunyanghoe_number,bank_holder,bank_name,bank_account,client_token")
      .in("meeting_result", ["계약완료","예약완료"])
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
  const contracts    = filtered.filter(c => c.meeting_result === "계약완료");
  const reservations = filtered.filter(c => c.meeting_result === "예약완료");

  // 토큰 생성
  const generateToken = async (contact: VipContact) => {
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await supabase.from("contacts").update({ client_token: token }).eq("id", contact.id);
    const url = `${window.location.origin}/client/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(contact.id);
    setTimeout(() => setCopiedToken(null), 2000);
    fetchVipMembers();
  };

  const copyLink = (token: string, contactId: number) => {
    const url = `${window.location.origin}/client/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(contactId);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // 리포트 저장
  const saveReport = async () => {
    if (!reportModal || !reportForm.title) return alert("제목을 입력하세요.");
    setReportSaving(true);
    await supabase.from("ad_reports").insert({
      contact_id: reportModal.id,
      title: reportForm.title,
      report_month: reportForm.report_month || null,
      quarter: reportForm.quarter || null,
      memo: reportForm.memo || null,
      file_url: reportForm.file_url || null,
    });
    setReportSaving(false);
    setReportModal(null);
    setReportForm({ title:"", report_month:"", quarter:"", memo:"", file_url:"" });
  };

  const TH = (label: string) => (
    <th key={label} className="text-center px-3 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{label}</th>
  );

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
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
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 상태</option>
            <option value="계약완료">계약완료</option>
            <option value="예약완료">예약완료</option>
          </select>
          <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">전체 담당자</option>
            {TEAM.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* 테이블 */}
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
                <tr>
                  {["#","고객명","연락처","담당컨설턴트","대협팀담당자","상태","예금주","은행명","계좌번호","계약/예약 완료일","메모","대시보드링크","리포트"].map(TH)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center align-middle text-slate-400 text-xs">{i+1}</td>
                    <td className="px-3 py-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{c.name[0]}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-slate-600 flex items-center justify-center gap-1 text-xs">
                        <Phone size={11}/>{c.phone||"-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle text-xs">{c.consultant||"-"}</td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{c.assigned_to}</span>
                    </td>
                    <td className="px-3 py-3 text-center align-middle">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.meeting_result==="계약완료"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>
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
                    {/* 대시보드 링크 */}
                    <td className="px-3 py-3 text-center align-middle">
                      {c.client_token ? (
                        <button onClick={() => copyLink(c.client_token!, c.id)}
                          className={`flex items-center gap-1 mx-auto text-xs px-2 py-1 rounded border transition-colors ${copiedToken===c.id?"bg-emerald-50 text-emerald-600 border-emerald-200":"bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"}`}>
                          {copiedToken===c.id ? <Check size={11}/> : <Copy size={11}/>}
                          {copiedToken===c.id ? "복사됨" : "링크복사"}
                        </button>
                      ) : (
                        <button onClick={() => generateToken(c)}
                          className="flex items-center gap-1 mx-auto text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-200 hover:bg-slate-100">
                          <Link size={11}/>생성
                        </button>
                      )}
                    </td>
                    {/* 리포트 업로드 */}
                    <td className="px-3 py-3 text-center align-middle">
                      <button onClick={() => { setReportModal(c); setReportForm({title:"",report_month:"",quarter:"",memo:"",file_url:""}); }}
                        className="flex items-center gap-1 mx-auto text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200 hover:bg-emerald-100">
                        <Upload size={11}/>리포트
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 리포트 업로드 모달 */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">리포트 업로드 — {reportModal.name}</h2>
              <button onClick={() => setReportModal(null)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {([
                {label:"제목 *", field:"title", placeholder:"2026년 4월 하이타겟 리포트"},
                {label:"리포트 월", field:"report_month", placeholder:"2026-04"},
                {label:"분기", field:"quarter", placeholder:"2026-Q2"},
                {label:"파일 URL", field:"file_url", placeholder:"https://... (구글드라이브 공유링크 등)"},
                {label:"메모", field:"memo", placeholder:"간단한 설명"},
              ] as {label:string;field:string;placeholder:string}[]).map(({label,field,placeholder}) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                  <input
                    value={(reportForm as any)[field]}
                    onChange={e => setReportForm(p => ({...p, [field]: e.target.value}))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button onClick={() => setReportModal(null)} className="flex-1 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">취소</button>
              <button onClick={saveReport} disabled={reportSaving}
                className="flex-1 py-2.5 text-sm font-bold bg-[#1E3A8A] text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
                {reportSaving ? "저장 중..." : "업로드"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
