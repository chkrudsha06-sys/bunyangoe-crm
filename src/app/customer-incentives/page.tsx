"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Award, CheckCircle, Clock, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

const TIERS = [
  { min:100000000, label:"3구간", incentive:10000000, color:"bg-amber-400", text:"text-amber-700", bg:"bg-amber-50", border:"border-amber-200" },
  { min:70000000, label:"2구간", incentive:5000000, color:"bg-slate-300", text:"text-slate-700", bg:"bg-slate-50", border:"border-slate-200" },
  { min:50000000, label:"1구간", incentive:3000000, color:"bg-orange-300", text:"text-orange-700", bg:"bg-orange-50", border:"border-orange-200" },
];
const getTier = (amt:number) => TIERS.find(t=>amt>=t.min)||null;
const fw = (n:number) => n.toLocaleString();
const fDate = (d:string) => d ? new Date(d+"T00:00:00").toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\. /g,".").replace(/\.$/,"") : "-";
const fmtBun = (b:string|null) => b||"-";
const AD_CHANNELS = ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];

export default function CustomerIncentivesPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [execs, setExecs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPaid, setFilterPaid] = useState("");

  useEffect(()=>{ loadData(); },[]);

  const loadData = async () => {
    setLoading(true);
    const [r1,r2,r3] = await Promise.all([
      supabase.from("contacts").select("id,name,title,bunyanghoe_number,consultant,assigned_to,contract_date,bank_holder,bank_code,bank_name,bank_account")
        .eq("meeting_result","계약완료").not("contract_date","is",null).order("contract_date",{ascending:true}),
      supabase.from("ad_executions").select("id,member_name,bunyanghoe_number,execution_amount,channel,payment_date")
        .in("channel",AD_CHANNELS).order("payment_date",{ascending:false}),
      supabase.from("incentive_payments").select("*"),
    ]);
    setContacts(r1.data||[]); setExecs(r2.data||[]); setPayments(r3.data||[]);
    setLoading(false);
  };

  const customerData = useMemo(()=>{
    return contacts.map(c=>{
      const cDate = new Date(c.contract_date+"T00:00:00");
      const now = new Date();
      const quarters: any[] = [];
      let qNum=1; let qStart=new Date(cDate);
      while(qStart<now){
        const qEnd=new Date(qStart); qEnd.setDate(qEnd.getDate()+89);
        const sStr=qStart.toISOString().split("T")[0];
        const eStr=qEnd.toISOString().split("T")[0];
        const adTotal=execs.filter(e=>(e.member_name===c.name||e.bunyanghoe_number===c.bunyanghoe_number)&&e.payment_date>=sStr&&e.payment_date<=eStr).reduce((s:number,e:any)=>s+(e.execution_amount||0),0);
        const tier=getTier(adTotal);
        const payMonth=new Date(qEnd); payMonth.setMonth(payMonth.getMonth()+1);
        const payDue=`${payMonth.getFullYear()}-${String(payMonth.getMonth()+1).padStart(2,"0")}-15`;
        const payment=payments.find((p:any)=>p.contact_id===c.id&&p.quarter_num===qNum);
        const isEnded=qEnd<now;
        quarters.push({qNum,start:qStart,end:qEnd,sStr,eStr,adTotal,tier,payDue,payment,isEnded});
        qStart=new Date(qEnd); qStart.setDate(qStart.getDate()+1); qNum++;
      }
      return {...c, quarters};
    });
  },[contacts,execs,payments]);

  // 필터
  const filteredData = useMemo(()=>{
    return customerData.filter(c=>{
      if(search.trim()){
        const s=search.trim().toLowerCase();
        if(!c.name.includes(s)&&!fmtBun(c.bunyanghoe_number).toLowerCase().includes(s)&&!(c.assigned_to||"").includes(s)) return false;
      }
      return true;
    });
  },[customerData,search]);

  // 필터된 행
  const allRows = useMemo(()=>{
    const rows: any[] = [];
    filteredData.forEach(c=>c.quarters.forEach((q:any)=>{
      if(filterPaid==="paid"&&!q.payment?.is_paid) return;
      if(filterPaid==="unpaid"&&(q.payment?.is_paid||!q.tier||!q.isEnded)) return;
      rows.push({...q, contact:c});
    }));
    return rows;
  },[filteredData,filterPaid]);

  const summary = useMemo(()=>{
    let total=0,t1=0,t2=0,t3=0,paid=0,unpaid=0,paidAmt=0;
    customerData.forEach(c=>c.quarters.forEach((q:any)=>{
      if(!q.tier) return; total++;
      if(q.tier.label==="1구간") t1++; if(q.tier.label==="2구간") t2++; if(q.tier.label==="3구간") t3++;
      if(q.payment?.is_paid){paid++;paidAmt+=q.payment.incentive_amount||0;} else unpaid++;
    }));
    return {total,t1,t2,t3,paid,unpaid,paidAmt};
  },[customerData]);

  const handlePay = async (contactId:number,qNum:number,amount:number) => {
    if(!confirm(`인센티브 ${fw(amount)}원을 지급 처리하시겠습니까?`)) return;
    const today=new Date().toISOString().split("T")[0];
    const ex=payments.find((p:any)=>p.contact_id===contactId&&p.quarter_num===qNum);
    if(ex) await supabase.from("incentive_payments").update({is_paid:true,paid_date:today,incentive_amount:amount}).eq("id",ex.id);
    else await supabase.from("incentive_payments").insert({contact_id:contactId,quarter_num:qNum,incentive_amount:amount,is_paid:true,paid_date:today});
    loadData();
  };

  const handleCancel = async (paymentId:number) => {
    if(!confirm("지급 취소하시겠습니까?")) return;
    await supabase.from("incentive_payments").update({is_paid:false,paid_date:null}).eq("id",paymentId);
    loadData();
  };

  const downloadDataXLS = () => {
    const rows: any[] = [];
    customerData.forEach(c=>c.quarters.forEach((q:any)=>{
      rows.push({
        "넘버링":fmtBun(c.bunyanghoe_number),"고객명":c.name,"직급":c.title||"",
        "대협팀":c.assigned_to||"","컨설턴트":c.consultant||"",
        "분기":`${q.qNum}기`,"기간시작":q.sStr,"기간종료":q.eStr,
        "누적광고비":q.adTotal,"구간":q.tier?.label||"미달",
        "인센티브":q.tier?.incentive||0,
        "지급여부":q.payment?.is_paid?"지급완료":"미지급",
        "지급일":q.payment?.paid_date||"",
      });
    }));
    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"인센티브데이터");
    XLSX.writeFile(wb,"인센티브_데이터.xls");
  };

  const downloadPaymentXLS = () => {
    const rows: any[][] = [];
    customerData.forEach(c=>c.quarters.forEach((q:any)=>{
      if(!q.payment?.is_paid) return;
      rows.push([
        c.bank_code||"", c.bank_account||"", c.bank_holder||c.name,
        q.payment.incentive_amount||0, `인센티브${q.qNum}기`, "(주)광고인",
      ]);
    }));
    const ws=XLSX.utils.aoa_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"입력정보");
    XLSX.writeFile(wb,"인센티브_지급정보.xls");
  };

  if(loading) return <div className="flex items-center justify-center h-full bg-[#F1F5F9]"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Award size={20} className="text-amber-500"/>인센티브 관리</h1>
            <p className="text-xs text-slate-500 mt-0.5">계약완료 고객 · 90일 누적 광고비 구간별 인센티브 (집행금액 기준)</p>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2 mt-3">
          <div className="relative">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="넘버링, 고객명, 담당자..."
              className="pl-3 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg w-52 outline-none focus:border-blue-400"/>
          </div>
          <select value={filterPaid} onChange={e=>setFilterPaid(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <option value="">지급여부</option>
            <option value="unpaid">미지급</option>
            <option value="paid">지급완료</option>
          </select>
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={downloadDataXLS} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100">
              <FileSpreadsheet size={14}/>데이터다운(XLS)
            </button>
            <button onClick={downloadPaymentXLS} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100">
              <FileSpreadsheet size={14}/>지급정보(XLS)
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* 요약 */}
        <div className="grid grid-cols-7 gap-3">
          {[
            {label:"인센티브 대상",value:`${summary.total}건`,color:"text-slate-700",bg:"bg-white"},
            {label:"1구간 (300만)",value:`${summary.t1}건`,color:"text-orange-600",bg:"bg-orange-50"},
            {label:"2구간 (500만)",value:`${summary.t2}건`,color:"text-slate-600",bg:"bg-slate-100"},
            {label:"3구간 (1,000만)",value:`${summary.t3}건`,color:"text-amber-600",bg:"bg-amber-50"},
            {label:"지급완료",value:`${summary.paid}건`,color:"text-emerald-600",bg:"bg-emerald-50"},
            {label:"지급금액",value:`${fw(summary.paidAmt)}원`,color:"text-blue-600",bg:"bg-blue-50"},
            {label:"미지급",value:`${summary.unpaid}건`,color:"text-red-500",bg:"bg-red-50"},
          ].map(c=>(
            <div key={c.label} className={`${c.bg} rounded-xl border border-slate-100 shadow-sm p-3`}>
              <p className="text-[10px] text-slate-400 font-semibold mb-1">{c.label}</p>
              <p className={`text-lg font-black ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* 구간 안내 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-sm font-bold text-slate-700 mb-3">구간별 인센티브 <span className="text-xs text-slate-400 font-normal ml-2">계약일 기준 90일 · 하이타겟+호갱노노+LMS 집행금액</span></p>
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:"1구간",range:"5,000만 ~ 7,000만 미만",amt:"300만원",grad:"from-orange-100 to-orange-50",border:"border-orange-200",badge:"bg-orange-400"},
              {label:"2구간",range:"7,000만 ~ 1억 미만",amt:"500만원",grad:"from-slate-100 to-slate-50",border:"border-slate-200",badge:"bg-slate-400"},
              {label:"3구간",range:"1억 이상",amt:"1,000만원",grad:"from-amber-100 to-amber-50",border:"border-amber-200",badge:"bg-amber-400"},
            ].map(t=>(
              <div key={t.label} className={`bg-gradient-to-br ${t.grad} rounded-xl border ${t.border} p-4 text-center`}>
                <span className={`text-xs px-2 py-0.5 ${t.badge} text-white rounded-full font-bold`}>{t.label}</span>
                <p className="text-sm font-semibold text-slate-700 mt-3">{t.range}</p>
                <p className="text-2xl font-black text-slate-800 mt-1">{t.amt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-auto" style={{maxHeight:"calc(100vh - 420px)"}}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
              <tr>
                {["넘버링","고객명","직급","계약일","분기","기간","누적 광고비","진행률","구간","인센티브","지급상태","지급일",""].map(h=>(
                  <th key={h} className="text-center px-3 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allRows.map((r:any,i:number)=>{
                const c=r.contact;
                const pct=Math.min(Math.round(r.adTotal/50000000*100),100);
                return (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3 text-center text-blue-600 font-bold text-sm">{fmtBun(c.bunyanghoe_number)}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800">{c.name}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{c.title||"-"}</td>
                    <td className="px-3 py-3 text-center text-slate-600 text-xs">{fDate(c.contract_date)}</td>
                    <td className="px-3 py-3 text-center"><span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold border border-blue-100">{r.qNum}기</span></td>
                    <td className="px-3 py-3 text-center text-xs text-slate-500 whitespace-nowrap">{fDate(r.sStr)} ~ {fDate(r.eStr)}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800">{fw(r.adTotal)}원</td>
                    <td className="px-3 py-3 text-center" style={{minWidth:80}}>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.tier?r.tier.color:r.adTotal>0?"bg-blue-300":"bg-slate-200"}`} style={{width:`${Math.max(pct,2)}%`}}/>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{pct}%</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.tier ? <span className={`text-xs px-2 py-1 rounded-full font-bold ${r.tier.bg} ${r.tier.text} ${r.tier.border} border`}>{r.tier.label}</span> : <span className="text-xs text-slate-300">미달</span>}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-slate-800">{r.tier?`${fw(r.tier.incentive)}원`:"-"}</td>
                    <td className="px-3 py-3 text-center">
                      {r.payment?.is_paid ? (
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold inline-flex items-center gap-1"><CheckCircle size={10}/>지급완료</span>
                      ) : r.tier&&r.isEnded ? (
                        <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-full font-bold inline-flex items-center gap-1"><Clock size={10}/>미지급</span>
                      ) : r.tier ? (
                        <span className="text-xs text-slate-400">진행중</span>
                      ) : <span className="text-xs text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-slate-400">{r.payment?.paid_date?fDate(r.payment.paid_date):"-"}</td>
                    <td className="px-3 py-3 text-center">
                      {r.tier&&!r.payment?.is_paid&&r.isEnded ? (
                        <button onClick={()=>handlePay(c.id,r.qNum,r.tier.incentive)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">지급</button>
                      ) : r.payment?.is_paid ? (
                        <button onClick={()=>handleCancel(r.payment.id)} className="text-xs px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg font-semibold hover:bg-red-50 hover:text-red-500">취소</button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
