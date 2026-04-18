"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Trash2, FileDown, Edit3, Download, Clock, List } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AdItem {
  id: number; isManual: boolean; media: string; type: string;
  targeting: string; quantity: string; unitPrice: string; amount: string;
  ageGroup: string; sendType: string; region1: string; region2: string; region3: string;
}

const MEDIA_OPTS = ["LMS","호갱노노"];
const LMS_GROUPS = [
  { label:"카드사", items:["국민카드","롯데멤버스(L.포인트)","비씨카드","삼성카드","신한카드","하나카드","현대카드","우리카드"] },
  { label:"통신사", items:["SKT","LGU+","KT"] },
  { label:"기타", items:["카카오","서울신문","조선일보","네이버"] },
];
const HOEGANGNONO_TYPES = ["호갱노노_단지마커","호갱노노_채널톡","직방_채널톡"];

const getUnitPrice = (media: string, type: string): string => {
  if (media === "호갱노노") { if (type === "호갱노노_채널톡") return "150"; if (type === "직방_채널톡") return "100"; return ""; }
  if (media === "LMS") { if (type === "롯데멤버스(L.포인트)") return "80"; if (type) return "100"; }
  return "";
};
const isUnitPriceFixed = (media: string, type: string): boolean => {
  if (media === "호갱노노" && type === "호갱노노_단지마커") return false;
  if (media === "호갱노노") return true;
  if (media === "LMS" && type) return true;
  return false;
};
const isAmountAuto = (media: string, type: string): boolean => {
  if (media === "호갱노노" && type === "호갱노노_단지마커") return false;
  return true;
};
const getQuantityLabel = (media: string, type: string): string =>
  media === "호갱노노" && type === "호갱노노_단지마커" ? "기간(일)" : "발송수량";
const buildSendType = (media: string, type: string, property: string): string => {
  if (!media) return "";
  return [media, type, property].filter(Boolean).join("_");
};
const newItem = (id: number, property: string = ""): AdItem => ({
  id, isManual: false, media: "LMS", type: "국민카드", targeting: "부동산 관심자",
  quantity: "", unitPrice: "100", amount: "", ageGroup: "30~60대",
  sendType: buildSendType("LMS", "국민카드", property), region1: "", region2: "", region3: "",
});
const newManualItem = (id: number): AdItem => ({
  id, isManual: true, media:"", type:"", targeting:"", quantity:"", unitPrice:"", amount:"",
  ageGroup:"", sendType:"", region1:"", region2:"", region3:"",
});

const inp = "w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
const inp_fixed = "w-full px-3 py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed";
const lbl = "block text-xs font-semibold text-slate-500 mb-1";

type SavedQuote = {
  id: number; property: string; quote_date: string;
  client_name: string; client_addr: string; client_biz_no: string;
  client_ceo: string; client_manager: string; client_phone: string;
  supplier_manager: string; supplier_phone: string;
  total_amount: number; total_vat: number; items: string;
  pdf_url: string | null; created_at: string;
};

export default function QuotePage() {
  const [property, setProperty] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [clientAddr, setClientAddr] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientBizNo, setClientBizNo] = useState("");
  const [clientCeo, setClientCeo] = useState("");
  const [clientMgr, setClientMgr] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [supplierMgr, setSupplierMgr] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [items, setItems] = useState<AdItem[]>([newItem(1)]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const fetchSavedQuotes = async () => {
    setLoadingQuotes(true);
    const { data } = await supabase.from("quotes").select("*").order("created_at",{ascending:false}).limit(50);
    setSavedQuotes((data || []) as SavedQuote[]);
    setLoadingQuotes(false);
  };
  useEffect(() => { fetchSavedQuotes(); }, []);

  const updateItem = (id: number, field: keyof AdItem, val: string) => {
    setItems(p => p.map(it => {
      if (it.id !== id) return it;
      const u = { ...it, [field]: val };
      if (field === "media") { u.type = val === "호갱노노" ? "호갱노노_단지마커" : "국민카드"; u.unitPrice = getUnitPrice(val, u.type); u.amount = ""; u.quantity = ""; u.sendType = buildSendType(val, u.type, property); }
      if (field === "type") { u.unitPrice = getUnitPrice(it.media, val); u.amount = ""; u.quantity = ""; u.sendType = buildSendType(it.media, val, property); }
      if (field === "quantity" || field === "unitPrice") { const q = Number(field === "quantity" ? val : u.quantity); const up = Number(field === "unitPrice" ? val : u.unitPrice); if (isAmountAuto(u.media, u.type)) u.amount = (q && up) ? String(q * up) : ""; }
      return u;
    }));
  };
  const handlePropertyChange = (val: string) => { setProperty(val); setItems(p => p.map(it => ({...it, sendType: it.isManual ? it.sendType : buildSendType(it.media, it.type, val)}))); };
  const addManual = () => setItems(p => [...p, newManualItem(p.length + 1)]);
  const removeItem = (id: number) => setItems(p => p.filter(it => it.id !== id));
  const total = items.reduce((s,it) => s + (Number(it.amount)||0), 0);
  const totalVat = Math.round(total * 1.1);

  const handleDownload = async () => {
    if (!property) return alert("대상물건을 입력하세요.");
    setDownloading(true);
    try {
      const res = await fetch("/api/generate-quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, quoteDate, clientAddr, clientName, clientBizNo, clientCeo, clientMgr, clientPhone, supplierMgr, supplierPhone, items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "오류");
      const blob = await res.blob();
      const _m = items[0]?.media||"", _t = items[0]?.type||"", _ds = quoteDate.replace(/-/g,"");
      const _v = totalVat >= 10000 ? `${Math.floor(totalVat/10000).toLocaleString()}만` : totalVat.toLocaleString();
      const fileName = `(주)광고인_${_m}_${_t}_${_ds}_${_v}(VAT포함).pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url);

      let pdfUrl: string | null = null;
      const storagePath = `quotes/${Date.now()}_${fileName}`;
      const { error: upErr } = await supabase.storage.from("quotes-pdf").upload(storagePath, blob, { contentType: "application/pdf" });
      if (!upErr) { const { data: ud } = supabase.storage.from("quotes-pdf").getPublicUrl(storagePath); pdfUrl = ud?.publicUrl || null; }
      else console.warn("Storage 업로드 실패:", upErr.message);

      await supabase.from("quotes").insert({
        property, quote_date: quoteDate, client_addr:clientAddr, client_name:clientName,
        client_biz_no:clientBizNo, client_ceo:clientCeo, client_manager:clientMgr, client_phone:clientPhone,
        supplier_manager:supplierMgr, supplier_phone:supplierPhone,
        items:JSON.stringify(items), total_amount:total, total_vat:totalVat, pdf_url:pdfUrl,
      });
      fetchSavedQuotes();
    } catch(e: any) { alert("PDF 생성 오류: " + e.message); }
    finally { setDownloading(false); }
  };

  const deleteSavedQuote = async (id: number) => { if (!confirm("삭제하시겠습니까?")) return; await supabase.from("quotes").delete().eq("id", id); fetchSavedQuotes(); };
  const loadQuote = (q: SavedQuote) => {
    setProperty(q.property); setQuoteDate(q.quote_date||new Date().toISOString().split("T")[0]);
    setClientAddr(q.client_addr||""); setClientName(q.client_name||""); setClientBizNo(q.client_biz_no||""); setClientCeo(q.client_ceo||"");
    setClientMgr(q.client_manager||""); setClientPhone(q.client_phone||"");
    setSupplierMgr(q.supplier_manager||""); setSupplierPhone(q.supplier_phone||"");
    try { const p = JSON.parse(q.items||"[]"); setItems(p.length>0?p:[newItem(1)]); } catch { setItems([newItem(1)]); }
  };

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-blue-500"/>견적서 작성</h1>
            <p className="text-sm text-slate-500 mt-0.5">㈜ 광고인 문자광고 대행 견적서</p>
          </div>
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 shadow-sm disabled:opacity-50">
            <FileDown size={14}/>{downloading ? " 변환중..." : " PDF 저장"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-5">
        <div className="flex-[3] min-w-0 space-y-4">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">기본 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>대상물건 <span className="text-red-400">*</span></label><input className={inp} value={property} onChange={e=>handlePropertyChange(e.target.value)} placeholder="예: [경산] 상방공원 호반써밋"/></div>
            <div><label className={lbl}>견적일자</label><input type="date" className={inp} value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">수급인(을) 담당자 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>담당자</label><input className={inp} value={supplierMgr} onChange={e=>setSupplierMgr(e.target.value)} placeholder="예: 기여운"/></div>
            <div><label className={lbl}>HP</label><input className={inp} value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)} placeholder="010-0000-0000"/></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">위탁인(갑) 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={lbl}>주소</label><input className={inp} value={clientAddr} onChange={e=>setClientAddr(e.target.value)} placeholder="주소"/></div>
            <div><label className={lbl}>계약자</label><input className={inp} value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="계약자명"/></div>
            <div><label className={lbl}>사업자번호</label><input className={inp} value={clientBizNo} onChange={e=>setClientBizNo(e.target.value)} placeholder="000-00-00000"/></div>
            <div><label className={lbl}>대표자</label><input className={inp} value={clientCeo} onChange={e=>setClientCeo(e.target.value)} placeholder="대표자명"/></div>
            <div><label className={lbl}>담당자</label><input className={inp} value={clientMgr} onChange={e=>setClientMgr(e.target.value)} placeholder="담당자명"/></div>
            <div><label className={lbl}>HP</label><input className={inp} value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="010-0000-0000"/></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">광고 항목</h2>
            <button onClick={addManual} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-600 rounded-lg border border-amber-200 hover:bg-amber-100"><Edit3 size={12}/> 수기입력</button>
          </div>
          <div className="space-y-4">
            {items.map((it,idx) => {
              const qtyLabel = it.isManual ? "발송수량" : getQuantityLabel(it.media, it.type);
              const fixedUnit = !it.isManual && isUnitPriceFixed(it.media, it.type);
              const autoAmt = !it.isManual && isAmountAuto(it.media, it.type);
              return (
                <div key={it.id} className={`p-4 rounded-xl border ${it.isManual ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><span className="text-sm font-bold text-amber-600">항목 {idx+1}</span>{it.isManual && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full border border-amber-200 font-semibold">수기입력</span>}</div>
                    {items.length > 1 && <button onClick={()=>removeItem(it.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13}/></button>}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div><label className={lbl}>매체</label>{it.isManual ? <input className={inp} value={it.media} onChange={e=>updateItem(it.id,"media",e.target.value)} placeholder="매체 입력"/> : <select className={inp} value={it.media} onChange={e=>updateItem(it.id,"media",e.target.value)}>{MEDIA_OPTS.map(m=><option key={m}>{m}</option>)}</select>}</div>
                    <div><label className={lbl}>발송/지면 유형</label>{it.isManual ? <input className={inp} value={it.type} onChange={e=>updateItem(it.id,"type",e.target.value)} placeholder="유형 입력"/> : it.media === "호갱노노" ? <select className={inp} value={it.type} onChange={e=>updateItem(it.id,"type",e.target.value)}>{HOEGANGNONO_TYPES.map(t=><option key={t}>{t}</option>)}</select> : <select className={inp} value={it.type} onChange={e=>updateItem(it.id,"type",e.target.value)}>{LMS_GROUPS.map(g=>(<optgroup key={g.label} label={g.label}>{g.items.map(t=><option key={t}>{t}</option>)}</optgroup>))}</select>}</div>
                    <div><label className={lbl}>타겟팅</label>{it.isManual ? <input className={inp} value={it.targeting} onChange={e=>updateItem(it.id,"targeting",e.target.value)} placeholder="타겟팅 입력"/> : <input className={inp_fixed} value="부동산 관심자" readOnly/>}</div>
                    <div><label className={lbl}>{qtyLabel}</label><input type="number" className={inp} value={it.quantity} onChange={e=>updateItem(it.id,"quantity",e.target.value)} placeholder={qtyLabel === "기간(일)" ? "예: 30" : "예: 100000"}/></div>
                    <div><label className={lbl}>단가(원)</label><input type="number" className={fixedUnit ? inp_fixed : inp} value={it.unitPrice} readOnly={fixedUnit} onChange={e=>!fixedUnit && updateItem(it.id,"unitPrice",e.target.value)} placeholder="단가"/></div>
                    <div><label className={lbl}>금액</label>{autoAmt && !it.isManual ? <div className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg font-bold text-blue-700">{Number(it.amount) ? Number(it.amount).toLocaleString() : "0"}원</div> : <input type="number" className={inp} value={it.amount} onChange={e=>updateItem(it.id,"amount",e.target.value)} placeholder="금액 입력"/>}</div>
                    <div><label className={lbl}>연령대</label><input className={inp} value={it.ageGroup} onChange={e=>updateItem(it.id,"ageGroup",e.target.value)}/></div>
                    <div><label className={lbl}>발송유형</label><input className={it.isManual ? inp : inp_fixed} value={it.isManual ? it.sendType : buildSendType(it.media, it.type, property)} readOnly={!it.isManual} onChange={e=>it.isManual && updateItem(it.id,"sendType",e.target.value)} placeholder="발송유형"/></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className={lbl}>지역①</label><input className={inp} value={it.region1} onChange={e=>updateItem(it.id,"region1",e.target.value)} placeholder="예: 경산"/></div>
                    <div><label className={lbl}>지역②</label><input className={inp} value={it.region2} onChange={e=>updateItem(it.id,"region2",e.target.value)} placeholder="예: 대구 동구"/></div>
                    <div><label className={lbl}>지역③</label><input className={inp} value={it.region3} onChange={e=>updateItem(it.id,"region3",e.target.value)} placeholder="예: 대구 수성구"/></div>
                  </div>
                </div>
              );
            })}
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

        <div className="flex-[2] min-w-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm sticky top-20">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2"><List size={16} className="text-blue-500"/><h3 className="text-base font-bold text-slate-700">저장된 견적서</h3></div>
              <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 font-semibold">{savedQuotes.length}건</span>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {loadingQuotes ? (
                <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/></div>
              ) : savedQuotes.length === 0 ? (
                <div className="text-center py-16 text-slate-300 text-sm"><FileText size={32} className="mx-auto mb-3 opacity-30"/><p>저장된 견적서가 없습니다</p><p className="text-xs mt-1">PDF 저장 시 자동 추가됩니다</p></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {savedQuotes.map(q => {
                    let pi: any[] = []; try { pi = JSON.parse(q.items||"[]"); } catch {}
                    return (
                      <div key={q.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-bold text-slate-800 truncate flex-1">{q.property}</p>
                          <span className="text-sm font-black text-blue-600 flex-shrink-0">{(q.total_vat||0)>=10000?`${Math.floor((q.total_vat||0)/10000).toLocaleString()}만원`:`${(q.total_vat||0).toLocaleString()}원`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 mb-3 space-y-1.5">
                          <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">날짜</span><span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1"><Clock size={10}/>{q.quote_date||"-"}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">수급인 담당자</span><span className="text-[11px] font-semibold text-slate-700">{q.supplier_manager||"-"}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">위탁인</span><span className="text-[11px] font-semibold text-slate-700">{q.client_name||"-"}</span></div>
                          <div className="flex items-center justify-between"><span className="text-[11px] text-slate-400">매체</span><div className="flex items-center gap-1"><span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 font-semibold">{pi[0]?.media||"-"}</span>{pi[0]?.type && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">{pi[0].type}</span>}</div></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={()=>loadQuote(q)} className="flex-1 text-xs py-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 font-semibold transition-colors text-center">불러오기</button>
                          {q.pdf_url ? (
                            <a href={q.pdf_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs py-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200 hover:bg-emerald-100 font-semibold transition-colors flex items-center justify-center gap-1"><Download size={11}/> PDF</a>
                          ) : (
                            <span className="flex-1 text-xs py-2 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 font-semibold text-center cursor-not-allowed">PDF 없음</span>
                          )}
                          <button onClick={()=>deleteSavedQuote(q.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}
