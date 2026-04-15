"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Truck, Plus, Save, X, CheckCircle, XCircle } from "lucide-react";

interface WanpanTruck {
  id: number;
  team_size: number | null;
  agency: string | null;
  contact_point: string | null;
  contact_point_title: string | null;
  contact_phone: string | null;
  location: string | null;
  dispatch_date: string | null;
  is_ordered: boolean;
  staff_count: number | null;
  staff_members: string | null;
  consultant_count: number | null;
  consultant_members: string | null;
  has_photo: boolean;
  notes: string | null;
}

const DAEHYUP_MEMBERS = ["김정후","김창완","최웅","조계현","이세호","기여운","최연전"];
const CONSULTANT_MEMBERS = ["박경화","박혜은","조승현","박민경","백선중","강아름","전정훈","박나라"];

const EMPTY: any = {
  team_size:"", agency:"", contact_point:"", contact_point_title:"", contact_phone:"",
  location:"", dispatch_date:"", is_ordered:false,
  staff_count:"", staff_members:[],
  consultant_count:"", consultant_members:[],
  has_photo:false, notes:"",
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

export default function WanpanTruckPage() {
  const [trucks, setTrucks] = useState<WanpanTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<WanpanTruck | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");

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
      contact_phone: t.contact_phone||"", location: t.location||"",
      dispatch_date: t.dispatch_date?.split("T")[0]||"", is_ordered: t.is_ordered,
      staff_count: t.staff_count||"", staff_members: parseMembers(t.staff_members),
      consultant_count: t.consultant_count||"", consultant_members: parseMembers(t.consultant_members),
      has_photo: t.has_photo||false, notes: t.notes||"",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      team_size: Number(form.team_size)||null,
      agency: form.agency||null, contact_point: form.contact_point||null,
      contact_point_title: form.contact_point_title||null,
      contact_phone: form.contact_phone||null, location: form.location||null,
      dispatch_date: form.dispatch_date||null, is_ordered: form.is_ordered,
      staff_count: Number(form.staff_count)||null,
      staff_members: form.staff_members.length>0 ? JSON.stringify(form.staff_members) : null,
      consultant_count: Number(form.consultant_count)||null,
      consultant_members: form.consultant_members.length>0 ? JSON.stringify(form.consultant_members) : null,
      has_photo: form.has_photo, notes: form.notes||null,
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

  const inp = "w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400";
  const lbl = "block text-xs font-semibold text-slate-500 mb-1";

  const HEADERS = ["#","발송일","현장위치","대행사","접점","직급","소통자 연락처","조직수","대협팀 출장인원","컨설턴트 출장인원","촬영","발주여부","비고",""];

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Truck size={20} className="text-blue-500" />완판트럭
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">완판트럭 진행 리스트 관리</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-lg font-bold text-blue-600">{trucks.length}</p>
              <p className="text-xs text-blue-500">전체 회차</p>
            </div>
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-sm font-semibold rounded-lg hover:bg-blue-800 shadow-sm">
              <Plus size={14} />신규 등록
            </button>
          </div>
        </div>
        {/* 월별 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">월별 검색</span>
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
            className="text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold outline-none">
            <option value="">전체</option>
            {Array.from({length:12},(_,i)=>i+1).map(m=>(
              <option key={m} value={String(m)}>{m}월</option>
            ))}
          </select>
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
                    <th key={h} className="text-center px-3 py-2.5 text-slate-500 text-xs font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trucks.map((t, i) => {
                  const staffList = parseMembers(t.staff_members);
                  const consultList = parseMembers(t.consultant_members);
                  // 발송일 포맷 (마지막 . 제거)
                  const dispDate = t.dispatch_date
                    ? new Date(t.dispatch_date).toLocaleDateString("ko-KR",{month:"2-digit",day:"2-digit"}).replace(/\.$/, "")
                    : "-";
                  return (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center align-middle text-slate-400 text-xs">{i+1}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-700 font-medium text-xs">{dispDate}</td>
                      <td className="px-3 py-2.5 text-center align-middle font-semibold text-slate-800 text-xs">{t.location||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-xs">{t.agency||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-xs">{t.contact_point||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-500 text-xs">{t.contact_point_title||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-slate-600 text-xs">{t.contact_phone||"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle text-xs font-bold text-slate-700">{t.team_size?`${t.team_size}명`:"-"}</td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        {staffList.length>0 ? (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {staffList.map(s=>(
                              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">{s}</span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        {consultList.length>0 ? (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {consultList.map(s=>(
                              <span key={s} className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded-full border border-violet-100">{s}</span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <span className={`text-sm font-black ${t.has_photo?"text-emerald-500":"text-slate-300"}`}>{t.has_photo?"O":"X"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <button onClick={()=>toggleOrder(t.id,t.is_ordered)}
                          className={`flex items-center justify-center gap-1 mx-auto text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${t.is_ordered?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>
                          {t.is_ordered?<CheckCircle size={11}/>:<XCircle size={11}/>}
                          {t.is_ordered?"완료":"미발주"}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle max-w-[100px]">
                        <p className="text-xs text-slate-500 truncate">{t.notes||"-"}</p>
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
                <div><label className={lbl}>대행사</label><input className={inp} value={form.agency} onChange={e=>setForm({...form,agency:e.target.value})}/></div>
                <div><label className={lbl}>접점 (소통자 이름)</label><input className={inp} value={form.contact_point} onChange={e=>setForm({...form,contact_point:e.target.value})} placeholder="홍길동"/></div>
                <div><label className={lbl}>소통자 직급</label><input className={inp} value={form.contact_point_title} onChange={e=>setForm({...form,contact_point_title:e.target.value})} placeholder="본부장"/></div>
                <div><label className={lbl}>소통자 연락처</label><input className={inp} value={form.contact_phone} onChange={e=>setForm({...form,contact_phone:e.target.value})} placeholder="010-0000-0000"/></div>
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
                  <label className={lbl}>촬영여부</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>setForm({...form,has_photo:true})}
                      className={`flex-1 py-2 text-sm font-black rounded-lg border transition-colors ${form.has_photo?"bg-emerald-500 text-white border-emerald-500":"bg-slate-50 text-slate-400 border-slate-200"}`}>O</button>
                    <button type="button" onClick={()=>setForm({...form,has_photo:false})}
                      className={`flex-1 py-2 text-sm font-black rounded-lg border transition-colors ${!form.has_photo?"bg-slate-500 text-white border-slate-500":"bg-slate-50 text-slate-400 border-slate-200"}`}>X</button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input type="checkbox" id="is_ordered" checked={form.is_ordered} onChange={e=>setForm({...form,is_ordered:e.target.checked})} className="w-4 h-4"/>
                  <label htmlFor="is_ordered" className="text-sm text-slate-700 font-medium">발주완료</label>
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
