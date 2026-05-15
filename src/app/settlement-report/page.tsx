"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import ExcelJS from "exceljs";

// 주차 계산: 일요일~토요일 기준
function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear(), month = d.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstSat = new Date(year, month, 1);
  // 첫 번째 토요일 찾기
  while (firstSat.getDay() !== 6) firstSat.setDate(firstSat.getDate() + 1);
  if (d <= firstSat) return 1;
  // 2주차부터: 첫 번째 일요일 기준
  const firstSun = new Date(firstSat);
  firstSun.setDate(firstSat.getDate() + 1);
  const diff = Math.floor((d.getTime() - firstSun.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return diff + 2;
}

function getWeekRanges(year: number, month: number): { week: number; start: string; end: string }[] {
  const weeks: { week: number; start: string; end: string }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1);
  const firstSat = new Date(year, month - 1, 1);
  while (firstSat.getDay() !== 6) firstSat.setDate(firstSat.getDate() + 1);
  const firstSatDate = Math.min(firstSat.getDate(), daysInMonth);
  weeks.push({ week: 1, start: `${year}-${String(month).padStart(2,"0")}-01`, end: `${year}-${String(month).padStart(2,"0")}-${String(firstSatDate).padStart(2,"0")}` });
  let sunDate = firstSatDate + 1;
  let wk = 2;
  while (sunDate <= daysInMonth) {
    const endDate = Math.min(sunDate + 6, daysInMonth);
    weeks.push({ week: wk, start: `${year}-${String(month).padStart(2,"0")}-${String(sunDate).padStart(2,"0")}`, end: `${year}-${String(month).padStart(2,"0")}-${String(endDate).padStart(2,"0")}` });
    sunDate += 7; wk++;
  }
  return weeks;
}

const OPS_MAP: Record<string, string> = { "이세호": "김재영", "기여운": "김재영", "조계현": "최은정", "최연전": "최은정" };
const HOG_CHS = ["호갱노노_채널톡", "호갱노노_단지마커", "호갱노노_기타"];
const fmt = (n: number) => n.toLocaleString() + "원";
const fmtMan = (n: number) => Math.round(n / 10000) > 0 ? Math.round(n / 10000).toLocaleString() + "만" : fmt(n);

export default function SettlementReport() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [allExecs, setAllExecs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selMonth, setSelMonth] = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; });

  const year = parseInt(selMonth.split("-")[0]);
  const month = parseInt(selMonth.split("-")[1]);
  const monthLabel = `${month}월`;
  const mStart = `${selMonth}-01`;
  const mEnd = `${selMonth}-${String(new Date(year, month, 0).getDate()).padStart(2,"0")}`;
  const weeks = getWeekRanges(year, month);

  useEffect(() => { const u = getCurrentUser(); setUser(u); }, []);
  useEffect(() => { if (user) loadData(); }, [user, selMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from("ad_executions").select("*").gte("payment_date", mStart).lte("payment_date", mEnd),
        supabase.from("contacts").select("id,name,title,bunyanghoe_number,meeting_result,assigned_to,contract_date,reservation_date").in("meeting_result", ["계약완료", "예약완료"]),
        supabase.from("ad_executions").select("id,member_name,channel,payment_date,execution_amount,vat_amount,refund_amount").eq("channel", "분양회 월회비"),
        supabase.from("wanpan_trucks").select("*").gte("dispatch_date", mStart).lte("dispatch_date", mEnd).order("dispatch_date"),
      ]);
      setData(r1.data || []);
      setContacts(r2.data || []);
      setAllExecs(r3.data || []);
      setTrucks(r4.data || []);
    } finally { setLoading(false); }
  };

  const eff = (e: any) => (e.vat_amount && e.vat_amount !== e.execution_amount) ? e.vat_amount : (e.execution_amount || 0);

  // ═══ 1. 광고연계매출-분양회 (하이타겟만) ═══
  const bunyanghoeHT = data.filter(e => e.contract_route === "분양회" && e.channel === "하이타겟" && (e.refund_amount || 0) === 0);
  const bunyanghoeRows = bunyanghoeHT.map(e => ({
    week: `${month}월${getWeekNumber(e.payment_date)}주차`,
    weekNum: getWeekNumber(e.payment_date),
    amount: eff(e),
    teamMember: e.team_member || "-",
    consultant: e.consultant || "-",
    customer: `${e.member_name || "-"} ${e.position || ""}`.trim(),
  })).sort((a, b) => a.weekNum - b.weekNum);

  // ═══ 2. 광고연계매출-완판트럭 (하이타겟만) ═══
  const wanpanHT = data.filter(e => e.contract_route === "완판트럭" && e.channel === "하이타겟" && (e.refund_amount || 0) === 0);
  const wanpanRows = wanpanHT.map(e => ({
    week: `${month}월${getWeekNumber(e.payment_date)}주차`,
    weekNum: getWeekNumber(e.payment_date),
    amount: eff(e),
    teamMember: e.team_member || "-",
    consultant: e.consultant || "-",
  })).sort((a, b) => a.weekNum - b.weekNum);

  // ═══ 3. 광고연계매출-환불내역 ═══
  const refunds = data.filter(e => e.channel === "하이타겟" && (e.refund_amount || 0) > 0);
  const refundRows = refunds.map(e => ({
    week: `${month}월${getWeekNumber(e.payment_date)}주차`,
    weekNum: getWeekNumber(e.payment_date),
    amount: e.refund_amount || 0,
    teamMember: e.team_member || "-",
  })).sort((a, b) => a.weekNum - b.weekNum);
  const totalRefund = refundRows.reduce((s, r) => s + r.amount, 0);

  // ═══ 4. 주차별마감 ═══
  const allHT = data.filter(e => e.channel === "하이타겟");
  const weeklyTotals = weeks.map(w => {
    const weekData = allHT.filter(e => e.payment_date >= w.start && e.payment_date <= w.end);
    const sales = weekData.filter(e => (e.refund_amount || 0) === 0).reduce((s, e) => s + eff(e), 0);
    return { label: `${month}월${w.week}주`, amount: sales };
  });
  const totalHTSales = weeklyTotals.reduce((s, w) => s + w.amount, 0);
  const totalHTClose = totalHTSales - totalRefund;

  // ═══ 5. 광고특전매출 (LMS + 호갱노노) ═══
  const specialSales = data.filter(e => (e.channel === "LMS" || HOG_CHS.includes(e.channel)) && (e.refund_amount || 0) === 0);
  const specialRows = specialSales.map(e => ({
    week: `${month}월${getWeekNumber(e.payment_date)}주차`,
    weekNum: getWeekNumber(e.payment_date),
    product: e.channel === "LMS" ? "LMS" : "호갱노노",
    amount: eff(e),
    customer: `${e.member_name || "-"} ${e.position || ""}`.trim(),
    teamMember: e.team_member || "-",
    consultant: e.consultant || "-",
    opsMember: OPS_MAP[e.team_member || ""] || "-",
  })).sort((a, b) => a.weekNum - b.weekNum);

  // ═══ 6. 매출 트랙별 마감 ═══
  const allAdSales = data.filter(e => ["하이타겟", "LMS", ...HOG_CHS].includes(e.channel));
  const track1Total = allAdSales.reduce((s, e) => s + eff(e) - (e.refund_amount || 0), 0);
  const track1Target = 170000000;
  const track2Count = data.filter(e => e.channel === "분양회 월회비" && (e.refund_amount || 0) === 0).length;
  const track2Target = 25;
  const track3Total = data.filter(e => e.channel === "하이타겟" && (e.refund_amount || 0) === 0).reduce((s, e) => s + eff(e), 0);
  const track3Target = 110000000;

  const th = "px-3 py-2.5 text-center text-xs font-bold border-b-2 border-[var(--border)]";
  const td = "px-3 py-2 text-xs border-b border-[var(--border)] text-center";

  // MD 파일 다운로드
  const downloadMD = () => {
    let md = `# 대외협력팀 ${year}년 ${monthLabel} 결산보고서 데이터\n\n`;
    md += `> 아래 데이터는 광고인㈜ 대외협력팀 CRM에서 자동 추출된 ${year}년 ${month}월 결산 데이터입니다.\n`;
    md += `> 이 데이터를 기반으로 매출 분석, 트렌드 파악, 개선점 도출 등을 요청할 수 있습니다.\n\n`;
    md += `---\n\n## 기본 정보\n- 보고 기간: ${mStart} ~ ${mEnd}\n- 발행일: ${new Date().toLocaleDateString("ko-KR")}\n- 실행파트: 조계현, 이세호, 기여운, 최연전\n- 운영파트: 김재영(목표 4,000만), 최은정(목표 2,000만)\n\n`;

    md += `---\n\n## PART 1. 광고연계매출\n\n### 1-1. 분양회 연계매출 (하이타겟)\n\n`;
    bunyanghoeRows.forEach(r => { md += `- ${r.week} | ${fmtMan(r.amount)} | 담당: ${r.teamMember} | 컨설턴트: ${r.consultant} | 고객: ${r.customer}\n`; });
    md += `- **소계: ${fmt(bunyanghoeRows.reduce((s,r)=>s+r.amount,0))} (${bunyanghoeRows.length}건)**\n`;

    const dh2 = data.filter(e => e.contract_route==="대협팀활동" && e.channel==="하이타겟" && (e.refund_amount||0)===0);
    md += `\n### 1-2. 대협팀활동 연계매출 (하이타겟)\n\n`;
    dh2.forEach(e => { md += `- ${month}월${getWeekNumber(e.payment_date)}주차 | ${fmtMan(eff(e))} | 담당: ${e.team_member||"-"} | 컨설턴트: ${e.consultant||"-"} | 고객: ${e.member_name||"-"} ${e.position||""}\n`; });
    md += `- **소계: ${fmt(dh2.reduce((s,e)=>s+eff(e),0))} (${dh2.length}건)**\n`;

    md += `\n### 1-3. 완판트럭 연계매출 (하이타겟)\n\n`;
    wanpanRows.forEach(r => { md += `- ${r.week} | ${fmtMan(r.amount)} | 담당: ${r.teamMember} | 컨설턴트: ${r.consultant}\n`; });
    md += `- **소계: ${fmt(wanpanRows.reduce((s,r)=>s+r.amount,0))} (${wanpanRows.length}건)**\n`;

    md += `\n### 1-4. 환불내역 (하이타겟)\n\n`;
    refundRows.forEach(r => { md += `- ${r.week} | -${fmtMan(r.amount)} | 담당: ${r.teamMember}\n`; });
    md += `- **환불 합계: -${fmt(totalRefund)} (${refundRows.length}건)**\n`;

    md += `\n### 1-5. 하이타겟 주차별 마감\n\n`;
    weeklyTotals.forEach(w => { md += `- ${w.label}: ${w.amount>0?fmt(w.amount):"0원"}\n`; });
    md += `- 환불: -${fmt(totalRefund)}\n- **${monthLabel} 마감 총액: ${fmt(totalHTClose)}**\n`;

    md += `\n### 1-6. 광고특전매출 (LMS+호갱노노, 운영파트 귀속)\n\n`;
    specialRows.forEach(r => { md += `- ${r.week} | ${r.product} | ${fmtMan(r.amount)} | 광고주: ${r.customer} | 담당: ${r.teamMember} | 컨설턴트: ${r.consultant} | 운영파트: ${r.opsMember}\n`; });
    md += `- **소계: ${fmt(specialRows.reduce((s,r)=>s+r.amount,0))} (${specialRows.length}건)**\n`;

    md += `\n### 1-7. 매출 트랙별 ${monthLabel} 마감\n\n`;
    md += `- 광고연계매출: 목표 ${fmt(track1Target)} → 현재 ${fmt(track1Total)} (${(track1Target>0?track1Total/track1Target*100:0).toFixed(1)}%) [실행파트]\n`;
    md += `- 분양회 결제: 목표 ${track2Target}건 → 현재 ${track2Count}건 (${(track2Target>0?track2Count/track2Target*100:0).toFixed(1)}%) [실행파트]\n`;
    md += `- 광고특전매출: 목표 ${fmt(track3Target)} → 현재 ${fmt(track3Total)} (${(track3Target>0?track3Total/track3Target*100:0).toFixed(1)}%) [운영파트]\n`;

    md += `\n---\n\n## PART 2. 분양회\n\n### 전체 회원 현황 (${contacts.length}명)\n\n`;
    const mf2 = allExecs.filter((e:any)=>(e.refund_amount||0)===0);
    contacts.sort((a:any,b:any)=>{const na=parseInt((a.bunyanghoe_number||"").replace(/[^0-9]/g,""))||0;const nb=parseInt((b.bunyanghoe_number||"").replace(/[^0-9]/g,""))||0;return na-nb;}).forEach((c:any)=>{
      const num=parseInt((c.bunyanghoe_number||"").replace(/[^0-9]/g,""))||0;
      const jd=c.contract_date||c.reservation_date||"-";
      const pays=mf2.filter((e:any)=>e.member_name===c.name).sort((a:any,b:any)=>(a.payment_date||"").localeCompare(b.payment_date||""));
      const thisMo=pays.find((e:any)=>e.payment_date>=mStart&&e.payment_date<=mEnd);
      md+=`- B-${num} ${c.name} ${c.title||""} | 가입: ${jd} | 담당: ${c.assigned_to||"-"} | 결제이력: ${pays.length}회 | 당월: ${thisMo?thisMo.payment_date:"미결제"}\n`;
    });

    md += `\n### 담당자별 ${monthLabel} 목표 vs 실적\n\n`;
    const TG:Record<string,{c:number;a:number}>={"조계현":{c:9,a:4950000},"이세호":{c:8,a:4400000},"기여운":{c:14,a:7700000},"최연전":{c:9,a:4950000}};
    const mfm=mf2.filter((e:any)=>e.payment_date>=mStart&&e.payment_date<=mEnd);
    ["조계현","이세호","기여운","최연전"].forEach(n=>{
      const mc=contacts.filter((c:any)=>c.assigned_to===n);
      const pd=mfm.filter((e:any)=>mc.some((c:any)=>c.name===e.member_name));
      const t=TG[n]||{c:0,a:0};
      md+=`- ${n}: 가입 ${mc.length}명 | 결제목표 ${t.c}건→완료 ${pd.length}건(${(t.c>0?pd.length/t.c*100:0).toFixed(1)}%) | 매출목표 ${fmtMan(t.a)}→실적 ${fmt(pd.reduce((s:number,e:any)=>s+eff(e),0))}\n`;
    });

    md += `\n---\n\n## PART 3. 완판트럭\n\n`;
    trucks.sort((a:any,b:any)=>(a.dispatch_date||"").localeCompare(b.dispatch_date||"")).forEach((t:any,i:number)=>{
      md+=`- ${28+i+1}회차 | ${month}월${getWeekNumber(t.dispatch_date)}주차 | ${t.site_name||"-"} | ${t.dispatch_date} | ${new Date(t.dispatch_date+"T23:59:59")<=new Date()?"완료":"예정"}\n`;
    });

    md += `\n---\n\n## PART 4. 신규회원 즉시 매출 (가입 7일 이내 하이타겟)\n\n`;
    let qc=0;
    contacts.filter((c:any)=>{const d=c.contract_date||c.reservation_date||"";return d>=mStart&&d<=mEnd;}).forEach((c:any)=>{
      const jd=c.contract_date||c.reservation_date||"";const jD=new Date(jd+"T00:00:00");const w7=new Date(jD);w7.setDate(w7.getDate()+7);
      const ht=data.filter((e:any)=>e.channel==="하이타겟"&&e.member_name===c.name&&(e.refund_amount||0)===0&&e.payment_date>=jd&&e.payment_date<=w7.toISOString().split("T")[0]);
      if(ht.length>0){qc++;md+=`- ${qc}. ${c.name} ${c.title||""} (${c.bunyanghoe_number||"-"}) | 가입: ${jd} | 매출: ${ht[0].payment_date} | ${fmt(ht.reduce((s:number,e:any)=>s+eff(e),0))} | ${c.assigned_to||"-"}/${ht[0].consultant||"-"}\n`;}
    });
    if(qc===0) md+=`- 해당 케이스 없음\n`;

    md += `\n---\n\n## PART 5. 담당자별 매출 결산\n\n### 실행파트 하이타겟\n\n`;
    const EHT:Record<string,number>={"조계현":30000000,"이세호":20000000,"기여운":35000000,"최연전":25000000};
    let tES=0,tER=0;
    ["조계현","이세호","기여운","최연전"].forEach(n=>{
      const my=data.filter((e:any)=>e.channel==="하이타겟"&&e.team_member===n);
      const s=my.filter((e:any)=>(e.refund_amount||0)===0).reduce((s:number,e:any)=>s+eff(e),0);
      const r=my.filter((e:any)=>(e.refund_amount||0)>0).reduce((s:number,e:any)=>s+(e.refund_amount||0),0);
      tES+=s;tER+=r;const net=s-r;
      md+=`- ${n}: 목표 ${fmtMan(EHT[n])} | 매출 ${fmt(s)} | 환불 -${fmt(r)} | 순매출 ${fmt(net)} (${(EHT[n]>0?net/EHT[n]*100:0).toFixed(1)}%)\n`;
      weeks.forEach(w=>{const ws=my.filter((e:any)=>e.payment_date>=w.start&&e.payment_date<=w.end&&(e.refund_amount||0)===0).reduce((s:number,e:any)=>s+eff(e),0);if(ws>0)md+=`  - ${w.week}주차: ${fmt(ws)}\n`;});
    });
    const tT=Object.values(EHT).reduce((s,v)=>s+v,0);
    md+=`- **합계: 목표 ${fmt(tT)} | 매출 ${fmt(tES)} | 환불 -${fmt(tER)} | 순매출 ${fmt(tES-tER)} (${(tT>0?(tES-tER)/tT*100:0).toFixed(1)}%)**\n`;

    md+=`\n### 운영파트 광고특전매출 (LMS+호갱노노)\n\n`;
    const OT:Record<string,number>={"김재영":40000000,"최은정":20000000};
    ["김재영","최은정"].forEach(on=>{
      const my=data.filter((e:any)=>(e.channel==="LMS"||HOG_CHS.includes(e.channel))&&(e.refund_amount||0)===0&&OPS_MAP[e.team_member||""]===on);
      const t=my.reduce((s:number,e:any)=>s+eff(e),0);const tg=OT[on]||0;
      md+=`- ${on}: 목표 ${fmtMan(tg)} | 매출 ${fmt(t)} | 달성율 ${(tg>0?t/tg*100:0).toFixed(1)}%\n`;
      weeks.forEach(w=>{const ws=my.filter((e:any)=>e.payment_date>=w.start&&e.payment_date<=w.end).reduce((s:number,e:any)=>s+eff(e),0);if(ws>0)md+=`  - ${w.week}주차: ${fmt(ws)}\n`;});
    });

    md+=`\n---\n\n> 이 데이터를 기반으로 월간 매출 분석, 담당자별 성과 평가, 채널별 효율 분석, 개선 방안 등을 요청해주세요.\n`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `결산보고서_${selMonth}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 엑셀 다운로드
  const downloadExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const hdr = (ws: ExcelJS.Worksheet, cols: string[]) => {
      const row = ws.addRow(cols);
      row.eachCell(c => { c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B2A4A" } }; c.alignment = { horizontal: "center", vertical: "middle" }; c.border = { bottom: { style: "thin" } }; });
    };
    const styleRow = (row: ExcelJS.Row) => { row.eachCell(c => { c.alignment = { horizontal: "center", vertical: "middle" }; c.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } }; c.font = { size: 10 }; }); };
    const fmtN = (n: number) => n.toLocaleString();

    // Sheet 1: 광고연계매출
    const s1 = wb.addWorksheet("광고연계매출");
    s1.columns = [{ width: 14 },{ width: 16 },{ width: 12 },{ width: 12 },{ width: 18 },{ width: 14 }];
    s1.addRow(["PART 1. 광고연계매출"]).font = { bold: true, size: 13 };
    s1.addRow([]);
    s1.addRow(["■ 분양회 연계매출 (하이타겟)"]).font = { bold: true, size: 11 };
    hdr(s1, ["주차", "금액", "대외협력팀", "컨설턴트", "고객명(직급)"]);
    bunyanghoeRows.forEach(r => { const row = s1.addRow([r.week, r.amount, r.teamMember, r.consultant, r.customer]); styleRow(row); row.getCell(2).numFmt = "#,##0"; });
    const bSum = s1.addRow(["합계", bunyanghoeRows.reduce((s,r)=>s+r.amount,0), "", "", `${bunyanghoeRows.length}건`]); bSum.font = { bold: true }; bSum.getCell(2).numFmt = "#,##0"; styleRow(bSum);

    s1.addRow([]); s1.addRow(["■ 대협팀활동 연계매출 (하이타겟)"]).font = { bold: true, size: 11 };
    hdr(s1, ["주차", "금액", "대외협력팀", "컨설턴트", "고객명(직급)"]);
    const dh = data.filter(e => e.contract_route === "대협팀활동" && e.channel === "하이타겟" && (e.refund_amount||0)===0);
    dh.forEach(e => { const row = s1.addRow([`${month}월${getWeekNumber(e.payment_date)}주차`, eff(e), e.team_member||"-", e.consultant||"-", `${e.member_name||"-"} ${e.position||""}`]); styleRow(row); row.getCell(2).numFmt = "#,##0"; });
    const dhSum = s1.addRow(["합계", dh.reduce((s,e)=>s+eff(e),0), "", "", `${dh.length}건`]); dhSum.font = { bold: true }; dhSum.getCell(2).numFmt = "#,##0"; styleRow(dhSum);

    s1.addRow([]); s1.addRow(["■ 완판트럭 연계매출 (하이타겟)"]).font = { bold: true, size: 11 };
    hdr(s1, ["주차", "금액", "대외협력팀", "컨설턴트"]);
    wanpanRows.forEach(r => { const row = s1.addRow([r.week, r.amount, r.teamMember, r.consultant]); styleRow(row); row.getCell(2).numFmt = "#,##0"; });
    const wSum = s1.addRow(["합계", wanpanRows.reduce((s,r)=>s+r.amount,0), "", `${wanpanRows.length}건`]); wSum.font = { bold: true }; wSum.getCell(2).numFmt = "#,##0"; styleRow(wSum);

    s1.addRow([]); s1.addRow(["■ 환불내역 (하이타겟)"]).font = { bold: true, size: 11 };
    hdr(s1, ["주차", "금액", "대외협력팀"]);
    refundRows.forEach(r => { const row = s1.addRow([r.week, -r.amount, r.teamMember]); styleRow(row); row.getCell(2).numFmt = "#,##0"; });
    const rSum = s1.addRow(["환불합계", -totalRefund, `${refundRows.length}건`]); rSum.font = { bold: true, color: { argb: "FFEF4444" } }; rSum.getCell(2).numFmt = "#,##0"; styleRow(rSum);

    s1.addRow([]); s1.addRow(["■ 주차별 마감 (하이타겟)"]).font = { bold: true, size: 11 };
    hdr(s1, ["구분", ...weeklyTotals.map(w=>w.label), "환불", `${monthLabel}마감`]);
    const wkRow = s1.addRow(["매출액", ...weeklyTotals.map(w=>w.amount), -totalRefund, totalHTClose]); styleRow(wkRow); wkRow.eachCell((c,i) => { if(i>1) c.numFmt = "#,##0"; }); wkRow.font = { bold: true };

    // Sheet 2: 광고특전매출
    const s2 = wb.addWorksheet("광고특전매출");
    s2.columns = [{ width: 14 },{ width: 10 },{ width: 14 },{ width: 18 },{ width: 12 },{ width: 12 },{ width: 12 }];
    s2.addRow(["광고특전매출 (LMS+호갱노노, 운영파트)"]).font = { bold: true, size: 13 };
    s2.addRow([]);
    hdr(s2, ["주차", "상품", "금액", "광고주", "대외협력팀", "컨설턴트", "운영파트"]);
    specialRows.forEach(r => { const row = s2.addRow([r.week, r.product, r.amount, r.customer, r.teamMember, r.consultant, r.opsMember]); styleRow(row); row.getCell(3).numFmt = "#,##0"; });
    const spSum = s2.addRow(["합계", "", specialRows.reduce((s,r)=>s+r.amount,0), "", "", "", `${specialRows.length}건`]); spSum.font = { bold: true }; spSum.getCell(3).numFmt = "#,##0"; styleRow(spSum);

    // Sheet 3: 트랙별 마감
    const s3 = wb.addWorksheet("트랙별마감");
    s3.columns = [{ width: 18 },{ width: 18 },{ width: 18 },{ width: 12 },{ width: 16 }];
    s3.addRow([`매출 트랙별 ${monthLabel} 마감`]).font = { bold: true, size: 13 };
    s3.addRow([]);
    hdr(s3, ["매출트랙", `${monthLabel}목표`, "현재진행", "달성율", "성격"]);
    [{ t: "광고연계매출", tg: track1Target, c: track1Total, n: "실행파트" },
     { t: "분양회(결제완료)", tg: track2Target, c: track2Count, n: "실행파트(건수)" },
     { t: "광고특전매출", tg: track3Target, c: track3Total, n: "운영파트" }].forEach(x => {
      const rate = x.tg > 0 ? (x.c / x.tg * 100).toFixed(1) + "%" : "0%";
      const row = s3.addRow([x.t, x.tg, x.c, rate, x.n]); styleRow(row);
      row.getCell(2).numFmt = "#,##0"; row.getCell(3).numFmt = "#,##0";
    });

    // Sheet 4: 분양회
    const s4 = wb.addWorksheet("분양회");
    s4.columns = [{ width: 8 },{ width: 10 },{ width: 10 },{ width: 14 },{ width: 14 },{ width: 14 },{ width: 14 },{ width: 14 },{ width: 10 },{ width: 30 }];
    s4.addRow(["PART 2. 분양회 전체회원 결제현황"]).font = { bold: true, size: 13 };
    s4.addRow([]);
    const allFees2 = allExecs.filter((e:any) => (e.refund_amount||0)===0).sort((a:any,b:any)=>(a.payment_date||"").localeCompare(b.payment_date||""));
    hdr(s4, ["연번", "이름", "직급", "가입일", "1차", "2차", "3차", "4차", "실행파트", "비고"]);
    const SPECIAL_NOTES2: Record<string,string> = {"백민엽":"3월 예약→계약 미전환","김나윤":"3월 예약→계약 미전환","이연수":"4월 예약→계약 미전환","윤권":"현장 딜레이","김정환":"현장문제 해소후","장은경":"사업자발행 후 입금","김성주":"사업자발행 후 입금","최두식":"개인계좌 별도입금","이정재":"매월 별도입금","신우진":"임시중단"};
    contacts.sort((a:any,b:any)=>{const na=parseInt((a.bunyanghoe_number||"").replace(/[^0-9]/g,""))||0;const nb=parseInt((b.bunyanghoe_number||"").replace(/[^0-9]/g,""))||0;return na-nb;}).forEach((c:any)=>{
      const num=parseInt((c.bunyanghoe_number||"").replace(/[^0-9]/g,""))||0;
      const pays=allFees2.filter((e:any)=>e.member_name===c.name);
      const row=s4.addRow([num,c.name,c.title||"-",c.contract_date||c.reservation_date||"-",pays[0]?.payment_date||"-",pays[1]?.payment_date||"-",pays[2]?.payment_date||"-",pays[3]?.payment_date||"-",c.assigned_to||"-",SPECIAL_NOTES2[c.name]||""]);
      styleRow(row);
    });

    // Sheet 5: 완판트럭
    const s5 = wb.addWorksheet("완판트럭");
    s5.columns = [{ width: 10 },{ width: 14 },{ width: 24 },{ width: 14 },{ width: 10 }];
    s5.addRow(["PART 3. 완판트럭 실행 현황"]).font = { bold: true, size: 13 };
    s5.addRow([]);
    hdr(s5, ["회차", "주차", "현장명", "실행일", "상태"]);
    trucks.sort((a:any,b:any)=>(a.dispatch_date||"").localeCompare(b.dispatch_date||"")).forEach((t:any,i:number)=>{
      const status = new Date(t.dispatch_date+"T23:59:59") <= new Date() ? "완료" : "예정";
      const row = s5.addRow([`${28+i+1}회차`, `${month}월${getWeekNumber(t.dispatch_date)}주차`, t.site_name||"-", t.dispatch_date, status]); styleRow(row);
    });

    // Sheet 6: 담당자별 결산
    const s6 = wb.addWorksheet("담당자별결산");
    const wkCols = weeks.map(w => ({ width: 14 }));
    s6.columns = [{ width: 10 },{ width: 14 }, ...wkCols, { width: 14 },{ width: 18 }];
    s6.addRow(["PART 5. 실행파트 하이타겟 매출 결산"]).font = { bold: true, size: 13 };
    s6.addRow([]);
    const EXEC_HT2: Record<string,number> = {"조계현":30000000,"이세호":20000000,"기여운":35000000,"최연전":25000000};
    hdr(s6, ["담당자", "목표", ...weeks.map(w=>`${w.week}주`), "환불", `${monthLabel}진척(달성율)`]);
    let tES2=0,tER2=0;
    const tWS2 = weeks.map(()=>0);
    ["조계현","이세호","기여운","최연전"].forEach(n=>{
      const my=data.filter((e:any)=>e.channel==="하이타겟"&&e.team_member===n);
      const ws=weeks.map((w,i)=>{const v=my.filter((e:any)=>e.payment_date>=w.start&&e.payment_date<=w.end&&(e.refund_amount||0)===0).reduce((s:number,e:any)=>s+eff(e),0);tWS2[i]+=v;return v;});
      const rf=my.filter((e:any)=>(e.refund_amount||0)>0).reduce((s:number,e:any)=>s+(e.refund_amount||0),0);
      const net=ws.reduce((s,v)=>s+v,0)-rf; tES2+=ws.reduce((s,v)=>s+v,0); tER2+=rf;
      const rate=EXEC_HT2[n]>0?net/EXEC_HT2[n]*100:0;
      const row=s6.addRow([n,EXEC_HT2[n],...ws,rf>0?-rf:0,`${fmtN(net)} (${rate.toFixed(1)}%)`]); styleRow(row);
      for(let i=2;i<=2+weeks.length;i++) row.getCell(i).numFmt="#,##0";
    });
    const tNet2=tES2-tER2; const tRate2=Object.values(EXEC_HT2).reduce((s,v)=>s+v,0);
    const totRow=s6.addRow(["합계",tRate2,...tWS2,tER2>0?-tER2:0,`${fmtN(tNet2)} (${(tRate2>0?tNet2/tRate2*100:0).toFixed(1)}%)`]); totRow.font={bold:true}; styleRow(totRow);
    for(let i=2;i<=2+weeks.length;i++) totRow.getCell(i).numFmt="#,##0";

    s6.addRow([]); s6.addRow([]); s6.addRow(["운영파트 광고특전매출"]).font = { bold: true, size: 13 };
    s6.addRow([]);
    const OT2: Record<string,number> = {"김재영":40000000,"최은정":20000000};
    hdr(s6, ["운영파트", "목표", ...weeks.map(w=>`${w.week}주차`), "누적", "달성율"]);
    ["김재영","최은정"].forEach(on=>{
      const my=data.filter((e:any)=>(e.channel==="LMS"||HOG_CHS.includes(e.channel))&&(e.refund_amount||0)===0&&OPS_MAP[e.team_member||""]===on);
      const ws=weeks.map(w=>my.filter((e:any)=>e.payment_date>=w.start&&e.payment_date<=w.end).reduce((s:number,e:any)=>s+eff(e),0));
      const total=ws.reduce((s,v)=>s+v,0); const tg=OT2[on]||0; const rate=tg>0?total/tg*100:0;
      const row=s6.addRow([on,tg,...ws,total,`${rate.toFixed(1)}%`]); styleRow(row);
      for(let i=2;i<=3+weeks.length;i++) row.getCell(i).numFmt="#,##0";
    });

    // 파일 저장
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `결산보고서_${selMonth}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user || !["admin", "ops"].includes(user.role)) return (
    <div className="flex items-center justify-center h-screen" style={{ color: "var(--text-subtle)" }}>
      <p>관리자 전용 메뉴입니다.</p>
    </div>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>📊 결산보고서</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>당월 기준 매출 결산 · {year}년 {monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={downloadExcel} className="px-4 py-2 text-xs font-bold rounded-lg" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>📊 엑셀 다운로드</button>
            <button onClick={downloadMD} className="px-4 py-2 text-xs font-bold rounded-lg" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>📥 MD 다운로드</button>
          <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* ═══ 1. 광고연계매출 - 분양회 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#8b5cf6" }}>분양회</span>
              광고연계매출 — 하이타겟
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>주차</th><th className={th}>금액</th><th className={th}>대외협력팀</th><th className={th}>컨설턴트</th><th className={th}>고객명(직급)</th>
                </tr></thead>
                <tbody>
                  {bunyanghoeRows.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>데이터 없음</td></tr> :
                    bunyanghoeRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td}><span className="font-semibold" style={{ color: "#8b5cf6" }}>{r.week}</span></td>
                        <td className={td + " font-bold"}>{fmtMan(r.amount)}</td>
                        <td className={td}>{r.teamMember}</td>
                        <td className={td}>{r.consultant}</td>
                        <td className={td}>{r.customer}</td>
                      </tr>
                    ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td} style={{ color: "#8b5cf6" }}>{fmt(bunyanghoeRows.reduce((s, r) => s + r.amount, 0))}</td>
                    <td colSpan={3} className={td}>{bunyanghoeRows.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 1-2. 대협팀활동연계매출 - 하이타겟 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#3b82f6" }}>대협팀</span>
              대협팀활동연계매출 — 하이타겟
            </h2>
            {(() => {
              const daehyupHT = data.filter(e => e.contract_route === "대협팀활동" && e.channel === "하이타겟" && (e.refund_amount || 0) === 0);
              const rows = daehyupHT.map(e => ({
                week: `${month}월${getWeekNumber(e.payment_date)}주차`, weekNum: getWeekNumber(e.payment_date),
                amount: eff(e), teamMember: e.team_member || "-", consultant: e.consultant || "-",
                customer: `${e.member_name || "-"} ${e.position || ""}`.trim(),
              })).sort((a, b) => a.weekNum - b.weekNum);
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>주차</th><th className={th}>금액</th><th className={th}>대외협력팀</th><th className={th}>컨설턴트</th><th className={th}>고객명(직급)</th>
                </tr></thead><tbody>
                  {rows.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>데이터 없음</td></tr> :
                    rows.map((r, i) => (<tr key={i} style={{ color: "var(--text)" }}><td className={td}><span className="font-semibold" style={{ color: "#3b82f6" }}>{r.week}</span></td><td className={td + " font-bold"}>{fmtMan(r.amount)}</td><td className={td}>{r.teamMember}</td><td className={td}>{r.consultant}</td><td className={td}>{r.customer}</td></tr>))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td} style={{ color: "#3b82f6" }}>{fmt(rows.reduce((s, r) => s + r.amount, 0))}</td><td colSpan={3} className={td}>{rows.length}건</td>
                  </tr>
                </tbody></table></div>
              );
            })()}
          </section>

          {/* ═══ 2. 광고연계매출 - 완판트럭 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#f59e0b" }}>완판트럭</span>
              광고연계매출 — 하이타겟
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>주차</th><th className={th}>금액</th><th className={th}>대외협력팀</th><th className={th}>컨설턴트</th>
                </tr></thead>
                <tbody>
                  {wanpanRows.length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>데이터 없음</td></tr> :
                    wanpanRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td}><span className="font-semibold" style={{ color: "#f59e0b" }}>{r.week}</span></td>
                        <td className={td + " font-bold"}>{fmtMan(r.amount)}</td>
                        <td className={td}>{r.teamMember}</td>
                        <td className={td}>{r.consultant}</td>
                      </tr>
                    ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td} style={{ color: "#f59e0b" }}>{fmt(wanpanRows.reduce((s, r) => s + r.amount, 0))}</td>
                    <td colSpan={2} className={td}>{wanpanRows.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 3. 광고연계매출 - 환불내역 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#ef4444" }}>환불</span>
              광고연계매출 — 환불내역
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>주차</th><th className={th}>금액</th><th className={th}>대외협력팀</th>
                </tr></thead>
                <tbody>
                  {refundRows.length === 0 ? <tr><td colSpan={3} className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>환불 내역 없음</td></tr> :
                    refundRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td}><span className="font-semibold" style={{ color: "#ef4444" }}>{r.week}</span></td>
                        <td className={td + " font-bold"} style={{ color: "#ef4444" }}>-{fmtMan(r.amount)}</td>
                        <td className={td}>{r.teamMember}</td>
                      </tr>
                    ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "#ef4444" }}>
                    <td className={td}>환불 합계</td><td className={td}>-{fmt(totalRefund)}</td><td className={td}>{refundRows.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 4. 광고연계매출 주차별마감 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📅 광고연계매출 주차별 마감 (하이타겟)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>구분</th>
                  {weeklyTotals.map(w => <th key={w.label} className={th}>{w.label}</th>)}
                  <th className={th} style={{ color: "#ef4444" }}>환불</th>
                  <th className={th} style={{ color: "#3b82f6" }}>{monthLabel} 마감</th>
                </tr></thead>
                <tbody>
                  <tr style={{ color: "var(--text)" }}>
                    <td className={td + " font-bold"}>매출액</td>
                    {weeklyTotals.map(w => <td key={w.label} className={td + " font-semibold"}>{w.amount > 0 ? fmtMan(w.amount) : "-"}</td>)}
                    <td className={td + " font-bold"} style={{ color: "#ef4444" }}>{totalRefund > 0 ? `-${fmtMan(totalRefund)}` : "-"}</td>
                    <td className={td + " font-black text-sm"} style={{ color: "#3b82f6" }}>{fmt(totalHTClose)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 5. 광고특전매출 (운영파트귀속) ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text)" }}>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "#10b981" }}>운영파트</span>
              광고특전매출 (LMS + 호갱노노)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>주차</th><th className={th}>상품</th><th className={th}>금액</th><th className={th}>광고주</th><th className={th}>대외협력팀</th><th className={th}>컨설턴트</th><th className={th}>운영파트</th>
                </tr></thead>
                <tbody>
                  {specialRows.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>데이터 없음</td></tr> :
                    specialRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td}><span className="font-semibold" style={{ color: "#10b981" }}>{r.week}</span></td>
                        <td className={td}><span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: r.product === "LMS" ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)", color: r.product === "LMS" ? "#3b82f6" : "#f59e0b" }}>{r.product}</span></td>
                        <td className={td + " font-bold"}>{fmtMan(r.amount)}</td>
                        <td className={td}>{r.customer}</td>
                        <td className={td}>{r.teamMember}</td>
                        <td className={td}>{r.consultant}</td>
                        <td className={td}><span className="font-semibold" style={{ color: "#10b981" }}>{r.opsMember}</span></td>
                      </tr>
                    ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td}></td>
                    <td className={td} style={{ color: "#10b981" }}>{fmt(specialRows.reduce((s, r) => s + r.amount, 0))}</td>
                    <td colSpan={4} className={td}>{specialRows.length}건</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ 6. 매출 트랙별 마감 ═══ */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>🏁 매출 트랙별 {monthLabel} 마감 (3트랙 독립)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>매출트랙</th><th className={th}>{monthLabel} 목표</th><th className={th}>현재 진행</th><th className={th}>달성률</th><th className={th}>성격</th>
                </tr></thead>
                <tbody>
                  {[
                    { track: "광고연계매출", target: track1Target, current: track1Total, unit: "원", note: "실행파트 귀속", color: "#3b82f6" },
                    { track: "분양회 (결제완료)", target: track2Target, current: track2Count, unit: "건", note: "실행파트 (결제건수)", color: "#8b5cf6" },
                    { track: "광고특전매출", target: track3Target, current: track3Total, unit: "원", note: "운영파트 귀속", color: "#10b981" },
                  ].map(t => {
                    const rate = t.unit === "원" ? (t.target > 0 ? t.current / t.target * 100 : 0) : (t.target > 0 ? t.current / t.target * 100 : 0);
                    return (
                      <tr key={t.track} style={{ color: "var(--text)" }}>
                        <td className={td + " font-bold"}><span style={{ color: t.color }}>●</span> {t.track}</td>
                        <td className={td + " font-semibold"}>{t.unit === "원" ? fmt(t.target) : `${t.target}건`}</td>
                        <td className={td}>
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-bold">{t.unit === "원" ? fmt(t.current) : `${t.current}건`}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 120 }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: t.color }} />
                            </div>
                          </div>
                        </td>
                        <td className={td + " font-black text-sm"} style={{ color: rate >= 100 ? "#10b981" : rate >= 50 ? t.color : "#ef4444" }}>{rate.toFixed(1)}%</td>
                        <td className={td + " text-xs"} style={{ color: "var(--text-muted)" }}>{t.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {/* ═══════════════ PART 2. 분양회 ═══════════════ */}
          <div className="mt-8 mb-4"><h2 className="text-lg font-black" style={{ color: "var(--text)" }}>PART 2. 분양회</h2></div>

          {(() => {
            // 특수 케이스 메모
            const SPECIAL_NOTES: Record<string, string> = {
              "백민엽": "3월 예약완료→계약완료 미전환 (당월내 전환예정)",
              "김나윤": "3월 예약완료→계약완료 미전환 (당월내 전환예정)",
              "이연수": "4월 예약완료→계약완료 미전환 (당월내 전환예정)",
              "윤권": "예약 후 현장상황 문제로 딜레이",
              "김정환": "현장문제 해소 후 진행예정",
              "장은경": "계약완료, 사업자 발행 후 당월입금예정",
              "김성주": "계약완료, 사업자 발행 후 당월입금예정",
              "최두식": "정기결제 등록, 개인계좌 문제로 별도입금예정",
              "이정재": "정기출금 불가, 매월 별도 입금키로함",
              "신우진": "광고효율 불만족 임시중단",
            };
            const TARGETS: Record<string, { count: number; amount: number }> = {
              "조계현": { count: 9, amount: 4950000 },
              "이세호": { count: 8, amount: 4400000 },
              "기여운": { count: 14, amount: 7700000 },
              "최연전": { count: 9, amount: 4950000 },
            };
            const EXEC_MEMBERS = ["조계현", "이세호", "기여운", "최연전"];

            // 가입일 = contract_date 또는 reservation_date
            const getJoinDate = (c: any) => c.contract_date || c.reservation_date || "";
            const getJoinMonth = (c: any) => { const d = getJoinDate(c); return d ? d.substring(0, 7) : ""; };
            const getNum = (c: any) => { const n = c.bunyanghoe_number || ""; return parseInt(n.replace(/[^0-9]/g, "")) || 0; };

            // 당월 신규가입 회원
            const monthNewMembers = contacts
              .filter(c => { const d = getJoinDate(c); return d >= mStart && d <= mEnd; })
              .sort((a, b) => getNum(a) - getNum(b));

            // 전체 월회비 결제 내역 (all months)
            const allFees = allExecs.filter(e => (e.refund_amount || 0) === 0).sort((a: any, b: any) => (a.payment_date || "").localeCompare(b.payment_date || ""));
            // 당월 월회비 결제
            const monthFees = allFees.filter((e: any) => e.payment_date >= mStart && e.payment_date <= mEnd);

            // 회원별 결제 이력 (차수별)
            const getMemberPayments = (name: string) => {
              return allFees.filter((e: any) => e.member_name === name).sort((a: any, b: any) => (a.payment_date || "").localeCompare(b.payment_date || ""));
            };

            // 당월 결제 상태 확인
            const getPaymentStatus = (name: string) => {
              const paid = monthFees.find((e: any) => e.member_name === name);
              return paid ? paid.payment_date : null;
            };

            // 월별 가입자 수 (2~5월)
            const monthRange = ["02", "03", "04", "05"];
            const getMonthJoinCount = (assignee: string, m: string) => {
              return contacts.filter(c => c.assigned_to === assignee && getJoinMonth(c) === `${year}-${m}`).length;
            };

            return (
              <>
                {/* ═══ P2-1. 당월 주차별 신규모집 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📋 당월 주차별 신규모집</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                      <th className={th}>연번</th><th className={th}>이름</th><th className={th}>직급</th><th className={th}>실행파트</th><th className={th}>결제상태</th><th className={th}>비고</th>
                    </tr></thead><tbody>
                      {monthNewMembers.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>당월 신규가입 없음</td></tr> :
                        monthNewMembers.map(c => {
                          const paidDate = getPaymentStatus(c.name);
                          return (
                            <tr key={c.id} style={{ color: "var(--text)" }}>
                              <td className={td + " font-bold"}>{getNum(c)}</td>
                              <td className={td + " font-semibold"}>{c.name}</td>
                              <td className={td}>{c.title || "-"}</td>
                              <td className={td}>{c.assigned_to || "-"}</td>
                              <td className={td}><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: paidDate ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: paidDate ? "#10b981" : "#f59e0b" }}>{paidDate || "예정"}</span></td>
                              <td className={td + " text-xs"} style={{ color: "var(--text-muted)" }}>{SPECIAL_NOTES[c.name] || `${month}월${getWeekNumber(getJoinDate(c))}주차 가입`}</td>
                            </tr>
                          );
                        })}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-2. 전체회원결제현황 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>💳 전체회원 결제현황</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                      <th className={th}>연번</th><th className={th}>이름</th><th className={th}>직급</th><th className={th}>가입일</th>
                      <th className={th}>1차</th><th className={th}>2차</th><th className={th}>3차</th><th className={th}>4차</th>
                      <th className={th}>실행파트</th><th className={th}>비고</th>
                    </tr></thead><tbody>
                      {contacts.sort((a, b) => getNum(a) - getNum(b)).map(c => {
                        const payments = getMemberPayments(c.name);
                        return (
                          <tr key={c.id} style={{ color: "var(--text)" }}>
                            <td className={td + " font-bold"}>{getNum(c)}</td>
                            <td className={td + " font-semibold"}>{c.name}</td>
                            <td className={td}>{c.title || "-"}</td>
                            <td className={td}>{getJoinDate(c) || "-"}</td>
                            {[0, 1, 2, 3].map(i => (
                              <td key={i} className={td}><span className={payments[i] ? "font-semibold" : ""} style={{ color: payments[i] ? "#10b981" : "var(--text-subtle)" }}>{payments[i]?.payment_date || "-"}</span></td>
                            ))}
                            <td className={td}>{c.assigned_to || "-"}</td>
                            <td className={td + " text-[10px]"} style={{ color: "var(--text-muted)" }}>{SPECIAL_NOTES[c.name] || ""}</td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-3. 월별 담당자 분양회 모집실적 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📈 월별 담당자 분양회 모집실적 (가입 VS 결제 분리)</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                      <th className={th}>대협팀 담당자</th>
                      {monthRange.map(m => <th key={m} className={th}>{parseInt(m)}월 가입</th>)}
                      <th className={th}>누적가입</th><th className={th}>결제완료</th><th className={th}>결제대기<br/>(출금일 미도래)</th><th className={th}>결제대기회원</th>
                    </tr></thead><tbody>
                      {EXEC_MEMBERS.map(name => {
                        const myContacts = contacts.filter(c => c.assigned_to === name);
                        const totalJoined = myContacts.length;
                        const paidThisMonth = monthFees.filter((e: any) => {
                          const c = myContacts.find(c2 => c2.name === e.member_name);
                          return !!c;
                        }).length;
                        const paidMembers = myContacts.filter(c => allFees.some((e: any) => e.member_name === c.name && e.payment_date >= mStart && e.payment_date <= mEnd));
                        const unpaidMembers = myContacts.filter(c => !allFees.some((e: any) => e.member_name === c.name && e.payment_date >= mStart && e.payment_date <= mEnd));
                        // 출금일 미도래: 특수케이스가 아닌 미결제 회원 (정기출금일이 아직 안 온 회원)
                        const today = new Date().toISOString().split("T")[0];
                        const notYetDue = unpaidMembers.filter(c => !SPECIAL_NOTES[c.name]);
                        const specialMembers = myContacts.filter(c => SPECIAL_NOTES[c.name]);
                        return (
                          <tr key={name} style={{ color: "var(--text)" }}>
                            <td className={td + " font-bold"}>{name}</td>
                            {monthRange.map(m => <td key={m} className={td + " text-center font-semibold"}>{getMonthJoinCount(name, m)}명</td>)}
                            <td className={td + " text-center font-bold"} style={{ color: "#3b82f6" }}>{totalJoined}명</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#10b981" }}>{paidThisMonth}건</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#f59e0b" }}>{unpaidMembers.length}건 / <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>(미도래 {notYetDue.length}건)</span></td>
                            <td className={td + " text-[10px]"} style={{ color: "var(--text-muted)" }}>
                              {notYetDue.length > 0 && <span style={{ color: "#f59e0b" }}>미도래: {notYetDue.map(c => c.name).join(", ")}</span>}
                              {notYetDue.length > 0 && specialMembers.length > 0 && " / "}
                              {specialMembers.length > 0 && <span style={{ color: "#ef4444" }}>{specialMembers.map(c => `${c.name}: ${SPECIAL_NOTES[c.name]}`).join(" / ")}</span>}
                              {notYetDue.length === 0 && specialMembers.length === 0 && "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-4. 실행파트 담당자별 현재 진척율 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>🎯 실행파트 담당자별 현재 진척율</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                      <th className={th}>담당자</th><th className={th}>{monthLabel} 가입</th><th className={th}>결제완료</th><th className={th}>결제미완료</th><th className={th}>결제매출</th><th className={th}>{monthLabel} 목표</th><th className={th}>달성율</th>
                    </tr></thead><tbody>
                      {EXEC_MEMBERS.map(name => {
                        const myContacts = contacts.filter(c => c.assigned_to === name);
                        const monthJoined = myContacts.filter(c => { const d = getJoinDate(c); return d >= mStart && d <= mEnd; }).length;
                        const paidMembers = myContacts.filter(c => monthFees.some((e: any) => e.member_name === c.name));
                        const paidCount = paidMembers.length;
                        const unpaidCount = myContacts.length - paidCount;
                        const paidAmount = monthFees.filter((e: any) => myContacts.some(c => c.name === e.member_name)).reduce((s: number, e: any) => s + eff(e), 0);
                        const target = TARGETS[name]?.count || 0;
                        const rate = target > 0 ? paidCount / target * 100 : 0;
                        return (
                          <tr key={name} style={{ color: "var(--text)" }}>
                            <td className={td + " font-bold"}>{name}</td>
                            <td className={td + " text-center"}>{monthJoined}명</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#10b981" }}>{paidCount}건</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#ef4444" }}>{unpaidCount}건</td>
                            <td className={td + " font-semibold"}>{fmt(paidAmount)}</td>
                            <td className={td + " text-center"}>{target}건</td>
                            <td className={td + " font-black"} style={{ color: rate >= 100 ? "#10b981" : rate >= 50 ? "#3b82f6" : "#ef4444" }}>
                              <div className="flex items-center justify-center gap-2">
                                <span>{rate.toFixed(1)}%</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 80 }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: rate >= 100 ? "#10b981" : "#3b82f6" }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-5. 차수별 결제 진행율 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📊 {monthLabel} 차수별 결제 진행율</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                      <th className={th}>결제분류</th><th className={th}>건수</th><th className={th}>매출</th><th className={th}>회원명</th>
                    </tr></thead><tbody>
                      {(() => {
                        // 가입월 기준으로 차수 계산
                        const joinMonths = [
                          { label: `4차결제 (2월 가입자)`, joinM: `${year}-02` },
                          { label: `3차결제 (3월 가입자)`, joinM: `${year}-03` },
                          { label: `2차결제 (4월 가입자)`, joinM: `${year}-04` },
                          { label: `1차결제 (${monthLabel} 가입자)`, joinM: selMonth },
                        ];
                        return joinMonths.map(jm => {
                          const members = contacts.filter(c => getJoinMonth(c) === jm.joinM);
                          const paidMembers = members.filter(c => monthFees.some((e: any) => e.member_name === c.name));
                          const unpaidMembers = members.filter(c => !monthFees.some((e: any) => e.member_name === c.name));
                          const paidAmount = paidMembers.reduce((s, c) => {
                            const fee = monthFees.find((e: any) => e.member_name === c.name);
                            return s + (fee ? eff(fee) : 0);
                          }, 0);
                          return (
                            <tr key={jm.label} style={{ color: "var(--text)" }}>
                              <td className={td + " font-bold"}>{jm.label}</td>
                              <td className={td + " text-center font-bold"} style={{ color: "#3b82f6" }}>{paidMembers.length}건 <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>/ {members.length}명</span></td>
                              <td className={td + " font-semibold"}>{paidAmount > 0 ? fmt(paidAmount) : "-"}</td>
                              <td className={td + " text-xs"}>
                                {paidMembers.length > 0 && <span style={{ color: "#10b981" }}>✓ {paidMembers.map(c => c.name).join(", ")}</span>}
                                {unpaidMembers.length > 0 && <span style={{ color: "#f59e0b" }}>{paidMembers.length > 0 ? " / " : ""}예정: {unpaidMembers.map(c => c.name).join(", ")}</span>}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody></table>
                  </div>
                </section>

                {/* ═══ P2-6. 담당자별 회비 매출 ═══ */}
                <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>💰 담당자별 {monthLabel} 회비 매출</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                      <th className={th}>담당자</th><th className={th}>결제건수</th><th className={th}>회비매출</th><th className={th}>목표매출</th><th className={th}>달성율</th>
                    </tr></thead><tbody>
                      {EXEC_MEMBERS.map(name => {
                        const myContacts = contacts.filter(c => c.assigned_to === name);
                        const paidFees = monthFees.filter((e: any) => myContacts.some(c => c.name === e.member_name));
                        const paidCount = paidFees.length;
                        const paidAmount = paidFees.reduce((s: number, e: any) => s + eff(e), 0);
                        const targetAmt = TARGETS[name]?.amount || 0;
                        const rate = targetAmt > 0 ? paidAmount / targetAmt * 100 : 0;
                        return (
                          <tr key={name} style={{ color: "var(--text)" }}>
                            <td className={td + " font-bold"}>{name}</td>
                            <td className={td + " text-center font-bold"} style={{ color: "#3b82f6" }}>{paidCount}건</td>
                            <td className={td + " font-bold"}>{fmt(paidAmount)}</td>
                            <td className={td + " font-semibold"}>{fmt(targetAmt)}</td>
                            <td className={td + " font-black"} style={{ color: rate >= 100 ? "#10b981" : rate >= 50 ? "#3b82f6" : "#ef4444" }}>
                              <div className="flex items-center justify-center gap-2">
                                <span>{rate.toFixed(1)}%</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 100 }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(rate, 100)}%`, background: rate >= 100 ? "#10b981" : "#3b82f6" }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {(() => {
                        const totalPaid = EXEC_MEMBERS.reduce((s, name) => {
                          const myC = contacts.filter(c => c.assigned_to === name);
                          return s + monthFees.filter((e: any) => myC.some(c => c.name === e.member_name)).reduce((s2: number, e: any) => s2 + eff(e), 0);
                        }, 0);
                        const totalTarget = Object.values(TARGETS).reduce((s, t) => s + t.amount, 0);
                        const totalCount = EXEC_MEMBERS.reduce((s, name) => {
                          const myC = contacts.filter(c => c.assigned_to === name);
                          return s + monthFees.filter((e: any) => myC.some(c => c.name === e.member_name)).length;
                        }, 0);
                        const rate = totalTarget > 0 ? totalPaid / totalTarget * 100 : 0;
                        return (
                          <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                            <td className={td}>합계</td>
                            <td className={td + " text-center"} style={{ color: "#3b82f6" }}>{totalCount}건</td>
                            <td className={td}>{fmt(totalPaid)}</td>
                            <td className={td}>{fmt(totalTarget)}</td>
                            <td className={td} style={{ color: rate >= 100 ? "#10b981" : "#3b82f6" }}>{rate.toFixed(1)}%</td>
                          </tr>
                        );
                      })()}
                    </tbody></table>
                  </div>
                </section>
              </>
            );
          })()}
          {/* ═══════════════ PART 3. 완판트럭 ═══════════════ */}
          <div className="mt-8 mb-4"><h2 className="text-lg font-black" style={{ color: "var(--text)" }}>PART 3. 완판트럭</h2></div>

          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>🚚 {monthLabel} 완판트럭 실행 현황</h2>
            {(() => {
              const TRUCK_BASE = 28; // 4월 마지막 회차
              const truckRows = trucks.sort((a: any, b: any) => (a.dispatch_date || "").localeCompare(b.dispatch_date || "")).map((t: any, i: number) => ({
                round: TRUCK_BASE + i + 1,
                week: `${month}월${getWeekNumber(t.dispatch_date)}주차`,
                siteName: t.site_name || "-",
                date: t.dispatch_date || "-",
                status: new Date(t.dispatch_date + "T23:59:59") <= new Date() ? "완료" : "예정",
              }));
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>회차</th><th className={th}>주차</th><th className={th}>현장명</th><th className={th}>실행일</th><th className={th}>상태</th>
                </tr></thead><tbody>
                  {truckRows.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>데이터 없음</td></tr> :
                    truckRows.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td + " font-bold"} style={{ color: "#f59e0b" }}>{r.round}회차</td>
                        <td className={td}>{r.week}</td>
                        <td className={td + " font-semibold"}>{r.siteName}</td>
                        <td className={td}>{r.date}</td>
                        <td className={td}><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: r.status === "완료" ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: r.status === "완료" ? "#10b981" : "#3b82f6" }}>{r.status}</span></td>
                      </tr>
                    ))}
                </tbody></table></div>
              );
            })()}
          </section>

          {/* ═══════════════ PART 4. 신규회원 즉시 매출 패턴 ═══════════════ */}
          <div className="mt-8 mb-4"><h2 className="text-lg font-black" style={{ color: "var(--text)" }}>PART 4. 신규회원 즉시 매출 패턴</h2></div>

          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>⚡ 가입 후 7일 이내 매출 발생 케이스</h2>
            {(() => {
              const monthNew = contacts.filter(c => { const d = c.contract_date || c.reservation_date || ""; return d >= mStart && d <= mEnd; });
              const quickSales: any[] = [];
              monthNew.forEach(c => {
                const joinDate = c.contract_date || c.reservation_date || "";
                const joinD = new Date(joinDate + "T00:00:00");
                const within7 = new Date(joinD); within7.setDate(within7.getDate() + 7);
                const w7str = within7.toISOString().split("T")[0];
                const htSales = data.filter(e => e.channel === "하이타겟" && e.member_name === c.name && (e.refund_amount || 0) === 0 && e.payment_date >= joinDate && e.payment_date <= w7str);
                if (htSales.length > 0) {
                  const totalAmt = htSales.reduce((s: number, e: any) => s + eff(e), 0);
                  quickSales.push({
                    name: `${c.name} ${c.title || ""}`.trim(),
                    num: c.bunyanghoe_number || "-",
                    joinDate,
                    salesDate: htSales[0].payment_date,
                    amount: totalAmt,
                    teamMember: c.assigned_to || "-",
                    consultant: htSales[0].consultant || "-",
                  });
                }
              });
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>구분</th><th className={th}>회원명</th><th className={th}>가입시점(넘버링)</th><th className={th}>매출발생시점</th><th className={th}>매출유형</th><th className={th}>금액</th><th className={th}>R&R</th>
                </tr></thead><tbody>
                  {quickSales.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>해당 케이스 없음</td></tr> :
                    quickSales.map((r, i) => (
                      <tr key={i} style={{ color: "var(--text)" }}>
                        <td className={td + " font-bold"}>{i + 1}</td>
                        <td className={td + " font-semibold"}>{r.name}</td>
                        <td className={td}>{r.joinDate} ({r.num})</td>
                        <td className={td}>{r.salesDate}</td>
                        <td className={td}><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>광고연계</span></td>
                        <td className={td + " font-bold"}>{fmt(r.amount)}</td>
                        <td className={td}>{r.teamMember} / {r.consultant}</td>
                      </tr>
                    ))}
                </tbody></table></div>
              );
            })()}
          </section>

          {/* ═══════════════ PART 5. 담당자별 매출 결산 ═══════════════ */}
          <div className="mt-8 mb-4"><h2 className="text-lg font-black" style={{ color: "var(--text)" }}>PART 5. {monthLabel} 현재 진척사항 — 담당자별 매출 결산</h2></div>

          {/* 실행파트 하이타겟 매출 */}
          <section className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>🎯 실행파트 담당자별 하이타겟 매출 결산</h2>
            {(() => {
              const EXEC_TARGETS_HT: Record<string, number> = { "조계현": 30000000, "이세호": 20000000, "기여운": 35000000, "최연전": 25000000 };
              const allHTMonth = data.filter(e => e.channel === "하이타겟");
              const execNames = ["조계현", "이세호", "기여운", "최연전"];
              const rows = execNames.map(name => {
                const myData = allHTMonth.filter(e => e.team_member === name);
                const weekSales = weeks.map(w => {
                  return myData.filter(e => e.payment_date >= w.start && e.payment_date <= w.end && (e.refund_amount || 0) === 0).reduce((s: number, e: any) => s + eff(e), 0);
                });
                const refundAmt = myData.filter(e => (e.refund_amount || 0) > 0).reduce((s: number, e: any) => s + (e.refund_amount || 0), 0);
                const totalSales = weekSales.reduce((s, v) => s + v, 0);
                const net = totalSales - refundAmt;
                const target = EXEC_TARGETS_HT[name] || 0;
                const rate = target > 0 ? net / target * 100 : 0;
                return { name, weekSales, refundAmt, net, target, rate };
              });
              const totals = {
                weekSales: weeks.map((_, i) => rows.reduce((s, r) => s + r.weekSales[i], 0)),
                refundAmt: rows.reduce((s, r) => s + r.refundAmt, 0),
                net: rows.reduce((s, r) => s + r.net, 0),
                target: rows.reduce((s, r) => s + r.target, 0),
              };
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>담당자</th><th className={th}>목표</th>
                  {weeks.map(w => <th key={w.week} className={th}>{w.week}주</th>)}
                  <th className={th} style={{ color: "#ef4444" }}>환불</th><th className={th}>{monthLabel} 진척(달성율)</th>
                </tr></thead><tbody>
                  {rows.map(r => (
                    <tr key={r.name} style={{ color: "var(--text)" }}>
                      <td className={td + " font-bold"}>{r.name}</td>
                      <td className={td + " font-semibold"}>{fmtMan(r.target)}</td>
                      {r.weekSales.map((v, i) => <td key={i} className={td + " font-semibold"}>{v > 0 ? fmtMan(v) : "-"}</td>)}
                      <td className={td + " font-bold"} style={{ color: "#ef4444" }}>{r.refundAmt > 0 ? `-${fmtMan(r.refundAmt)}` : "-"}</td>
                      <td className={td + " font-black"}>
                        <div className="flex items-center justify-center gap-2">
                          <span>{fmtMan(r.net)}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: r.rate >= 100 ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)", color: r.rate >= 100 ? "#10b981" : "#3b82f6" }}>{r.rate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td><td className={td}>{fmtMan(totals.target)}</td>
                    {totals.weekSales.map((v, i) => <td key={i} className={td}>{v > 0 ? fmtMan(v) : "-"}</td>)}
                    <td className={td} style={{ color: "#ef4444" }}>{totals.refundAmt > 0 ? `-${fmtMan(totals.refundAmt)}` : "-"}</td>
                    <td className={td} style={{ color: "#3b82f6" }}>{fmtMan(totals.net)} ({(totals.target > 0 ? totals.net / totals.target * 100 : 0).toFixed(1)}%)</td>
                  </tr>
                </tbody></table></div>
              );
            })()}
          </section>

          {/* 운영파트 광고특전매출 */}
          <section className="rounded-2xl p-5 mt-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>📊 운영파트 담당자별 광고특전매출 ({monthLabel} 진척)</h2>
            {(() => {
              const opsMembers = ["김재영", "최은정"];
              const OPS_TGT: Record<string, number> = { "김재영": 40000000, "최은정": 20000000 };
              const specialData = data.filter(e => (e.channel === "LMS" || HOG_CHS.includes(e.channel)) && (e.refund_amount || 0) === 0);
              const rows = opsMembers.map(opsName => {
                const myData = specialData.filter(e => OPS_MAP[e.team_member || ""] === opsName);
                const weekSales = weeks.map(w => myData.filter(e => e.payment_date >= w.start && e.payment_date <= w.end).reduce((s: number, e: any) => s + eff(e), 0));
                const total = weekSales.reduce((s, v) => s + v, 0);
                const target = OPS_TGT[opsName] || 0;
                const rate = target > 0 ? total / target * 100 : 0;
                return { name: opsName, weekSales, total, target, rate };
              });
              const grandTotal = rows.reduce((s, r) => s + r.total, 0);
              return (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr style={{ background: "rgba(59,130,246,0.08)", color: "var(--text)", borderBottom: "2px solid var(--border)" }}>
                  <th className={th}>운영파트</th><th className={th}>목표</th>
                  {weeks.map(w => <th key={w.week} className={th}>{w.week}주차</th>)}
                  <th className={th}>누적</th><th className={th}>달성율</th>
                </tr></thead><tbody>
                  {rows.map(r => (
                    <tr key={r.name} style={{ color: "var(--text)" }}>
                      <td className={td + " font-bold"}>{r.name}</td>
                      <td className={td + " font-semibold"}>{fmtMan(r.target)}</td>
                      {r.weekSales.map((v, i) => <td key={i} className={td + " font-semibold"}>{v > 0 ? fmtMan(v) : "-"}</td>)}
                      <td className={td + " font-bold"} style={{ color: "#10b981" }}>{fmt(r.total)}</td>
                      <td className={td + " font-black"} style={{ color: r.rate >= 100 ? "#10b981" : r.rate >= 50 ? "#3b82f6" : "#ef4444" }}>{r.rate.toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="font-bold" style={{ borderTop: "2px solid var(--border)", color: "var(--text)" }}>
                    <td className={td}>합계</td>
                    <td className={td}>{fmtMan(rows.reduce((s,r)=>s+r.target,0))}</td>
                    {weeks.map((_, i) => <td key={i} className={td}>{fmtMan(rows.reduce((s, r) => s + r.weekSales[i], 0))}</td>)}
                    <td className={td} style={{ color: "#10b981" }}>{fmt(grandTotal)}</td>
                    <td className={td} style={{ color: "#3b82f6" }}>{(rows.reduce((s,r)=>s+r.target,0)>0?grandTotal/rows.reduce((s,r)=>s+r.target,0)*100:0).toFixed(1)}%</td>
                  </tr>
                </tbody></table></div>
              );
            })()}
          </section>
        </>
      )}
    </div>
  );
}
