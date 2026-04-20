"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Truck, Plus, Save, X, CheckCircle, XCircle, FileText } from "lucide-react";

interface WanpanTruck {
  id: number;
  team_size: number | null;
  agency: string | null;
  contact_point: string | null;
  contact_point_title: string | null;
  contact_phone: string | null;
  location: string | null;
  site_name: string | null;
  dispatch_date: string | null;
  is_ordered: boolean;
  is_direct_order: boolean;
  staff_count: number | null;
  staff_members: string | null;
  consultant_count: number | null;
  consultant_members: string | null;
  has_photo: boolean;
  order_qty_base: number | null;
  order_qty_extra: number | null;
  notes: string | null;
  assigned_to: string | null;
  order_confirmed_by: string | null;
  report_data: string | null;
}

const DAEHYUP_MEMBERS = ["김정후","김창완","최웅","조계현","이세호","기여운","최연전"];
const CONSULTANT_MEMBERS = ["박경화","박혜은","조승현","박민경","백선중","강아름","전정훈","박나라"];

const EMPTY: any = {
  team_size:"", agency:"", contact_point:"", contact_point_title:"", contact_phone:"",
  location:"", site_name:"", dispatch_date:"", is_ordered:false, is_direct_order:false,
  staff_count:"", staff_members:[],
  consultant_count:"", consultant_members:[],
  has_photo:false, order_qty_base:"", order_qty_extra:"", notes:"", assigned_to:"", order_confirmed_by:null, report_data:null,
};

function parseMembers(val: string | null): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function MemberSelector({ count, selected, options, onChange, label, color }: {
  count: number; selected: string[]; options: string[];
  onChange: (v: string[]) => void; label: string; color: string;
}) {
  if (count <= 0) return null;
  const toggle = (name: string) => {
    if (selected.includes(name)) onChange(selected.filter(s => s !== name));
    else if (selected.length < count) onChange([...selected, name]);
  };
  return (
    <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-200">
      <p className="text-xs font-semibold text-slate-500 mb-2">
        {label} 선택 <span className="text-blue-600 font-bold">{selected.length}/{count}명</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(name => {
          const sel = selected.includes(name);
          const disabled = !sel && selected.length >= count;
          return (
            <button key={name} type="button" onClick={() => toggle(name)} disabled={disabled}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                sel ? `${color} text-white border-transparent`
                  : disabled ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}>{name}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── 리포트 팝업 ────────────────────────────────
type ReportData = {
  pre_contact: string;
  field_contact: string;
  managed_count: string;
  customers: { name: string; title: string; phone: string; note: string }[];
};
const EMPTY_REPORT: ReportData = { pre_contact:"", field_contact:"", managed_count:"", customers:[] };

function ReportModal({ truck, onClose, onSaved }: { truck: WanpanTruck; onClose: () => void; onSaved: () => void }) {
  const existing: ReportData = (() => { try { return truck.report_data ? JSON.parse(truck.report_data) : null; } catch { return null; } })();
  const [mode, setMode] = useState<"view"|"edit">(existing ? "view" : "edit");
  const [data, setData] = useState<ReportData>(existing || { ...EMPTY_REPORT });
  const [saving, setSaving] = useState(false);

  const addCustomer = () => setData(d => ({...d, customers:[...d.customers,{name:"",title:"",phone:"",note:""}]}));
  const removeCustomer = (i: number) => setData(d => ({...d, customers:d.customers.filter((_,idx)=>idx!==i)}));
  const updateCustomer = (i: number, field: string, val: string) => {
    setData(d => ({...d, customers: d.customers.map((c,idx) => idx===i ? {...c,[field]:val} : c)}));
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("wanpan_trucks").update({ report_data: JSON.stringify(data) }).eq("id", truck.id);
    setSaving(false); onSaved(); setMode("view");
  };

  const inp = "w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const dispDate = truck.dispatch_date ? new Date(truck.dispatch_date).toLocaleDateString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).replace(/\.$/, "") : "-";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">완판트럭 리포트</h3>
            <p className="text-xs text-slate-400 mt-0.5">{dispDate} · {truck.location||"-"}</p>
          </div>
          <div className="flex items-center gap-2">
            {mode==="view" && existing && <button onClick={()=>setMode("edit")} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 font-semibold hover:bg-blue-100">수정</button>}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4">
          {mode === "view" && existing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                  <p className="text-[10px] text-blue-400 mb-1">출장전 접촉인원</p>
                  <p className="text-lg font-black text-blue-700">{data.pre_contact || 0}명</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-[10px] text-emerald-400 mb-1">현장 접촉인원</p>
                  <p className="text-lg font-black text-emerald-700">{data.field_contact || 0}명</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                  <p className="text-[10px] text-amber-400 mb-1">관리고객</p>
                  <p className="text-lg font-black text-amber-700">{data.managed_count || 0}명</p>
                </div>
              </div>
              {data.customers.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">관리고객 리스트</p>
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-slate-50">
                      <th className="px-2 py-2 border border-slate-200 text-slate-500 font-semibold">고객명</th>
                      <th className="px-2 py-2 border border-slate-200 text-slate-500 font-semibold">직급</th>
                      <th className="px-2 py-2 border border-slate-200 text-slate-500 font-semibold">연락처</th>
                      <th className="px-2 py-2 border border-slate-200 text-slate-500 font-semibold">비고</th>
                    </tr></thead>
                    <tbody>
                      {data.customers.map((c,i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-2 py-2 border border-slate-200 text-slate-700 font-semibold text-center">{c.name||"-"}</td>
                          <td className="px-2 py-2 border border-slate-200 text-slate-600 text-center">{c.title||"-"}</td>
                          <td className="px-2 py-2 border border-slate-200 text-slate-600 text-center">{c.phone||"-"}</td>
                          <td className="px-2 py-2 border border-slate-200 text-slate-500">{c.note||"-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">출장전 접촉인원</label><input type="number" className={inp} value={data.pre_contact} onChange={e=>setData({...data,pre_contact:e.target.value})} placeholder="0"/></div>
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">현장 접촉인원</label><input type="number" className={inp} value={data.field_contact} onChange={e=>setData({...data,field_contact:e.target.value})} placeholder="0"/></div>
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">관리고객</label><input type="number" className={inp} value={data.managed_count} onChange={e=>{
                  const n = Number(e.target.value)||0;
                  const cur = data.customers.length;
                  let custs = [...data.customers];
                  if (n > cur) for(let i=0;i<n-cur;i++) custs.push({name:"",title:"",phone:"",note:""});
                  else if (n < cur) custs = custs.slice(0,n);
                  setData({...data, managed_count:e.target.value, customers:custs});
                }} placeholder="0"/></div>
              </div>
              {data.customers.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">관리고객 리스트</p>
                  <div className="space-y-2">
                    {data.customers.map((c,i) => (
                      <div key={i} className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <input className={inp} value={c.name} onChange={e=>updateCustomer(i,"name",e.target.value)} placeholder="고객명"/>
                        <input className={inp} value={c.title} onChange={e=>updateCustomer(i,"title",e.target.value)} placeholder="직급"/>
                        <input className={inp} value={c.phone} onChange={e=>updateCustomer(i,"phone",e.target.value)} placeholder="연락처"/>
                        <input className={inp} value={c.note} onChange={e=>updateCustomer(i,"note",e.target.value)} placeholder="비고"/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {mode === "edit" && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50">
              <Save size={13}/>{saving?"저장 중...":"저장"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WanpanTruckPage() {
  const [trucks, setTrucks] = useState<WanpanTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<WanpanTruck | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [reportTruck, setReportTruck] = useState<WanpanTruck | null>(null);

  useEffect(() => { fetchTrucks(); }, [filterMonth]);

  const fetchTrucks = async () => {
    setLoading(true);
    let q = supabase.from("wanpan_trucks").select("*").order("dispatch_date", { ascending: false, nullsFirst: false });
    if (filterMonth) {
      const year = new Date().getFullYear();
      const m = filterMonth.padStart(2,"0");
      const lastDay = new Date(year, parseInt(filterMonth), 0).getDate();
      q = q.gte("dispatch_date", `${year}-${m}-01`).lte("dispatch_date", `${year}-${m}-${lastDay}`);
    }
    const { data } = await q;
    setTrucks((data as WanpanTruck[]) || []);
    setLoading(false);
  };

  const openAdd = () => { setEditItem(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (t: WanpanTruck) => {
    setEditItem(t);
    setForm({
      team_size: t.team_size||"", agency: t.agency||"",
      contact_point: t.contact_point||"", contact_point_title: t.contact_point_title||"",
      contact_phone: t.contact_phone||"", location: t.location||"", site_name: (t as any).site_name||"",
      dispatch_date: t.dispatch_date?.split("T")[0]||"", is_ordered: t.is_ordered, is_direct_order: t.is_direct_order||false,
      assigned_to: t.assigned_to||"", order_confirmed_by: t.order_confirmed_by||null,
      staff_count: t.staff_count||"", staff_members: parseMembers(t.staff_members),
      consultant_count: t.consultant_count||"", consultant_members: parseMembers(t.consultant_members),
      has_photo: t.has_photo||false, order_qty_base: t.order_qty_base||"", order_qty_extra: t.order_qty_extra||"", notes: t.notes||"",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      team_size: Number(form.team_size)||null,
      agency: form.agency||null, contact_point: form.contact_point||null,
      contact_point_title: form.contact_point_title||null,
      contact_phone: form.contact_phone||null, location: form.location||null, site_name: form.site_name||null,
      dispatch_date: form.dispatch_date||null, is_ordered: form.is_ordered, is_direct_order: form.is_direct_order||false,
      assigned_to: form.assigned_to||null, order_confirmed_by: form.order_confirmed_by||null,
      staff_count: Number(form.staff_count)||null,
      staff_members: form.staff_members.length>0 ? JSON.stringify(form.staff_members) : null,
      consultant_count: Number(form.consultant_count)||null,
      consultant_members: form.consultant_members.length>0 ? JSON.stringify(form.consultant_members) : null,
      has_photo: form.has_photo, order_qty_base: Number(form.order_qty_base)||null, order_qty_extra: Number(form.order_qty_extra)||null, notes: form.notes||null,
    };
    let error;
    if (editItem) {
      const res = await supabase.from("wanpan_trucks").update(payload).eq("id", editItem.id);
      error = res.error;
    } else {
      const res = await supabase.from("wanpan_trucks").insert(payload);
      error = res.error;
    }
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    setShowModal(false); fetchTrucks();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await supabase.from("wanpan_trucks").delete().eq("id", id);
    fetchTrucks();
  };

  const toggleOrder = async (id: number, current: boolean) => {
    await supabase.from("wanpan_trucks").update({ is_ordered: !current }).eq("id", id);
    fetchTrucks();
  };

  const toggleDirectOrder = async (id: number, current: boolean) => {
    await supabase.from("wanpan_trucks").update({ is_direct_order: !current }).eq("id", id);
    fetchTrucks();
  };

  const toggleConfirm = async (id: number, current: string | null, assignedTo: string | null) => {
    if (current) {
      await supabase.from("wanpan_trucks").update({ order_confirmed_by: null }).eq("id", id);
    } else {
      await supabase.from("wanpan_trucks").update({ order_confirmed_by: assignedTo }).eq("id", id);
    }
    fetchTrucks();
  };

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";

  const HEADERS = ["#","발송일","현장위치","현장명","대행사","접점","직급","소통자 연락처","조직수","대협팀 출장인원","컨설턴트 출장인원","리포트","촬영","발주수량","발주여부","시안","담당자확인","비고",""];

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Truck size={20} className="text-blue-500" />완판트럭
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">완판트럭 진행 리스트 관리</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
            className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold outline-none">
            <option value="">월별</option>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <option key={m} value={String(m)}>{m}월</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <span className="text-sm font-bold text-blue-600">전체 {trucks.length}회차</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 shadow-sm ml-auto">
            <Plus size={14} />신규 등록
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trucks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Truck size={40} className="mb-3 opacity-30" />
            <p className="text-sm">완판트럭 데이터가 없습니다</p>
            <button onClick={openAdd} className="mt-3 text-xs text-blue-600 underline">첫 번째 회차 등록하기</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {HEADERS.map(h => (
                    <th key={h} className="text-center px-3 py-3 text-slate-500 text-sm font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trucks.map((t, i) => {
                  const staffList = parseMembers(t.staff_members);
                  const consultList = parseMembers(t.consultant_members);
                  const dispDate = t.dispatch_date
                    ? new Date(t.dispatch_date).toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"}).replace(/\.$/, "")
                    : "-";
                  const hasReport = !!t.report_data;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center align-middle text-slate-400 text-sm">{i+1}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-700 font-medium text-sm">{dispDate}</td>
                      <td className="px-3 py-2.5 text-center align-middle font-semibold text-slate-800 text-sm">{t.location||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-700 text-sm font-medium">{(t as any).site_name||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-sm">{t.agency||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-sm">{t.contact_point||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-500 text-sm">{t.contact_point_title||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-sm">{t.contact_phone||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-sm font-bold text-slate-700">{t.team_size?`${t.team_size}명`:"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        {staffList.length>0 ? (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {staffList.map(s=>(<span key={s} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 font-semibold">{s}</span>))}
                          </div>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        {consultList.length>0 ? (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {consultList.map(s=>(<span key={s} className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full border border-violet-100 font-semibold">{s}</span>))}
                          </div>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      {/* 리포트 */}
                      <td className="px-3 py-2.5 text-center align-middle">
                        <button onClick={()=>setReportTruck(t)}
                          className={`p-1.5 rounded-lg transition-colors ${hasReport ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-blue-50 hover:text-blue-500"}`}
                          title={hasReport?"리포트 보기":"리포트 작성"}>
                          <FileText size={13}/>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <span className={`text-sm font-black ${t.has_photo?"text-emerald-500":"text-slate-300"}`}>{t.has_photo?"O":"X"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        {t.order_qty_base ? (
                          <span className="text-sm font-bold text-slate-700">
                            {t.order_qty_base}{t.order_qty_extra ? <span className="text-blue-500">+({t.order_qty_extra})</span> : ""}
                          </span>
                        ) : <span className="text-sm text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <button onClick={()=>toggleOrder(t.id,t.is_ordered)}
                          className={`flex items-center justify-center gap-1 mx-auto text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${t.is_ordered?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>
                          {t.is_ordered?<CheckCircle size={11}/>:<XCircle size={11}/>}
                          {t.is_ordered?"완료":"미발주"}
                        </button>
                      </td>
                      {/* 시안(직발주여부) */}
                      <td className="px-3 py-2.5 text-center align-middle">
                        <button onClick={()=>toggleDirectOrder(t.id,t.is_direct_order||false)}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${t.is_direct_order?"bg-violet-100 text-violet-700":"bg-slate-100 text-slate-500"}`}>
                          {t.is_direct_order?"직발주":"미발주"}
                        </button>
                      </td>
                      {/* 담당자 확인 (토글) */}
                      <td className="px-3 py-2.5 text-center align-middle">
                        {t.assigned_to ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-slate-600 font-medium">{t.assigned_to}</span>
                            <button onClick={()=>toggleConfirm(t.id, t.order_confirmed_by, t.assigned_to)}
                              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5 transition-colors ${
                                t.order_confirmed_by
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-red-50 hover:text-red-500"
                                  : "bg-amber-100 text-amber-600 hover:bg-emerald-50 hover:text-emerald-600 border border-amber-200"
                              }`}>
                              {t.order_confirmed_by ? <><CheckCircle size={10}/> 확인완료</> : "담당자확인"}
                            </button>
                          </div>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle max-w-[100px]">
                        <p className="text-sm text-slate-500 truncate">{t.notes||"-"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <div className="flex justify-center gap-1">
                          <button onClick={()=>openEdit(t)} className="text-xs text-slate-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50">수정</button>
                          <button onClick={()=>handleDelete(t.id)} className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 리포트 팝업 */}
      {reportTruck && <ReportModal truck={reportTruck} onClose={()=>setReportTruck(null)} onSaved={()=>{fetchTrucks();setReportTruck(null);}}/>}

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editItem?"완판트럭 수정":"완판트럭 신규 등록"}</h2>
              <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>발송일</label><input type="date" className={inp} value={form.dispatch_date} onChange={e=>setForm({...form,dispatch_date:e.target.value})}/></div>
                <div><label className={lbl}>현장위치</label><input className={inp} value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="예: 인천 송도"/></div>
                <div><label className={lbl}>현장명</label><input className={inp} value={form.site_name||""} onChange={e=>setForm({...form,site_name:e.target.value})} placeholder="예: 인천 더샵 센트럴파크"/></div>
                <div><label className={lbl}>대행사</label><input className={inp} value={form.agency} onChange={e=>setForm({...form,agency:e.target.value})}/></div>
                <div><label className={lbl}>접점 (소통자 이름)</label><input className={inp} value={form.contact_point} onChange={e=>setForm({...form,contact_point:e.target.value})} placeholder="홍길동"/></div>
                <div><label className={lbl}>소통자 직급</label><input className={inp} value={form.contact_point_title} onChange={e=>setForm({...form,contact_point_title:e.target.value})} placeholder="본부장"/></div>
                <div><label className={lbl}>소통자 연락처</label><input className={inp} value={form.contact_phone} onChange={e=>{
                  let v = e.target.value.replace(/[^0-9]/g,"");
                  if(v.length>3&&v.length<=7) v=v.slice(0,3)+"-"+v.slice(3);
                  else if(v.length>7) v=v.slice(0,3)+"-"+v.slice(3,7)+"-"+v.slice(7,11);
                  setForm({...form,contact_phone:v});
                }} placeholder="010-0000-0000" maxLength={13}/></div>
                <div><label className={lbl}>조직수</label><input type="number" className={inp} value={form.team_size} onChange={e=>setForm({...form,team_size:e.target.value})} placeholder="명"/></div>
                <div>
                  <label className={lbl}>대협팀 출장인원 (명수)</label>
                  <input type="number" className={inp} value={form.staff_count} min={0} max={7}
                    onChange={e=>{const n=Number(e.target.value)||0; setForm({...form,staff_count:e.target.value,staff_members:form.staff_members.slice(0,n)});}}/>
                </div>
                <div>
                  <label className={lbl}>컨설턴트 출장인원 (명수)</label>
                  <input type="number" className={inp} value={form.consultant_count} min={0} max={8}
                    onChange={e=>{const n=Number(e.target.value)||0; setForm({...form,consultant_count:e.target.value,consultant_members:form.consultant_members.slice(0,n)});}}/>
                </div>
                <div>
                  <label className={lbl}>담당자 지정</label>
                  <select value={form.assigned_to||""} onChange={e=>setForm({...form,assigned_to:e.target.value})}
                    className={inp}>
                    <option value="">선택</option>
                    <option value="김재영">김재영</option>
                    <option value="최은정">최은정</option>
                  </select>
                </div>

                {Number(form.staff_count)>0 && (
                  <MemberSelector count={Number(form.staff_count)} selected={form.staff_members}
                    options={DAEHYUP_MEMBERS} onChange={v=>setForm({...form,staff_members:v})}
                    label="대협팀 출장인원" color="bg-blue-600"/>
                )}
                {Number(form.consultant_count)>0 && (
                  <MemberSelector count={Number(form.consultant_count)} selected={form.consultant_members}
                    options={CONSULTANT_MEMBERS} onChange={v=>setForm({...form,consultant_members:v})}
                    label="컨설턴트 출장인원" color="bg-violet-600"/>
                )}

                <div>
                  <label className={lbl}>발주수량 (기본)</label>
                  <input type="number" className={inp} value={form.order_qty_base} onChange={e=>setForm({...form,order_qty_base:e.target.value})} placeholder="기본 수량"/>
                </div>
                <div>
                  <label className={lbl}>발주수량 (추가)</label>
                  <input type="number" className={inp} value={form.order_qty_extra} onChange={e=>setForm({...form,order_qty_extra:e.target.value})} placeholder="추가 수량"/>
                </div>

                <div>
                  <label className={lbl}>촬영여부</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>setForm({...form,has_photo:true})}
                      className={`flex-1 py-2 text-sm font-black rounded-lg border transition-colors ${form.has_photo?"bg-emerald-500 text-white border-emerald-500":"bg-slate-50 text-slate-400 border-slate-200"}`}>O</button>
                    <button type="button" onClick={()=>setForm({...form,has_photo:false})}
                      className={`flex-1 py-2 text-sm font-black rounded-lg border transition-colors ${!form.has_photo?"bg-slate-500 text-white border-slate-500":"bg-slate-50 text-slate-400 border-slate-200"}`}>X</button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className={lbl}>비고</label>
                  <textarea className={`${inp} resize-none`} rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E3A8A] text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50">
                <Save size={13}/>{saving?"저장 중...":"저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
