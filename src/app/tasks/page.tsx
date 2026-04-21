"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, Paperclip, MessageCircle, Check, Clock, AlertCircle, Pause, X, ChevronDown, Download } from "lucide-react";

const CATEGORIES = ["LMS부킹요청","호갱노노 부킹요청","호갱노노 광고요청"];
const PRIORITIES: {label:string;color:string;bg:string;border:string}[] = [
  {label:"긴급",color:"text-red-500",bg:"bg-red-50",border:"border-red-200"},
  {label:"높음",color:"text-orange-500",bg:"bg-orange-50",border:"border-orange-200"},
  {label:"보통",color:"text-blue-500",bg:"bg-blue-50",border:"border-blue-200"},
  {label:"낮음",color:"text-slate-400",bg:"bg-slate-50",border:"border-slate-200"},
];
const STATUS_CONFIG: Record<string,{icon:any;color:string;bg:string}> = {
  "요청":{icon:Send,color:"text-blue-500",bg:"bg-blue-50"},
  "접수":{icon:Check,color:"text-cyan-500",bg:"bg-cyan-50"},
  "진행중":{icon:Clock,color:"text-amber-500",bg:"bg-amber-50"},
  "완료":{icon:Check,color:"text-emerald-500",bg:"bg-emerald-50"},
  "보류":{icon:Pause,color:"text-slate-400",bg:"bg-slate-100"},
};
const TEAM = ["조계현","이세호","기여운","최연전"];
const fw = (d:string) => d ? new Date(d).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "-";
const fDate = (d:string) => d ? new Date(d).toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"}) : "-";

export default function TasksPage() {
  const [tasks,setTasks]=useState<any[]>([]);
  const [comments,setComments]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("나에게 온");
  const [showCreate,setShowCreate]=useState(false);
  const [selectedTask,setSelectedTask]=useState<any>(null);
  const [newComment,setNewComment]=useState("");
  const [toast,setToast]=useState<string|null>(null);

  // 현재 로그인 유저
  const [me,setMe]=useState("");
  useEffect(()=>{try{const u=localStorage.getItem("crm_user");if(u)setMe(JSON.parse(u).name||"");}catch{};},[]);

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    const [r1,r2]=await Promise.all([
      supabase.from("tasks").select("*").order("created_at",{ascending:false}),
      supabase.from("task_comments").select("*").order("created_at",{ascending:true}),
    ]);
    setTasks(r1.data||[]);setComments(r2.data||[]);setLoading(false);
  };
  useEffect(()=>{loadData();},[]);

  // Supabase Realtime
  useEffect(()=>{
    const channel = supabase.channel("tasks-realtime")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"tasks"},(payload)=>{
        const t = payload.new as any;
        if(t.assignee===me){
          setToast(`${t.requester}님이 업무를 요청했습니다: ${t.category}`);
          setTimeout(()=>setToast(null),5000);
        }
        loadData();
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"tasks"},()=>loadData())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"task_comments"},()=>loadData())
      .subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[me]);

  // 필터
  const filtered = tasks.filter(t=>{
    if(tab==="내가 요청한") return t.requester===me;
    if(tab==="나에게 온") return t.assignee===me;
    return true;
  });

  // 업무 생성
  const [form,setForm]=useState({category:CATEGORIES[0],content:"",priority:"보통",assignee:""});
  const [files,setFiles]=useState<File[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if(!form.assignee||!form.content.trim()){alert("수신자와 상세내용을 입력하세요");return;}
    let fileUrls: string[] = [];
    for(const file of files){
      const fname=`${Date.now()}_${file.name}`;
      const {error}=await supabase.storage.from("task-files").upload(fname,file);
      if(!error) fileUrls.push(fname);
    }
    const {error}=await supabase.from("tasks").insert({
      category:form.category,content:form.content.trim(),priority:form.priority,
      assignee:form.assignee,requester:me,status:"요청",
      file_urls:fileUrls.length>0?fileUrls:null,
    });
    if(error){alert("생성 실패: "+error.message);return;}
    setForm({category:CATEGORIES[0],content:"",priority:"보통",assignee:""});
    setFiles([]);setShowCreate(false);loadData();
  };

  // 상태 변경
  const handleStatus = async (taskId:number,status:string) => {
    await supabase.from("tasks").update({status,completed_at:status==="완료"?new Date().toISOString():null}).eq("id",taskId);
    await supabase.from("task_comments").insert({task_id:taskId,author:me,content:`상태를 '${status}'(으)로 변경했습니다`,comment_type:"상태변경"});
    loadData();
    if(selectedTask?.id===taskId) setSelectedTask({...selectedTask,status});
  };

  // 코멘트 추가
  const handleComment = async () => {
    if(!newComment.trim()||!selectedTask) return;
    await supabase.from("task_comments").insert({task_id:selectedTask.id,author:me,content:newComment.trim(),comment_type:"코멘트"});
    setNewComment("");loadData();
  };

  const taskComments = (taskId:number) => comments.filter(c=>c.task_id===taskId);
  const getPriority = (p:string) => PRIORITIES.find(pr=>pr.label===p)||PRIORITIES[2];
  const getStatus = (s:string) => STATUS_CONFIG[s]||STATUS_CONFIG["요청"];

  if(loading) return <div className="flex items-center justify-center h-full bg-[#F1F5F9]"><div className="w-6 h-6 border-2 border-[#6C72FF] border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 토스트 알림 */}
      {toast&&(
        <div className="fixed top-4 right-4 z-50 animate-slide-in" style={{animation:"slideIn 0.3s ease"}}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><Send size={18} className="text-blue-500"/></div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">📬 새 업무 요청</p>
                <p className="text-sm text-slate-600 mt-1">{toast}</p>
              </div>
              <button onClick={()=>setToast(null)} className="text-slate-300 hover:text-slate-500"><X size={16}/></button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">📬 업무전달</h1>
            <p className="text-xs text-slate-500 mt-0.5">대외협력팀 양방향 업무 요청 및 진행 관리</p>
          </div>
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            <Send size={14}/>업무 요청
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* 탭 */}
        <div className="flex items-center gap-3">
          {["나에게 온","내가 요청한","전체"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab===t?"bg-blue-600 text-white shadow-sm":"bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>{t}
              <span className="ml-1.5 text-xs opacity-70">
                {t==="나에게 온"?tasks.filter(x=>x.assignee===me).length:t==="내가 요청한"?tasks.filter(x=>x.requester===me).length:tasks.length}
              </span>
            </button>
          ))}
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-5 gap-3">
          {["요청","접수","진행중","완료","보류"].map(s=>{
            const cfg=getStatus(s);const Icon=cfg.icon;
            const cnt=filtered.filter(t=>t.status===s).length;
            return(<div key={s} className={`${cfg.bg} rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-3`}>
              <Icon size={18} className={cfg.color}/>
              <div><p className="text-xs text-slate-500 font-semibold">{s}</p><p className={`text-xl font-black ${cfg.color}`}>{cnt}건</p></div>
            </div>);
          })}
        </div>

        {/* 업무 리스트 */}
        <div className="space-y-2">
          {filtered.length===0?<div className="text-center py-16 text-slate-300 text-sm">업무가 없습니다</div>:
          filtered.map(t=>{
            const p=getPriority(t.priority);const s=getStatus(t.status);const Icon=s.icon;
            const cmts=taskComments(t.id);
            return(
              <div key={t.id} onClick={()=>setSelectedTask(t)}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${p.bg} ${p.color} border ${p.border}`}>{t.priority}</span>
                    <span className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-slate-50 text-slate-600 border border-slate-200">{t.category}</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${s.bg} ${s.color} flex items-center gap-1`}><Icon size={12}/>{t.status}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-3 line-clamp-2">{t.content}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{t.requester} → <strong className="text-slate-600">{t.assignee}</strong></span>
                    <span>{fw(t.created_at)}</span>
                    {t.file_urls?.length>0&&<span className="flex items-center gap-0.5"><Paperclip size={11}/>파일 {t.file_urls.length}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MessageCircle size={12}/>{cmts.length}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ 업무 생성 모달 ═══ */}
      {showCreate&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">📬 업무 요청</h2>
              <button onClick={()=>setShowCreate(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">수신자</label>
                <select value={form.assignee} onChange={e=>setForm({...form,assignee:e.target.value})}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400">
                  <option value="">선택하세요</option>
                  {TEAM.filter(n=>n!==me).map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">카테고리</label>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400">
                  {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">우선순위</label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p=>(
                    <button key={p.label} onClick={()=>setForm({...form,priority:p.label})}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${form.priority===p.label?`${p.bg} ${p.color} ${p.border}`:"bg-slate-50 text-slate-400 border-slate-200"}`}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">상세내용</label>
                <textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})}
                  rows={4} placeholder="업무 내용을 상세히 입력하세요..."
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">파일첨부</label>
                <input ref={fileRef} type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))} className="hidden"/>
                <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-500 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 w-full">
                  <Paperclip size={14}/>
                  {files.length>0?`${files.length}개 파일 선택됨`:"파일을 선택하세요"}
                </button>
                {files.length>0&&<div className="mt-2 space-y-1">{files.map((f,i)=><p key={i} className="text-xs text-slate-500 truncate">📎 {f.name}</p>)}</div>}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={()=>setShowCreate(false)} className="flex-1 py-2.5 text-sm text-slate-500 border border-slate-200 rounded-xl">취소</button>
              <button onClick={handleCreate} className="flex-1 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center gap-1.5">
                <Send size={14}/>요청 전송
              </button>
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
                <span className={`text-xs px-2 py-1 rounded-lg font-bold ${getPriority(selectedTask.priority).bg} ${getPriority(selectedTask.priority).color}`}>{selectedTask.priority}</span>
                <span className="text-xs px-2 py-1 rounded-lg font-semibold bg-slate-50 text-slate-600 border border-slate-200">{selectedTask.category}</span>
              </div>
              <button onClick={()=>setSelectedTask(null)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 요청 정보 */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{selectedTask.requester} → <strong className="text-slate-800">{selectedTask.assignee}</strong></span>
                <span className="text-xs text-slate-400">{fw(selectedTask.created_at)}</span>
              </div>

              {/* 상태 변경 */}
              <div className="flex gap-1.5">
                {["요청","접수","진행중","완료","보류"].map(s=>{
                  const cfg=getStatus(s);const active=selectedTask.status===s;
                  return(<button key={s} onClick={()=>handleStatus(selectedTask.id,s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${active?`${cfg.bg} ${cfg.color} border-current`:"bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"}`}>{s}</button>);
                })}
              </div>

              {/* 내용 */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedTask.content}</p>
              </div>

              {/* 파일 */}
              {selectedTask.file_urls?.length>0&&(
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">📎 첨부파일</p>
                  {selectedTask.file_urls.map((f:string,i:number)=>(
                    <a key={i} href={`https://rlpdhufcsuewvwluydky.supabase.co/storage/v1/object/public/task-files/${f}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700 py-1">
                      <Download size={14}/>{f.split("_").slice(1).join("_")}
                    </a>
                  ))}
                </div>
              )}

              {/* 코멘트 */}
              <div>
                <p className="text-xs font-bold text-slate-500 mb-3">💬 코멘트 {taskComments(selectedTask.id).length}건</p>
                <div className="space-y-2">
                  {taskComments(selectedTask.id).map(c=>(
                    <div key={c.id} className={`rounded-xl p-3 ${c.comment_type==="상태변경"?"bg-blue-50 border border-blue-100":"bg-slate-50 border border-slate-100"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">{c.author}</span>
                        <span className="text-xs text-slate-400">{fw(c.created_at)}</span>
                      </div>
                      <p className={`text-sm ${c.comment_type==="상태변경"?"text-blue-600 font-semibold":"text-slate-600"}`}>{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 코멘트 입력 */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <input value={newComment} onChange={e=>setNewComment(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleComment();}}}
                placeholder="코멘트를 입력하세요..." className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"/>
              <button onClick={handleComment} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                <Send size={14}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
