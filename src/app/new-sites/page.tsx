"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, X, Copy, ExternalLink, Trash2, Sparkles, Building2, MapPin, Calendar, FileText } from "lucide-react";

const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
const lbl = "block text-xs font-bold text-slate-500 mb-1.5";

interface Site {
  id: number; site_name: string; work_address: string;
  developer: string; constructor: string; trustee: string; agency: string;
  business_site_name: string; business_address: string;
  property_type: string; unit_count: string;
  staff_start_date: string; model_house_date: string; grand_open_date: string;
  selling_points: string; created_at: string; created_by: string;
}

const initForm = {
  site_name:"", work_address:"", developer:"", constructor:"", trustee:"", agency:"",
  business_site_name:"", business_address:"", property_type:"", unit_count:"",
  staff_start_date:"", model_house_date:"", grand_open_date:"", selling_points:"",
};

export default function NewSitesPage() {
  const [sites,setSites]=useState<Site[]>([]);
  const [loading,setLoading]=useState(true);
  const [showCreate,setShowCreate]=useState(false);
  const [form,setForm]=useState(initForm);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState<string|null>(null);
  const [me,setMe]=useState("");

  useEffect(()=>{try{const u=localStorage.getItem("crm_user");if(u)setMe(JSON.parse(u).name||"");}catch{}},[]);

  const loadSites=async()=>{setLoading(true);const{data}=await supabase.from("new_sites").select("*").order("created_at",{ascending:false});setSites(data||[]);setLoading(false);};
  useEffect(()=>{loadSites();},[]);

  const handleCreate=async()=>{
    if(!form.site_name.trim()){alert("현장명을 입력하세요");return;}
    setSaving(true);
    const{error}=await supabase.from("new_sites").insert({...form,created_by:me});
    if(error){alert("등록 실패: "+error.message);setSaving(false);return;}
    setForm(initForm);setShowCreate(false);setSaving(false);loadSites();
  };

  const handleDelete=async(id:number)=>{
    if(!confirm("이 현장 정보를 삭제하시겠습니까?"))return;
    await supabase.from("new_sites").delete().eq("id",id);loadSites();
  };

  const copyLink=(id:number)=>{
    navigator.clipboard.writeText(`${window.location.origin}/sites/${id}`);
    setToast("링크가 복사되었습니다");setTimeout(()=>setToast(null),2000);
  };

  const isNew=(d:string)=>Date.now()-new Date(d).getTime()<7*24*60*60*1000;

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {toast&&<div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg" style={{animation:"slideIn 0.3s ease"}}>✅ {toast}</div>}
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes sparkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.15)}}.badge-sparkle{animation:sparkle 1.5s ease-in-out infinite;}`}</style>

      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">🏗️ 신규현장</h1>
            <p className="text-sm text-slate-500 mt-0.5">신규 분양현장 정보 등록 및 공유</p></div>
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700"><Plus size={14}/>현장 등록</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {loading?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
        :sites.length===0?<div className="text-center py-20 text-slate-300"><Building2 size={48} className="mx-auto mb-3 opacity-40"/><p className="text-sm font-semibold">등록된 현장이 없습니다</p></div>
        :<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map(s=>(
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isNew(s.created_at)&&<span className="badge-sparkle inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black rounded-full shadow-sm"><Sparkles size={10}/>신규현장</span>}
                    <h3 className="text-base font-black text-slate-800">{s.site_name}</h3>
                  </div>
                  <button onClick={()=>handleDelete(s.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14}/></button>
                </div>
                {s.business_address&&<p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1"><MapPin size={11}/>{s.business_address}</p>}
              </div>
              <div className="px-5 pb-3 space-y-1.5">
                <div className="flex gap-3 text-xs"><span className="text-slate-400 w-14 flex-shrink-0">물건구분</span><span className="text-slate-700 font-semibold">{s.property_type||"-"}</span></div>
                <div className="flex gap-3 text-xs"><span className="text-slate-400 w-14 flex-shrink-0">세대수</span><span className="text-slate-700 font-semibold">{s.unit_count||"-"}</span></div>
                <div className="flex gap-3 text-xs"><span className="text-slate-400 w-14 flex-shrink-0">시행사</span><span className="text-slate-700 font-semibold truncate">{s.developer||"-"}</span></div>
              </div>
              <div className="px-5 pb-3 flex flex-wrap gap-1.5 text-[10px]">
                {s.staff_start_date&&<span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-semibold">착석 {s.staff_start_date}</span>}
                {s.model_house_date&&<span className="px-2 py-1 bg-violet-50 text-violet-600 rounded-lg font-semibold">MH {s.model_house_date}</span>}
                {s.grand_open_date&&<span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-semibold">GR {s.grand_open_date}</span>}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
                <button onClick={()=>copyLink(s.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"><Copy size={12}/>링크 복사</button>
                <a href={`/sites/${s.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"><ExternalLink size={12}/>미리보기</a>
              </div>
            </div>
          ))}
        </div>}
      </div>

      {/* 등록 모달 */}
      {showCreate&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">🏗️ 신규현장 등록</h2>
              <button onClick={()=>setShowCreate(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                <p className="text-xs font-bold text-blue-600 flex items-center gap-1"><Building2 size={13}/>기본 정보</p>
                <div><label className={lbl}>현장명 <span className="text-red-400">*</span></label><input className={inp} value={form.site_name} onChange={e=>setForm({...form,site_name:e.target.value})} placeholder="예: 덕수궁 롯데캐슬136"/></div>
                <div><label className={lbl}>근무지 주소</label><input className={inp} value={form.work_address} onChange={e=>setForm({...form,work_address:e.target.value})} placeholder="예: 서울 용산구 한강대로 23"/></div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-600">🏢 사업자 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>시행사</label><input className={inp} value={form.developer} onChange={e=>setForm({...form,developer:e.target.value})}/></div>
                  <div><label className={lbl}>시공사</label><input className={inp} value={form.constructor} onChange={e=>setForm({...form,constructor:e.target.value})}/></div>
                  <div><label className={lbl}>신탁사</label><input className={inp} value={form.trustee} onChange={e=>setForm({...form,trustee:e.target.value})}/></div>
                  <div><label className={lbl}>대행사</label><input className={inp} value={form.agency} onChange={e=>setForm({...form,agency:e.target.value})}/></div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1"><MapPin size={13}/>사업지 정보</p>
                <div><label className={lbl}>사업지 현장명</label><input className={inp} value={form.business_site_name} onChange={e=>setForm({...form,business_site_name:e.target.value})}/></div>
                <div><label className={lbl}>사업지 주소</label><input className={inp} value={form.business_address} onChange={e=>setForm({...form,business_address:e.target.value})}/></div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-600">🏠 물건 정보</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>물건구분</label><input className={inp} value={form.property_type} onChange={e=>setForm({...form,property_type:e.target.value})} placeholder="예: 아파트 / 오피스텔"/></div>
                  <div><label className={lbl}>세대수</label><input className={inp} value={form.unit_count} onChange={e=>setForm({...form,unit_count:e.target.value})} placeholder="예: 1,200세대"/></div>
                </div>
              </div>
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-3">
                <p className="text-xs font-bold text-amber-600 flex items-center gap-1"><Calendar size={13}/>현장 스케줄</p>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={lbl}>직원착석일</label><input className={inp} value={form.staff_start_date} onChange={e=>setForm({...form,staff_start_date:e.target.value})} placeholder="2026.05.01"/></div>
                  <div><label className={lbl}>MH 오픈일</label><input className={inp} value={form.model_house_date} onChange={e=>setForm({...form,model_house_date:e.target.value})} placeholder="2026.06.15"/></div>
                  <div><label className={lbl}>그랜드오픈일</label><input className={inp} value={form.grand_open_date} onChange={e=>setForm({...form,grand_open_date:e.target.value})} placeholder="2026.07.01"/></div>
                </div>
              </div>
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1"><FileText size={13}/>현장 소구점</p>
                <textarea className={`${inp} min-h-[120px]`} value={form.selling_points} onChange={e=>setForm({...form,selling_points:e.target.value})} placeholder="현장의 강점, 특징, 매력 포인트를 자유롭게 작성하세요..."/>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={()=>setShowCreate(false)} className="flex-1 py-2.5 text-sm text-slate-500 border border-slate-200 rounded-xl">취소</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">{saving?"등록 중...":"현장 등록"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
