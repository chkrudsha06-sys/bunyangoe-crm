"use client";

import { useState } from "react";
import { FileText, Plus, Trash2, FileDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AdItem {
  id: number;
  media: string;
  type: string;
  targeting: string;
  quantity: string;
  unitPrice: string;
  region1: string;
  region2: string;
  region3: string;
  ageGroup: string;
  sendType: string;
}

const MEDIA_OPTS = ["SKT","KT","LGU+","호갱노노_단지마커","직방_단지마커","프리미엄_비즈마커","네이버 DA","카카오 DA","기타"];
const TYPE_OPTS  = ["LMS","SMS","MMS","단지마커","비즈마커","배너광고","기타"];
const newItem = (id: number): AdItem => ({
  id, media:"SKT", type:"LMS", targeting:"부동산 관심자",
  quantity:"", unitPrice:"", region1:"", region2:"", region3:"",
  ageGroup:"30~60대", sendType:"",
});

const inp = "w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
const lbl = "block text-xs font-semibold text-slate-500 mb-1";

export default function QuotePage() {
  const [property,    setProperty]    = useState("");
  const [quoteDate,   setQuoteDate]   = useState(new Date().toISOString().split("T")[0]);
  const [clientAddr,  setClientAddr]  = useState("");
  const [clientName,  setClientName]  = useState("");
  const [clientBizNo, setClientBizNo] = useState("");
  const [clientCeo,   setClientCeo]   = useState("");
  const [clientMgr,   setClientMgr]   = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [items, setItems] = useState<AdItem[]>([newItem(1)]);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [downloading, setDownloading] = useState(false);

  const updateItem = (id: number, f: keyof AdItem, v: string) =>
    setItems(p => p.map(it => it.id===id ? {...it,[f]:v} : it));
  const addItem    = () => setItems(p => [...p, newItem(p.length+1)]);
  const removeItem = (id: number) => setItems(p => p.filter(it=>it.id!==id));

  const amt  = (q:string,p:string) => (Number(q)||0)*(Number(p)||0);
  const total    = items.reduce((s,it)=>s+amt(it.quantity,it.unitPrice),0);
  const totalVat = Math.round(total*1.1);

  const handleSave = async () => {
    if (!property) return alert("대상물건을 입력하세요.");
    setSaving(true);
    await supabase.from("quotes").insert({
      property, quote_date: quoteDate,
      client_addr:clientAddr, client_name:clientName,
      client_biz_no:clientBizNo, client_ceo:clientCeo,
      client_manager:clientMgr, client_phone:clientPhone,
      items:JSON.stringify(items), total_amount:total, total_vat:totalVat,
    });
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const handleDownload = async () => {
    if (!property) return alert("대상물건을 입력하세요.");
    setDownloading(true);
    try {
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property, quoteDate,
          clientAddr, clientName, clientBizNo, clientCeo,
          clientMgr, clientPhone, items,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "오류 발생");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `광고인_견적서_${property}_${quoteDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e: any) {
      alert("PDF 생성 오류: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText size={20} className="text-blue-500"/>견적서 작성
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">㈜ 광고인 문자광고 대행 견적서</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50">
              {saved ? "✓ 저장됨" : "저장"}
            </button>
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 shadow-sm disabled:opacity-50">
              <FileDown size={14}/>{downloading ? " 변환중... (최대 30초)" : " PDF 저장"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">기본 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>대상물건 <span className="text-red-400">*</span></label>
              <input className={inp} value={property} onChange={e=>setProperty(e.target.value)} placeholder="예: [경산] 상방공원 호반써밋"/></div>
            <div><label className={lbl}>견적일자</label>
              <input type="date" className={inp} value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">위탁인(갑) 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={lbl}>주소</label>
              <input className={inp} value={clientAddr} onChange={e=>setClientAddr(e.target.value)} placeholder="주소"/></div>
            <div><label className={lbl}>계약자(담당자)</label>
              <input className={inp} value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="담당자명"/></div>
            <div><label className={lbl}>HP</label>
              <input className={inp} value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="010-0000-0000"/></div>
            <div><label className={lbl}>사업자번호</label>
              <input className={inp} value={clientBizNo} onChange={e=>setClientBizNo(e.target.value)} placeholder="000-00-00000"/></div>
            <div><label className={lbl}>대표자</label>
              <input className={inp} value={clientCeo} onChange={e=>setClientCeo(e.target.value)} placeholder="대표자명"/></div>
            <div className="col-span-2"><label className={lbl}>담당자</label>
              <input className={inp} value={clientMgr} onChange={e=>setClientMgr(e.target.value)} placeholder="담당자명"/></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">광고 항목</h2>
            <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100">
              <Plus size={12}/> 항목 추가
            </button>
          </div>
          <div className="space-y-4">
            {items.map((it,idx)=>(
              <div key={it.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-amber-600">항목 {idx+1}</span>
                  {items.length>1 && <button onClick={()=>removeItem(it.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13}/></button>}
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div><label className={lbl}>매체</label>
                    <select className={inp} value={it.media} onChange={e=>updateItem(it.id,"media",e.target.value)}>
                      {MEDIA_OPTS.map(m=><option key={m}>{m}</option>)}</select></div>
                  <div><label className={lbl}>발송/지면 유형</label>
                    <select className={inp} value={it.type} onChange={e=>updateItem(it.id,"type",e.target.value)}>
                      {TYPE_OPTS.map(t=><option key={t}>{t}</option>)}</select></div>
                  <div><label className={lbl}>타겟팅</label>
                    <input className={inp} value={it.targeting} onChange={e=>updateItem(it.id,"targeting",e.target.value)}/></div>
                  <div><label className={lbl}>발송수량</label>
                    <input type="number" className={inp} value={it.quantity} onChange={e=>updateItem(it.id,"quantity",e.target.value)} placeholder="100000"/></div>
                  <div><label className={lbl}>단가(원)</label>
                    <input type="number" className={inp} value={it.unitPrice} onChange={e=>updateItem(it.id,"unitPrice",e.target.value)} placeholder="100"/></div>
                  <div><label className={lbl}>금액</label>
                    <div className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg font-bold text-blue-700">
                      {amt(it.quantity,it.unitPrice).toLocaleString()}원</div></div>
                  <div><label className={lbl}>연령대</label>
                    <input className={inp} value={it.ageGroup} onChange={e=>updateItem(it.id,"ageGroup",e.target.value)}/></div>
                  <div><label className={lbl}>발송유형</label>
                    <input className={inp} value={it.sendType} onChange={e=>updateItem(it.id,"sendType",e.target.value)} placeholder="SKT LMS_현장명"/></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className={lbl}>지역①</label><input className={inp} value={it.region1} onChange={e=>updateItem(it.id,"region1",e.target.value)} placeholder="경산"/></div>
                  <div><label className={lbl}>지역②</label><input className={inp} value={it.region2} onChange={e=>updateItem(it.id,"region2",e.target.value)} placeholder="대구 동구"/></div>
                  <div><label className={lbl}>지역③</label><input className={inp} value={it.region3} onChange={e=>updateItem(it.id,"region3",e.target.value)} placeholder="대구 수성구"/></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
            <span className="text-sm text-slate-600">공급가액: <b>{total.toLocaleString()}원</b></span>
            <span className="text-base font-black text-blue-700">합계 (VAT 포함): {totalVat.toLocaleString()}원</span>
          </div>
        </div>

        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
          <p className="text-sm font-semibold text-amber-700">💳 입금처</p>
          <p className="text-sm text-amber-600 mt-1">기업은행 298-122618-04-018 &nbsp;|&nbsp; 예금주: ㈜ 광고인</p>
        </div>
      </div>
    </div>
  );
}
