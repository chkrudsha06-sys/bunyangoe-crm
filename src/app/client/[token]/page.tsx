"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Award, TrendingUp, Gift, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";

interface Contact {
  id: number; name: string; title: string | null;
  bunyanghoe_number: string | null; assigned_to: string;
  consultant: string | null; meeting_result: string;
  contract_date: string | null;
}
interface AdExecution {
  id: number; channel: string; execution_amount: number;
  hightarget_mileage: number; hightarget_reward: number;
  hogaengnono_reward: number; lms_reward: number;
  payment_date: string | null; vat_amount: number | null;
}
interface PaymentRecord {
  id: number; quarter: string; paid_amount: number; paid_date: string | null;
}
interface MileageUsage {
  id: number; usage_date: string; usage_amount: number;
}
interface AdReport {
  id: number; title: string; file_url: string | null;
  report_month: string | null; quarter: string | null; memo: string | null;
  created_at: string;
}

function fw(n: number) {
  if (!n) return "0원";
  return n.toLocaleString() + "원";
}
function fmtBun(s: string | null) {
  if (!s) return "-";
  return s.startsWith("B-") ? s : `B-${s}`;
}
function getCurrentQuarter() {
  const n = new Date();
  return `${n.getFullYear()}-Q${Math.ceil((n.getMonth()+1)/3)}`;
}
function getQuarterDateRange(q: string) {
  const [year, quarter] = q.split("-");
  const y = parseInt(year);
  return ({
    Q1:{start:`${y}-01-01`,end:`${y}-03-31`},
    Q2:{start:`${y}-04-01`,end:`${y}-06-30`},
    Q3:{start:`${y}-07-01`,end:`${y}-09-30`},
    Q4:{start:`${y}-10-01`,end:`${y}-12-31`},
  } as any)[quarter] || {start:"",end:""};
}
function getQuarters() {
  const y = new Date().getFullYear();
  return [`${y}-Q1`,`${y}-Q2`,`${y}-Q3`,`${y}-Q4`];
}
function quarterOrder(q: string) {
  const [y, qn] = q.split("-Q");
  return parseInt(y)*10+parseInt(qn);
}

export default function ClientDashboard({ params }: { params: { token: string } }) {
  const [contact, setContact]     = useState<Contact|null>(null);
  const [executions, setExecutions] = useState<AdExecution[]>([]);
  const [payments, setPayments]   = useState<PaymentRecord[]>([]);
  const [mileUsages, setMileUsages] = useState<MileageUsage[]>([]);
  const [reports, setReports]     = useState<AdReport[]>([]);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [openSection, setOpenSection] = useState<string>("reward");

  const currentQ = getCurrentQuarter();
  const quarters = getQuarters();

  useEffect(() => {
    fetchData();
  }, [params.token]);

  const fetchData = async () => {
    setLoading(true);
    // 토큰으로 고객 조회
    const { data: c } = await supabase.from("contacts")
      .select("id,name,title,bunyanghoe_number,assigned_to,consultant,meeting_result,contract_date")
      .eq("client_token", params.token)
      .single();

    if (!c) { setNotFound(true); setLoading(false); return; }
    setContact(c as Contact);

    // 병렬 데이터 로드
    const [{ data:e },{ data:p },{ data:m },{ data:r }] = await Promise.all([
      supabase.from("ad_executions")
        .select("id,channel,execution_amount,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward,payment_date,vat_amount")
        .eq("contract_route","분양회")
        .or(`member_name.eq.${c.name}${c.bunyanghoe_number?`,bunyanghoe_number.eq.${c.bunyanghoe_number}`:""}`)
        .order("payment_date",{ascending:false}),
      supabase.from("rewards").select("id,quarter,paid_amount,paid_date").eq("contact_id",c.id),
      supabase.from("mileage_usages").select("id,usage_date,usage_amount").eq("contact_id",c.id).order("usage_date",{ascending:false}),
      supabase.from("ad_reports").select("*").eq("contact_id",c.id).order("created_at",{ascending:false}),
    ]);

    setExecutions((e||[]) as AdExecution[]);
    setPayments((p||[]) as PaymentRecord[]);
    setMileUsages((m||[]) as MileageUsage[]);
    setReports((r||[]) as AdReport[]);
    setLoading(false);
  };

  // 분기별 리워드 계산
  function getQuarterReward(q: string) {
    const { start, end } = getQuarterDateRange(q);
    const list = executions.filter(e => e.payment_date && e.payment_date >= start && e.payment_date <= end);
    const reward = list.reduce((s,e)=>s+(e.hightarget_reward||0)+(e.hogaengnono_reward||0)+(e.lms_reward||0),0);
    const paid   = payments.filter(p=>p.quarter===q).reduce((s,p)=>s+(p.paid_amount||0),0);
    const tax    = reward > 0 ? Math.floor(reward*0.033) : 0;
    const payable= reward - tax;
    return { reward, tax, payable, paid, balance: Math.max(payable-paid,0) };
  }

  // 누적 마일리지
  const totalMileage = executions.reduce((s,e)=>s+(e.hightarget_mileage||0),0);
  const usedMileage  = mileUsages.reduce((s,m)=>s+(m.usage_amount||0),0);
  const mileBalance  = totalMileage - usedMileage;

  // 현재 분기 데이터
  const currentQData = getQuarterReward(currentQ);

  // 전체 지급 완료
  const totalPaid = payments.reduce((s,p)=>s+(p.paid_amount||0),0);

  if (loading) return (
    <div className="min-h-screen bg-[#0C0F1A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#0C0F1A] flex flex-col items-center justify-center text-white">
      <Award size={48} className="text-amber-400 mb-4 opacity-50"/>
      <p className="text-lg font-bold text-slate-300">유효하지 않은 링크입니다</p>
      <p className="text-sm text-slate-500 mt-2">담당자에게 새 링크를 요청해주세요</p>
    </div>
  );

  const toggle = (s: string) => setOpenSection(prev => prev === s ? "" : s);

  return (
    <div className="min-h-screen bg-[#0C0F1A] text-white">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-[#0C0F1A] via-[#1a1f35] to-[#0C0F1A] border-b border-amber-900/30 px-5 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-black font-black text-base">{contact?.name[0]}</span>
            </div>
            <div>
              <p className="text-xs text-amber-400 font-semibold tracking-widest uppercase mb-0.5">Bunyangoe Circle</p>
              <h1 className="text-lg font-black text-white">
                {contact?.name} <span className="text-slate-400 font-normal text-sm">{contact?.title}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs px-2 py-1 bg-amber-900/40 text-amber-400 rounded-full border border-amber-700/40 font-bold">
              {fmtBun(contact?.bunyanghoe_number||null)}
            </span>
            <span className="text-xs px-2 py-1 bg-emerald-900/40 text-emerald-400 rounded-full border border-emerald-700/40">
              {contact?.meeting_result}
            </span>
            {contact?.consultant && (
              <span className="text-xs text-slate-500">담당 컨설턴트: <span className="text-slate-300">{contact.consultant}</span></span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* 요약 카드 3개 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"잔여 마일리지", value:fw(mileBalance), sub:`적립 ${fw(totalMileage)}`, color:"text-blue-400", border:"border-blue-900/40", bg:"bg-blue-900/20" },
            { label:`${currentQ} 리워드`, value:fw(currentQData.payable), sub:`소득세 -${fw(currentQData.tax)}`, color:"text-amber-400", border:"border-amber-900/40", bg:"bg-amber-900/20" },
            { label:"누적 지급 완료", value:fw(totalPaid), sub:`${payments.length}건`, color:"text-emerald-400", border:"border-emerald-900/40", bg:"bg-emerald-900/20" },
          ].map(({label,value,sub,color,border,bg})=>(
            <div key={label} className={`${bg} rounded-2xl p-3.5 border ${border}`}>
              <p className="text-[10px] text-slate-500 mb-1.5 font-medium">{label}</p>
              <p className={`text-base font-black ${color} leading-tight`}>{value}</p>
              <p className="text-[10px] text-slate-600 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── 분기별 리워드 내역 ── */}
        <div className="bg-[#151929] rounded-2xl border border-slate-800/50 overflow-hidden">
          <button onClick={()=>toggle("reward")} className="w-full flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <Gift size={16} className="text-amber-400"/>
              <span className="text-sm font-bold text-white">분기별 리워드 내역</span>
            </div>
            {openSection==="reward" ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
          </button>
          {openSection==="reward" && (
            <div className="px-5 pb-5 space-y-3">
              {quarters.map(q => {
                const d = getQuarterReward(q);
                if (d.reward === 0 && d.paid === 0) return null;
                return (
                  <div key={q} className="bg-[#0C0F1A] rounded-xl p-4 border border-slate-800/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-blue-400 px-2 py-0.5 bg-blue-900/30 rounded-full border border-blue-800/30">{q}</span>
                      {d.balance > 0
                        ? <span className="text-[10px] text-amber-400 font-semibold">→ 다음 분기 이월 예정</span>
                        : d.paid > 0
                        ? <span className="text-[10px] text-emerald-400 font-semibold">✓ 지급 완료</span>
                        : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        {label:"발생 리워드", value:fw(d.reward), color:"text-amber-400"},
                        {label:"소득세(3.3%)", value:`-${fw(d.tax)}`, color:"text-red-400"},
                        {label:"지급 가능액", value:fw(d.payable), color:"text-white font-bold"},
                        {label:"지급 완료", value:fw(d.paid), color:"text-emerald-400"},
                        ...(d.balance > 0 ? [{label:"이월 잔액", value:fw(d.balance), color:"text-sky-400"}] : []),
                      ].map(({label,value,color})=>(
                        <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-800/30">
                          <span className="text-slate-500">{label}</span>
                          <span className={color}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {quarters.every(q => getQuarterReward(q).reward === 0) && (
                <p className="text-center py-4 text-slate-600 text-sm">아직 리워드 내역이 없습니다</p>
              )}
            </div>
          )}
        </div>

        {/* ── 광고 집행 내역 ── */}
        <div className="bg-[#151929] rounded-2xl border border-slate-800/50 overflow-hidden">
          <button onClick={()=>toggle("exec")} className="w-full flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400"/>
              <span className="text-sm font-bold text-white">광고 집행 내역</span>
              <span className="text-xs text-slate-500 ml-1">{executions.length}건</span>
            </div>
            {openSection==="exec" ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
          </button>
          {openSection==="exec" && (
            <div className="px-5 pb-5 space-y-2">
              {executions.length === 0
                ? <p className="text-center py-4 text-slate-600 text-sm">집행 내역이 없습니다</p>
                : executions.map(e=>(
                  <div key={e.id} className="bg-[#0C0F1A] rounded-xl p-3.5 border border-slate-800/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs px-1.5 py-0.5 bg-blue-900/40 text-blue-400 rounded border border-blue-800/30 font-medium">{e.channel}</span>
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        {e.payment_date ? new Date(e.payment_date).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}) : "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{e.execution_amount.toLocaleString()}원</p>
                      {e.vat_amount && e.vat_amount !== e.execution_amount && (
                        <p className="text-[10px] text-blue-400">VAT포함 {e.vat_amount.toLocaleString()}원</p>
                      )}
                      {(e.hightarget_mileage > 0) && <p className="text-[10px] text-blue-400">마일리지 +{e.hightarget_mileage.toLocaleString()}원</p>}
                      {(e.hightarget_reward > 0 || e.hogaengnono_reward > 0 || e.lms_reward > 0) && (
                        <p className="text-[10px] text-amber-400">리워드 +{((e.hightarget_reward||0)+(e.hogaengnono_reward||0)+(e.lms_reward||0)).toLocaleString()}원</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* ── 마일리지 내역 ── */}
        <div className="bg-[#151929] rounded-2xl border border-slate-800/50 overflow-hidden">
          <button onClick={()=>toggle("mile")} className="w-full flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-sky-400"/>
              <span className="text-sm font-bold text-white">마일리지 내역</span>
            </div>
            {openSection==="mile" ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
          </button>
          {openSection==="mile" && (
            <div className="px-5 pb-5">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  {label:"총 적립", value:fw(totalMileage), color:"text-blue-400"},
                  {label:"총 사용", value:fw(usedMileage), color:"text-red-400"},
                  {label:"잔여", value:fw(mileBalance), color:"text-white font-bold"},
                ].map(({label,value,color})=>(
                  <div key={label} className="bg-[#0C0F1A] rounded-xl p-3 border border-slate-800/40 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                    <p className={`text-sm font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              {mileUsages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-semibold mb-2">사용 내역</p>
                  {mileUsages.map(m=>(
                    <div key={m.id} className="flex items-center justify-between bg-[#0C0F1A] rounded-xl px-4 py-3 border border-slate-800/40">
                      <span className="text-xs text-slate-500">{m.usage_date}</span>
                      <span className="text-xs font-bold text-blue-400">-{m.usage_amount.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 광고 리포트 ── */}
        <div className="bg-[#151929] rounded-2xl border border-slate-800/50 overflow-hidden">
          <button onClick={()=>toggle("report")} className="w-full flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-emerald-400"/>
              <span className="text-sm font-bold text-white">광고 리포트</span>
              <span className="text-xs text-slate-500 ml-1">{reports.length}건</span>
            </div>
            {openSection==="report" ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
          </button>
          {openSection==="report" && (
            <div className="px-5 pb-5 space-y-3">
              {reports.length === 0
                ? <p className="text-center py-4 text-slate-600 text-sm">업로드된 리포트가 없습니다</p>
                : reports.map(r=>(
                  <div key={r.id} className="bg-[#0C0F1A] rounded-xl p-4 border border-slate-800/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white mb-1">{r.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.quarter && <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-400 rounded border border-blue-800/30">{r.quarter}</span>}
                          {r.report_month && <span className="text-[10px] text-slate-500">{r.report_month}</span>}
                        </div>
                        {r.memo && <p className="text-xs text-slate-500 mt-1.5">{r.memo}</p>}
                      </div>
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-900/40 text-emerald-400 rounded-xl border border-emerald-800/40 hover:bg-emerald-900/60 transition-colors text-xs font-semibold whitespace-nowrap flex-shrink-0">
                          <Download size={12}/>다운로드
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2">
                      {new Date(r.created_at).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"})} 업로드
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="text-center py-6 border-t border-slate-800/30">
          <p className="text-xs text-slate-600">Bunyangoe Circle × 광고인㈜</p>
          <p className="text-[10px] text-slate-700 mt-1">담당자: {contact?.assigned_to}</p>
        </div>
      </div>
    </div>
  );
}
