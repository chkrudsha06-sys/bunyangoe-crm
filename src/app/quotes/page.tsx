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
  amount: string;
  region1: string;
  region2: string;
  region3: string;
  ageGroup: string;
  sendType: string;
}

// 매체 옵션
const MEDIA_OPTS = ["호갱노노", "LMS"];

// 호갱노노 발송유형
const HOEGANGNONO_TYPES = ["호갱노노_단지마커","호갱노노_채널톡","직방_채널톡"];

// LMS 발송유형 (그룹 구조)
const LMS_GROUPS = [
  {
    label: "■ 카드사",
    items: ["국민카드","BC카드","삼성카드","신한카드","롯데카드","하나카드"],
  },
  {
    label: "■ 통신사",
    items: ["SKT","KT"],
  },
  {
    label: "■ 멤버십사외",
    items: ["롯데멤버스(L.포인트)","스마트스코어","티맵","신세계포인트","OK캐시백"],
  },
];

// 단가 자동 설정
const getUnitPrice = (media: string, type: string): string => {
  if (media === "호갱노노") {
    if (type === "호갱노노_채널톡") return "150";
    if (type === "직방_채널톡") return "100";
    return ""; // 단지마커는 수기
  }
  if (media === "LMS") {
    if (type === "롯데멤버스(L.포인트)") return "80";
    if (type) return "100";
  }
  return "";
};

// 발송수량 라벨
const getQuantityLabel = (media: string, type: string): string => {
  if (media === "호갱노노" && type === "호갱노노_단지마커") return "기간(일)";
  return "발송수량";
};

// 단가 고정 여부
const isUnitPriceFixed = (media: string, type: string): boolean => {
  if (media === "호갱노노" && type === "호갱노노_단지마커") return false;
  if (media === "호갱노노" && (type === "호갱노노_채널톡" || type === "직방_채널톡")) return true;
  if (media === "LMS" && type) return true;
  return false;
};

// 금액 고정 여부 (호갱노노_단지마커만 수기)
const isAmountFixed = (media: string, type: string): boolean => {
  if (media === "호갱노노" && type === "호갱노노_단지마커") return false;
  return true;
};

const newItem = (id: number): AdItem => ({
  id, media:"호갱노노", type:"호갱노노_단지마커", targeting:"부동산 관심자",
  quantity:"", unitPrice:"", amount:"",
  region1:"", region2:"", region3:"",
  ageGroup:"30~60대", sendType:"",
});

const inp = "w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
const inp_fixed = "w-full px-3 py-1.5 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed";
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

  const updateItem = (id: number, field: keyof AdItem, val: string) => {
    setItems(p => p.map(it => {
      if (it.id !== id) return it;
      const updated = { ...it, [field]: val };

      // 매체 변경 시 → 첫 번째 타입으로 초기화
      if (field === "media") {
        updated.type = val === "호갱노노" ? "호갱노노_단지마커" : "국민카드";
        updated.unitPrice = getUnitPrice(val, updated.type);
        updated.amount = "";
        updated.quantity = "";
      }

      // 타입 변경 시 → 단가 자동 설정
      if (field === "type") {
        updated.unitPrice = getUnitPrice(it.media, val);
        updated.amount = "";
        updated.quantity = "";
      }

      // 수량/단가 변경 시 → 금액 자동 계산 (단지마커 제외)
      if (field === "quantity" || field === "unitPrice") {
        const q = field === "quantity" ? Number(val) : Number(updated.quantity);
        const p = field === "unitPrice" ? Number(val) : Number(updated.unitPrice);
        if (!isAmountFixed(updated.media, updated.type)) {
          // 단지마커: 수기
        } else {
          updated.amount = (q && p) ? String(q * p) : "";
        }
      }

      return updated;
    }));
  };

  const addItem    = () => setItems(p => [...p, newItem(p.length+1)]);
  const removeItem = (id: number) => setItems(p => p.filter(it=>it.id!==id));

  const totalVat = Math.round(
    items.reduce((s,it) => s + (Number(it.amount)||0), 0) * 1.1
  );
  const total = items.reduce((s,it) => s + (Number(it.amount)||0), 0);

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
              <FileDown size={14}/>{downloading ? " 변환중..." : " PDF 저장"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-4xl mx-auto w-full">

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">기본 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>대상물건 <span className="text-red-400">*</span></label>
              <input className={inp} value={property} onChange={e=>setProperty(e.target.value)} placeholder="예: [경산] 상방공원 호반써밋"/></div>
            <div><label className={lbl}>견적일자</label>
              <input type="date" className={inp} value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/></div>
          </div>
        </div>

        {/* 위탁인(갑) */}
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

        {/* 광고 항목 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">광고 항목</h2>
            <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100">
              <Plus size={12}/> 항목 추가
            </button>
          </div>

          <div className="space-y-4">
            {items.map((it,idx)=>{
              const qtyLabel = getQuantityLabel(it.media, it.type);
              const fixedUnit = isUnitPriceFixed(it.media, it.type);
              const fixedAmt  = isAmountFixed(it.media, it.type);

              return (
                <div key={it.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-amber-600">항목 {idx+1}</span>
                    {items.length>1 && <button onClick={()=>removeItem(it.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13}/></button>}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {/* 매체 */}
                    <div>
                      <label className={lbl}>매체</label>
                      <select className={inp} value={it.media} onChange={e=>updateItem(it.id,"media",e.target.value)}>
                        {MEDIA_OPTS.map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>

                    {/* 발송/지면 유형 */}
                    <div>
                      <label className={lbl}>발송/지면 유형</label>
                      {it.media === "호갱노노" ? (
                        <select className={inp} value={it.type} onChange={e=>updateItem(it.id,"type",e.target.value)}>
                          {HOEGANGNONO_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      ) : (
                        <select className={inp} value={it.type} onChange={e=>updateItem(it.id,"type",e.target.value)}>
                          {LMS_GROUPS.map(g=>(
                            <optgroup key={g.label} label={g.label}>
                              {g.items.map(t=><option key={t} value={t}>{t}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* 타겟팅 고정 */}
                    <div>
                      <label className={lbl}>타겟팅</label>
                      <input className={inp_fixed} value="부동산 관심자" readOnly/>
                    </div>

                    {/* 발송수량 / 기간(일) */}
                    <div>
                      <label className={lbl}>{qtyLabel}</label>
                      <input type="number" className={inp} value={it.quantity}
                        onChange={e=>updateItem(it.id,"quantity",e.target.value)}
                        placeholder={qtyLabel === "기간(일)" ? "예: 30" : "예: 100000"}/>
                    </div>

                    {/* 단가 */}
                    <div>
                      <label className={lbl}>단가(원)</label>
                      <input type="number"
                        className={fixedUnit ? inp_fixed : inp}
                        value={it.unitPrice}
                        readOnly={fixedUnit}
                        onChange={e=>!fixedUnit && updateItem(it.id,"unitPrice",e.target.value)}
                        placeholder="단가"/>
                    </div>

                    {/* 금액 */}
                    <div>
                      <label className={lbl}>금액</label>
                      {fixedAmt ? (
                        <div className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg font-bold text-blue-700">
                          {Number(it.amount) ? Number(it.amount).toLocaleString() : "0"}원
                        </div>
                      ) : (
                        <input type="number" className={inp} value={it.amount}
                          onChange={e=>updateItem(it.id,"amount",e.target.value)}
                          placeholder="금액 직접 입력"/>
                      )}
                    </div>

                    {/* 연령대 */}
                    <div>
                      <label className={lbl}>연령대</label>
                      <input className={inp} value={it.ageGroup} onChange={e=>updateItem(it.id,"ageGroup",e.target.value)}/>
                    </div>

                    {/* 발송유형 */}
                    <div>
                      <label className={lbl}>발송유형</label>
                      <input className={inp} value={it.sendType} onChange={e=>updateItem(it.id,"sendType",e.target.value)} placeholder="발송유형 입력"/>
                    </div>
                  </div>

                  {/* 지역 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className={lbl}>지역①</label><input className={inp} value={it.region1} onChange={e=>updateItem(it.id,"region1",e.target.value)} placeholder="예: 경산"/></div>
                    <div><label className={lbl}>지역②</label><input className={inp} value={it.region2} onChange={e=>updateItem(it.id,"region2",e.target.value)} placeholder="예: 대구 동구"/></div>
                    <div><label className={lbl}>지역③</label><input className={inp} value={it.region3} onChange={e=>updateItem(it.id,"region3",e.target.value)} placeholder="예: 대구 수성구"/></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 합계 */}
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
