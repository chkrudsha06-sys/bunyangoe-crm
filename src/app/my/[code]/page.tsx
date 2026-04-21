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
const fShort = (d:string) => { if(!d) return "-"; const dt=new Date(d+"T00:00:00"); return `${dt.getMonth()+1}. ${String(dt.getDate()).padStart(2,"0")}.`; };

export default function CustomerDashboard() {
  const { code } = useParams();
  const [contact, setContact] = useState<Contact|null>(null);
  const [execs, setExecs] = useState<ExecRow[]>([]);
  const [usages, setUsages] = useState<MileUsage[]>([]);
  const [contents, setContents] = useState<DashContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("전체");

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
    return { totalMileage, htReward, hogReward, lmsReward, totalReward, totalUsed, remainMileage: totalMileage - totalUsed, netReward: totalReward - tax, tax };
  }, [execs, usages]);

  // 통합 내역
  const history = useMemo(() => {
    const items: {date:string;type:string;channel:string;amount:number;mileage:number;reward:number;sign:string;category:string}[] = [];
    execs.forEach(e => {
      const eff = (e.vat_amount&&e.vat_amount>0&&e.vat_amount!==e.execution_amount)?e.vat_amount:(e.execution_amount||0);
      items.push({
        date:e.payment_date, type:"광고집행", channel:e.channel||"기타",
        amount:eff, mileage:e.hightarget_mileage||0,
        reward:(e.hightarget_reward||0)+(e.hogaengnono_reward||0)+(e.lms_reward||0),
        sign:"+", category:"적립"
      });
    });
    usages.forEach(u => {
      items.push({ date:u.usage_date, type:"마일리지 사용", channel:"", amount:0, mileage:u.usage_amount, reward:0, sign:"-", category:"사용" });
    });
    return items.sort((a,b) => b.date.localeCompare(a.date));
  }, [execs, usages]);

  const filtered = tab==="전체" ? history : tab==="적립" ? history.filter(h=>h.sign==="+") : history.filter(h=>h.sign==="-");

  const photoUrl = contact?.photo_url ? `https://rlpdhufcsuewvwluydky.supabase.co/storage/v1/object/public/customer-photos/${contact.photo_url}` : null;
  const guides = contents.filter(c => c.content_type === "guide");
  const links = contents.filter(c => c.content_type === "link");

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#fff"}}><div style={{width:28,height:28,border:"3px solid #1E3A8A",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (notFound) return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",fontFamily:"'Pretendard',sans-serif"}}><div style={{fontSize:48,marginBottom:16}}>🔒</div><h1 style={{fontSize:20,fontWeight:700,color:"#334155"}}>접근할 수 없는 페이지입니다</h1><p style={{fontSize:14,color:"#94a3b8",marginTop:8}}>유효하지 않은 대시보드 코드입니다</p></div>;

  return (
    <div style={{minHeight:"100vh",background:"#fff",fontFamily:"'Pretendard','Noto Sans KR',sans-serif"}}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css');
        * { box-sizing:border-box; margin:0; padding:0; }
        .dash-wrap { max-width:960px; margin:0 auto; display:flex; gap:0; min-height:100vh; }
        .dash-left { flex:1; min-width:0; border-right:1px solid #f1f1f1; }
        .dash-right { width:320px; flex-shrink:0; padding:32px 24px; }
        @media(max-width:768px) {
          .dash-wrap { flex-direction:column-reverse; }
          .dash-left { border-right:none; border-top:8px solid #f5f5f5; }
          .dash-right { width:100%; padding:24px 20px; }
        }
      `}</style>

      <div className="dash-wrap">
        {/* ═══ 좌측: 내역 ═══ */}
        <div className="dash-left">
          {/* 탭 */}
          <div style={{display:"flex",alignItems:"center",gap:20,padding:"20px 24px",borderBottom:"1px solid #f1f1f1",position:"sticky",top:0,background:"#fff",zIndex:10}}>
            {["전체","적립","사용"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                fontSize:15,fontWeight:tab===t?700:400,color:tab===t?"#222":"#999",
                background:"none",border:"none",cursor:"pointer",padding:"4px 0",
                borderBottom:tab===t?"2px solid #222":"2px solid transparent",
              }}>{t}</button>
            ))}
            <span style={{fontSize:13,color:"#bbb",marginLeft:"auto"}}>총 {filtered.length}건</span>
          </div>

          {/* 내역 리스트 */}
          <div style={{padding:"0 24px"}}>
            {filtered.length === 0 ? (
              <div style={{textAlign:"center",padding:"60px 0",color:"#ccc",fontSize:14}}>내역이 없습니다</div>
            ) : (
              filtered.map((h,i) => (
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"20px 0",borderBottom:"1px solid #f8f8f8"}}>
                  {/* 아이콘 */}
                  <div style={{
                    width:44,height:44,borderRadius:12,flexShrink:0,
                    background:h.sign==="+"?"#f0f7ff":"#fff5f5",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    border:h.sign==="+"?"1px solid #dbeafe":"1px solid #fee2e2",
                  }}>
                    <span style={{fontSize:18}}>{h.sign==="+"?"📥":"📤"}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:15,fontWeight:600,color:"#222"}}>{h.type}</span>
                      {h.mileage > 0 && (
                        <span style={{fontSize:15,fontWeight:700,color:h.sign==="+"?"#2563EB":"#EF4444"}}>
                          {h.sign}{fw(h.mileage)}P
                        </span>
                      )}
                    </div>
                    {h.channel && <p style={{fontSize:13,color:"#999",marginTop:2}}>{h.channel}</p>}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}>
                      <span style={{fontSize:12,color:"#bbb"}}>{fDate(h.date)}</span>
                      {h.amount > 0 && <span style={{fontSize:12,color:"#bbb"}}>집행 {fw(h.amount)}원</span>}
                    </div>
                    {h.reward > 0 && (
                      <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",background:"#f0fdf4",borderRadius:20,border:"1px solid #dcfce7"}}>
                        <span style={{fontSize:11,color:"#16a34a",fontWeight:600}}>리워드 +{fw(h.reward)}원</span>
                      </div>
                    )}
                    {h.mileage > 0 && h.sign === "+" && (
                      <div style={{marginTop:4,display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",background:"#eff6ff",borderRadius:20,border:"1px solid #dbeafe"}}>
                        <span style={{fontSize:11,color:"#2563eb",fontWeight:600}}>마일리지 +{fw(h.mileage)}P</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 콘텐츠 & 링크 */}
          {(guides.length > 0 || links.length > 0) && (
            <div style={{padding:"24px",borderTop:"8px solid #f5f5f5"}}>
              <p style={{fontSize:15,fontWeight:700,color:"#222",marginBottom:16}}>콘텐츠 & 링크</p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...guides,...links].map(item=>(
                  <a key={item.id} href={item.url||"#"} target="_blank" rel="noopener noreferrer" style={{
                    display:"flex",alignItems:"center",gap:12,padding:"14px 16px",
                    borderRadius:12,border:"1px solid #f1f1f1",textDecoration:"none",background:"#fafafa",
                  }}>
                    <span style={{fontSize:18}}>📎</span>
                    <div>
                      <p style={{fontSize:14,fontWeight:600,color:"#333"}}>{item.title}</p>
                      {item.description && <p style={{fontSize:12,color:"#999",marginTop:2}}>{item.description}</p>}
                    </div>
                    <span style={{marginLeft:"auto",fontSize:12,color:"#ccc"}}>›</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ 우측: 프로필 사이드바 ═══ */}
        <div className="dash-right">
          {/* 프로필 */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
            <div style={{
              width:56,height:56,borderRadius:"50%",overflow:"hidden",flexShrink:0,
              background:"#1a1a1a",
              border:"2px solid #D4A843",
              boxShadow:"0 0 0 3px rgba(212,168,67,0.15)",
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%"}}/>
              ) : (
                <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:22,fontWeight:800,color:"#D4A843"}}>{contact?.name?.[0]}</span>
                </div>
              )}
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <h2 style={{fontSize:18,fontWeight:800,color:"#222"}}>{contact?.name}</h2>
                <span style={{fontSize:12,color:"#999"}}>{contact?.title}</span>
              </div>
              <p style={{fontSize:12,color:"#bbb",marginTop:2}}>{contact?.bunyanghoe_number} · {contact?.consultant}</p>
            </div>
          </div>

          {/* VIP 뱃지 */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20,padding:"10px 14px",background:"linear-gradient(90deg,#1a1a1a,#2d2318)",borderRadius:10}}>
            <span style={{fontSize:10,padding:"2px 8px",background:"#D4A843",color:"#1a1a1a",borderRadius:4,fontWeight:800,letterSpacing:"0.05em"}}>VIP</span>
            <span style={{fontSize:12,color:"#D4A843",fontWeight:600}}>분양회 프리미엄 멤버십</span>
          </div>

          {/* 포인트 카드 2개 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
            <div style={{background:"#f0f7ff",borderRadius:14,padding:"18px 16px",border:"1px solid #dbeafe"}}>
              <p style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:8}}>마일리지</p>
              <p style={{fontSize:22,fontWeight:800,color:"#1e293b"}}>{fw(stats.remainMileage)}<span style={{fontSize:12,color:"#94a3b8"}}>P</span></p>
              <div style={{display:"flex",gap:6,marginTop:12}}>
                <span style={{fontSize:10,color:"#64748b",background:"#fff",padding:"4px 8px",borderRadius:6,border:"1px solid #e2e8f0"}}>누적 {fw(stats.totalMileage)}P</span>
              </div>
            </div>
            <div style={{background:"#f0fdf4",borderRadius:14,padding:"18px 16px",border:"1px solid #dcfce7"}}>
              <p style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:8}}>리워드</p>
              <p style={{fontSize:22,fontWeight:800,color:"#1e293b"}}>{fw(stats.netReward)}<span style={{fontSize:12,color:"#94a3b8"}}>원</span></p>
              <div style={{display:"flex",gap:6,marginTop:12}}>
                <span style={{fontSize:10,color:"#64748b",background:"#fff",padding:"4px 8px",borderRadius:6,border:"1px solid #e2e8f0"}}>세전 {fw(stats.totalReward)}원</span>
              </div>
            </div>
          </div>

          {/* 메뉴 리스트 */}
          <div style={{borderTop:"1px solid #f1f1f1",paddingTop:16}}>
            <p style={{fontSize:13,fontWeight:700,color:"#222",marginBottom:12}}>내 정보</p>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {[
                {icon:"📋",label:"멤버십 번호",value:contact?.bunyanghoe_number||"-"},
                {icon:"👤",label:"담당 컨설턴트",value:contact?.consultant||"-"},
                {icon:"🏢",label:"대협팀 담당",value:contact?.assigned_to||"-"},
                {icon:"📅",label:"가입일",value:fDate(contact?.contract_date||"")},
                {icon:"📊",label:"광고 집행",value:`${execs.length}건`},
              ].map(row=>(
                <div key={row.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f8f8f8"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:15}}>{row.icon}</span>
                    <span style={{fontSize:13,color:"#666"}}>{row.label}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:"#333"}}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 리워드 상세 */}
          <div style={{borderTop:"1px solid #f1f1f1",paddingTop:16,marginTop:16}}>
            <p style={{fontSize:13,fontWeight:700,color:"#222",marginBottom:12}}>리워드 상세</p>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {[
                {icon:"🎯",label:"하이타겟",value:`${fw(stats.htReward)}원`},
                {icon:"📱",label:"호갱노노",value:`${fw(stats.hogReward)}원`},
                {icon:"💬",label:"LMS",value:`${fw(stats.lmsReward)}원`},
                {icon:"💸",label:"원천징수 (3.3%)",value:`-${fw(stats.tax)}원`},
              ].map(row=>(
                <div key={row.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f8f8f8"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:14}}>{row.icon}</span>
                    <span style={{fontSize:13,color:"#666"}}>{row.label}</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:row.label.includes("원천")?"#ef4444":"#333"}}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* VIP 특전 가이드 */}
          <div style={{borderTop:"1px solid #f1f1f1",paddingTop:16,marginTop:16}}>
            <p style={{fontSize:13,fontWeight:700,color:"#222",marginBottom:12}}>VIP 특전</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {(guides.length > 0 ? guides : [
                {id:1,title:"하이타겟",description:"맞춤형 광고",url:"",content_type:"guide",image_url:"",sort_order:0,is_active:true},
                {id:2,title:"호갱노노",description:"부동산 앱",url:"",content_type:"guide",image_url:"",sort_order:0,is_active:true},
                {id:3,title:"LMS",description:"문자 마케팅",url:"",content_type:"guide",image_url:"",sort_order:0,is_active:true},
                {id:4,title:"매거진",description:"퍼스널 브랜딩",url:"",content_type:"guide",image_url:"",sort_order:0,is_active:true},
              ]).map((g: any) => (
                <div key={g.id} style={{padding:"14px 12px",borderRadius:10,background:"#fafafa",border:"1px solid #f1f1f1",textAlign:"center"}}>
                  <p style={{fontSize:13,fontWeight:600,color:"#333"}}>{g.title}</p>
                  <p style={{fontSize:11,color:"#aaa",marginTop:2}}>{g.description}</p>
                  {!g.url && <p style={{fontSize:10,color:"#ddd",marginTop:6}}>준비 중</p>}
                </div>
              ))}
            </div>
          </div>

          {/* 푸터 */}
          <div style={{marginTop:32,paddingTop:16,borderTop:"1px solid #f1f1f1",textAlign:"center"}}>
            <p style={{fontSize:11,color:"#ccc"}}>© 2026 광고인㈜ · 분양의신</p>
            <p style={{fontSize:10,color:"#ddd",marginTop:2}}>분양회 VIP Membership</p>
          </div>
        </div>
      </div>
    </div>
  );
}
