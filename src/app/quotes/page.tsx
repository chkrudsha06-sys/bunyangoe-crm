"use client";

import { useState } from "react";
import { FileText, Plus, Trash2, FileDown } from "lucide-react";
import { useState as _u } from "react";
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
  const fw = (n:number) => n ? n.toLocaleString() : "0";

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

  const [downloading, setDownloading] = useState(false);

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

  const handlePDF = () => {
    if (!property) return alert("대상물건을 입력하세요.");

    const stampUrl = `${window.location.origin}/stamp.png`;
    const fmtDate = quoteDate.replace(/-/g, ".");

    const itemRows = items.map((it, i) => `
      <tr>
        <td class="center">${i+1}</td>
        <td class="center">${it.media}</td>
        <td class="center">${it.type}</td>
        <td class="center">${it.targeting}</td>
        <td class="right">${(Number(it.quantity)||0).toLocaleString()}</td>
        <td class="right">${(Number(it.unitPrice)||0).toLocaleString()}</td>
        <td class="right red-bold">${amt(it.quantity,it.unitPrice).toLocaleString()}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"/>
<title>광고인_견적서_${property}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'맑은 고딕','Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:9pt;color:#000;background:#fff;}
  @page{size:A4 portrait;margin:10mm 12mm;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  table{border-collapse:collapse;width:100%;}
  td,th{border:1px solid #888;padding:3px 5px;vertical-align:middle;font-size:8.5pt;}
  .title-row td{background:#1a3a8a;color:#fff;text-align:center;font-size:16pt;font-weight:900;padding:10px;letter-spacing:2px;}
  .sec-label{background:#c8d4e8;font-weight:bold;text-align:center;white-space:pre-line;font-size:8pt;width:48px;}
  .field-label{background:#e8edf5;font-weight:bold;text-align:center;font-size:8pt;width:52px;}
  .th{background:#1a3a8a;color:#fff;font-weight:bold;text-align:center;font-size:8.5pt;padding:5px 3px;}
  .center{text-align:center;}
  .right{text-align:right;}
  .red-bold{color:#c00;font-weight:bold;text-align:right;}
  .targeting-label{background:#c8d4e8;font-weight:bold;text-align:center;font-size:8pt;}
  .total-label{background:#1a3a8a;color:#fff;font-weight:bold;text-align:center;font-size:9pt;white-space:pre-line;}
  .total-val{color:#c00;font-weight:900;font-size:14pt;text-align:right;padding-right:8px;}
  .bank-cell{background:#fffbe6;font-size:9pt;font-weight:bold;text-align:center;line-height:1.6;}
  .stamp-wrap{position:relative;display:inline-block;}
  .stamp{position:absolute;right:-10px;top:-18px;width:65px;height:65px;opacity:0.88;}
  .terms-header{background:#1a3a8a;color:#fff;font-weight:bold;text-align:center;font-size:10pt;padding:5px;margin-top:4mm;}
  .terms-body{border:1px solid #aaa;padding:4px 8px;font-size:7pt;line-height:1.5;color:#222;}
  .terms-body b{font-size:7.5pt;}
  .warning{border:1px solid #e44;background:#fff8f8;padding:5px 8px;font-size:7.5pt;margin-top:2mm;}
  .warning-title{color:#c00;font-weight:bold;}
</style></head>
<body>
<table>
  <tr><td colspan="7" class="title-row">㈜ 광고인&nbsp;&nbsp; 문자광고 대행 견적서</td></tr>
  <tr>
    <td class="sec-label">대상물건</td>
    <td colspan="6" style="font-weight:bold;font-size:10pt;">${property}</td>
  </tr>
  <tr>
    <td rowspan="3" class="sec-label">위탁인&#10;(갑)</td>
    <td class="field-label">주소</td>
    <td colspan="2">${clientAddr}</td>
    <td class="field-label">사업자번호</td>
    <td colspan="2">${clientBizNo}</td>
  </tr>
  <tr>
    <td class="field-label">계약자</td>
    <td colspan="2">${clientName}</td>
    <td class="field-label">대표자</td>
    <td>${clientCeo}</td>
    <td class="center" style="font-size:8pt;">(인)</td>
  </tr>
  <tr>
    <td class="field-label">담당자</td>
    <td colspan="2">${clientMgr}</td>
    <td class="field-label">HP</td>
    <td colspan="2">${clientPhone}</td>
  </tr>
  <tr>
    <td rowspan="4" class="sec-label">수급인&#10;(을)</td>
    <td class="field-label">주소</td>
    <td colspan="2">광주광역시 북구 군왕로51번길 118(두암동)</td>
    <td class="field-label">사업자번호</td>
    <td colspan="2">268-88-01715</td>
  </tr>
  <tr>
    <td class="field-label">계약자</td>
    <td colspan="2">㈜ 광고인 | 분양의신</td>
    <td class="field-label">대표자</td>
    <td>문시욱</td>
    <td class="center" style="position:relative;">
      <span class="stamp-wrap">(인)<img src="${stampUrl}" class="stamp" alt="도장"/></span>
    </td>
  </tr>
  <tr>
    <td class="field-label">담당자</td>
    <td colspan="2">기여운</td>
    <td class="field-label">HP</td>
    <td colspan="2">010-8478-2564</td>
  </tr>
  <tr>
    <td class="field-label">e-mail</td>
    <td colspan="2">sales@ad-person.net</td>
    <td class="field-label">견적일자</td>
    <td colspan="2">${fmtDate}</td>
  </tr>
  <tr>
    <th class="th" style="width:32px">구분</th>
    <th class="th" style="width:70px">매체</th>
    <th class="th" style="width:80px">발송/지면 유형</th>
    <th class="th">타겟팅</th>
    <th class="th" style="width:75px">발송수량</th>
    <th class="th" style="width:65px">단가</th>
    <th class="th" style="width:85px">금액</th>
  </tr>
  ${itemRows}
  <tr>
    <td rowspan="4" class="targeting-label">타겟팅&#10;상세</td>
    <td class="field-label">연령대</td>
    <td>${items[0]?.ageGroup||""}</td>
    <td class="field-label" style="font-weight:bold;background:#e8edf5;">발송유형</td>
    <td colspan="3">${items[0]?.sendType||""}</td>
  </tr>
  <tr><td class="field-label">지역①</td><td colspan="5">${items[0]?.region1||""}</td></tr>
  <tr><td class="field-label">지역③</td><td colspan="5">${items[0]?.region3||""}</td></tr>
  <tr><td class="field-label">지역②</td><td colspan="5">${items[0]?.region2||""}</td></tr>
  <tr>
    <td colspan="2" class="bank-cell">입금처</td>
    <td colspan="2" class="bank-cell">기업은행 298-122618-04-018<br/>예금주: ㈜ 광고인</td>
    <td class="total-label">합계&#10;(VAT포함)</td>
    <td colspan="2" class="total-val">${totalVat.toLocaleString()}</td>
  </tr>
</table>

<div class="terms-header">광고대행 서비스 이용 약관</div>
<div class="terms-body">
<b>제1조 (당사자의 정의)</b> 본 계약에서 사용하는 당사자의 정의는 다음과 같다. "갑": 용역을 의뢰하는 고객 / "을": 용역을 제공하는 당사<br/>
<b>제2조 (계약의 완전성)</b> 본 계약서에 서면으로 명시되지 아니한 구두, 전자적 통신 등을 통한 일체의 약정은 본 계약의 효력에 영향을 미치지 아니하며, 본 계약서에 기재된 내용만이 당사자 간 합의의 전부를 구성한다.<br/>
<b>제3조 (계약의 성립 및 동의)</b> ① 본 계약은 계약서의 작성·체결과 함께 계약금이 "갑"으로부터 "을"에게 입금 또는 결제 완료된 시점에 그 효력이 발생한다. ② "갑"이 본 계약서에 서명·날인하는 것은 본 약관 및 주의사항의 내용을 충분히 숙지하고 이에 동의하며, 광고 집행 계약을 체결하는 것을 의미한다.<br/>
<b>제4조 (광고 집행의 범위)</b> ① 본 계약에 따른 광고 집행의 구체적 범위(발송 매체, 발송 건수, 발송 대상 지역, 발송 시기, 발송 기간 등)는 별도의 광고 집행 계획서 또는 본 계약서 별지에서 정한 바에 따른다. ② "을"은 제1항에서 정한 범위 내에서 성실히 광고를 집행할 의무를 부담하며, 집행 범위의 변경이 필요한 경우 "갑"과 사전 협의하여야 한다.<br/>
<b>제5조 (갑의 자료 제공 및 정보 제공 의무)</b> ① "갑"은 본 계약의 원활한 이행을 위하여 "을"이 요청하는 기초자료 및 관련 정보를 성실히 제공하여야 한다. ② "갑"은 "을"에게 제공하는 분양 관련 정보의 정확성 및 진실성에 대한 책임을 부담한다. ③ "갑"이 제공한 정보가 허위이거나 과장된 내용을 포함하여 관계 기관의 제재 또는 제3자로부터의 분쟁이 발생한 경우, 이에 따른 책임은 "갑"에게 귀속된다. ④ "갑"의 자료 제공 지연 또는 미제공으로 인하여 용역 이행이 지연되거나 광고 효과가 저하될 경우, "을"은 이에 대한 책임을 부담하지 아니한다.<br/>
<b>제6조 (법령 준수 의무)</b> "을"은 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「표시·광고의 공정화에 관한 법률」 등 관련 법령을 준수하여야 하며, 광고성 정보 표기, 수신거부 수단 제공, 야간 발송 제한(21시~익일 08시) 등 법적 의무의 이행을 성실히 이행한다.<br/>
<b>제7조 (광고 효과에 대한 면책)</b> "을"은 본 계약에 따른 광고를 성실히 집행할 의무를 부담하나, 광고 집행 이후의 분양 실적, 고객 유입률, 계약 전환율 등 광고 효과에 대하여는 이를 보증하지 아니한다.<br/>
<b>제8조 (계약의 변경 및 해제)</b> ① 광고 마케팅 콘텐츠 제작 업무의 특수성상 계약 이행 초기에 상당한 선투입 비용이 발생하므로, 계약 성립 이후 계약 내용의 변경 또는 해제는 원칙적으로 불가하다. ② 불가피한 사유로 계약을 변경 또는 해제하고자 하는 경우, 기이행 용역에 해당하는 대금 외에 총 계약금액의 30%에 해당하는 위약금이 발생한다.<br/>
<b>제9조 (제작물의 저작권 귀속)</b> ① 본 계약의 이행 과정에서 "을"이 제작한 광고 소재(문구, 이미지, 렌더링이미지자료)는 계약 대금 완납 시 "갑"에게 귀속된다. ② 단 "을"이 기존에 보유하고 있던 작자물, 범용적으로 사용하는 플랫폼 및 발송 시스템 등은 그러하지 아니하며, "을"에게 귀속된다.<br/>
<b>제10조 (비밀유지 의무)</b> "갑"과 "을"은 본 계약의 체결 및 이행 과정에서 취득한 계약 내용, 계약 금액, 상대방의 개인정보 및 영업상 비밀에 대하여 상호 비밀유지 의무를 부담하며, 상대방의 사전 서면 동의 없이 제3자에게 누설하거나 본 계약의 이행 목적 외의 용도로 사용하여서는 아니 된다.<br/>
<b>제11조 (불가항력)</b> 천재지변, 전쟁, 폭동, 테러, 시민봉기, 감염병의 대유행, 정부의 명령·규제, 통신망 장애 및 기타 당사자의 합리적 지배 범위를 벗어난 불가항력적 사유로 인하여 계약의 이행이 지연되거나 불능이 되는 경우, "을"은 이에 따른 손해배상 책임을 부담하지 아니한다.<br/>
<b>제12조 (개인정보의 수집 및 이용)</b> ① "을"은 본 계약의 원활한 이행을 위하여 필요한 범위 내에서 "갑"의 개인정보를 수집·이용할 수 있다. ② "갑"은 제3조 제2항에 따라 본 계약서에 서명·날인함으로써 전항의 개인정보 수집·이용에 동의한 것으로 간주한다.<br/>
<b>제13조 (준거법 및 관할)</b> 본 약관에서 정하지 아니한 사항은 대한민국의 관련 법령 및 상관습에 따르며, 본 계약과 관련하여 당사자 간 분쟁이 발생하는 경우 "을"의 본점 소재지를 관할하는 법원을 제1심 전속 관할법원으로 한다.
</div>
<div class="warning">
<span class="warning-title">▲ 주의사항</span><br/>
광고 집행 개시 이후는 중도 중단이 원칙적으로 불가하며, 불가피하게 중단하는 경우 계약 제8조에 따른 위약금과 별도로 매체사의 내부 규정에 따른 패널티가 "갑"에게 추가로 부과될 수 있습니다.
</div>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.");
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
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
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl hover:bg-blue-800 shadow-sm">
              <FileDown size={14}/> {downloading ? "변환중... (최대 30초)" : "PDF 저장"}
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
