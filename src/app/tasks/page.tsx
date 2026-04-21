"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, Paperclip, MessageCircle, Check, Clock, AlertCircle, Pause, X, Download } from "lucide-react";

const CATEGORIES = ["LMS부킹요청","호갱노노 부킹요청","호갱노노 광고요청"];
const PRIORITIES = [
  {label:"긴급",color:"text-red-500",bg:"bg-red-50",border:"border-red-200"},
  {label:"높음",color:"text-orange-500",bg:"bg-orange-50",border:"border-orange-200"},
  {label:"보통",color:"text-blue-500",bg:"bg-blue-50",border:"border-blue-200"},
  {label:"낮음",color:"text-slate-400",bg:"bg-slate-50",border:"border-slate-200"},
];
const STATUS_CFG: Record<string,{icon:any;color:string;bg:string}> = {
  "요청":{icon:Send,color:"text-blue-500",bg:"bg-blue-50"},
  "접수":{icon:Check,color:"text-cyan-500",bg:"bg-cyan-50"},
  "진행중":{icon:Clock,color:"text-amber-500",bg:"bg-amber-50"},
  "완료":{icon:Check,color:"text-emerald-500",bg:"bg-emerald-50"},
  "보류":{icon:Pause,color:"text-slate-400",bg:"bg-slate-100"},
};
const TEAM = [
  {name:"김정후",title:"본부장",group:"관리자"},
  {name:"김창완",title:"팀장",group:"관리자"},
  {name:"최웅",title:"파트장",group:"실행파트"},
  {name:"조계현",title:"메인",group:"실행파트"},
  {name:"이세호",title:"어쏘",group:"실행파트"},
  {name:"기여운",title:"어쏘",group:"실행파트"},
  {name:"최연전",title:"CX",group:"실행파트"},
  {name:"김재영",title:"어시",group:"운영파트"},
  {name:"최은정",title:"어시",group:"운영파트"},
];
const TEAM_GROUPS = ["관리자","실행파트","운영파트"];
const LMS_PLATFORMS = [
  {label:"카드사",items:["국민카드","BC카드","삼성카드","신한카드","롯데카드","하나카드"]},
  {label:"통신사",items:["SKT","KT"]},
  {label:"멤버십사 외",items:["롯데멤버스","스마트스코어","티맵","신세계포인트","OK캐시백"]},
];
const WEEKDAYS=["일","월","화","수","목","금","토"];
const getWeekday=(d:string)=>{if(!d)return"";const dt=new Date(d+"T00:00:00");return WEEKDAYS[dt.getDay()];};
const fw=(d:string)=>d?new Date(d).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}):"-";
const fmtAmt=(v:string)=>{const n=Number(v.replace(/,/g,""));return isNaN(n)?"":n.toLocaleString();};

const inp="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
const inp_fixed="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed";
const lbl="block text-xs font-bold text-slate-500 mb-1.5";

export default function TasksPage() {
  const [tasks,setTasks]=useState<any[]>([]);
  const [comments,setComments]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("나에게 온");
  const [showCreate,setShowCreate]=useState(false);
  const [selectedTask,setSelectedTask]=useState<any>(null);
  const [newComment,setNewComment]=useState("");
  const [toast,setToast]=useState<string|null>(null);
  const [me,setMe]=useState("");

  useEffect(()=>{try{const u=localStorage.getItem("crm_user");if(u)setMe(JSON.parse(u).name||"");}catch{};},[]);

  const [members,setMembers]=useState<any[]>([]);
  const [memberSearch,setMemberSearch]=useState("");
  useEffect(()=>{(async()=>{
    const {data}=await supabase.from("contacts").select("id,name,title,bunyanghoe_number,meeting_result,assigned_to,consultant").order("bunyanghoe_number",{ascending:true});
    setMembers((data||[]).sort((a:any,b:any)=>{const na=parseInt(a.bunyanghoe_number?.replace(/[^0-9]/g,"")||"9999");const nb=parseInt(b.bunyanghoe_number?.replace(/[^0-9]/g,"")||"9999");return na-nb;}));
  })();},[]);
  const filteredMembers=members.filter(m=>{if(!memberSearch)return true;const s=memberSearch.toLowerCase();return (m.name||"").includes(s)||(m.bunyanghoe_number||"").includes(s)||(m.title||"").includes(s);});

  const loadData=async()=>{
    setLoading(true);
    const [r1,r2]=await Promise.all([
      supabase.from("tasks").select("*").order("created_at",{ascending:false}),
      supabase.from("task_comments").select("*").order("created_at",{ascending:true}),
    ]);
    setTasks(r1.data||[]);setComments(r2.data||[]);setLoading(false);
  };
  useEffect(()=>{loadData();},[]);

  useEffect(()=>{
    const ch=supabase.channel("tasks-rt")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"tasks"},(p)=>{
        const t=p.new as any;
        if(t.assignee===me||(t.tagged&&(t.tagged as string[]).includes(me))){
          setToast(`${t.requester}님이 업무를 요청했습니다: ${t.category}`);
          setTimeout(()=>setToast(null),5000);
        }
        loadData();
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"tasks"},()=>loadData())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"task_comments"},()=>loadData())
      .subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[me]);

  const filtered=tasks.filter(t=>{
    if(tab==="내가 요청한")return t.requester===me;
    if(tab==="나에게 온")return t.assignee===me||(t.tagged&&(t.tagged as string[]).includes(me));
    return true;
  });

  // ═══ 생성 폼 ═══
  const initForm={category:CATEGORIES[0],content:"",priority:"보통",assignee:"",tagged:[] as string[],member_name:"",member_number:"",member_title:"",
    platform:"",age_range:"",site_name:"",ad_amount:"",send_count:"",hope_date:"",hope_time:"",
    region1:"",region2:"",region3:""};
  const [form,setForm]=useState(initForm);
  const [files,setFiles]=useState<File[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);

  const handleCreate=async()=>{
    if(!form.assignee){alert("수신자를 선택하세요");return;}
    let fileUrls:string[]=[];
    for(const file of files){
      const fname=`${Date.now()}_${file.name}`;
      const {error}=await supabase.storage.from("task-files").upload(fname,file);
      if(!error)fileUrls.push(fname);
    }
    // 카테고리별 content 조합
    let content=form.content;
    if(form.category==="LMS부킹요청"){
      content=`■ 분양회원: ${form.member_number} ${form.member_name} ${form.member_title}\n■ 플랫폼: ${form.platform}\n■ 연령대: ${form.age_range}\n■ 타겟팅: 부동산 관심자\n■ 현장명: ${form.site_name}\n■ 집행방식: LMS\n■ 광고금액: ${fmtAmt(form.ad_amount)}원\n■ 발송건수: ${fmtAmt(form.send_count)}건\n■ 희망날짜: ${form.hope_date}${form.hope_date?` (${getWeekday(form.hope_date)})`:""} ${form.hope_time?form.hope_time+"시":""}\n■ 지역타겟팅: ①${form.region1} ②${form.region2} ③${form.region3}`;
    } else if(form.category==="호갱노노 부킹요청"){
      content=`■ 분양회원: ${form.member_number} ${form.member_name} ${form.member_title}\n■ 현장명: ${form.site_name}\n■ 플랫폼: 호갱노노 채널톡\n■ 발송건수: ${fmtAmt(form.send_count)}건\n■ 발송일시: ${form.hope_date}${form.hope_date?` (${getWeekday(form.hope_date)})`:""} ${form.hope_time?form.hope_time+"시":""}\n■ 지역타겟팅: ①${form.region1} ②${form.region2} ③${form.region3}\n■ 타겟연령: ${form.age_range}`;
    }
    const {error}=await supabase.from("tasks").insert({
      category:form.category,content,priority:form.priority,
      assignee:form.assignee,requester:me,status:"요청",
      tagged:form.tagged.length>0?form.tagged:null,
      file_urls:fileUrls.length>0?fileUrls:null,
    });
    if(error){alert("생성 실패: "+error.message);return;}
    setForm(initForm);setFiles([]);setShowCreate(false);loadData();
  };

  const handleStatus=async(taskId:number,status:string)=>{
    await supabase.from("tasks").update({status,completed_at:status==="완료"?new Date().toISOString():null}).eq("id",taskId);
    await supabase.from("task_comments").insert({task_id:taskId,author:me,content:`상태를 '${status}'(으)로 변경했습니다`,comment_type:"상태변경"});
    loadData();if(selectedTask?.id===taskId)setSelectedTask({...selectedTask,status});
  };
  const handleComment=async()=>{
    if(!newComment.trim()||!selectedTask)return;
    await supabase.from("task_comments").insert({task_id:selectedTask.id,author:me,content:newComment.trim(),comment_type:"코멘트"});
    setNewComment("");loadData();
  };

  const taskComments=(id:number)=>comments.filter(c=>c.task_id===id);
  const getPri=(p:string)=>PRIORITIES.find(x=>x.label===p)||PRIORITIES[2];
  const getSt=(s:string)=>STATUS_CFG[s]||STATUS_CFG["요청"];

  // ═══ 태그 토글 ═══
  const toggleTag=(name:string)=>setForm(p=>({...p,tagged:p.tagged.includes(name)?p.tagged.filter(n=>n!==name):[...p.tagged,name]}));

  if(loading)return<div className="flex items-center justify-center h-full bg-[#F1F5F9]"><div className="w-6 h-6 border-2 border-[#6C72FF] border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {toast&&(<div className="fixed top-4 right-4 z-50" style={{animation:"slideIn 0.3s ease"}}>
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 max-w-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><Send size={18} className="text-blue-500"/></div>
            <div className="flex-1"><p className="font-bold text-slate-800 text-sm">📬 새 업무 요청</p><p className="text-sm text-slate-600 mt-1">{toast}</p></div>
            <button onClick={()=>setToast(null)} className="text-slate-300 hover:text-slate-500"><X size={16}/></button>
          </div>
        </div>
      </div>)}
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">📬 업무전달</h1>
            <p className="text-xs text-slate-500 mt-0.5">대외협력팀 양방향 업무 요청 및 진행 관리</p></div>
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Send size={14}/>업무 요청</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        <div className="flex items-center gap-3">
          {["나에게 온","내가 요청한","전체"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab===t?"bg-blue-600 text-white shadow-sm":"bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>{t}
              <span className="ml-1.5 text-xs opacity-70">{t==="나에게 온"?tasks.filter(x=>x.assignee===me||(x.tagged&&(x.tagged as string[]).includes(me))).length:t==="내가 요청한"?tasks.filter(x=>x.requester===me).length:tasks.length}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3">
          {["요청","접수","진행중","완료","보류"].map(s=>{const cfg=getSt(s);const Icon=cfg.icon;
            return(<div key={s} className={`${cfg.bg} rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3`}>
              <Icon size={18} className={cfg.color}/><div><p className="text-xs text-slate-500 font-semibold">{s}</p><p className={`text-xl font-black ${cfg.color}`}>{filtered.filter(t=>t.status===s).length}건</p></div>
            </div>);
          })}
        </div>

        <div className="space-y-2">
          {filtered.length===0?<div className="text-center py-16 text-slate-300 text-sm">업무가 없습니다</div>:
          filtered.map(t=>{const p=getPri(t.priority);const s=getSt(t.status);const Icon=s.icon;const cmts=taskComments(t.id);
            return(<div key={t.id} onClick={()=>setSelectedTask(t)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${p.bg} ${p.color} border ${p.border}`}>{t.priority}</span>
                  <span className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-slate-50 text-slate-600 border border-slate-200">{t.category}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${s.bg} ${s.color} flex items-center gap-1`}><Icon size={12}/>{t.status}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 mt-3 line-clamp-2 whitespace-pre-wrap">{t.content}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{t.requester} → <strong className="text-slate-600">{t.assignee}</strong></span>
                  {t.tagged?.length>0&&<span className="text-violet-500">@{(t.tagged as string[]).join(" @")}</span>}
                  <span>{fw(t.created_at)}</span>
                  {t.file_urls?.length>0&&<span className="flex items-center gap-0.5"><Paperclip size={11}/>파일 {t.file_urls.length}</span>}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400"><MessageCircle size={12}/>{cmts.length}</div>
              </div>
            </div>);
          })}
        </div>
      </div>

      {/* ═══ 업무 생성 모달 ═══ */}
      {showCreate&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">📬 업무 요청</h2>
              <button onClick={()=>setShowCreate(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 수신자 */}
              <div><label className={lbl}>수신자</label>
                <select value={form.assignee} onChange={e=>setForm({...form,assignee:e.target.value})} className={inp}>
                  <option value="">선택하세요</option>
                  {TEAM_GROUPS.map(g=>(<optgroup key={g} label={`■ ${g}`}>{TEAM.filter(t=>t.group===g&&t.name!==me).map(t=><option key={t.name} value={t.name}>{t.name} {t.title}</option>)}</optgroup>))}
                </select>
              </div>
              {/* 태그자 */}
              <div><label className={lbl}>태그자 <span className="text-xs text-slate-400 font-normal">(선택, 복수 가능)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {TEAM.filter(t=>t.name!==me&&t.name!==form.assignee).map(t=>(
                    <button key={t.name} type="button" onClick={()=>toggleTag(t.name)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${form.tagged.includes(t.name)?"bg-violet-50 text-violet-600 border-violet-200":"bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}>
                      @{t.name} <span className="text-slate-400">{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* 카테고리 */}
              <div><label className={lbl}>카테고리</label>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value,content:"",platform:"",site_name:"",ad_amount:"",send_count:"",hope_date:"",hope_time:"",age_range:"",region1:"",region2:"",region3:""})} className={inp}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              {/* 분양회 회원 선택 */}
              <div>
                <label className={lbl}>분양회 회원</label>
                {form.member_name ? (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-sm font-bold text-blue-700">{form.member_number} {form.member_name} {form.member_title}</span>
                    <button type="button" onClick={()=>setForm({...form,member_name:"",member_number:"",member_title:""})} className="text-xs text-red-400 hover:text-red-600">변경</button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="이름, 넘버링, 직급 검색..."
                      className="w-full px-3 py-2 text-sm border-b border-slate-200 outline-none focus:border-blue-400"/>
                    <div className="max-h-[160px] overflow-y-auto">
                      {filteredMembers.slice(0,20).map(m=>(
                        <button key={m.id} type="button" onClick={()=>{setForm({...form,member_name:m.name,member_number:m.bunyanghoe_number||"",member_title:m.title||""});setMemberSearch("");}}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-50 text-left">
                          <span className="font-black text-amber-600 w-10">{m.bunyanghoe_number||"-"}</span>
                          <span className="font-bold text-slate-800">{m.name}</span>
                          <span className="text-slate-400">{m.title||""}</span>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.meeting_result==="계약완료"?"bg-emerald-50 text-emerald-600":"bg-slate-50 text-slate-400"}`}>{m.meeting_result==="계약완료"?"계약완료":"미계약"}</span>
                        </button>
                      ))}
                      {filteredMembers.length===0&&<p className="text-xs text-slate-300 text-center py-4">검색 결과 없음</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* 우선순위 */}
              <div><label className={lbl}>우선순위</label>
                <div className="flex gap-2">{PRIORITIES.map(p=>(
                  <button key={p.label} type="button" onClick={()=>setForm({...form,priority:p.label})}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${form.priority===p.label?`${p.bg} ${p.color} ${p.border}`:"bg-slate-50 text-slate-400 border-slate-200"}`}>{p.label}</button>
                ))}</div>
              </div>

              {/* ═══ LMS부킹요청 양식 ═══ */}
              {form.category==="LMS부킹요청"&&(<div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 mb-2">📋 LMS 부킹 요청 양식</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>플랫폼</label>
                    <select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})} className={inp}>
                      <option value="">선택</option>
                      <option value="전체플랫폼">전체플랫폼</option>
                      {LMS_PLATFORMS.map(g=>(<optgroup key={g.label} label={`■ ${g.label}`}>{g.items.map(t=><option key={t}>{t}</option>)}</optgroup>))}
                    </select>
                  </div>
                  <div><label className={lbl}>연령대</label><input className={inp} value={form.age_range} onChange={e=>setForm({...form,age_range:e.target.value})} placeholder="예: 30~60대"/></div>
                  <div><label className={lbl}>타겟팅</label><input className={inp_fixed} value="부동산 관심자" readOnly/></div>
                  <div><label className={lbl}>현장명</label><input className={inp} value={form.site_name} onChange={e=>setForm({...form,site_name:e.target.value})} placeholder="예: [경산] 상방공원 호반써밋"/></div>
                  <div><label className={lbl}>집행방식</label><input className={inp_fixed} value="LMS" readOnly/></div>
                  <div><label className={lbl}>광고금액</label><input className={inp} value={form.ad_amount} onChange={e=>setForm({...form,ad_amount:e.target.value})} placeholder="예: 5000000"/></div>
                  <div><label className={lbl}>발송건수</label><input className={inp} value={form.send_count} onChange={e=>setForm({...form,send_count:e.target.value})} placeholder="예: 50000"/></div>
                  <div><label className={lbl}>희망날짜</label>
                    <div className="flex gap-1.5">
                      <input type="date" className={`${inp} flex-1`} value={form.hope_date} onChange={e=>setForm({...form,hope_date:e.target.value})}/>
                      {form.hope_date&&<span className="flex items-center text-xs font-bold text-blue-500 px-2">({getWeekday(form.hope_date)})</span>}
                      <select className={`${inp} w-20`} value={form.hope_time} onChange={e=>setForm({...form,hope_time:e.target.value})}>
                        <option value="">시간</option>
                        {Array.from({length:24}).map((_,i)=><option key={i} value={String(i).padStart(2,"0")}>{String(i).padStart(2,"0")}시</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div><label className={lbl}>지역 타겟팅</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inp} value={form.region1} onChange={e=>setForm({...form,region1:e.target.value})} placeholder="① 지역"/>
                    <input className={inp} value={form.region2} onChange={e=>setForm({...form,region2:e.target.value})} placeholder="② 지역"/>
                    <input className={inp} value={form.region3} onChange={e=>setForm({...form,region3:e.target.value})} placeholder="③ 지역"/>
                  </div>
                </div>
              </div>)}

              {/* ═══ 호갱노노 부킹요청 양식 ═══ */}
              {form.category==="호갱노노 부킹요청"&&(<div className="space-y-3 p-4 bg-violet-50/50 rounded-xl border border-violet-100">
                <p className="text-xs font-bold text-violet-600 mb-2">📋 호갱노노 채널톡 부킹 요청 양식</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>현장명</label><input className={inp} value={form.site_name} onChange={e=>setForm({...form,site_name:e.target.value})} placeholder="예: [경산] 상방공원 호반써밋"/></div>
                  <div><label className={lbl}>플랫폼</label><input className={inp_fixed} value="호갱노노 채널톡" readOnly/></div>
                  <div><label className={lbl}>발송건수</label><input className={inp} value={form.send_count} onChange={e=>setForm({...form,send_count:e.target.value})} placeholder="예: 50000"/></div>
                  <div><label className={lbl}>발송일시</label>
                    <div className="flex gap-1.5">
                      <input type="date" className={`${inp} flex-1`} value={form.hope_date} onChange={e=>setForm({...form,hope_date:e.target.value})}/>
                      {form.hope_date&&<span className="flex items-center text-xs font-bold text-violet-500 px-2">({getWeekday(form.hope_date)})</span>}
                      <select className={`${inp} w-20`} value={form.hope_time} onChange={e=>setForm({...form,hope_time:e.target.value})}>
                        <option value="">시간</option>
                        {Array.from({length:24}).map((_,i)=><option key={i} value={String(i).padStart(2,"0")}>{String(i).padStart(2,"0")}시</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className={lbl}>타겟연령</label><input className={inp} value={form.age_range} onChange={e=>setForm({...form,age_range:e.target.value})} placeholder="예: 30~60대"/></div>
                </div>
                <div><label className={lbl}>지역 타겟팅</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inp} value={form.region1} onChange={e=>setForm({...form,region1:e.target.value})} placeholder="① 지역"/>
                    <input className={inp} value={form.region2} onChange={e=>setForm({...form,region2:e.target.value})} placeholder="② 지역"/>
                    <input className={inp} value={form.region3} onChange={e=>setForm({...form,region3:e.target.value})} placeholder="③ 지역"/>
                  </div>
                </div>
              </div>)}

              {/* ═══ 호갱노노 광고요청 (자유 입력) ═══ */}
              {form.category==="호갱노노 광고요청"&&(
                <div><label className={lbl}>상세내용</label>
                  <textarea className={inp} rows={5} value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="광고 요청 내용을 상세히 입력하세요..."/>
                </div>
              )}

              {/* 파일첨부 */}
              <div><label className={lbl}>파일첨부</label>
                <input ref={fileRef} type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))} className="hidden"/>
                <button type="button" onClick={()=>fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 w-full">
                  <Paperclip size={14}/>{files.length>0?`${files.length}개 파일 선택됨`:"파일을 선택하세요"}
                </button>
                {files.length>0&&<div className="mt-2 space-y-1">{files.map((f,i)=><p key={i} className="text-xs text-slate-500 truncate">📎 {f.name}</p>)}</div>}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={()=>setShowCreate(false)} className="flex-1 py-2.5 text-sm text-slate-500 border border-slate-200 rounded-xl">취소</button>
              <button onClick={handleCreate} className="flex-1 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-1.5"><Send size={14}/>요청 전송</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 업무 상세 모달 ═══ */}
      {selectedTask&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setSelectedTask(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-lg font-bold ${getPri(selectedTask.priority).bg} ${getPri(selectedTask.priority).color}`}>{selectedTask.priority}</span>
                <span className="text-xs px-2 py-1 rounded-lg font-semibold bg-slate-50 text-slate-600 border border-slate-200">{selectedTask.category}</span>
              </div>
              <button onClick={()=>setSelectedTask(null)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div><span className="text-slate-500">{selectedTask.requester} → <strong className="text-slate-800">{selectedTask.assignee}</strong></span>
                  {selectedTask.tagged?.length>0&&<span className="text-xs text-violet-500 ml-2">@{(selectedTask.tagged as string[]).join(" @")}</span>}
                </div>
                <span className="text-xs text-slate-400">{fw(selectedTask.created_at)}</span>
              </div>
              <div className="flex gap-1.5">{["요청","접수","진행중","완료","보류"].map(s=>{const cfg=getSt(s);const active=selectedTask.status===s;
                return(<button key={s} onClick={()=>handleStatus(selectedTask.id,s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${active?`${cfg.bg} ${cfg.color} border-current`:"bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"}`}>{s}</button>);
              })}</div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedTask.content}</p></div>
              {selectedTask.file_urls?.length>0&&(<div><p className="text-xs font-bold text-slate-500 mb-2">📎 첨부파일</p>
                {selectedTask.file_urls.map((f:string,i:number)=>(<a key={i} href={`https://rlpdhufcsuewvwluydky.supabase.co/storage/v1/object/public/task-files/${f}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 py-1"><Download size={14}/>{f.split("_").slice(1).join("_")}</a>))}
              </div>)}
              <div><p className="text-xs font-bold text-slate-500 mb-3">💬 코멘트 {taskComments(selectedTask.id).length}건</p>
                <div className="space-y-2">{taskComments(selectedTask.id).map(c=>(
                  <div key={c.id} className={`rounded-xl p-3 ${c.comment_type==="상태변경"?"bg-blue-50 border border-blue-100":"bg-slate-50 border border-slate-100"}`}>
                    <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-slate-700">{c.author}</span><span className="text-xs text-slate-400">{fw(c.created_at)}</span></div>
                    <p className={`text-sm ${c.comment_type==="상태변경"?"text-blue-600 font-semibold":"text-slate-600"}`}>{c.content}</p>
                  </div>
                ))}</div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleComment();}}}
                placeholder="코멘트를 입력하세요..." className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"/>
              <button onClick={handleComment} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Send size={14}/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
