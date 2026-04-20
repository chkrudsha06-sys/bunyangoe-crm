"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Contact { id:number; name:string; title:string; bunyanghoe_number:string; consultant:string; assigned_to:string; contract_date:string; photo_url:string; phone:string; }
interface ExecRow { id:number; member_name:string; bunyanghoe_number:string; hightarget_mileage:number; hightarget_reward:number; hogaengnono_reward:number; lms_reward:number; payment_date:string; channel:string; execution_amount:number; vat_amount:number; contract_route:string; }
interface MileUsage { id:number; contact_id:number; usage_date:string; usage_amount:number; }
interface DashContent { id:number; content_type:string; title:string; description:string; url:string; image_url:string; sort_order:number; is_active:boolean; }

const fw = (n:number) => n.toLocaleString();
const fDate = (d:string) => { if(!d) return "-"; const dt=new Date(d+"T00:00:00"); return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`; };

export default function CustomerDashboard() {
  const { code } = useParams();
  const [contact, setContact] = useState<Contact|null>(null);
  const [execs, setExecs] = useState<ExecRow[]>([]);
  const [usages, setUsages] = useState<MileUsage[]>([]);
  const [contents, setContents] = useState<DashContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    const load = async () => {
      setLoading(true);
      const { data: c } = await supabase.from("contacts").select("id,name,title,bunyanghoe_number,consultant,assigned_to,contract_date,photo_url,phone").eq("dashboard_code", code).maybeSingle();
      if (!c) { setNotFound(true); setLoading(false); return; }
      setContact(c as Contact);
      const [r1, r2, r3] = await Promise.all([
        supabase.from("ad_executions").select("id,member_name,bunyanghoe_number,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward,payment_date,channel,execution_amount,vat_amount,contract_route").or(`member_name.eq.${c.name},bunyanghoe_number.eq.${c.bunyanghoe_number}`).order("payment_date",{ascending:false}),
        supabase.from("mileage_usages").select("*").eq("contact_id", c.id).order("usage_date",{ascending:false}),
        supabase.from("dashboard_contents").select("*").eq("is_active", true).order("sort_order",{ascending:true}),
      ]);
      setExecs((r1.data||[]) as ExecRow[]); setUsages((r2.data||[]) as MileUsage[]); setContents((r3.data||[]) as DashContent[]);
      setLoading(false);
    };
    load();
  }, [code]);

  const stats = useMemo(() => {
    const totalMileage = execs.reduce((s,e) => s+(e.hightarget_mileage||0), 0);
    const htReward = execs.reduce((s,e) => s+(e.hightarget_reward||0), 0);
    const hogReward = execs.reduce((s,e) => s+(e.hogaengnono_reward||0), 0);
    const lmsReward = execs.reduce((s,e) => s+(e.lms_reward||0), 0);
    const totalReward = htReward + hogReward + lmsReward;
    const totalUsed = usages.reduce((s,u) => s+(u.usage_amount||0), 0);
    const tax = totalReward > 0 ? Math.floor(totalReward * 0.033) : 0;
    const totalExecAmt = execs.reduce((s,e) => s+((e.vat_amount&&e.vat_amount>0&&e.vat_amount!==e.execution_amount)?e.vat_amount:(e.execution_amount||0)), 0);
    return { totalMileage, htReward, hogReward, lmsReward, totalReward, totalUsed, remainMileage: totalMileage - totalUsed, netReward: totalReward - tax, tax, totalExecAmt };
  }, [execs, usages]);

  // 채널별 매출 집계
  const channelBreakdown = useMemo(() => {
    const map: Record<string,{count:number;mileage:number;reward:number}> = {};
    execs.forEach(e => {
      const ch = e.channel || "기타";
      if (!map[ch]) map[ch] = {count:0,mileage:0,reward:0};
      map[ch].count++;
      map[ch].mileage += (e.hightarget_mileage||0);
      map[ch].reward += (e.hightarget_reward||0) + (e.hogaengnono_reward||0) + (e.lms_reward||0);
    });
    return Object.entries(map).sort((a,b) => b[1].mileage+b[1].reward - (a[1].mileage+a[1].reward));
  }, [execs]);

  // 월별 추이
  const monthlyTrend = useMemo(() => {
    const map: Record<string,{mileage:number;reward:number}> = {};
    execs.forEach(e => {
      if (!e.payment_date) return;
      const m = e.payment_date.slice(0,7);
      if (!map[m]) map[m] = {mileage:0,reward:0};
      map[m].mileage += (e.hightarget_mileage||0);
      map[m].reward += (e.hightarget_reward||0) + (e.hogaengnono_reward||0) + (e.lms_reward||0);
    });
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]));
  }, [execs]);

  const history = useMemo(() => {
    const items: {date:string;type:string;desc:string;amount:number;sign:string}[] = [];
    execs.forEach(e => {
      if (e.hightarget_mileage>0) items.push({date:e.payment_date,type:"마일리지 적립",desc:`하이타겟 (${e.channel})`,amount:e.hightarget_mileage,sign:"+"});
      if (e.hightarget_reward>0) items.push({date:e.payment_date,type:"리워드 적립",desc:"하이타겟 리워드",amount:e.hightarget_reward,sign:"+"});
      if (e.hogaengnono_reward>0) items.push({date:e.payment_date,type:"리워드 적립",desc:"호갱노노 리워드",amount:e.hogaengnono_reward,sign:"+"});
      if (e.lms_reward>0) items.push({date:e.payment_date,type:"리워드 적립",desc:"LMS 리워드",amount:e.lms_reward,sign:"+"});
    });
    usages.forEach(u => items.push({date:u.usage_date,type:"마일리지 사용",desc:"마일리지 사용",amount:u.usage_amount,sign:"-"}));
    return items.sort((a,b) => b.date.localeCompare(a.date));
  }, [execs, usages]);

  const photoUrl = contact?.photo_url ? `https://rlpdhufcsuewvwluydky.supabase.co/storage/v1/object/public/customer-photos/${contact.photo_url}` : null;
  const guides = contents.filter(c => c.content_type === "guide");
  const links = contents.filter(c => c.content_type === "link");
  const maxMile = Math.max(...monthlyTrend.map(([,v])=>v.mileage), 1);

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f6fa"}}><div style={{width:28,height:28,border:"3px solid #1E3A8A",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (notFound) return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#f5f6fa",fontFamily:"'Pretendard',sans-serif"}}><div style={{fontSize:48,marginBottom:16}}>🔒</div><h1 style={{fontSize:20,fontWeight:700,color:"#334155"}}>접근할 수 없는 페이지입니다</h1><p style={{fontSize:14,color:"#94a3b8",marginTop:8}}>유효하지 않은 대시보드 코드입니다</p></div>;

  const Card = ({children,style,className}:{children:React.ReactNode;style?:React.CSSProperties;className?:string}) => <div className={className} style={{background:"#fff",borderRadius:20,padding:"24px",boxShadow:"0 2px 16px rgba(0,0,0,0.06)",...style}}>{children}</div>;
  const SectionTitle = ({children}:{children:React.ReactNode}) => <h3 style={{fontSize:16,fontWeight:700,color:"#1e293b",marginBottom:20,display:"flex",alignItems:"center",gap:8}}>{children}</h3>;

  return (
    <div style={{minHeight:"100vh",background:"#f0f2f7",fontFamily:"'Pretendard','Noto Sans KR',sans-serif"}}>
      {/* 헤더 */}
      <div style={{background:"linear-gradient(135deg, #1E3A8A 0%, #3B5FC0 50%, #1E3A8A 100%)",padding:"40px 24px 100px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.03)",top:-100,right:-50}}/>
        <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.03)",bottom:-80,left:-30}}/>
        <div style={{maxWidth:960,margin:"0 auto",textAlign:"center",position:"relative",zIndex:1}}>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:11,letterSpacing:"0.25em",fontWeight:600}}>BUNYANGOE VIP MEMBERSHIP</p>
          <h1 style={{color:"#fff",fontSize:26,fontWeight:800,marginTop:10}}>분양회 VIP 대시보드</h1>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"-72px auto 0",padding:"0 20px 48px",position:"relative",zIndex:1}}>
        {/* ═══ 프로필 + 요약 카드 ═══ */}
        <div className="dash-grid-4" style={{display:"grid",gap:14,marginBottom:16}}>
          {/* 프로필 */}
          <Card style={{display:"flex",alignItems:"center",gap:20}} className="dash-span-2">
            <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",background:"#e2e8f0",flexShrink:0,border:"3px solid #E8C87A",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {photoUrl ? <img src={photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:28,fontWeight:800,color:"#94a3b8"}}>{contact?.name?.[0]}</span>}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontSize:10,padding:"3px 10px",background:"linear-gradient(135deg,#FEF3C7,#FDE68A)",color:"#92400E",borderRadius:20,fontWeight:700,letterSpacing:"0.05em"}}>VIP</span>
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>{contact?.bunyanghoe_number}</span>
              </div>
              <h2 style={{fontSize:22,fontWeight:800,color:"#1e293b"}}>{contact?.name} <span style={{fontSize:14,fontWeight:500,color:"#94a3b8"}}>{contact?.title}</span></h2>
              <p style={{fontSize:12,color:"#94a3b8",marginTop:4}}>담당 {contact?.consultant} · 가입 {fDate(contact?.contract_date||"")}</p>
            </div>
          </Card>
          {/* 잔여 마일리지 */}
          <Card style={{borderLeft:"4px solid #3B82F6"}}>
            <p style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>잔여 마일리지</p>
            <p style={{fontSize:28,fontWeight:800,color:"#1e293b",marginTop:8}}>{fw(stats.remainMileage)}<span style={{fontSize:13,color:"#94a3b8",marginLeft:2}}>P</span></p>
            <p style={{fontSize:11,color:"#cbd5e1",marginTop:8}}>누적 {fw(stats.totalMileage)}P · 사용 {fw(stats.totalUsed)}P</p>
          </Card>
          {/* 누적 리워드 */}
          <Card style={{borderLeft:"4px solid #10B981"}}>
            <p style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>누적 리워드</p>
            <p style={{fontSize:28,fontWeight:800,color:"#1e293b",marginTop:8}}>{fw(stats.totalReward)}<span style={{fontSize:13,color:"#94a3b8",marginLeft:2}}>원</span></p>
            <p style={{fontSize:11,color:"#cbd5e1",marginTop:8}}>세전 · 원천징수 {fw(stats.tax)}원</p>
          </Card>
        </div>

        {/* ═══ 리워드 상세 + 월별 추이 ═══ */}
        <div className="dash-grid-2" style={{display:"grid",gap:14,marginBottom:16}}>
          {/* 리워드 상세 */}
          <Card>
            <SectionTitle><span style={{fontSize:18}}>💎</span>리워드 상세</SectionTitle>
            <div className="dash-grid-3" style={{display:"grid",gap:12}}>
              {[
                {label:"하이타겟",value:stats.htReward,color:"#6366F1"},
                {label:"호갱노노",value:stats.hogReward,color:"#14B8A6"},
                {label:"LMS",value:stats.lmsReward,color:"#EC4899"},
              ].map(r=>(
                <div key={r.label} style={{background:"#f8fafc",borderRadius:14,padding:"16px 14px",textAlign:"center",border:"1px solid #f1f5f9"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:r.color,margin:"0 auto 8px"}}/>
                  <p style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>{r.label}</p>
                  <p style={{fontSize:18,fontWeight:800,color:"#1e293b",marginTop:4}}>{fw(r.value)}<span style={{fontSize:10,color:"#94a3b8"}}>원</span></p>
                </div>
              ))}
            </div>
          </Card>

          {/* 월별 추이 */}
          <Card>
            <SectionTitle><span style={{fontSize:18}}>📊</span>월별 마일리지 적립</SectionTitle>
            {monthlyTrend.length === 0 ? (
              <p style={{textAlign:"center",color:"#cbd5e1",fontSize:13,padding:"32px 0"}}>데이터가 없습니다</p>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {monthlyTrend.map(([month, val]) => (
                  <div key={month} style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:12,color:"#64748b",fontWeight:600,width:64,flexShrink:0}}>{month.replace("-",".")}</span>
                    <div style={{flex:1,height:20,background:"#f1f5f9",borderRadius:10,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:10,background:"linear-gradient(90deg,#3B82F6,#6366F1)",width:`${Math.max(val.mileage/maxMile*100,3)}%`,transition:"width 0.5s"}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:"#334155",width:80,textAlign:"right"}}>{fw(val.mileage)}P</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ═══ 채널별 분석 + 광고 현황 ═══ */}
        <div className="dash-grid-2" style={{display:"grid",gap:14,marginBottom:16}}>
          {/* 채널별 */}
          <Card>
            <SectionTitle><span style={{fontSize:18}}>📋</span>채널별 현황</SectionTitle>
            {channelBreakdown.length === 0 ? (
              <p style={{textAlign:"center",color:"#cbd5e1",fontSize:13,padding:"24px 0"}}>데이터가 없습니다</p>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {channelBreakdown.map(([ch,v]) => (
                  <div key={ch} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"#f8fafc",borderRadius:12,border:"1px solid #f1f5f9"}}>
                    <div>
                      <p style={{fontSize:13,fontWeight:600,color:"#334155"}}>{ch}</p>
                      <p style={{fontSize:11,color:"#94a3b8"}}>{v.count}건</p>
                    </div>
                    <div style={{textAlign:"right"}}>
                      {v.mileage > 0 && <p style={{fontSize:13,fontWeight:700,color:"#3B82F6"}}>{fw(v.mileage)}P</p>}
                      {v.reward > 0 && <p style={{fontSize:12,fontWeight:600,color:"#10B981"}}>{fw(v.reward)}원</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 가입 정보 */}
          <Card>
            <SectionTitle><span style={{fontSize:18}}>📌</span>멤버십 정보</SectionTitle>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                {label:"회원번호",value:contact?.bunyanghoe_number||"-"},
                {label:"성명",value:`${contact?.name} ${contact?.title||""}`},
                {label:"담당 컨설턴트",value:contact?.consultant||"-"},
                {label:"대협팀 담당자",value:contact?.assigned_to||"-"},
                {label:"가입일",value:fDate(contact?.contract_date||"")},
                {label:"광고 집행 건수",value:`${execs.length}건`},
                {label:"누적 집행 금액",value:`${fw(stats.totalExecAmt)}원`},
              ].map(row=>(
                <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f5f6fa"}}>
                  <span style={{fontSize:13,color:"#94a3b8",fontWeight:500}}>{row.label}</span>
                  <span style={{fontSize:13,color:"#334155",fontWeight:600}}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ═══ 적립/사용 내역 ═══ */}
        <Card style={{marginBottom:16}}>
          <SectionTitle><span style={{fontSize:18}}>📒</span>적립 · 사용 내역</SectionTitle>
          {history.length === 0 ? (
            <p style={{textAlign:"center",color:"#cbd5e1",fontSize:13,padding:"32px 0"}}>내역이 없습니다</p>
          ) : (
            <div>
              {history.slice(0,30).map((h,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:i<Math.min(history.length,30)-1?"1px solid #f5f6fa":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{width:40,height:40,borderRadius:12,background:h.sign==="+"?"#EFF6FF":"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{h.sign==="+"?"📥":"📤"}</div>
                    <div>
                      <p style={{fontSize:14,fontWeight:600,color:"#334155"}}>{h.type}</p>
                      <p style={{fontSize:12,color:"#94a3b8"}}>{h.desc}</p>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <p style={{fontSize:15,fontWeight:700,color:h.sign==="+"?"#2563EB":"#EF4444"}}>{h.sign}{fw(h.amount)}{h.type.includes("마일리지")?"P":"원"}</p>
                    <p style={{fontSize:11,color:"#cbd5e1"}}>{fDate(h.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ═══ VIP 특전 가이드 ═══ */}
        <Card style={{marginBottom:16}}>
          <SectionTitle><span style={{fontSize:18}}>🎁</span>VIP 특전 가이드</SectionTitle>
          {guides.length > 0 ? (
            <div className="dash-grid-3" style={{display:"grid",gap:12}}>
              {guides.map(g=>(
                <a key={g.id} href={g.url||"#"} target="_blank" rel="noopener noreferrer" style={{display:"block",padding:"20px",borderRadius:16,background:"#f8fafc",border:"1px solid #e2e8f0",textDecoration:"none",textAlign:"center",transition:"all 0.2s"}}>
                  <p style={{fontSize:14,fontWeight:700,color:"#334155"}}>{g.title}</p>
                  {g.description&&<p style={{fontSize:12,color:"#94a3b8",marginTop:6}}>{g.description}</p>}
                </a>
              ))}
            </div>
          ) : (
            <div className="dash-grid-4s" style={{display:"grid",gap:10}}>
              {[
                {icon:"🎯",label:"하이타겟",desc:"맞춤형 광고"},
                {icon:"📱",label:"호갱노노",desc:"부동산 앱 광고"},
                {icon:"💬",label:"LMS",desc:"문자 마케팅"},
                {icon:"📰",label:"매거진",desc:"퍼스널 브랜딩"},
              ].map(g=>(
                <div key={g.label} style={{padding:"20px 14px",borderRadius:16,background:"#f8fafc",border:"1px solid #f1f5f9",textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:8}}>{g.icon}</div>
                  <p style={{fontSize:13,fontWeight:700,color:"#334155"}}>{g.label}</p>
                  <p style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{g.desc}</p>
                  <p style={{fontSize:10,color:"#cbd5e1",marginTop:8}}>준비 중</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ═══ 콘텐츠 & 링크 ═══ */}
        <Card style={{marginBottom:16}}>
          <SectionTitle><span style={{fontSize:18}}>🔗</span>콘텐츠 & 링크</SectionTitle>
          {links.length > 0 ? (
            <div className="dash-grid-2s" style={{display:"grid",gap:10}}>
              {links.map(l=>(
                <a key={l.id} href={l.url||"#"} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:14,background:"#f8fafc",border:"1px solid #e2e8f0",textDecoration:"none",transition:"all 0.2s"}}>
                  <span style={{fontSize:20}}>📎</span>
                  <div><p style={{fontSize:13,fontWeight:600,color:"#334155"}}>{l.title}</p>{l.description&&<p style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{l.description}</p>}</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="dash-grid-3" style={{display:"grid",gap:10}}>
              {[{icon:"📺",label:"분양의신 유튜브"},{icon:"📰",label:"분양의신 매거진"},{icon:"📱",label:"분양의신 앱"}].map(l=>(
                <div key={l.label} style={{padding:"18px",borderRadius:14,background:"#f8fafc",border:"1px solid #f1f5f9",textAlign:"center"}}>
                  <div style={{fontSize:24,marginBottom:6}}>{l.icon}</div>
                  <p style={{fontSize:13,fontWeight:600,color:"#94a3b8"}}>{l.label}</p>
                  <p style={{fontSize:10,color:"#cbd5e1",marginTop:4}}>준비 중</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 푸터 */}
        <div style={{textAlign:"center",padding:"32px 0 8px",color:"#cbd5e1",fontSize:12}}>
          <p style={{fontWeight:600}}>© 2026 광고인㈜ · 분양의신</p>
          <p style={{marginTop:4}}>분양회 VIP Membership</p>
        </div>
      </div>

      <style>{`
        .dash-grid-4{grid-template-columns:1fr 1fr 1fr 1fr;}
        .dash-grid-2{grid-template-columns:1fr 1fr;}
        .dash-grid-3{grid-template-columns:1fr 1fr 1fr;}
        .dash-grid-4s{grid-template-columns:1fr 1fr 1fr 1fr;}
        .dash-grid-2s{grid-template-columns:1fr 1fr;}
        .dash-span-2{grid-column:span 2;}
        @media(max-width:768px){
          .dash-grid-4{grid-template-columns:1fr !important;}
          .dash-grid-2{grid-template-columns:1fr !important;}
          .dash-grid-3{grid-template-columns:1fr 1fr !important;}
          .dash-grid-4s{grid-template-columns:1fr 1fr !important;}
          .dash-grid-2s{grid-template-columns:1fr !important;}
          .dash-span-2{grid-column:span 1 !important;}
        }
      `}</style>
    </div>
  );
}
