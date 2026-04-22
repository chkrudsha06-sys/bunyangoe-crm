"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { CreditCard, Plus, Save, X, TrendingUp, Search, Edit2, FileText } from "lucide-react";
import { sendPushNotification, PUSH_TEMPLATES } from "@/lib/push-notify";

interface AdExecution {
  id: number;
  member_name: string;
  position: string | null;
  execution_amount: number;
  vat_amount: number | null;
  channel: string;
  contract_route: string | null;
  bunyanghoe_number: string | null;
  payment_date: string | null;
  team_member: string | null;
  consultant: string | null;
  hightarget_reward_type: string | null;
  hightarget_mileage: number;
  hightarget_reward: number;
  hogaengnono_reward: number;
  lms_reward: number;
  refund_amount: number | null;
  created_at: string;
}

interface VipMember {
  id: number; name: string; title: string | null;
  assigned_to: string; consultant: string | null;
  bunyanghoe_number: string | null; meeting_result: string;
}

// 분양회 전용 채널 포함
const CHANNELS_BUNYANGHOE = ["분양회 입회비","분양회 월회비","하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];
const CHANNELS_WANPAN     = ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];
const CHANNELS_DAEHYUP    = ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"];
const TEAM = ["조계현","이세호","기여운","최연전"];

const EMPTY_FORM = {
  sales_type:"", vip_member_id:"",
  member_name:"", position:"", bunyanghoe_number:"",
  execution_amount:"", vat_yn:"여",  // 부가세 여/부
  channel:"", payment_date:"",
  team_member:"", consultant:"",
  hightarget_reward_type:"",
  refund_amount:"",
};

// ── 리워드 계산 (집행금액 기준) ──────────────────────────────
// rewardType: "마일리지10%", "마일리지5%", "마일리지15%", "리워드5%", "리워드15%" 등
function calcRewards(channel: string, amount: number, rewardType: string) {
  let hightarget_mileage = 0, hightarget_reward = 0, hogaengnono_reward = 0, lms_reward = 0;

  if (channel === "하이타겟") {
    if (rewardType === "마일리지10%") hightarget_mileage = Math.floor(amount * 0.10);
    else if (rewardType === "리워드5%") hightarget_reward = Math.floor(amount * 0.05);

  } else if (channel === "호갱노노_채널톡") {
    const base = Math.floor((amount / 150) * 200);
    if (rewardType === "마일리지5%") hightarget_mileage = Math.floor(base * 0.05);
    else hogaengnono_reward = Math.floor(base * 0.05); // 기본: 리워드5%

  } else if (channel === "호갱노노_단지마커" || channel === "호갱노노_기타") {
    if (rewardType === "마일리지5%") hightarget_mileage = Math.floor(amount * 0.05);
    else hogaengnono_reward = Math.floor(amount * 0.05); // 기본: 리워드5%

  } else if (channel === "LMS") {
    if (rewardType === "마일리지15%") hightarget_mileage = Math.floor(amount * 0.15);
    else if (rewardType === "리워드15%") lms_reward = Math.floor(amount * 0.15);
    else lms_reward = Math.floor(amount * 0.15); // 기본: 리워드15% (미선택 시)
  }

  return { hightarget_mileage, hightarget_reward, hogaengnono_reward, lms_reward };
}

function fw(n: number) {
  if (!n) return "-";
  return n.toLocaleString() + "원";
}
function fwFull(n: number) {
  if (!n) return "-";
  return n.toLocaleString() + "원";
}

function parseAmount(s: string) { return Number(s.replace(/,/g,"")) || 0; }
function formatAmt(s: string) {
  const n = s.replace(/[^0-9]/g,"");
  return n ? Number(n).toLocaleString() : "";
}


// ── 매출일보 팝업 ──────────────────────────────────
const EXEC_MEMBERS = ["조계현","이세호","기여운","최연전"];
const OPS_MEMBERS  = ["김재영","최은정"];
const OPS_EXEC_MAP: Record<string,string[]> = { "김재영":["이세호","기여운"], "최은정":["조계현","최연전"] };
const HOG_CHS = ["호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타"];

function DailyReportModal({ onClose }: { onClose: () => void }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [rData, setRData] = useState<any>(null);
  const [rLoading, setRLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const eff = (e: any): number => (e.vat_amount && e.vat_amount > 0 && e.vat_amount !== e.execution_amount) ? e.vat_amount : (e.execution_amount || 0);

  useEffect(() => { loadReport(); }, []);

  const loadReport = async () => {
    setRLoading(true);
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth()+1;
    const ms = String(m).padStart(2,"0");
    const ld = new Date(y, m, 0).getDate();
    const mS = `${y}-${ms}-01`, mE = `${y}-${ms}-${String(ld).padStart(2,"0")}`;
    const td = now.toISOString().split("T")[0];

    const kpi: any = {};
    for (const n of [...EXEC_MEMBERS, ...OPS_MEMBERS]) {
      const scope = EXEC_MEMBERS.includes(n) ? "execution" : "operation";
      const { data: k } = await supabase.from("kpi_settings").select("*")
        .eq("year",y).eq("month",m).eq("scope",scope).eq("target_name",n).maybeSingle();
      kpi[n] = k || {};
    }
    const { data: mExecs = [] } = await supabase.from("ad_executions").select("*").gte("payment_date",mS).lte("payment_date",mE);
    const me = mExecs || [];
    const te = me.filter((e:any) => e.payment_date === td);
    const { data: cts = [] } = await supabase.from("contacts")
      .select("id,assigned_to,meeting_result,contract_date,reservation_date")
      .in("meeting_result",["계약완료","예약완료"]);
    const inM = (c:any) => { const d = c.meeting_result==="계약완료"?c.contract_date:c.reservation_date; return d && d>=mS && d<=mE; };

    const s1 = EXEC_MEMBERS.map(n => {
      const tgt = kpi[n]?.linked_revenue||0;
      const act = me.filter((e:any)=>e.team_member===n&&e.channel==="하이타겟").reduce((s:number,e:any)=>s+eff(e)-(e.refund_amount||0),0);
      return { n, tgt, act, r: tgt>0?act/tgt:0 };
    });
    const s2 = EXEC_MEMBERS.map(n => {
      const tA = kpi[n]?.bunyanghoe_revenue||0, tC = kpi[n]?.recruit_count||0;
      const aA = me.filter((e:any)=>e.team_member===n&&e.contract_route==="분양회"&&(e.channel==="분양회 입회비"||e.channel==="분양회 월회비")).reduce((s:number,e:any)=>s+eff(e)-(e.refund_amount||0),0);
      const aC = (cts||[]).filter((c:any)=>c.assigned_to===n&&inM(c)).length;
      return { n, tA, tC, aA, aC, r: tA>0?aA/tA:0 };
    });
    const s3 = OPS_MEMBERS.map(n => {
      const tgt = kpi[n]?.ad_operation_revenue||0;
      const mem = OPS_EXEC_MAP[n]||[];
      const lms = me.filter((e:any)=>mem.includes(e.team_member)&&e.contract_route==="분양회"&&e.channel==="LMS").reduce((s:number,e:any)=>s+eff(e),0);
      const hog = me.filter((e:any)=>mem.includes(e.team_member)&&e.contract_route==="분양회"&&HOG_CHS.includes(e.channel)).reduce((s:number,e:any)=>s+eff(e),0);
      return { n, tgt, lms, hog, tot:lms+hog, r: tgt>0?(lms+hog)/tgt:0 };
    });
    const eT = s1.reduce((s,r)=>s+r.tgt,0)+s2.reduce((s,r)=>s+r.tA,0);
    const eA = s1.reduce((s,r)=>s+r.act,0)+s2.reduce((s,r)=>s+r.aA,0);
    const s5 = EXEC_MEMBERS.map(n => {
      const lk = me.filter((e:any)=>e.team_member===n&&e.channel==="하이타겟");
      const by = me.filter((e:any)=>e.team_member===n&&e.contract_route==="분양회"&&(e.channel==="분양회 입회비"||e.channel==="분양회 월회비"));
      const la = lk.reduce((s:number,e:any)=>s+eff(e)-(e.refund_amount||0),0);
      const ba = by.reduce((s:number,e:any)=>s+eff(e)-(e.refund_amount||0),0);
      const tt = (kpi[n]?.linked_revenue||0)+(kpi[n]?.bunyanghoe_revenue||0);
      return { n, lC:lk.length, la, bC:by.length, ba, tot:la+ba, r:tt>0?(la+ba)/tt:0 };
    });
    const s6 = EXEC_MEMBERS.map(n => {
      const lk = te.filter((e:any)=>e.team_member===n&&e.channel==="하이타겟");
      const by = te.filter((e:any)=>e.team_member===n&&e.contract_route==="분양회"&&(e.channel==="분양회 입회비"||e.channel==="분양회 월회비"));
      const la = lk.reduce((s:number,e:any)=>s+eff(e)-(e.refund_amount||0),0);
      const ba = by.reduce((s:number,e:any)=>s+eff(e)-(e.refund_amount||0),0);
      return { n, lC:lk.length, la, bC:by.length, ba, tC:lk.length+by.length, tot:la+ba };
    });
    const topM = s5.reduce((b,r)=>r.tot>b.tot?r:b,s5[0])?.n;
    const topD = s6.filter(r=>r.tot>0).reduce((b:any,r)=>(!b||r.tot>b.tot)?r:b,null as any)?.n||"";
    setRData({ td, s1, s2, s3, eT, eA, s5, s6, topM, topD });
    setRLoading(false);
  };

  const copyImage = async () => {
    if (!reportRef.current) return;
    setCopying(true);
    try {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      await new Promise<void>((ok,fail) => { s.onload=()=>ok(); s.onerror=()=>fail(); document.head.appendChild(s); });
      const cv = await (window as any).html2canvas(reportRef.current, { scale:2, backgroundColor:"#fff" });
      cv.toBlob(async (blob:any) => {
        if (!blob) { alert("이미지 생성 실패"); setCopying(false); return; }
        try { await navigator.clipboard.write([new (window as any).ClipboardItem({"image/png":blob})]); alert("이미지가 클립보드에 복사되었습니다!\n카카오톡/워크에 Ctrl+V로 붙여넣기 하세요."); }
        catch { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=u; a.download=`매출일보_${rData?.td||"today"}.png`; a.click(); URL.revokeObjectURL(u); }
        setCopying(false);
      },"image/png");
    } catch(err) { console.error(err); alert("이미지 복사 실패"); setCopying(false); }
  };

  const f = (n:number) => n?n.toLocaleString():"0";
  const fp = (n:number) => (n*100).toFixed(1)+"%";
  const th = "px-2 py-2 text-xs font-bold text-slate-600 border border-slate-200 bg-slate-100 whitespace-nowrap text-center";
  const td = "px-2 py-2 text-xs text-slate-700 border border-slate-200 text-right whitespace-nowrap";
  const tc = "px-2 py-2 text-xs text-slate-700 border border-slate-200 text-center whitespace-nowrap font-semibold";
  const rc = (r:number) => r>=1?"text-emerald-600 font-bold":r>=0.5?"text-blue-600 font-bold":"text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.5)"}} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-blue-500"/>매출일보</h3>
          <div className="flex items-center gap-2">
            <button onClick={copyImage} disabled={copying||rLoading} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{copying?"복사 중...":"📋 이미지 복사"}</button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {rLoading||!rData ? (<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
          ) : (
            <div ref={reportRef} className="bg-white p-6 space-y-5" style={{fontFamily:"'Pretendard','Noto Sans KR',sans-serif"}}>
              <div className="text-center mb-4"><p className="text-xs text-slate-400 mb-1">{rData.td}</p><h2 className="text-lg font-black text-slate-800">대외협력팀 매출일보</h2></div>
              <div><p className="text-sm font-bold text-slate-700 mb-2">  [실행파트] 자사광고 연계 매출</p><table className="w-full border-collapse"><thead><tr><th className={th}>담당자</th><th className={th}>목표</th><th className={th}>달성</th><th className={th}>달성률</th></tr></thead><tbody>{rData.s1.map((r:any)=><tr key={r.n}><td className={tc}>{r.n}</td><td className={td}>{f(r.tgt)}</td><td className={td}>{f(r.act)}</td><td className={`${td} ${rc(r.r)}`}>{fp(r.r)}</td></tr>)}<tr className="bg-slate-50 font-bold"><td className={tc}>합계</td><td className={td}>{f(rData.s1.reduce((s:number,r:any)=>s+r.tgt,0))}</td><td className={td}>{f(rData.s1.reduce((s:number,r:any)=>s+r.act,0))}</td><td className={td}>{fp(rData.s1.reduce((s:number,r:any)=>s+r.tgt,0)>0?rData.s1.reduce((s:number,r:any)=>s+r.act,0)/rData.s1.reduce((s:number,r:any)=>s+r.tgt,0):0)}</td></tr></tbody></table></div>
              <div><p className="text-sm font-bold text-slate-700 mb-2">  [실행파트] 분양회 모집 누적 매출</p><table className="w-full border-collapse"><thead><tr><th className={th}>담당자</th><th className={th}>목표</th><th className={th}>인원</th><th className={th}>달성</th><th className={th}>인원</th><th className={th}>달성률</th></tr></thead><tbody>{rData.s2.map((r:any)=><tr key={r.n}><td className={tc}>{r.n}</td><td className={td}>{f(r.tA)}</td><td className={tc}>{r.tC}인</td><td className={td}>{f(r.aA)}</td><td className={tc}>{r.aC}</td><td className={`${td} ${rc(r.r)}`}>{fp(r.r)}</td></tr>)}<tr className="bg-slate-50 font-bold"><td className={tc}>합계</td><td className={td}>{f(rData.s2.reduce((s:number,r:any)=>s+r.tA,0))}</td><td className={tc}></td><td className={td}>{f(rData.s2.reduce((s:number,r:any)=>s+r.aA,0))}</td><td className={tc}></td><td className={td}>{fp(rData.s2.reduce((s:number,r:any)=>s+r.tA,0)>0?rData.s2.reduce((s:number,r:any)=>s+r.aA,0)/rData.s2.reduce((s:number,r:any)=>s+r.tA,0):0)}</td></tr></tbody></table></div>
              <div><p className="text-sm font-bold text-slate-700 mb-2">  [운영파트] 분양회 광고 특전 매출</p><table className="w-full border-collapse"><thead><tr><th className={th}>담당자</th><th className={th}>목표</th><th className={th}>LMS</th><th className={th}>호갱노노</th><th className={th}>합산</th><th className={th}>달성률</th></tr></thead><tbody>{rData.s3.map((r:any)=><tr key={r.n}><td className={tc}>{r.n}</td><td className={td}>{f(r.tgt)}</td><td className={td}>{f(r.lms)}</td><td className={td}>{f(r.hog)}</td><td className={td+" font-semibold"}>{f(r.tot)}</td><td className={`${td} ${rc(r.r)}`}>{fp(r.r)}</td></tr>)}<tr className="bg-slate-50 font-bold"><td className={tc}>합계</td><td className={td}>{f(rData.s3.reduce((s:number,r:any)=>s+r.tgt,0))}</td><td className={td}>{f(rData.s3.reduce((s:number,r:any)=>s+r.lms,0))}</td><td className={td}>{f(rData.s3.reduce((s:number,r:any)=>s+r.hog,0))}</td><td className={td}>{f(rData.s3.reduce((s:number,r:any)=>s+r.tot,0))}</td><td className={td}>{fp(rData.s3.reduce((s:number,r:any)=>s+r.tgt,0)>0?rData.s3.reduce((s:number,r:any)=>s+r.tot,0)/rData.s3.reduce((s:number,r:any)=>s+r.tgt,0):0)}</td></tr></tbody></table></div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200"><p className="text-sm font-bold text-slate-700 mb-2">통합 매출 합계</p><div className="grid grid-cols-3 gap-3 text-center"><div><p className="text-[10px] text-slate-400">목표</p><p className="text-sm font-black text-slate-800">{f(rData.eT)}</p></div><div><p className="text-[10px] text-slate-400">달성</p><p className="text-sm font-black text-blue-600">{f(rData.eA)}</p></div><div><p className="text-[10px] text-slate-400">잔여</p><p className="text-sm font-black text-red-500">{f(rData.eT-rData.eA)}</p></div></div><div className="mt-2 text-center"><span className="text-xs text-slate-400">달성률 </span><span className="text-sm font-black text-blue-600">{fp(rData.eT>0?rData.eA/rData.eT:0)}</span></div></div>
              <div><p className="text-sm font-bold text-slate-700 mb-2">  ★ 월 누적 매출 현황 ★</p><table className="w-full border-collapse"><thead><tr><th className={th} rowSpan={2}>담당자</th><th className={th} colSpan={2}>연계 매출</th><th className={th} colSpan={2}>분양회</th><th className={th} rowSpan={2}>달성률</th><th className={th} rowSpan={2}>매출액</th></tr><tr><th className={th}>건</th><th className={th}>월 매출액</th><th className={th}>건</th><th className={th}>월 매출액</th></tr></thead><tbody>{rData.s5.map((r:any)=><tr key={r.n}><td className={tc}>{r.n===rData.topM?`👑 ${r.n}`:r.n}</td><td className={td}>{r.lC}</td><td className={td}>{f(r.la)}</td><td className={td}>{r.bC}</td><td className={td}>{f(r.ba)}</td><td className={`${td} ${rc(r.r)}`}>{fp(r.r)}</td><td className={td+" font-bold"}>{f(r.tot)}</td></tr>)}<tr className="bg-slate-50 font-bold"><td className={tc}>합계</td><td className={td}>{rData.s5.reduce((s:number,r:any)=>s+r.lC,0)}</td><td className={td}>{f(rData.s5.reduce((s:number,r:any)=>s+r.la,0))}</td><td className={td}>{rData.s5.reduce((s:number,r:any)=>s+r.bC,0)}</td><td className={td}>{f(rData.s5.reduce((s:number,r:any)=>s+r.ba,0))}</td><td className={td}>{fp(rData.eT>0?rData.eA/rData.eT:0)}</td><td className={td}>{f(rData.s5.reduce((s:number,r:any)=>s+r.tot,0))}</td></tr></tbody></table></div>
              <div><p className="text-sm font-bold text-slate-700 mb-2">  ★ 당일 개인별 매출 현황 ★</p><table className="w-full border-collapse"><thead><tr><th className={th} rowSpan={2}>담당자</th><th className={th} colSpan={2}>연계 매출</th><th className={th} colSpan={2}>분양회</th><th className={th} colSpan={2}>합계</th></tr><tr><th className={th}>건</th><th className={th}>일 매출액</th><th className={th}>건</th><th className={th}>일 매출액</th><th className={th}>건</th><th className={th}>매출액</th></tr></thead><tbody>{rData.s6.map((r:any)=><tr key={r.n}><td className={tc}>{r.n===rData.topD&&r.tot>0?`👑 ${r.n}`:r.n}</td><td className={td}>{r.lC}</td><td className={td}>{f(r.la)}</td><td className={td}>{r.bC}</td><td className={td}>{f(r.ba)}</td><td className={td}>{r.tC}</td><td className={td+" font-bold"}>{f(r.tot)}</td></tr>)}<tr className="bg-slate-50 font-bold"><td className={tc}>합계</td><td className={td}>{rData.s6.reduce((s:number,r:any)=>s+r.lC,0)}</td><td className={td}>{f(rData.s6.reduce((s:number,r:any)=>s+r.la,0))}</td><td className={td}>{rData.s6.reduce((s:number,r:any)=>s+r.bC,0)}</td><td className={td}>{f(rData.s6.reduce((s:number,r:any)=>s+r.ba,0))}</td><td className={td}>{rData.s6.reduce((s:number,r:any)=>s+r.tC,0)}</td><td className={td}>{f(rData.s6.reduce((s:number,r:any)=>s+r.tot,0))}</td></tr></tbody></table></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesPage() {
  const [executions, setExecutions]   = useState<AdExecution[]>([]);
  const [vipMembers, setVipMembers]   = useState<VipMember[]>([]);
  const [intakeMap, setIntakeMap]       = useState<Record<string,string>>({});
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editId, setEditId]           = useState<number|null>(null);
  const [form, setForm]               = useState<any>(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [salesSearch, setSalesSearch]     = useState("");
  const [filterIntake, setFilterIntake]   = useState("");
  const [filterRoute, setFilterRoute]     = useState("");
  const [filterConsultant, setFilterConsultant] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterMember, setFilterMember]   = useState("");
  const [filterStart, setFilterStart]     = useState("");
  const [filterEnd, setFilterEnd]         = useState("");
  const [filterRefund, setFilterRefund]   = useState("");
  const [filterMonth, setFilterMonth]     = useState("");
  const [vipSearch, setVipSearch]         = useState("");
  const [showDailyReport, setShowDailyReport] = useState(false);

  useEffect(() => { fetchExecutions(); }, [filterRoute, filterChannel, filterMember, filterConsultant, filterStart, filterEnd, filterRefund, filterMonth]);
  useEffect(() => { fetchVipMembers(); }, []);

  const fetchExecutions = async () => {
    setLoading(true);
    let q = supabase.from("ad_executions").select("*").order("payment_date",{ascending:false,nullsFirst:true});
    if (filterChannel === "호갱노노(전체)") {
      q = q.in("channel", ["호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타"]);
    } else if (filterChannel) {
      q = q.eq("channel", filterChannel);
    }
    if (filterRoute)   q = q.eq("contract_route", filterRoute);
    if (filterMember)  q = q.eq("team_member", filterMember);
    if (filterConsultant) q = q.eq("consultant", filterConsultant);
    if (filterStart)   q = q.gte("payment_date", filterStart);
    if (filterEnd)     q = q.lte("payment_date", filterEnd);
    if (filterRefund === "refund") q = q.not("refund_amount", "is", null);
    if (filterMonth) {
      const year = new Date().getFullYear();
      const m = filterMonth.padStart(2,"0");
      const lastDay = new Date(year, parseInt(filterMonth), 0).getDate();
      q = q.gte("payment_date", `${year}-${m}-01`).lte("payment_date", `${year}-${m}-${lastDay}`);
    }
    const { data } = await q;
    setExecutions((data as AdExecution[]) || []);

    // 유입경로 조회 (분양회 가입 고객)
    const { data: contactsIR } = await supabase.from("contacts")
      .select("name,intake_route,bunyanghoe_number")
      .in("meeting_result",["계약완료","예약완료"]);
    const iMap: Record<string,string> = {};
    (contactsIR||[]).forEach((c: any) => {
      if (c.intake_route) {
        if (c.name) iMap[c.name] = c.intake_route;
        if (c.bunyanghoe_number) iMap[`num:${c.bunyanghoe_number}`] = c.intake_route;
      }
    });
    setIntakeMap(iMap);
    setLoading(false);
  };

  const fetchVipMembers = async () => {
    const { data } = await supabase.from("contacts")
      .select("id,name,title,assigned_to,consultant,bunyanghoe_number,meeting_result")
      .in("meeting_result",["계약완료","예약완료"])
      .order("bunyanghoe_number",{ascending:true});
    setVipMembers((data as VipMember[]) || []);
  };

  const filteredVip = useMemo(() => {
    const list = !vipSearch.trim()
      ? [...vipMembers]
      : vipMembers.filter(v => v.name.includes(vipSearch.trim()));
    return list.sort((a, b) => {
      const na = parseInt(a.bunyanghoe_number?.replace(/[^0-9]/g, "") || "9999");
      const nb = parseInt(b.bunyanghoe_number?.replace(/[^0-9]/g, "") || "9999");
      return na - nb;
    });
  }, [vipMembers, vipSearch]);

  // ── 대시보드 집계 ─────────────────────────────────────────
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
  const monthEnd   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${new Date(now.getFullYear(),now.getMonth()+1,0).getDate()}`;

  const monthly = executions.filter(e => e.payment_date && e.payment_date >= monthStart && e.payment_date <= monthEnd);
  const all     = executions;

  // 실효금액: VAT 여이면 vat_amount, 부이면 execution_amount
  const effAmt  = (e: AdExecution) => (e.vat_amount && e.vat_amount !== e.execution_amount) ? (e.vat_amount||0) : (e.execution_amount||0);
  const sumEff  = (list: AdExecution[]) => list.reduce((s,e)=>s+effAmt(e),0);
  const filterCh = (list: AdExecution[], ch: string|string[]) =>
    Array.isArray(ch) ? list.filter(e=>ch.includes(e.channel)) : list.filter(e=>e.channel===ch);

  const calc = (list: AdExecution[]) => {
    const bunyanList  = list.filter(e=>e.contract_route==="분양회");
    const adBunyan    = filterCh(bunyanList, ["하이타겟","호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS"]);
    const refundTotal = list.reduce((s,e)=>s+(e.refund_amount||0),0);
    const refundBunyan = bunyanList.reduce((s,e)=>s+(e.refund_amount||0),0);
    // 채널별 환불 차감
    const refundByChannel = (ch: string) =>
      filterCh(list, ch).reduce((s,e)=>s+(e.refund_amount||0),0);

    return {
      total:     sumEff(list) - refundTotal,
      inBunyan:  sumEff(filterCh(list,"분양회 입회비")),
      monBunyan: sumEff(filterCh(list,"분양회 월회비")),
      adSpecial: sumEff(adBunyan) - refundBunyan,
      hightarget:sumEff(filterCh(list,"하이타겟")) - refundByChannel("하이타겟"),
      hogaengCh: sumEff(filterCh(list,"호갱노노_채널톡")) - refundByChannel("호갱노노_채널톡"),
      hogaengDan:sumEff(filterCh(list,"호갱노노_단지마커")) - refundByChannel("호갱노노_단지마커"),
      hogaengEtc:sumEff(filterCh(list,"호갱노노_기타")) - refundByChannel("호갱노노_기타"),
      lms:       sumEff(filterCh(list,"LMS")) - refundByChannel("LMS"),
      refund:    refundTotal,
    };
  };

  const mon = calc(monthly);
  const cum = calc(all);

  // ── VAT 계산 ──────────────────────────────────────────────
  const rawAmount  = parseAmount(form.execution_amount);
  const vatAmount  = form.vat_yn === "여" ? Math.round(rawAmount * 1.1) : rawAmount;

  // 리워드 미리보기 (집행금액 기준)
  const previewRewards = form.channel && rawAmount > 0
    ? calcRewards(form.channel, rawAmount, form.hightarget_reward_type)
    : null;

  // ── 분양회 입회자 선택 ────────────────────────────────────
  const handleVipSelect = (memberId: string) => {
    const m = vipMembers.find(v => String(v.id) === memberId);
    if (!m) return;
    setForm((p:any) => ({
      ...p, vip_member_id: memberId,
      member_name: m.name, position: m.title||"",
      bunyanghoe_number: m.bunyanghoe_number||"",
      team_member: m.assigned_to||"", consultant: m.consultant||"",
    }));
    setVipSearch("");
  };

  // ── 저장 ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.sales_type)       return alert("매출구분을 선택해주세요.");
    if (!form.member_name)      return alert("고객명을 입력해주세요.");
    if (!form.channel)          return alert("광고채널을 선택해주세요.");
    const refundAmt = form.refund_amount ? Number(form.refund_amount.replace(/,/g,"")) : 0;
    if (!rawAmount && !refundAmt) return alert("집행금액 또는 환불금액을 입력해주세요.");
    setSaving(true);
    const isRefundOnly = !rawAmount && refundAmt > 0;
    const calcBase = isRefundOnly ? refundAmt : rawAmount;
    const rawRewards = calcRewards(form.channel, calcBase, form.hightarget_reward_type);
    // 환불이면 모든 리워드/마일리지 음수
    const rewards = isRefundOnly || refundAmt > 0 ? {
      hightarget_mileage: -Math.abs(rawRewards.hightarget_mileage),
      hightarget_reward:  -Math.abs(rawRewards.hightarget_reward),
      hogaengnono_reward: -Math.abs(rawRewards.hogaengnono_reward),
      lms_reward:         -Math.abs(rawRewards.lms_reward),
    } : rawRewards;
    const payload = {
      member_name: form.member_name,
      position: form.position||null,
      execution_amount: rawAmount,
      vat_amount: vatAmount,
      channel: form.channel,
      contract_route: form.sales_type,
      bunyanghoe_number: form.bunyanghoe_number||null,
      payment_date: form.payment_date||null,
      team_member: form.team_member||null,
      consultant: form.consultant||null,
      hightarget_reward_type: form.hightarget_reward_type||null,
      refund_amount: form.refund_amount ? Number(form.refund_amount.replace(/,/g,"")) : null,
      ...rewards,
    };
    let error;
    if (editId) {
      const res = await supabase.from("ad_executions").update(payload).eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("ad_executions").insert(payload);
      error = res.error;
    }
    setSaving(false);
    if (error) {
      alert(`저장 실패: ${error.message}\n\n코드: ${error.code||"-"}\n상세: ${error.details||"-"}`);
      console.error("저장 에러:", error);
      return;
    }

    // ── 푸시 알림 발송 (신규 등록 + 환불 아닌 경우만) ──
    if (!editId && !isRefundOnly && form.member_name) {
      const name = form.member_name;
      const ch = form.channel || "";

      // 마일리지 적립 알림
      if (rewards.hightarget_mileage > 0) {
        sendPushNotification({ contactName: name, ...PUSH_TEMPLATES.mileageEarned(name, rewards.hightarget_mileage) });
      }
      // 리워드 적립 알림
      const totalRwd = (rewards.hightarget_reward || 0) + (rewards.hogaengnono_reward || 0) + (rewards.lms_reward || 0);
      if (totalRwd > 0) {
        sendPushNotification({ contactName: name, ...PUSH_TEMPLATES.rewardEarned(name, totalRwd, ch) });
      }

      // 인센티브 구간 달성 체크 (분양회 경로만)
      if (form.sales_type === "분양회") {
        try {
          const { data: contactRow } = await supabase.from("contacts").select("id,contract_date").eq("name", name).maybeSingle();
          if (contactRow?.contract_date) {
            const cDate = new Date(contactRow.contract_date + "T00:00:00");
            const now = new Date();
            let qStart = new Date(cDate);
            let qEnd = new Date(cDate); qEnd.setDate(qEnd.getDate() + 89);
            while (qEnd < now) { qStart = new Date(qEnd); qStart.setDate(qStart.getDate() + 1); qEnd = new Date(qStart); qEnd.setDate(qEnd.getDate() + 89); }
            const sStr = qStart.toISOString().split("T")[0];
            const eStr = qEnd.toISOString().split("T")[0];
            const AD_CHS = ["호갱노노_채널톡","호갱노노_단지마커","호갱노노_기타","LMS","하이타겟"];
            const { data: adRows } = await supabase.from("ad_executions").select("execution_amount").eq("member_name", name).in("channel", AD_CHS).gte("payment_date", sStr).lte("payment_date", eStr);
            const total = (adRows || []).reduce((s: number, r: any) => s + (r.execution_amount || 0), 0);
            const prevTotal = total - rawAmount;
            // 구간 달성 체크 (이전에는 미달성 → 현재 달성)
            const TIERS = [{ min: 100000000, label: "3구간 (1억)", amt: 10000000 }, { min: 70000000, label: "2구간 (7천만)", amt: 5000000 }, { min: 50000000, label: "1구간 (5천만)", amt: 3000000 }];
            for (const tier of TIERS) {
              if (total >= tier.min && prevTotal < tier.min) {
                sendPushNotification({ contactName: name, ...PUSH_TEMPLATES.incentivePaid(name, tier.amt), tag: "incentive-tier" });
                break;
              }
            }
          }
        } catch {}
      }
    }

    setShowModal(false); setEditId(null);
    setForm(EMPTY_FORM); setVipSearch("");
    fetchExecutions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("ad_executions").delete().eq("id", id);
    fetchExecutions();
  };

  const handleEdit = (e: AdExecution) => {
    setEditId(e.id);
    setForm({
      sales_type: e.contract_route||"",
      vip_member_id: "",
      member_name: e.member_name,
      position: e.position||"",
      bunyanghoe_number: e.bunyanghoe_number||"",
      execution_amount: e.execution_amount ? e.execution_amount.toLocaleString() : "",
      vat_yn: (e.vat_amount && e.vat_amount !== e.execution_amount) ? "여" : "부",
      channel: e.channel,
      payment_date: e.payment_date||"",
      team_member: e.team_member||"",
      consultant: e.consultant||"",
      hightarget_reward_type: e.hightarget_reward_type||"",
      refund_amount: e.refund_amount ? e.refund_amount.toLocaleString() : "",
    });
    setShowModal(true);
  };

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";
  const isBunyanghoe = form.sales_type === "분양회";
  const isWanpan     = form.sales_type === "완판트럭";
  const isDaehyup    = form.sales_type === "대협팀활동";
  const channels     = isBunyanghoe ? CHANNELS_BUNYANGHOE : isDaehyup ? CHANNELS_DAEHYUP : CHANNELS_WANPAN;

  // 대시보드 카드 데이터
  const dashCols = [
    { label:"총 집행금액",       mVal:mon.total,      cVal:cum.total,     color:"text-slate-800" },
    { label:"분양회 입회비",     mVal:mon.inBunyan,   cVal:cum.inBunyan,  color:"text-amber-600" },
    { label:"분양회 월회비",     mVal:mon.monBunyan,  cVal:cum.monBunyan, color:"text-amber-600" },
    { label:"광고특전 집행매출", mVal:mon.adSpecial,  cVal:cum.adSpecial, color:"text-amber-600" },
    { label:"연계매출(하이타겟)",mVal:mon.hightarget, cVal:cum.hightarget,color:"text-blue-600" },
  ];
  const channelCols = [
    { label:"하이타겟",          mVal:mon.hightarget, cVal:cum.hightarget, color:"text-blue-600" },
    { label:"호갱노노_채널톡",   mVal:mon.hogaengCh,  cVal:cum.hogaengCh,  color:"text-amber-600" },
    { label:"호갱노노_단지마커", mVal:mon.hogaengDan, cVal:cum.hogaengDan, color:"text-amber-600" },
    { label:"호갱노노_기타",     mVal:mon.hogaengEtc, cVal:cum.hogaengEtc, color:"text-amber-600" },
    { label:"LMS",               mVal:mon.lms,        cVal:cum.lms,        color:"text-purple-600" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* ── 헤더 ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              💳 통합매출관리
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">광고 집행 내역 및 리워드 현황</p>
          </div>
          <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setVipSearch(""); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 shadow-sm">
            <Plus size={14}/>매출 등록
          </button>
        </div>

        {/* ── 대시보드 ── */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"/>
            <span className="text-xs font-bold text-slate-600">당월 매출</span>
            <span className="text-xs text-slate-400">{now.getFullYear()}.{String(now.getMonth()+1).padStart(2,"0")}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {dashCols.map(({ label, mVal, cVal, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 flex flex-col">
                <p className="text-[10px] text-slate-400 mb-2 truncate font-medium">{label}</p>
                <p className={`text-sm font-bold flex-1 ${color}`}>{fw(mVal)}</p>
                <div className="border-t border-dashed border-slate-200 my-2"/>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] text-slate-400 font-semibold tracking-wider">누적</span>
                </div>
                <p className={`text-xs font-bold ${color} opacity-70`}>{fw(cVal)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 검색 + 필터 */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="넘버링, 고객명, 직급 검색..." value={salesSearch}
              onChange={e=>setSalesSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"/>
          </div>
          <select value={filterIntake} onChange={e=>setFilterIntake(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none">
            <option value="">유입구분</option>
            <option value="영업부토스TM">영업부토스TM</option>
            <option value="신규고객TM">신규고객TM</option>
            <option value="기고객TM">기고객TM</option>
            <option value="완판트럭">완판트럭</option>
            <option value="대협팀활동">대협팀활동</option>
          </select>
          <select value={filterRoute} onChange={e=>setFilterRoute(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none">
            <option value="">매출구분</option>
            <option value="분양회">분양회</option>
            <option value="완판트럭">완판트럭</option>
            <option value="대협팀활동">대협팀활동</option>
          </select>
          <select value={filterChannel} onChange={e=>setFilterChannel(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none">
            <option value="">광고채널</option>
            <option value="분양회 입회비">분양회 입회비</option>
            <option value="분양회 월회비">분양회 월회비</option>
            <option value="하이타겟">하이타겟</option>
            <option value="호갱노노(전체)">호갱노노(전체)</option>
            <option value="호갱노노_채널톡">호갱노노_채널톡</option>
            <option value="호갱노노_단지마커">호갱노노_단지마커</option>
            <option value="호갱노노_기타">호갱노노_기타</option>
            <option value="LMS">LMS</option>
          </select>
          <select value={filterMember} onChange={e=>setFilterMember(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none">
            <option value="">대협팀담당자</option>
            {TEAM.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterConsultant} onChange={e=>setFilterConsultant(e.target.value)} className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none">
            <option value="">담당컨설턴트</option>
            {["박경화","박혜은","조승현","박민경","백선중","강아름","전정훈","박나라"].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterMonth} onChange={e=>{ setFilterMonth(e.target.value); setFilterStart(""); setFilterEnd(""); }}
            className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none">
            <option value="">전체월</option>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <option key={m} value={String(m)}>{m}월</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">기간</span>
            <input type="date" value={filterStart} onChange={e=>{ setFilterStart(e.target.value); setFilterMonth(""); }}
              className="text-xs text-slate-600 bg-transparent outline-none"/>
            <span className="text-slate-300 text-xs">—</span>
            <input type="date" value={filterEnd} onChange={e=>{ setFilterEnd(e.target.value); setFilterMonth(""); }}
              className="text-xs text-slate-600 bg-transparent outline-none"/>
            {(filterStart||filterEnd) && (
              <button onClick={()=>{setFilterStart("");setFilterEnd("");}}
                className="text-slate-400 hover:text-red-400 text-xs ml-1">✕</button>
            )}
          </div>
          <button
            onClick={()=>{
              setSalesSearch(""); setFilterIntake(""); setFilterRoute(""); setFilterChannel(""); setFilterMember(""); setFilterConsultant("");
              setFilterStart(""); setFilterEnd(""); setFilterRefund(""); setFilterMonth("");
            }}
            className={`text-xs px-2.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors ${(salesSearch||filterIntake||filterRoute||filterChannel||filterMember||filterConsultant||filterMonth||filterStart||filterEnd) ? "bg-red-500 text-white border border-red-500" : "text-red-400 border border-red-200 hover:bg-red-50"}`}>
            ↺ 초기화
          </button>
          <button onClick={()=>{
            const rows = executions.filter(e => {
              const matchSearch = !salesSearch || (e.member_name&&e.member_name.includes(salesSearch)) || (e.position&&e.position.includes(salesSearch)) || ((e as any).bunyanghoe_number&&(e as any).bunyanghoe_number.includes(salesSearch));
              return matchSearch;
            }).map((e: any) => ({
              "유입구분": intakeMap[e.member_name]||"",
              "매출구분": e.contract_route||"",
              "넘버링": e.bunyanghoe_number||"",
              "고객명": e.member_name||"",
              "직급": e.position||"",
              "집행금액": e.execution_amount||0,
              "VAT포함": e.vat_amount||0,
              "환불금액": e.refund_amount||0,
              "광고채널": e.channel||"",
              "결제일/등록일": e.payment_date||"",
              "대협팀": e.team_member||"",
              "컨설턴트": e.consultant||"",
              "하이타겟마일리지": e.hightarget_mileage||0,
              "하이타겟리워드": e.hightarget_reward||0,
              "호갱노노리워드": e.hogaengnono_reward||0,
              "LMS리워드": e.lms_reward||0,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            // 금액 컬럼 서식
            const range = XLSX.utils.decode_range(ws["!ref"]||"A1");
            for(let R=range.s.r+1;R<=range.e.r;R++){
              for(const C of [5,6,7,12,13,14,15]){
                const addr=XLSX.utils.encode_cell({r:R,c:C});
                if(ws[addr]&&typeof ws[addr].v==="number") ws[addr].z="#,##0";
              }
            }
            const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"매출데이터");
            XLSX.writeFile(wb,"통합매출_데이터.xls");
          }} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 whitespace-nowrap">
            <FileText size={13}/> 데이터다운(XLS)
          </button>
        </div>
      </div>

      {/* ── 테이블 ── */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <TrendingUp size={40} className="mb-3 opacity-30"/>
            <p className="text-sm">집행 내역이 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto" style={{maxHeight:"calc(100vh - 380px)"}}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                <tr>
                  {["유입구분","매출구분","넘버링","고객명","직급","집행금액","VAT포함","환불금액","광고채널","결제일/환불일","대협팀","컨설턴트","하이타겟마일리지","하이타겟리워드","호갱노노리워드","LMS리워드",""].map(h=>(
                    <th key={h} className="text-center px-3 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {executions.filter(e => {
                  const matchSearch = !salesSearch || 
                    (e.member_name&&e.member_name.includes(salesSearch)) || 
                    (e.position&&e.position.includes(salesSearch)) ||
                    ((e as any).bunyanghoe_number&&(e as any).bunyanghoe_number.includes(salesSearch));
                  const ir = intakeMap[e.member_name] || ((e as any).bunyanghoe_number ? intakeMap[`num:${(e as any).bunyanghoe_number}`] : "") || "";
                  const matchIntake = !filterIntake || ir === filterIntake;
                  return matchSearch && matchIntake;
                }).map(e=>(
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-center">
                      {e.contract_route==="분양회" ? (() => {
                        const ir = intakeMap[e.member_name] || (e.bunyanghoe_number ? intakeMap[`num:${e.bunyanghoe_number}`] : "") || "";
                        return ir ? <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${ir.includes("TM")?"bg-blue-100 text-blue-700":ir==="완판트럭"?"bg-emerald-100 text-emerald-700":"bg-violet-100 text-violet-700"}`}>{ir}</span> : <span className="text-xs text-slate-300">-</span>;
                      })() : <span className="text-xs text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${e.contract_route==="분양회"?"bg-amber-50 text-amber-700 border-amber-100":e.contract_route==="완판트럭"?"bg-emerald-50 text-emerald-700 border-emerald-100":e.contract_route==="대협팀활동"?"bg-blue-50 text-blue-700 border-blue-100":"bg-slate-50 text-slate-500 border-slate-100"}`}>
                        {e.contract_route||"-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-amber-600 text-center">{(e as any).bunyanghoe_number ? ((e as any).bunyanghoe_number.startsWith("B-") ? (e as any).bunyanghoe_number : `B-${(e as any).bunyanghoe_number}`) : "-"}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 text-xs text-center">{e.member_name}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs text-center">{e.position||"-"}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800 text-xs text-center">{fwFull(e.execution_amount)}</td>
                    <td className="px-3 py-2.5 text-xs text-center">
                      {e.vat_amount && e.vat_amount !== e.execution_amount
                        ? <span className="font-bold text-blue-600">{fwFull(e.vat_amount)}</span>
                        : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center">
                      {(e as any).refund_amount
                        ? <span className="font-bold text-red-500">-{((e as any).refund_amount).toLocaleString()}원</span>
                        : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{e.channel}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs text-center">
                      {e.payment_date ? new Date(e.payment_date).toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"}) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-center"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">{e.team_member||"-"}</span></td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs text-center">{e.consultant||"-"}</td>
                    <td className="px-3 py-2.5 font-medium text-xs text-center">
                      <span className={e.hightarget_mileage < 0 ? "text-red-500" : "text-blue-600"}>
                        {e.hightarget_mileage ? fw(e.hightarget_mileage) : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-xs text-center">
                      <span className={e.hightarget_reward < 0 ? "text-red-500" : "text-amber-600"}>
                        {e.hightarget_reward ? fw(e.hightarget_reward) : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-xs text-center">
                      <span className={e.hogaengnono_reward < 0 ? "text-red-500" : "text-amber-600"}>
                        {e.hogaengnono_reward ? fw(e.hogaengnono_reward) : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-xs text-center">
                      <span className={e.lms_reward < 0 ? "text-red-500" : "text-amber-600"}>
                        {e.lms_reward ? fw(e.lms_reward) : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 flex items-center gap-1 text-center">
                      <button onClick={()=>handleEdit(e)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1">
                        <Edit2 size={11}/>수정
                      </button>
                      <button onClick={()=>handleDelete(e.id)} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>



      {/* ── 매출집행등록 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editId ? "매출 수정" : "매출집행등록"}</h2>
              <button onClick={()=>{setShowModal(false);setEditId(null);}} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">

              {/* ① 매출구분 */}
              <div>
                <label className={lbl}>매출구분 *</label>
                <div className="flex gap-2">
                  {["분양회","완판트럭","대협팀활동"].map(t=>(
                    <button key={t} onClick={()=>setForm({...EMPTY_FORM, sales_type:t, vat_yn:"여"})}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-all ${
                        form.sales_type===t
                          ? t==="분양회"    ? "bg-amber-50 border-amber-400 text-amber-700"
                          : t==="완판트럭"  ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                                           : "bg-blue-50 border-blue-400 text-blue-700"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* 분양회 */}
              {isBunyanghoe && (
                <>
                  <div>
                    <label className={lbl}>분양회 입회자 선택 *</label>
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
                        placeholder="이름으로 검색..." value={vipSearch} onChange={e=>setVipSearch(e.target.value)}/>
                    </div>
                    <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-slate-50">
                      {filteredVip.length===0
                        ? <div className="text-center py-4 text-xs text-slate-400">검색 결과 없음</div>
                        : filteredVip.map(v=>(
                          <button key={v.id} onClick={()=>handleVipSelect(String(v.id))}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors ${form.vip_member_id===String(v.id)?"bg-blue-50":""}`}>
                            <span className="text-xs font-bold text-amber-600 min-w-[48px]">{v.bunyanghoe_number ? (v.bunyanghoe_number.startsWith("B-") ? v.bunyanghoe_number : `B-${v.bunyanghoe_number}`) : "미부여"}</span>
                            <span className="font-semibold text-slate-800">{v.name}</span>
                            <span className="text-xs text-slate-400">{v.title||""}</span>
                            <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${v.meeting_result==="계약완료"?"bg-emerald-100 text-emerald-700":"bg-blue-100 text-blue-700"}`}>{v.meeting_result}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {form.vip_member_id && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-2">선택된 분양회 회원</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-slate-400">넘버링</span><p className="font-bold text-amber-600">{form.bunyanghoe_number ? (form.bunyanghoe_number.startsWith("B-") ? form.bunyanghoe_number : `B-${form.bunyanghoe_number}`) : "-"}</p></div>
                        <div><span className="text-slate-400">고객명</span><p className="font-bold text-slate-800">{form.member_name}</p></div>
                        <div><span className="text-slate-400">직급</span><p className="font-bold text-slate-800">{form.position||"-"}</p></div>
                        <div><span className="text-slate-400">대협팀 담당</span><p className="font-bold text-slate-800">{form.team_member||"-"}</p></div>
                        <div><span className="text-slate-400">담당 컨설턴트</span><p className="font-bold text-slate-800">{form.consultant||"-"}</p></div>
                      </div>
                    </div>
                  )}

                  {/* 집행금액 + VAT */}
                  <div>
                    <label className={lbl}>집행금액 *</label>
                    <input className={inp} value={form.execution_amount}
                      onChange={e=>setForm({...form, execution_amount:formatAmt(e.target.value)})}
                      placeholder="5,000,000"/>
                    {rawAmount > 0 && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-semibold">부가세</span>
                        {["여","부"].map(v=>(
                          <button key={v} onClick={()=>setForm({...form,vat_yn:v})}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg border-2 transition-all ${
                              form.vat_yn===v
                                ? v==="여" ? "bg-blue-50 border-blue-400 text-blue-700"
                                           : "bg-slate-100 border-slate-400 text-slate-700"
                                : "bg-white border-slate-200 text-slate-400"
                            }`}>{v}</button>
                        ))}
                        <span className="text-xs text-slate-400 ml-1">
                          VAT포함금액: <span className="font-bold text-blue-600">{vatAmount.toLocaleString()}원</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 환불금액 */}
                  <div>
                    <label className={lbl}>환불금액</label>
                    <input className={inp} value={form.refund_amount}
                      onChange={e=>setForm({...form,refund_amount:formatAmt(e.target.value)})}
                      placeholder="환불 시 입력"/>
                  </div>

                  {/* 광고채널 + 하이타겟 옵션 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>광고채널 *</label>
                      <select className={inp} value={form.channel} onChange={e=>setForm({...form,channel:e.target.value,hightarget_reward_type:""})}>
                        <option value="">선택</option>
                        {channels.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {form.channel==="하이타겟" && (
                      <div>
                        <label className={lbl}>마일리지/리워드</label>
                        <select className={inp} value={form.hightarget_reward_type} onChange={e=>setForm({...form,hightarget_reward_type:e.target.value})}>
                          <option value="">선택</option>
                          <option value="마일리지10%">마일리지 10%</option>
                          <option value="리워드5%">리워드 5%</option>
                        </select>
                      </div>
                    )}
                    {(form.channel==="호갱노노_채널톡"||form.channel==="호갱노노_단지마커"||form.channel==="호갱노노_기타") && (
                      <div>
                        <label className={lbl}>마일리지/리워드</label>
                        <select className={inp} value={form.hightarget_reward_type} onChange={e=>setForm({...form,hightarget_reward_type:e.target.value})}>
                          <option value="">선택</option>
                          <option value="마일리지5%">하이타겟 마일리지 5%</option>
                          <option value="리워드5%">리워드 5%</option>
                        </select>
                      </div>
                    )}
                    {form.channel==="LMS" && (
                      <div>
                        <label className={lbl}>마일리지/리워드</label>
                        <select className={inp} value={form.hightarget_reward_type} onChange={e=>setForm({...form,hightarget_reward_type:e.target.value})}>
                          <option value="">선택</option>
                          <option value="마일리지15%">하이타겟 마일리지 15%</option>
                          <option value="리워드15%">리워드 15%</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={lbl}>{form.refund_amount ? "환불일" : "결제일"}</label>
                      <input type="date" className={inp} value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/>
                    </div>
                  </div>
                </>
              )}

              {/* 완판트럭 */}
              {isWanpan && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>고객명 *</label><input className={inp} value={form.member_name} onChange={e=>setForm({...form,member_name:e.target.value})} placeholder="홍길동"/></div>
                  <div><label className={lbl}>직급</label><input className={inp} value={form.position} onChange={e=>setForm({...form,position:e.target.value})} placeholder="본부장"/></div>
                  <div>
                    <label className={lbl}>집행금액 *</label>
                    <input className={inp} value={form.execution_amount}
                      onChange={e=>setForm({...form,execution_amount:formatAmt(e.target.value)})}
                      placeholder="5,000,000"/>
                    {rawAmount > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">부가세</span>
                        {["여","부"].map(v=>(
                          <button key={v} onClick={()=>setForm({...form,vat_yn:v})}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all ${form.vat_yn===v ? v==="여"?"bg-blue-50 border-blue-400 text-blue-700":"bg-slate-100 border-slate-400 text-slate-700":"bg-white border-slate-200 text-slate-400"}`}>{v}</button>
                        ))}
                        <span className="text-xs text-blue-600 font-bold">{vatAmount.toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={lbl}>광고채널 *</label>
                    <select className={inp} value={form.channel} onChange={e=>setForm({...form,channel:e.target.value,hightarget_reward_type:""})}>
                      <option value="">선택</option>
                      {channels.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>환불금액</label>
                    <input className={inp} value={form.refund_amount}
                      onChange={e=>setForm({...form,refund_amount:formatAmt(e.target.value)})}
                      placeholder="환불 시 입력"/>
                  </div>
                  <div><label className={lbl}>{form.refund_amount ? "환불일" : "결제일"}</label><input type="date" className={inp} value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/></div>
                  <div>
                    <label className={lbl}>대협팀 담당자</label>
                    <select className={inp} value={form.team_member} onChange={e=>setForm({...form,team_member:e.target.value})}>
                      <option value="">선택</option>{TEAM.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>담당컨설턴트</label>
                    <select className={inp} value={form.consultant} onChange={e=>setForm({...form,consultant:e.target.value})}>
                      <option value="">선택</option>
                      {["박경화","박혜은","조승현","박민경","백선중","강아름","전정훈","박나라"].map(c=><option key={c} value={c}>{c}</option>)}
                    </select></div>
                </div>
              )}

              {/* 대협팀활동 — 완판트럭과 동일 구성, 리워드 없음 */}
              {isDaehyup && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>고객명 *</label><input className={inp} value={form.member_name} onChange={e=>setForm({...form,member_name:e.target.value})} placeholder="홍길동"/></div>
                  <div><label className={lbl}>직급</label><input className={inp} value={form.position} onChange={e=>setForm({...form,position:e.target.value})} placeholder="본부장"/></div>
                  <div>
                    <label className={lbl}>집행금액 *</label>
                    <input className={inp} value={form.execution_amount}
                      onChange={e=>setForm({...form,execution_amount:formatAmt(e.target.value)})}
                      placeholder="5,000,000"/>
                    {rawAmount > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold">부가세</span>
                        {["여","부"].map(v=>(
                          <button key={v} onClick={()=>setForm({...form,vat_yn:v})}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border-2 transition-all ${form.vat_yn===v ? v==="여"?"bg-blue-50 border-blue-400 text-blue-700":"bg-slate-100 border-slate-400 text-slate-700":"bg-white border-slate-200 text-slate-400"}`}>{v}</button>
                        ))}
                        <span className="text-xs text-blue-600 font-bold">{vatAmount.toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={lbl}>광고채널 *</label>
                    <select className={inp} value={form.channel} onChange={e=>setForm({...form,channel:e.target.value,hightarget_reward_type:""})}>
                      <option value="">선택</option>
                      {channels.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>환불금액</label>
                    <input className={inp} value={form.refund_amount}
                      onChange={e=>setForm({...form,refund_amount:formatAmt(e.target.value)})}
                      placeholder="환불 시 입력"/>
                  </div>
                  <div><label className={lbl}>{form.refund_amount ? "환불일" : "결제일"}</label><input type="date" className={inp} value={form.payment_date} onChange={e=>setForm({...form,payment_date:e.target.value})}/></div>
                  <div>
                    <label className={lbl}>대협팀 담당자</label>
                    <select className={inp} value={form.team_member} onChange={e=>setForm({...form,team_member:e.target.value})}>
                      <option value="">선택</option>{TEAM.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>담당컨설턴트</label>
                    <select className={inp} value={form.consultant} onChange={e=>setForm({...form,consultant:e.target.value})}>
                      <option value="">선택</option>
                      {["박경화","박혜은","조승현","박민경","백선중","강아름","전정훈","박나라"].map(c=><option key={c} value={c}>{c}</option>)}
                    </select></div>
                  <div className="col-span-2">
                    <label className={lbl}>환불금액</label>
                    <input className={inp} value={form.refund_amount}
                      onChange={e=>setForm({...form,refund_amount:formatAmt(e.target.value)})}
                      placeholder="환불 시 입력"/>
                  </div>
                </div>
              )}

              {/* 리워드 미리보기 */}
              {previewRewards && form.sales_type && Object.values(previewRewards).some(v=>v>0) && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-2">자동 계산 리워드 (집행금액 기준)</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    {previewRewards.hightarget_mileage>0 && <div className="flex justify-between"><span>하이타겟 마일리지</span><span className="font-bold text-blue-600">{fw(previewRewards.hightarget_mileage)}</span></div>}
                    {previewRewards.hightarget_reward>0  && <div className="flex justify-between"><span>하이타겟 리워드</span><span className="font-bold text-amber-600">{fw(previewRewards.hightarget_reward)}</span></div>}
                    {previewRewards.hogaengnono_reward>0 && <div className="flex justify-between"><span>호갱노노 리워드</span><span className="font-bold text-amber-600">{fw(previewRewards.hogaengnono_reward)}</span></div>}
                    {previewRewards.lms_reward>0         && <div className="flex justify-between"><span>LMS 리워드</span><span className="font-bold text-amber-600">{fw(previewRewards.lms_reward)}</span></div>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={()=>{setShowModal(false);setEditId(null);}} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleSave} disabled={saving||!form.sales_type}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-40">
                <Save size={13}/>{saving?"저장 중...":editId?"수정":"저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
