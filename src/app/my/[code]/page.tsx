"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Contact { id:number; name:string; title:string; bunyanghoe_number:string; consultant:string; assigned_to:string; contract_date:string; photo_url:string; }
interface ExecRow { id:number; member_name:string; bunyanghoe_number:string; hightarget_mileage:number; hightarget_reward:number; hogaengnono_reward:number; lms_reward:number; payment_date:string; channel:string; execution_amount:number; vat_amount:number; contract_route:string; }
interface MileUsage { id:number; contact_id:number; usage_date:string; usage_amount:number; }
interface DashContent { id:number; content_type:string; title:string; description:string; url:string; image_url:string; sort_order:number; is_active:boolean; }

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
      const { data: c } = await supabase.from("contacts")
        .select("id,name,title,bunyanghoe_number,consultant,assigned_to,contract_date,photo_url")
        .eq("dashboard_code", code).maybeSingle();
      if (!c) { setNotFound(true); setLoading(false); return; }
      setContact(c as Contact);

      const [r1, r2, r3] = await Promise.all([
        supabase.from("ad_executions")
          .select("id,member_name,bunyanghoe_number,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward,payment_date,channel,execution_amount,vat_amount,contract_route")
          .or(`member_name.eq.${c.name},bunyanghoe_number.eq.${c.bunyanghoe_number}`)
          .order("payment_date",{ascending:false}),
        supabase.from("mileage_usages").select("*").eq("contact_id", c.id).order("usage_date",{ascending:false}),
        supabase.from("dashboard_contents").select("*").eq("is_active", true).order("sort_order",{ascending:true}),
      ]);
      setExecs((r1.data||[]) as ExecRow[]);
      setUsages((r2.data||[]) as MileUsage[]);
      setContents((r3.data||[]) as DashContent[]);
      setLoading(false);
    };
    load();
  }, [code]);

  // 마일리지/리워드 계산
  const stats = useMemo(() => {
    const totalMileage = execs.reduce((s,e) => s + (e.hightarget_mileage||0), 0);
    const totalReward = execs.reduce((s,e) => s + (e.hightarget_reward||0) + (e.hogaengnono_reward||0) + (e.lms_reward||0), 0);
    const totalUsed = usages.reduce((s,u) => s + (u.usage_amount||0), 0);
    const tax = totalReward > 0 ? Math.floor(totalReward * 0.033) : 0;
    return { totalMileage, totalReward, totalUsed, remainMileage: totalMileage - totalUsed, netReward: totalReward - tax, tax };
  }, [execs, usages]);

  // 적립 내역
  const history = useMemo(() => {
    const items: { date:string; type:string; desc:string; amount:number; sign:string }[] = [];
    execs.forEach(e => {
      if (e.hightarget_mileage > 0) items.push({ date:e.payment_date, type:"마일리지 적립", desc:`하이타겟 (${e.channel})`, amount:e.hightarget_mileage, sign:"+" });
      if (e.hightarget_reward > 0) items.push({ date:e.payment_date, type:"리워드 적립", desc:"하이타겟 리워드", amount:e.hightarget_reward, sign:"+" });
      if (e.hogaengnono_reward > 0) items.push({ date:e.payment_date, type:"리워드 적립", desc:"호갱노노 리워드", amount:e.hogaengnono_reward, sign:"+" });
      if (e.lms_reward > 0) items.push({ date:e.payment_date, type:"리워드 적립", desc:"LMS 리워드", amount:e.lms_reward, sign:"+" });
    });
    usages.forEach(u => { items.push({ date:u.usage_date, type:"마일리지 사용", desc:"마일리지 사용", amount:u.usage_amount, sign:"-" }); });
    return items.sort((a,b) => b.date.localeCompare(a.date));
  }, [execs, usages]);

  const fw = (n:number) => n.toLocaleString();
  const fDate = (d:string) => { if(!d) return "-"; const dt=new Date(d+"T00:00:00"); return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`; };

  const photoUrl = contact?.photo_url
    ? `https://rlpdhufcsuewvwluydky.supabase.co/storage/v1/object/public/customer-photos/${contact.photo_url}`
    : null;

  const guides = contents.filter(c => c.content_type === "guide");
  const links = contents.filter(c => c.content_type === "link");

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f5f6fa" }}>
      <div style={{ width:28, height:28, border:"3px solid #1E3A8A", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#f5f6fa", fontFamily:"'Pretendard','sans-serif'" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h1 style={{ fontSize:20, fontWeight:700, color:"#334155" }}>접근할 수 없는 페이지입니다</h1>
      <p style={{ fontSize:14, color:"#94a3b8", marginTop:8 }}>유효하지 않은 대시보드 코드입니다</p>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f5f6fa", fontFamily:"'Pretendard','Noto Sans KR',sans-serif" }}>
      {/* 헤더 */}
      <div style={{ background:"linear-gradient(135deg, #1E3A8A 0%, #3B5FC0 100%)", padding:"32px 20px 80px", position:"relative" }}>
        <div style={{ maxWidth:480, margin:"0 auto", textAlign:"center" }}>
          <p style={{ color:"rgba(255,255,255,0.6)", fontSize:11, letterSpacing:"0.2em", fontWeight:600 }}>BUNYANGOE VIP MEMBERSHIP</p>
          <h1 style={{ color:"#fff", fontSize:22, fontWeight:800, marginTop:8, letterSpacing:"-0.02em" }}>분양회 VIP 대시보드</h1>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:"-56px auto 0", padding:"0 16px 40px", position:"relative", zIndex:1 }}>
        {/* 프로필 카드 */}
        <div style={{ background:"#fff", borderRadius:20, padding:"24px 20px", boxShadow:"0 4px 20px rgba(0,0,0,0.08)", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{
              width:64, height:64, borderRadius:"50%", overflow:"hidden",
              background:"#e2e8f0", flexShrink:0,
              border: "3px solid #E8C87A",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              ) : (
                <span style={{ fontSize:24, fontWeight:800, color:"#94a3b8" }}>{contact?.name?.[0]}</span>
              )}
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, padding:"2px 8px", background:"#FEF3C7", color:"#92400E", borderRadius:20, fontWeight:700 }}>VIP</span>
                <span style={{ fontSize:11, color:"#64748b" }}>{contact?.bunyanghoe_number}</span>
              </div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#1e293b", marginTop:4 }}>{contact?.name} <span style={{ fontSize:14, fontWeight:500, color:"#94a3b8" }}>{contact?.title}</span></h2>
              <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>
                담당 {contact?.consultant} · 가입 {fDate(contact?.contract_date||"")}
              </div>
            </div>
          </div>
        </div>

        {/* 마일리지/리워드 카드 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"20px 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", borderLeft:"4px solid #3B82F6" }}>
            <p style={{ fontSize:11, color:"#94a3b8", fontWeight:600, marginBottom:4 }}>잔여 마일리지</p>
            <p style={{ fontSize:22, fontWeight:800, color:"#1e293b" }}>{fw(stats.remainMileage)}<span style={{ fontSize:12, color:"#94a3b8" }}>P</span></p>
            <p style={{ fontSize:10, color:"#cbd5e1", marginTop:4 }}>누적 {fw(stats.totalMileage)}P · 사용 {fw(stats.totalUsed)}P</p>
          </div>
          <div style={{ background:"#fff", borderRadius:16, padding:"20px 16px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", borderLeft:"4px solid #10B981" }}>
            <p style={{ fontSize:11, color:"#94a3b8", fontWeight:600, marginBottom:4 }}>누적 리워드</p>
            <p style={{ fontSize:22, fontWeight:800, color:"#1e293b" }}>{fw(stats.totalReward)}<span style={{ fontSize:12, color:"#94a3b8" }}>원</span></p>
            <p style={{ fontSize:10, color:"#cbd5e1", marginTop:4 }}>세전 · 원천징수 {fw(stats.tax)}원</p>
          </div>
        </div>

        {/* 적립/사용 내역 */}
        <div style={{ background:"#fff", borderRadius:20, padding:"20px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginBottom:16 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:"#1e293b", marginBottom:16 }}>적립 · 사용 내역</h3>
          {history.length === 0 ? (
            <p style={{ textAlign:"center", color:"#cbd5e1", fontSize:13, padding:"24px 0" }}>내역이 없습니다</p>
          ) : (
            <div>
              {history.slice(0,20).map((h,i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"12px 0", borderBottom: i < Math.min(history.length,20)-1 ? "1px solid #f1f5f9" : "none",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{
                      width:36, height:36, borderRadius:10,
                      background: h.sign==="+" ? "#EFF6FF" : "#FEF2F2",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:14,
                    }}>{h.sign==="+" ? "📥" : "📤"}</div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:"#334155" }}>{h.type}</p>
                      <p style={{ fontSize:11, color:"#94a3b8" }}>{h.desc}</p>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:14, fontWeight:700, color: h.sign==="+" ? "#2563EB" : "#EF4444" }}>
                      {h.sign}{fw(h.amount)}{h.type.includes("마일리지")?"P":"원"}
                    </p>
                    <p style={{ fontSize:10, color:"#cbd5e1" }}>{fDate(h.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VIP 특전 가이드 */}
        {guides.length > 0 && (
          <div style={{ background:"#fff", borderRadius:20, padding:"20px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginBottom:16 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:"#1e293b", marginBottom:16 }}>VIP 특전 가이드</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {guides.map(g => (
                <a key={g.id} href={g.url||"#"} target="_blank" rel="noopener noreferrer" style={{
                  display:"block", padding:"16px", borderRadius:14,
                  background:"#f8fafc", border:"1px solid #e2e8f0", textDecoration:"none",
                  transition:"background 0.2s",
                }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#334155" }}>{g.title}</p>
                  {g.description && <p style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>{g.description}</p>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 콘텐츠 & 링크 */}
        {links.length > 0 && (
          <div style={{ background:"#fff", borderRadius:20, padding:"20px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginBottom:16 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:"#1e293b", marginBottom:16 }}>콘텐츠 & 링크</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {links.map(l => (
                <a key={l.id} href={l.url||"#"} target="_blank" rel="noopener noreferrer" style={{
                  display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
                  borderRadius:14, background:"#f8fafc", border:"1px solid #e2e8f0", textDecoration:"none",
                  transition:"background 0.2s",
                }}>
                  <span style={{ fontSize:18 }}>📎</span>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:"#334155" }}>{l.title}</p>
                    {l.description && <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{l.description}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div style={{ textAlign:"center", padding:"24px 0 8px", color:"#cbd5e1", fontSize:11 }}>
          <p>© 2026 광고인㈜ · 분양의신</p>
          <p style={{ marginTop:4 }}>분양회 VIP Membership</p>
        </div>
      </div>
    </div>
  );
}
