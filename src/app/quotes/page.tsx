"use client";

import { useState, useRef } from "react";
import { FileText, Plus, Trash2, Printer } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const updateItem = (id: number, f: keyof AdItem, v: string) =>
    setItems(p => p.map(it => it.id===id ? {...it,[f]:v} : it));
  const addItem    = () => setItems(p => [...p, newItem(p.length+1)]);
  const removeItem = (id: number) => setItems(p => p.filter(it=>it.id!==id));

  const amt  = (q:string,p:string) => (Number(q)||0)*(Number(p)||0);
  const total    = items.reduce((s,it)=>s+amt(it.quantity,it.unitPrice),0);
  const totalVat = Math.round(total*1.1);
  const fw = (n:number) => n ? n.toLocaleString() : "";

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

  const handlePrint = () => {
    const printHtml = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
<title>견적서_${property}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:9pt;color:#000;}
@page{size:A4 landscape;margin:12mm;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
table{border-collapse:collapse;width:100%;}
td,th{border:1px solid #666;padding:3px 5px;vertical-align:middle;}
.title{text-align:center;font-size:14pt;font-weight:bold;padding:8px;border:2px solid #333;background:#f0f4ff;}
.sec-label{background:#e8edf5;font-weight:bold;text-align:center;white-space:pre-line;width:60px;}
.field-label{background:#f5f7fa;font-weight:bold;text-align:center;width:55px;}
.th{background:#dde3ef;font-weight:bold;text-align:center;}
.right{text-align:right;}
.center{text-align:center;}
.bold{font-weight:bold;}
.total-label{background:#dde3ef;font-weight:bold;text-align:center;}
.total-val{font-size:11pt;font-weight:bold;text-align:right;color:#1a3a8a;}
.bank{background:#f9f5e8;font-size:8.5pt;}
.terms{font-size:7.5pt;color:#333;padding:4px 6px;border:1px solid #ccc;margin-top:2mm;}
.terms-title{font-weight:bold;font-size:9pt;padding:3px 6px;background:#e8edf5;border:1px solid #ccc;}
</style></head><body>
<table>
<tr><td colspan="8" class="title">㈜ 광고인&nbsp;&nbsp; 문자광고 대행 견적서</td></tr>
<tr>
  <td class="sec-label">대상물건</td>
  <td colspan="7" class="bold">${property}</td>
</tr>
<tr>
  <td rowspan="3" class="sec-label">위탁인\n(갑)</td>
  <td class="field-label">주소</td>
  <td colspan="3">${clientAddr}</td>
  <td class="field-label">사업자번호</td>
  <td colspan="2">${clientBizNo}</td>
</tr>
<tr>
  <td class="field-label">계약자</td>
  <td colspan="3">${clientName}</td>
  <td class="field-label">대표자</td>
  <td>${clientCeo}</td>
  <td class="center">(인)</td>
</tr>
<tr>
  <td class="field-label">담당자</td>
  <td colspan="3">${clientMgr}</td>
  <td class="field-label">HP</td>
  <td colspan="2">${clientPhone}</td>
</tr>
<tr>
  <td rowspan="4" class="sec-label">수급인\n(을)</td>
  <td class="field-label">주소</td>
  <td colspan="3">광주광역시 북구 군왕로51번길 118(두암동)</td>
  <td class="field-label">사업자번호</td>
  <td colspan="2">268-88-01715</td>
</tr>
<tr>
  <td class="field-label">계약자</td>
  <td colspan="3">㈜ 광고인 | 분양의신</td>
  <td class="field-label">대표자</td>
  <td>문시욱</td>
  <td class="center">(인)</td>
</tr>
<tr>
  <td class="field-label">담당자</td>
  <td colspan="3">기여운</td>
  <td class="field-label">HP</td>
  <td colspan="2">010-8478-2564</td>
</tr>
<tr>
  <td class="field-label">e-mail</td>
  <td colspan="3">sales@ad-person.net</td>
  <td class="field-label">견적일자</td>
  <td colspan="2">${quoteDate}</td>
</tr>
<tr>
  <th class="th" style="width:40px">구분</th>
  <th class="th" style="width:80px">매체</th>
  <th class="th">발송/지면 유형</th>
  <th class="th">타겟팅</th>
  <th class="th" style="width:80px">발송수량</th>
  <th class="th" style="width:70px">단가</th>
  <th class="th" style="width:90px">금액</th>
  <th class="th" style="width:10px"></th>
</tr>
${items.map((it,i)=>`<tr>
  <td class="center">${i+1}</td>
  <td class="center">${it.media}</td>
  <td class="center">${it.type}</td>
  <td class="center">${it.targeting}</td>
  <td class="right">${fw(Number(it.quantity)||0)}</td>
  <td class="right">${fw(Number(it.unitPrice)||0)}</td>
  <td class="right bold">${fw(amt(it.quantity,it.unitPrice))}</td>
  <td></td>
</tr>`).join("")}
<tr>
  <td rowspan="4" class="sec-label">타겟팅\n상세</td>
  <td class="field-label">연령대</td>
  <td colspan="2">${items[0]?.ageGroup||""}</td>
  <td class="field-label" colspan="2">발송유형</td>
  <td colspan="2">${items[0]?.sendType||""}</td>
</tr>
<tr><td class="field-label">지역①</td><td colspan="6">${items[0]?.region1||""}</td></tr>
<tr><td class="field-label">지역②</td><td colspan="6">${items[0]?.region2||""}</td></tr>
<tr><td class="field-label">지역③</td><td colspan="6">${items[0]?.region3||""}</td></tr>
<tr>
  <td colspan="2" class="bank">입금처</td>
  <td colspan="3" class="bank">기업은행 298-122618-04-018 &nbsp; 예금주: ㈜ 광고인</td>
  <td class="total-label">합계<br/>(VAT포함)</td>
  <td colspan="2" class="total-val">${totalVat.toLocaleString()}원</td>
</tr>
</table>
<div class="terms-title" style="margin-top:3mm">광고대행 서비스 이용 약관</div>
<div class="terms">
<b>제1조 (당사자의 정의)</b> 본 계약에서 "갑"은 용역을 의뢰하는 고객, "을"은 용역을 제공하는 당사를 의미합니다.<br/>
<b>제2조 (계약의 완전성)</b> 서면으로 명시되지 아니한 구두·전자적 통신 등의 약정은 본 계약의 효력에 영향을 미치지 않으며, 본 계약서에 기재된 내용만이 당사자 간 합의의 전부를 구성합니다.<br/>
<b>제3조 (계약의 성립)</b> 계약서 작성·체결과 함께 계약금이 입금 완료된 시점에 효력이 발생합니다.<br/>
<b>제4조 (광고 집행의 범위)</b> 광고 집행의 구체적 범위는 별도 광고 집행 계획서 또는 계약서 별지에서 정한 바에 따릅니다.<br/>
<b>제5조 (갑의 자료 제공)</b> "갑"은 용역 이행에 필요한 기초자료를 성실히 제공하여야 하며, 제공 정보의 정확성에 대한 책임을 부담합니다.
</div>
</body></html>`;
    const w = window.open("","_blank","width=1200,height=800");
    if(!w) return alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.");
    w.document.write(printHtml);
    w.document.close();
    setTimeout(()=>{ w.focus(); w.print(); },400);
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
              {saved?"✓ 저장됨":"저장"}
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 shadow-sm">
              <Printer size={14}/> PDF 저장
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-4xl mx-auto w-full">

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">기본 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>대상물건 <span className="text-red-400">*</span></label>
              <input className={inp} value={property} onChange={e=>setProperty(e.target.value)} placeholder="예: [경산] 상방공원 호반써밋"/>
            </div>
            <div>
              <label className={lbl}>견적일자</label>
              <input type="date" className={inp} value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/>
            </div>
          </div>
        </div>

        {/* 위탁인(갑) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">위탁인(갑) 정보</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={lbl}>주소</label><input className={inp} value={clientAddr} onChange={e=>setClientAddr(e.target.value)} placeholder="주소"/></div>
            <div><label className={lbl}>계약자(담당자)</label><input className={inp} value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="담당자명"/></div>
            <div><label className={lbl}>HP</label><input className={inp} value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="010-0000-0000"/></div>
            <div><label className={lbl}>사업자번호</label><input className={inp} value={clientBizNo} onChange={e=>setClientBizNo(e.target.value)} placeholder="000-00-00000"/></div>
            <div><label className={lbl}>대표자</label><input className={inp} value={clientCeo} onChange={e=>setClientCeo(e.target.value)} placeholder="대표자명"/></div>
            <div className="col-span-2"><label className={lbl}>담당자</label><input className={inp} value={clientMgr} onChange={e=>setClientMgr(e.target.value)} placeholder="담당자명"/></div>
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
                      {fw(amt(it.quantity,it.unitPrice))}원</div></div>
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
