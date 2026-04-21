"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Contact { id:number; name:string; title:string; bunyanghoe_number:string; consultant:string; assigned_to:string; contract_date:string; photo_url:string; phone:string; }
interface ExecRow { id:number; member_name:string; bunyanghoe_number:string; hightarget_mileage:number; hightarget_reward:number; hogaengnono_reward:number; lms_reward:number; payment_date:string; channel:string; execution_amount:number; vat_amount:number; contract_route:string; }
interface MileUsage { id:number; contact_id:number; usage_date:string; usage_amount:number; }

// 담당자 연락처 매핑
const CONSULTANT_INFO: Record<string,{title:string;phone:string}> = {
  "박경화":{title:"총괄본부장",phone:"010-7602-2564"},"박혜은":{title:"총괄본부장",phone:"010-7584-2564"},
  "박민경":{title:"본부장",phone:"010-2242-2564"},"조승현":{title:"본부장",phone:"010-7546-2564"},
  "백선중":{title:"팀장",phone:"010-7538-2564"},"강아름":{title:"팀장",phone:"010-8144-2564"},
  "전정훈":{title:"팀장",phone:"010-8449-2564"},"박나라":{title:"팀장",phone:"010-5817-2568"},
};
const TEAM_INFO: Record<string,{title:string;phone:string}> = {
  "조계현":{title:"부장",phone:"010-3964-2564"},"이세호":{title:"과장",phone:"010-8336-2564"},
  "기여운":{title:"과장",phone:"010-6718-3301"},"최연전":{title:"과장",phone:"010-7760-2560"},
};

const fw = (n:number) => n.toLocaleString();
const fDate = (d:string) => { if(!d) return "-"; const dt=new Date(d+"T00:00:00"); return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`; };

export default function CustomerDashboard() {
  const { code } = useParams();
  const [contact, setContact] = useState<Contact|null>(null);
  const [execs, setExecs] = useState<ExecRow[]>([]);
  const [usages, setUsages] = useState<MileUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("전체");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideSection, setGuideSection] = useState("");

  useEffect(() => {
    if (!code) return;
    const load = async () => {
      setLoading(true);
      const { data: c } = await supabase.from("contacts").select("id,name,title,bunyanghoe_number,consultant,assigned_to,contract_date,photo_url,phone").eq("dashboard_code", code).maybeSingle();
      if (!c) { setNotFound(true); setLoading(false); return; }
      setContact(c as Contact);
      const [r1, r2] = await Promise.all([
        supabase.from("ad_executions").select("id,member_name,bunyanghoe_number,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward,payment_date,channel,execution_amount,vat_amount,contract_route").or(`member_name.eq.${c.name},bunyanghoe_number.eq.${c.bunyanghoe_number}`).order("payment_date",{ascending:false}),
        supabase.from("mileage_usages").select("*").eq("contact_id", c.id).order("usage_date",{ascending:false}),
      ]);
      setExecs((r1.data||[]) as ExecRow[]); setUsages((r2.data||[]) as MileUsage[]);
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
    return { totalMileage, htReward, hogReward, lmsReward, totalReward, totalUsed, remainMileage: totalMileage - totalUsed };
  }, [execs, usages]);

  const history = useMemo(() => {
    const items: {date:string;type:string;channel:string;mileage:number;reward:number;sign:string}[] = [];
    execs.forEach(e => {
      items.push({ date:e.payment_date, type:"광고 적립", channel:e.channel||"기타", mileage:e.hightarget_mileage||0, reward:(e.hightarget_reward||0)+(e.hogaengnono_reward||0)+(e.lms_reward||0), sign:"+" });
    });
    usages.forEach(u => { items.push({ date:u.usage_date, type:"마일리지 사용", channel:"", mileage:u.usage_amount, reward:0, sign:"-" }); });
    return items.sort((a,b) => b.date.localeCompare(a.date));
  }, [execs, usages]);

  const filtered = tab==="전체" ? history : tab==="적립" ? history.filter(h=>h.sign==="+") : history.filter(h=>h.sign==="-");
  const photoUrl = contact?.photo_url ? `https://rlpdhufcsuewvwluydky.supabase.co/storage/v1/object/public/customer-photos/${contact.photo_url}` : null;
  const cInfo = contact?.consultant ? CONSULTANT_INFO[contact.consultant] : null;
  const tInfo = contact?.assigned_to ? TEAM_INFO[contact.assigned_to] : null;

  // VIP 가이드 카테고리
  const GUIDE_CATS = [
    {id:"start",emoji:"🚀",title:"분양회 시작하기",desc:"입회 자격, 프로세스, 회비 안내",color:"#FF6B35"},
    {id:"ad",emoji:"📢",title:"광고 특전 이용하기",desc:"하이타겟, LMS, 호갱노노, 리워드",color:"#2962FF"},
    {id:"pr",emoji:"⭐",title:"홍보 특전 이용하기",desc:"PR패키지, 매거진, 앱 노출",color:"#7C3AED"},
    {id:"network",emoji:"🤝",title:"네트워킹 특전",desc:"컨퍼런스, 세미나, 전용 네트워크",color:"#059669"},
    {id:"reward",emoji:"💰",title:"리워드 및 정산 안내",desc:"리워드 비율, 정산주기, 인센티브",color:"#D97706"},
    {id:"app",emoji:"📱",title:"분양의신 앱 이용",desc:"앱 기능 가이드",color:"#475569"},
  ];

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#fff"}}><div style={{width:28,height:28,border:"3px solid #1E3A8A",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (notFound) return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff"}}><div style={{fontSize:48,marginBottom:16}}>🔒</div><h1 style={{fontSize:20,fontWeight:700,color:"#334155"}}>접근할 수 없는 페이지입니다</h1></div>;

  return (
    <div style={{minHeight:"100vh",background:"#fff",fontFamily:"'Pretendard','Noto Sans KR',sans-serif"}}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css');
        *{box-sizing:border-box;margin:0;padding:0}
        .dw{max-width:960px;margin:0 auto;display:flex;gap:0;min-height:100vh}
        .dl{flex:1;min-width:0;max-width:480px;border-right:1px solid #f1f1f1}
        .dr{flex:1;min-width:360px;padding:28px 28px}
        @media(max-width:768px){.dw{flex-direction:column-reverse}.dl{border-right:none;border-top:8px solid #f5f5f5}.dr{width:100%;padding:24px 20px}}
      `}</style>

      <div className="dw">
        {/* ═══ 좌측: 내역 ═══ */}
        <div className="dl">
          <div style={{display:"flex",alignItems:"center",gap:20,padding:"20px 24px",borderBottom:"1px solid #f1f1f1",position:"sticky",top:0,background:"#fff",zIndex:10}}>
            {["전체","적립","사용"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{fontSize:15,fontWeight:tab===t?700:400,color:tab===t?"#222":"#999",background:"none",border:"none",cursor:"pointer",padding:"4px 0",borderBottom:tab===t?"2px solid #222":"2px solid transparent"}}>{t}</button>
            ))}
            <span style={{fontSize:13,color:"#bbb",marginLeft:"auto"}}>{filtered.length}건</span>
          </div>
          <div style={{padding:"0 24px"}}>
            {filtered.length===0 ? <div style={{textAlign:"center",padding:"60px 0",color:"#ccc",fontSize:14}}>내역이 없습니다</div> : filtered.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"18px 0",borderBottom:"1px solid #f8f8f8"}}>
                <div style={{width:42,height:42,borderRadius:12,flexShrink:0,background:h.sign==="+"?"#f0f7ff":"#fff5f5",display:"flex",alignItems:"center",justifyContent:"center",border:h.sign==="+"?"1px solid #dbeafe":"1px solid #fee2e2"}}>
                  <span style={{fontSize:16}}>{h.sign==="+"?"📥":"📤"}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"#222"}}>{h.type}</span>
                  </div>
                  {h.channel && <p style={{fontSize:13,color:"#999",marginTop:2}}>{h.channel}</p>}
                  <p style={{fontSize:12,color:"#bbb",marginTop:4}}>{fDate(h.date)}</p>
                  <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                    {h.mileage>0 && <span style={{fontSize:11,fontWeight:600,color:h.sign==="+"?"#2563eb":"#ef4444",padding:"3px 10px",background:h.sign==="+"?"#eff6ff":"#fef2f2",borderRadius:20,border:h.sign==="+"?"1px solid #dbeafe":"1px solid #fee2e2"}}>{h.sign==="+"?"마일리지 +":"마일리지 -"}{fw(h.mileage)}P</span>}
                    {h.reward>0 && <span style={{fontSize:11,fontWeight:600,color:"#16a34a",padding:"3px 10px",background:"#f0fdf4",borderRadius:20,border:"1px solid #dcfce7"}}>리워드 +{fw(h.reward)}원</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 우측: 사이드바 ═══ */}
        <div className="dr">
          {/* 프로필: 사진 | 이름 | 로고 */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
            <div style={{width:100,height:120,borderRadius:12,overflow:"hidden",flexShrink:0,background:"#1a1a1a",border:"2px solid #D4A843",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
              {photoUrl ? <img src={photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 15%"}}/> : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:32,fontWeight:800,color:"#D4A843"}}>{contact?.name?.[0]}</span></div>}
            </div>
            <div style={{flex:1}}>
              <h2 style={{fontSize:20,fontWeight:800,color:"#222"}}>{contact?.name} <span style={{fontSize:13,fontWeight:500,color:"#999"}}>{contact?.title}</span></h2>
            </div>
            <img src="/bunyanghoe-logo.png" alt="분양회" style={{width:52,height:52,objectFit:"contain",flexShrink:0}} onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none"}}/>
          </div>

          {/* VIP 뱃지 */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,padding:"10px 14px",background:"linear-gradient(90deg,#1a1a1a,#2d2318)",borderRadius:10}}>
            <span style={{fontSize:10,padding:"2px 8px",background:"#D4A843",color:"#1a1a1a",borderRadius:4,fontWeight:800}}>VIP</span>
            <span style={{fontSize:12,color:"#D4A843",fontWeight:600}}>분양회 프리미엄 멤버십</span>
          </div>

          {/* 포인트 카드 2개 (동일 스타일) */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div style={{background:"#f8fafc",borderRadius:14,padding:"18px 16px",border:"1px solid #e8edf2"}}>
              <p style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:8}}>하이타겟 마일리지</p>
              <p style={{fontSize:24,fontWeight:800,color:"#1e293b"}}>{fw(stats.remainMileage)}<span style={{fontSize:12,color:"#94a3b8",marginLeft:2}}>P</span></p>
            </div>
            <div style={{background:"#f8fafc",borderRadius:14,padding:"18px 16px",border:"1px solid #e8edf2"}}>
              <p style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:8}}>리워드</p>
              <p style={{fontSize:24,fontWeight:800,color:"#1e293b"}}>{fw(stats.totalReward)}<span style={{fontSize:12,color:"#94a3b8",marginLeft:2}}>원</span></p>
            </div>
          </div>
          {/* 누적 인센티브 */}
          <div style={{background:"linear-gradient(135deg,#fefce8,#fef9c3)",borderRadius:14,padding:"18px 16px",border:"1px solid #fde68a",marginBottom:24}}>
            <p style={{fontSize:11,fontWeight:600,color:"#92400e",marginBottom:8}}>누적 인센티브</p>
            <p style={{fontSize:24,fontWeight:800,color:"#78350f"}}>{fw(stats.totalReward + stats.totalMileage)}<span style={{fontSize:12,color:"#a16207",marginLeft:2}}>원</span></p>
          </div>

          {/* 내 정보 */}
          <div style={{borderTop:"1px solid #f1f1f1",paddingTop:16,marginBottom:16}}>
            <p style={{fontSize:13,fontWeight:700,color:"#222",marginBottom:12}}>내 정보</p>
            <div style={{padding:"10px 0",borderBottom:"1px solid #f8f8f8",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:13,color:"#666"}}>성명 / 직급</span>
              <span style={{fontSize:13,fontWeight:600,color:"#333"}}>{contact?.name} {contact?.title}</span>
            </div>
            <div style={{padding:"10px 0",borderBottom:"1px solid #f8f8f8",display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontSize:13,color:"#666"}}>가입일</span>
              <span style={{fontSize:13,fontWeight:600,color:"#333"}}>{fDate(contact?.contract_date||"")}</span>
            </div>
            {contact?.assigned_to && tInfo && (
              <div style={{padding:"12px 14px",background:"#f8fafc",borderRadius:10,border:"1px solid #f1f1f1",marginBottom:8}}>
                <p style={{fontSize:12,color:"#94a3b8",fontWeight:600,marginBottom:6}}>대외협력팀 담당자</p>
                <p style={{fontSize:14,fontWeight:700,color:"#222"}}>{contact.assigned_to} {tInfo.title}</p>
                <a href={`tel:${tInfo.phone}`} style={{fontSize:13,color:"#3b82f6",textDecoration:"none",marginTop:2,display:"block"}}>{tInfo.phone}</a>
              </div>
            )}
            {contact?.consultant && cInfo && (
              <div style={{padding:"12px 14px",background:"#f8fafc",borderRadius:10,border:"1px solid #f1f1f1",marginBottom:8}}>
                <p style={{fontSize:12,color:"#94a3b8",fontWeight:600,marginBottom:6}}>광고사업부 담당자</p>
                <p style={{fontSize:14,fontWeight:700,color:"#222"}}>{contact.consultant} {cInfo.title}</p>
                <a href={`tel:${cInfo.phone}`} style={{fontSize:13,color:"#3b82f6",textDecoration:"none",marginTop:2,display:"block"}}>{cInfo.phone}</a>
              </div>
            )}
          </div>

          {/* 마일리지 및 리워드 상세 */}
          <div style={{borderTop:"1px solid #f1f1f1",paddingTop:16,marginBottom:16}}>
            <p style={{fontSize:13,fontWeight:700,color:"#222",marginBottom:12}}>마일리지 및 리워드 상세</p>
            {[
              {icon:"🎯",label:"하이타겟 마일리지",value:`${fw(stats.totalMileage)}P`,detail:execs.filter(e=>(e.hightarget_mileage||0)>0).map(e=>({date:e.payment_date,ch:e.channel,amt:e.hightarget_mileage,unit:"P"}))},
              {icon:"🎯",label:"하이타겟 리워드",value:`${fw(stats.htReward)}원`,detail:execs.filter(e=>(e.hightarget_reward||0)>0).map(e=>({date:e.payment_date,ch:e.channel,amt:e.hightarget_reward,unit:"원"}))},
              {icon:"📱",label:"호갱노노 리워드",value:`${fw(stats.hogReward)}원`,detail:execs.filter(e=>(e.hogaengnono_reward||0)>0).map(e=>({date:e.payment_date,ch:e.channel,amt:e.hogaengnono_reward,unit:"원"}))},
              {icon:"💬",label:"LMS 리워드",value:`${fw(stats.lmsReward)}원`,detail:execs.filter(e=>(e.lms_reward||0)>0).map(e=>({date:e.payment_date,ch:e.channel,amt:e.lms_reward,unit:"원"}))},
            ].map(row=>(
              <details key={row.label} style={{borderBottom:"1px solid #f8f8f8"}}>
                <summary style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",cursor:"pointer",listStyle:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:14}}>{row.icon}</span>
                    <span style={{fontSize:13,color:"#666"}}>{row.label}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#333"}}>{row.value}</span>
                    <span style={{fontSize:10,color:"#ccc"}}>▼</span>
                  </div>
                </summary>
                {row.detail.length > 0 ? (
                  <div style={{padding:"4px 0 12px 28px"}}>
                    {row.detail.map((d: any,i: number)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12}}>
                        <span style={{color:"#999"}}>{fDate(d.date)} · {d.ch}</span>
                        <span style={{fontWeight:600,color:"#2563eb"}}>+{fw(d.amt)}{d.unit}</span>
                      </div>
                    ))}
                  </div>
                ) : <p style={{padding:"8px 0 12px 28px",fontSize:12,color:"#ccc"}}>내역 없음</p>}
              </details>
            ))}
          </div>

          {/* 분양회 VIP 이용가이드 */}
          <div style={{borderTop:"1px solid #f1f1f1",paddingTop:16,marginBottom:16}}>
            <p style={{fontSize:13,fontWeight:700,color:"#222",marginBottom:12}}>분양회 VIP 이용가이드</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {GUIDE_CATS.map(cat=>(
                <button key={cat.id} onClick={()=>{setGuideOpen(true);setGuideSection(cat.id);}} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 14px",borderRadius:10,border:"1px solid #f1f1f1",background:"#fafafa",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"background 0.15s"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:cat.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:600,color:"#333"}}>{cat.title}</p>
                    <p style={{fontSize:11,color:"#999",marginTop:1}}>{cat.desc}</p>
                  </div>
                  <span style={{fontSize:14,color:"#ccc"}}>›</span>
                </button>
              ))}
            </div>
          </div>

          {/* 푸터 */}
          <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid #f1f1f1",textAlign:"center"}}>
            <p style={{fontSize:11,color:"#ccc"}}>© 2026 광고인㈜ · 분양의신</p>
          </div>
        </div>
      </div>

      {/* ═══ VIP 가이드 모달 ═══ */}
      {guideOpen && (
        <div style={{position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setGuideOpen(false)}>
          <div style={{background:"#fff",borderRadius:20,width:"90%",maxWidth:600,maxHeight:"85vh",overflow:"auto",padding:"32px 28px"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:800,color:"#222"}}>{GUIDE_CATS.find(c=>c.id===guideSection)?.title}</h2>
              <button onClick={()=>setGuideOpen(false)} style={{background:"none",border:"none",fontSize:20,color:"#999",cursor:"pointer"}}>✕</button>
            </div>
            {guideSection==="reward" && (
              <div>
                <p style={{fontSize:14,color:"#555",lineHeight:1.8,marginBottom:16}}>분양회 VIP 멤버십의 리워드 및 마일리지 적립률 안내입니다.</p>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:20}}>
                  <thead><tr style={{background:"#f8fafc"}}><th style={{padding:"12px 14px",textAlign:"left",fontWeight:700,borderBottom:"2px solid #e2e8f0"}}>광고채널</th><th style={{padding:"12px 14px",textAlign:"center",fontWeight:700,borderBottom:"2px solid #e2e8f0"}}>마일리지</th><th style={{padding:"12px 14px",textAlign:"center",fontWeight:700,borderBottom:"2px solid #e2e8f0"}}>리워드</th></tr></thead>
                  <tbody>
                    <tr><td style={{padding:"12px 14px",borderBottom:"1px solid #f1f1f1"}}>분양의신 하이타겟</td><td style={{padding:"12px 14px",textAlign:"center",borderBottom:"1px solid #f1f1f1",fontWeight:600,color:"#2563eb"}}>10%</td><td style={{padding:"12px 14px",textAlign:"center",borderBottom:"1px solid #f1f1f1",fontWeight:600,color:"#16a34a"}}>5%</td></tr>
                    <tr><td style={{padding:"12px 14px",borderBottom:"1px solid #f1f1f1"}}>호갱노노</td><td style={{padding:"12px 14px",textAlign:"center",borderBottom:"1px solid #f1f1f1",fontWeight:600,color:"#2563eb"}}>5%</td><td style={{padding:"12px 14px",textAlign:"center",borderBottom:"1px solid #f1f1f1",fontWeight:600,color:"#16a34a"}}>5%</td></tr>
                    <tr><td style={{padding:"12px 14px",borderBottom:"1px solid #f1f1f1"}}>LMS</td><td style={{padding:"12px 14px",textAlign:"center",borderBottom:"1px solid #f1f1f1",fontWeight:600,color:"#2563eb"}}>15%</td><td style={{padding:"12px 14px",textAlign:"center",borderBottom:"1px solid #f1f1f1",fontWeight:600,color:"#16a34a"}}>5%</td></tr>
                  </tbody>
                </table>
                <p style={{fontSize:12,color:"#999",lineHeight:1.6}}>※ 마일리지는 자사 광고 집행 시 적립됩니다.<br/>※ 리워드는 분기별 정산 후 현금 지급됩니다. (원천징수 3.3% 차감)</p>
              </div>
            )}
            {guideSection==="start" && (
              <div>
                <p style={{fontSize:14,color:"#555",lineHeight:1.8,marginBottom:16}}>분양회는 분양업계 상위 3%, 리더 100인만을 위한 프라이빗 멤버십입니다.</p>
                <p style={{fontSize:14,color:"#555",lineHeight:1.8}}>전체 분양상담사 약 45,000명 중 상위권 팀장 900명, 상위권 본부장 450명, 그 중 분양회 100명이 선발됩니다.</p>
                <div style={{marginTop:16,padding:"16px",background:"#f8fafc",borderRadius:12,border:"1px solid #e2e8f0"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead><tr style={{background:"#f1f5f9"}}><th style={{padding:"10px 12px",textAlign:"left",fontWeight:700}}>특전</th><th style={{padding:"10px 12px",textAlign:"left",fontWeight:700}}>콘셉트</th><th style={{padding:"10px 12px",textAlign:"right",fontWeight:700}}>연간 체감가치</th></tr></thead>
                    <tbody>
                      <tr><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0"}}>광고 특전</td><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0"}}>광고 잘하는 리더</td><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0",textAlign:"right",fontWeight:700}}>~1억원</td></tr>
                      <tr><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0"}}>홍보 특전</td><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0"}}>팀원이 먼저 찾는 리더</td><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0",textAlign:"right",fontWeight:700}}>~1,000만원</td></tr>
                      <tr><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0"}}>네트워킹 특전</td><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0"}}>좋은 현장 가져오는 리더</td><td style={{padding:"10px 12px",borderTop:"1px solid #e2e8f0",textAlign:"right",fontWeight:700}}>~1,000만원</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {guideSection==="ad" && (
              <div style={{fontSize:14,color:"#555",lineHeight:1.8}}>
                <p style={{marginBottom:12}}>분양회 VIP 멤버십의 광고 특전 안내입니다.</p>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[{t:"횡보기간 단독 콜보장",d:"정체기 현장 하이타겟 광고 독점 집행, 150% 효과 보장"},{t:"LMS 광고 이용 및 리워드",d:"장문 문자 광고, 마일리지 15% + 리워드 5%"},{t:"호갱노노 광고 이용 및 리워드",d:"부동산 플랫폼 광고, 마일리지 5% + 리워드 5%"},{t:"분양의신 광고 이용 및 리워드",d:"마일리지 10% 또는 리워드 5% 택1"},{t:"본부 광고비 지원 제안서",d:"현장 맞춤형 브리핑용 제안서 무료 제작"},{t:"PC+모바일 홈페이지",d:"팀원 수만큼 퍼포먼스형 홈페이지 무료 제공"}].map(item=>(
                    <div key={item.t} style={{padding:"14px",background:"#f8fafc",borderRadius:10,border:"1px solid #f1f1f1"}}>
                      <p style={{fontSize:14,fontWeight:700,color:"#222"}}>{item.t}</p>
                      <p style={{fontSize:13,color:"#666",marginTop:2}}>{item.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {guideSection==="pr" && (
              <div style={{fontSize:14,color:"#555",lineHeight:1.8}}>
                <p style={{marginBottom:12}}>퍼스널 브랜딩을 위한 홍보 특전 안내입니다.</p>
                {[{t:"PR패키지 3종",d:"프로필 촬영(50만원) + 아티클 작성(50만원) + 플랫폼 노출"},{t:"분신 매거진 게재",d:"연 2회 발행 매거진 VIP 전용 섹션"},{t:"앱 내 프리미엄 노출",d:"45,000명 대상 VIP 전용 영역 무료 노출"},{t:"VIP 이모티콘 및 인증서",d:"분기 1회 이모티콘 + 공식 인증서 제공"}].map(item=>(
                  <div key={item.t} style={{padding:"14px",background:"#f8fafc",borderRadius:10,border:"1px solid #f1f1f1",marginBottom:8}}>
                    <p style={{fontSize:14,fontWeight:700,color:"#222"}}>{item.t}</p>
                    <p style={{fontSize:13,color:"#666",marginTop:2}}>{item.d}</p>
                  </div>
                ))}
              </div>
            )}
            {guideSection==="network" && (
              <div style={{fontSize:14,color:"#555",lineHeight:1.8}}>
                <p style={{marginBottom:12}}>네트워킹 특전 안내입니다.</p>
                {[{t:"분신 컨퍼런스 VIP 초청",d:"연 2회, VIP 좌석 배정 + 공식 포지션 노출"},{t:"교육/세미나 VIP 우선 초청",d:"연 4회 세미나·워크샵 우선 등록"},{t:"전용 네트워크 라운지",d:"VIP 100인 전용 프라이빗 커뮤니티"}].map(item=>(
                  <div key={item.t} style={{padding:"14px",background:"#f8fafc",borderRadius:10,border:"1px solid #f1f1f1",marginBottom:8}}>
                    <p style={{fontSize:14,fontWeight:700,color:"#222"}}>{item.t}</p>
                    <p style={{fontSize:13,color:"#666",marginTop:2}}>{item.d}</p>
                  </div>
                ))}
              </div>
            )}
            {guideSection==="app" && (
              <div style={{fontSize:14,color:"#555",lineHeight:1.8}}>
                <p>분양의신 앱 가이드는 앱 출시 후 업데이트 예정입니다.</p>
              </div>
            )}
            {/* 가이드 하단 담당자 연락처 */}
            <div style={{marginTop:24,padding:"16px",background:"#f8fafc",borderRadius:12,border:"1px solid #e2e8f0",fontSize:13,color:"#666"}}>
              <p style={{fontWeight:700,color:"#333",marginBottom:8}}>문의</p>
              {contact?.assigned_to && tInfo && <p>대외협력팀 {contact.assigned_to} {tInfo.title} <a href={`tel:${tInfo.phone}`} style={{color:"#3b82f6"}}>{tInfo.phone}</a></p>}
              {contact?.consultant && cInfo && <p>광고사업부 {contact.consultant} {cInfo.title} <a href={`tel:${cInfo.phone}`} style={{color:"#3b82f6"}}>{cInfo.phone}</a></p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
