"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Award, CheckCircle, Clock, TrendingUp } from "lucide-react";

const TIERS = [
  { min: 100000000, label: "3구간", incentive: 10000000, color: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50" },
  { min: 70000000, label: "2구간", incentive: 5000000, color: "bg-slate-300", text: "text-slate-700", bg: "bg-slate-50" },
  { min: 50000000, label: "1구간", incentive: 3000000, color: "bg-orange-300", text: "text-orange-700", bg: "bg-orange-50" },
];
const getTier = (amt: number) => TIERS.find(t => amt >= t.min) || null;
const fw = (n: number) => n.toLocaleString();
const fDate = (d: string) => d ? new Date(d+"T00:00:00").toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\. /g,".").replace(/\.$/,"") : "-";

const AD_CHANNELS = ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];

export default function CustomerIncentivesPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [execs, setExecs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([
      supabase.from("contacts").select("id,name,title,bunyanghoe_number,consultant,assigned_to,contract_date")
        .eq("meeting_result","계약완료").not("contract_date","is",null).order("contract_date",{ascending:true}),
      supabase.from("ad_executions").select("id,member_name,bunyanghoe_number,execution_amount,channel,payment_date,contract_route")
        .in("channel", AD_CHANNELS).order("payment_date",{ascending:false}),
      supabase.from("incentive_payments").select("*"),
    ]);
    setContacts(r1.data||[]); setExecs(r2.data||[]); setPayments(r3.data||[]);
    setLoading(false);
  };

  // 고객별 분기 계산
  const customerData = useMemo(() => {
    return contacts.map(c => {
      const cDate = new Date(c.contract_date + "T00:00:00");
      const now = new Date();
      const quarters: { qNum: number; start: Date; end: Date; adTotal: number; tier: any; payDue: string; payment: any }[] = [];

      let qNum = 1;
      let qStart = new Date(cDate);
      while (qStart < now) {
        const qEnd = new Date(qStart);
        qEnd.setDate(qEnd.getDate() + 89); // 90일

        // 이 기간 광고비 (execution_amount 기반)
        const sStr = qStart.toISOString().split("T")[0];
        const eStr = qEnd.toISOString().split("T")[0];
        const adTotal = execs.filter(e =>
          (e.member_name === c.name || e.bunyanghoe_number === c.bunyanghoe_number) &&
          e.payment_date >= sStr && e.payment_date <= eStr
        ).reduce((s: number, e: any) => s + (e.execution_amount || 0), 0);

        const tier = getTier(adTotal);
        // 지급예정: 분기 종료 익월 15일
        const payMonth = new Date(qEnd);
        payMonth.setMonth(payMonth.getMonth() + 1);
        const payDue = `${payMonth.getFullYear()}-${String(payMonth.getMonth()+1).padStart(2,"0")}-15`;

        // 기존 지급 내역
        const payment = payments.find((p: any) => p.contact_id === c.id && p.quarter_num === qNum);

        quarters.push({ qNum, start: qStart, end: qEnd, adTotal, tier, payDue, payment });

        qStart = new Date(qEnd);
        qStart.setDate(qStart.getDate() + 1);
        qNum++;
      }

      return { ...c, quarters };
    });
  }, [contacts, execs, payments]);

  // 요약
  const summary = useMemo(() => {
    let total = 0, tier1 = 0, tier2 = 0, tier3 = 0, paid = 0, unpaid = 0;
    customerData.forEach(c => c.quarters.forEach((q: any) => {
      if (!q.tier) return;
      total++;
      if (q.tier.label === "1구간") tier1++;
      if (q.tier.label === "2구간") tier2++;
      if (q.tier.label === "3구간") tier3++;
      if (q.payment?.is_paid) paid++; else unpaid++;
    }));
    return { total, tier1, tier2, tier3, paid, unpaid };
  }, [customerData]);

  const handlePay = async (contactId: number, qNum: number, amount: number) => {
    if (!confirm(`인센티브 ${fw(amount)}원을 지급 처리하시겠습니까?`)) return;
    const today = new Date().toISOString().split("T")[0];
    const existing = payments.find((p: any) => p.contact_id === contactId && p.quarter_num === qNum);
    if (existing) {
      await supabase.from("incentive_payments").update({ is_paid: true, paid_date: today, incentive_amount: amount }).eq("id", existing.id);
    } else {
      await supabase.from("incentive_payments").insert({ contact_id: contactId, quarter_num: qNum, incentive_amount: amount, is_paid: true, paid_date: today });
    }
    loadData();
  };

  const handleCancel = async (paymentId: number) => {
    if (!confirm("지급 취소하시겠습니까?")) return;
    await supabase.from("incentive_payments").update({ is_paid: false, paid_date: null }).eq("id", paymentId);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full bg-[#F1F5F9]"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Award size={20} className="text-amber-500"/>인센티브 관리</h1>
            <p className="text-xs text-slate-500 mt-0.5">계약완료 고객 · 90일 누적 광고비 구간별 인센티브</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        {/* 요약 카드 */}
        <div className="grid grid-cols-6 gap-3">
          {[
            {label:"인센티브 대상",value:`${summary.total}건`,color:"text-slate-700",bg:"bg-white"},
            {label:"1구간 (300만)",value:`${summary.tier1}건`,color:"text-orange-600",bg:"bg-orange-50"},
            {label:"2구간 (500만)",value:`${summary.tier2}건`,color:"text-slate-600",bg:"bg-slate-50"},
            {label:"3구간 (1,000만)",value:`${summary.tier3}건`,color:"text-amber-600",bg:"bg-amber-50"},
            {label:"지급완료",value:`${summary.paid}건`,color:"text-emerald-600",bg:"bg-emerald-50"},
            {label:"미지급",value:`${summary.unpaid}건`,color:"text-red-500",bg:"bg-red-50"},
          ].map(c=>(
            <div key={c.label} className={`${c.bg} rounded-xl border border-slate-100 shadow-sm p-4`}>
              <p className="text-xs text-slate-400 font-semibold mb-1">{c.label}</p>
              <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* 구간 안내 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-sm font-bold text-slate-700 mb-3">구간별 인센티브 기준 <span className="text-xs text-slate-400 font-normal ml-2">계약일 기준 90일 누적 광고비 (집행금액 기준)</span></p>
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:"1구간",range:"5,000만 ~ 7,000만 미만",amt:"300만원",color:"bg-gradient-to-br from-orange-100 to-orange-50",border:"border-orange-200",badge:"bg-orange-400"},
              {label:"2구간",range:"7,000만 ~ 1억 미만",amt:"500만원",color:"bg-gradient-to-br from-slate-100 to-slate-50",border:"border-slate-200",badge:"bg-slate-400"},
              {label:"3구간",range:"1억 이상",amt:"1,000만원",color:"bg-gradient-to-br from-amber-100 to-amber-50",border:"border-amber-200",badge:"bg-amber-400"},
            ].map(t=>(
              <div key={t.label} className={`${t.color} rounded-xl border ${t.border} p-4 text-center`}>
                <span className={`text-xs px-2 py-0.5 ${t.badge} text-white rounded-full font-bold`}>{t.label}</span>
                <p className="text-sm font-semibold text-slate-700 mt-3">{t.range}</p>
                <p className="text-2xl font-black text-slate-800 mt-2">{t.amt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 고객별 인센티브 테이블 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-auto" style={{maxHeight:"calc(100vh - 380px)"}}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
              <tr>
                {["고객명","직급","계약일","분기","기간","누적 광고비","진행률","구간","인센티브","지급상태",""].map(h=>(
                  <th key={h} className="text-center px-3 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customerData.map(c => c.quarters.map((q: any) => {
                const pct = Math.min(Math.round(q.adTotal / 50000000 * 100), 100);
                const tierInfo = q.tier;
                const isPaid = q.payment?.is_paid;
                const isEnded = q.end < new Date();
                return (
                  <tr key={`${c.id}-${q.qNum}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3 text-center font-bold text-slate-800">{c.name}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{c.title||"-"}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{fDate(c.contract_date)}</td>
                    <td className="px-3 py-3 text-center"><span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold border border-blue-100">{q.qNum}기</span></td>
                    <td className="px-3 py-3 text-center text-xs text-slate-500 whitespace-nowrap">{fDate(q.start.toISOString().split("T")[0])} ~ {fDate(q.end.toISOString().split("T")[0])}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800">{fw(q.adTotal)}원</td>
                    <td className="px-3 py-3 text-center" style={{minWidth:100}}>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${tierInfo ? tierInfo.color : q.adTotal > 0 ? "bg-blue-300" : "bg-slate-200"}`} style={{width:`${Math.max(pct,2)}%`}}/>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{pct}%</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {tierInfo ? <span className={`text-xs px-2 py-1 rounded-full font-bold ${tierInfo.bg} ${tierInfo.text}`}>{tierInfo.label}</span> : <span className="text-xs text-slate-300">미달</span>}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-slate-800">
                      {tierInfo ? `${fw(tierInfo.incentive)}원` : "-"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isPaid ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold flex items-center gap-1"><CheckCircle size={10}/>지급완료</span>
                          <span className="text-xs text-slate-400">{fDate(q.payment.paid_date)}</span>
                        </div>
                      ) : tierInfo && isEnded ? (
                        <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-bold flex items-center gap-1"><Clock size={10}/>미지급</span>
                      ) : tierInfo ? (
                        <span className="text-xs text-slate-400">진행중</span>
                      ) : <span className="text-xs text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {tierInfo && !isPaid && isEnded ? (
                        <button onClick={()=>handlePay(c.id, q.qNum, tierInfo.incentive)}
                          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">지급</button>
                      ) : isPaid ? (
                        <button onClick={()=>handleCancel(q.payment.id)}
                          className="text-xs px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg font-semibold hover:bg-red-50 hover:text-red-500">취소</button>
                      ) : null}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
