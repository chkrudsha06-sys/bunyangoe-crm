"use client";

import { useState, useEffect, useRef } from "react";
import { Camera, FileText, Send, CheckCircle, Upload, Download, X, ChevronDown, ChevronUp, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface VipMember {
  id: number;
  name: string;
  title: string | null;
  bunyanghoe_number: string | null;
  meeting_result: string | null;
  assigned_to: string | null;
}

interface ContentStatus {
  id?: number;
  contact_id: number;
  photo_received: boolean;
  info_received: boolean;
  tf2_delivered: boolean;
  pr_completed: boolean;
  photo_url: string | null;
  photo_filename: string | null;
  pr_name: string;
  pr_title_position: string;
  pr_age: string;
  pr_height: string;
  pr_body_type: string;
  pr_site_info: string;
  pr_photo_desc: string;
  pr_intro: string;
  updated_at: string | null;
}

const EMPTY_STATUS: Omit<ContentStatus, "contact_id"> = {
  photo_received: false, info_received: false, tf2_delivered: false, pr_completed: false,
  photo_url: null, photo_filename: null,
  pr_name: "", pr_title_position: "", pr_age: "", pr_height: "", pr_body_type: "",
  pr_site_info: "", pr_photo_desc: "", pr_intro: "", updated_at: null,
};

export default function ContentManagePage() {
  const [members, setMembers] = useState<VipMember[]>([]);
  const [statuses, setStatuses] = useState<Record<number, ContentStatus>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const fetchData = async () => {
    setLoading(true);
    // VIP 입회자 (계약완료/예약완료)
    const { data: contacts } = await supabase.from("contacts")
      .select("id,name,title,bunyanghoe_number,meeting_result,assigned_to")
      .in("meeting_result", ["계약완료", "예약완료"]);
    
    // 넘버링 기준 정렬 (B-1, B-2, ... B-10, B-11)
    const sorted = (contacts || []).sort((a: any, b: any) => {
      const numA = parseInt((a.bunyanghoe_number || "").replace(/[^0-9]/g, "")) || 9999;
      const numB = parseInt((b.bunyanghoe_number || "").replace(/[^0-9]/g, "")) || 9999;
      return numA - numB;
    });
    setMembers(sorted as VipMember[]);

    // 컨텐츠 현황
    const { data: cs } = await supabase.from("content_statuses").select("*");
    const map: Record<number, ContentStatus> = {};
    (cs || []).forEach((s: any) => { map[s.contact_id] = s; });
    setStatuses(map);
    setLoading(false);
  };

  const getStatus = (contactId: number): ContentStatus => {
    return statuses[contactId] || { ...EMPTY_STATUS, contact_id: contactId };
  };

  const updateField = (contactId: number, field: string, value: any) => {
    setStatuses(prev => ({
      ...prev,
      [contactId]: { ...getStatus(contactId), contact_id: contactId, [field]: value },
    }));
  };

  const toggleCheckbox = async (contactId: number, field: string) => {
    const s = getStatus(contactId);
    const newVal = !(s as any)[field];
    updateField(contactId, field, newVal);

    const payload = { contact_id: contactId, [field]: newVal, updated_at: new Date().toISOString() };
    if (s.id) {
      await supabase.from("content_statuses").update(payload).eq("id", s.id);
    } else {
      const { data } = await supabase.from("content_statuses").insert(payload).select().single();
      if (data) updateField(contactId, "id", data.id);
    }
  };

  const handlePhotoUpload = async (contactId: number, file: File) => {
    setUploading(contactId);
    const ext = file.name.split(".").pop();
    const path = `content-photos/${contactId}_${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("uploads").upload(path, file);
    if (upErr) {
      // storage 없으면 base64로 저장
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const s = getStatus(contactId);
        const payload = {
          contact_id: contactId,
          photo_url: base64,
          photo_filename: file.name,
          photo_received: true,
          updated_at: new Date().toISOString(),
        };
        if (s.id) {
          await supabase.from("content_statuses").update(payload).eq("id", s.id);
        } else {
          const { data } = await supabase.from("content_statuses").insert(payload).select().single();
          if (data) updateField(contactId, "id", data.id);
        }
        updateField(contactId, "photo_url", base64);
        updateField(contactId, "photo_filename", file.name);
        updateField(contactId, "photo_received", true);
        setUploading(null);
        showToast("사진 업로드 완료");
      };
      reader.readAsDataURL(file);
      return;
    }

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
    const s = getStatus(contactId);
    const payload = {
      contact_id: contactId,
      photo_url: urlData.publicUrl,
      photo_filename: file.name,
      photo_received: true,
      updated_at: new Date().toISOString(),
    };
    if (s.id) {
      await supabase.from("content_statuses").update(payload).eq("id", s.id);
    } else {
      const { data } = await supabase.from("content_statuses").insert(payload).select().single();
      if (data) updateField(contactId, "id", data.id);
    }
    updateField(contactId, "photo_url", urlData.publicUrl);
    updateField(contactId, "photo_filename", file.name);
    updateField(contactId, "photo_received", true);
    setUploading(null);
    showToast("사진 업로드 완료");
  };

  const saveInfo = async (contactId: number) => {
    setSaving(contactId);
    const s = getStatus(contactId);
    const payload = {
      contact_id: contactId,
      pr_name: s.pr_name, pr_title_position: s.pr_title_position, pr_age: s.pr_age,
      pr_height: s.pr_height, pr_body_type: s.pr_body_type, pr_site_info: s.pr_site_info,
      pr_photo_desc: s.pr_photo_desc, pr_intro: s.pr_intro,
      info_received: true,
      updated_at: new Date().toISOString(),
    };
    if (s.id) {
      await supabase.from("content_statuses").update(payload).eq("id", s.id);
    } else {
      const { data } = await supabase.from("content_statuses").insert(payload).select().single();
      if (data) updateField(contactId, "id", data.id);
    }
    updateField(contactId, "info_received", true);
    setSaving(null);
    showToast("기본정보 저장 완료");
  };

  const downloadPhoto = (s: ContentStatus) => {
    if (!s.photo_url) return;
    const a = document.createElement("a");
    a.href = s.photo_url;
    a.download = s.photo_filename || "photo";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const StatusBadge = ({ done, label }: { done: boolean; label: string }) => (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
      style={{
        background: done ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)",
        color: done ? "#10b981" : "#94a3b8",
        border: `1px solid ${done ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.15)"}`,
      }}>
      {done ? <CheckCircle size={11} /> : <span style={{ width: 11, height: 11, borderRadius: "50%", border: "1.5px solid currentColor", display: "inline-block" }} />}
      {label}
    </span>
  );

  const inp = "w-full px-3 py-2 text-sm rounded-xl outline-none focus:ring-1 focus:ring-blue-400";
  const lbl = "block text-xs font-semibold mb-1";

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>🎬 분양회 회원 컨텐츠 관리</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>PR패키지 제작을 위한 자료 수취 및 TF2팀 전달 관리</p>
      </div>

      {/* 요약 카드 */}
      <div className="px-6 py-3 flex gap-3 flex-shrink-0 flex-wrap">
        {[
          { label: "총 회원", value: members.length, color: "#3b82f6" },
          { label: "사진 수취", value: Object.values(statuses).filter(s => s.photo_received).length, color: "#8b5cf6" },
          { label: "정보 수취", value: Object.values(statuses).filter(s => s.info_received).length, color: "#f59e0b" },
          { label: "TF2 전달", value: Object.values(statuses).filter(s => s.tf2_delivered).length, color: "#10b981" },
          { label: "PR 완료", value: Object.values(statuses).filter(s => s.pr_completed).length, color: "#ef4444" },
        ].map(c => (
          <div key={c.label} className="px-4 py-2 rounded-xl text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: 90 }}>
            <p className="text-lg font-black" style={{ color: c.color }}>{c.value}</p>
            <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* 회원 목록 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm">입회자가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const s = getStatus(m.id);
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  {/* 행 */}
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : m.id)}>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", minWidth: 48, textAlign: "center" }}>
                      {m.bunyanghoe_number ? `B-${m.bunyanghoe_number.replace(/[^0-9]/g, "")}` : "-"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{m.name}</span>
                      <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{m.title || ""}</span>
                      {m.assigned_to && (
                        <span className="text-[11px] ml-2 px-1.5 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{m.assigned_to}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge done={s.photo_received} label="사진" />
                      <StatusBadge done={s.info_received} label="정보" />
                      <StatusBadge done={s.tf2_delivered} label="TF2" />
                      <StatusBadge done={s.pr_completed} label="PR" />
                    </div>
                    {isExpanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                  </div>

                  {/* 상세 패널 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
                      {/* 체크박스 행 */}
                      <div className="flex items-center gap-4 pt-3 flex-wrap">
                        {[
                          { field: "photo_received", label: "사진 수취", icon: Camera },
                          { field: "info_received", label: "기본정보 수취", icon: FileText },
                          { field: "tf2_delivered", label: "TF2팀 전달", icon: Send },
                          { field: "pr_completed", label: "PR패키지 완료", icon: CheckCircle },
                        ].map(item => (
                          <label key={item.field} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--text)" }}>
                            <input type="checkbox" checked={(s as any)[item.field] || false}
                              onChange={() => toggleCheckbox(m.id, item.field)}
                              className="w-4 h-4 rounded accent-blue-500" />
                            <item.icon size={13} style={{ color: (s as any)[item.field] ? "#10b981" : "var(--text-muted)" }} />
                            {item.label}
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 사진 업로드 */}
                        <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                            <Camera size={14} /> 사진 파일
                          </h4>
                          {s.photo_url ? (
                            <div className="space-y-2">
                              {s.photo_url.startsWith("data:image") ? (
                                <img src={s.photo_url} alt="사진" className="w-full max-h-48 object-contain rounded-lg" style={{ background: "#f1f5f9" }} />
                              ) : (
                                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                                  <FileText size={16} style={{ color: "#3b82f6" }} />
                                  <span className="text-sm flex-1 truncate" style={{ color: "var(--text)" }}>{s.photo_filename || "파일"}</span>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button onClick={() => downloadPhoto(s)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg"
                                  style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
                                  <Download size={12} /> 다운로드
                                </button>
                                <button onClick={() => { setUploadTarget(m.id); fileRef.current?.click(); }}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg"
                                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                                  <Upload size={12} /> 변경
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "rgba(59,130,246,0.05)"; }}
                              onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
                              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; const file = e.dataTransfer.files?.[0]; if (file) handlePhotoUpload(m.id, file); }}
                              onClick={() => { setUploadTarget(m.id); fileRef.current?.click(); }}
                              className="w-full py-8 rounded-xl text-sm font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer"
                              style={{ border: "2px dashed var(--border)", color: "var(--text-muted)", background: "transparent" }}>
                              {uploading === m.id ? (
                                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                              ) : (
                                <>
                                  <Upload size={20} />
                                  클릭 또는 파일을 드래그하여 업로드
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 기본정보 작성 */}
                        <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                            <FileText size={14} /> PR패키지 기본정보
                          </h4>
                          <div className="space-y-2">
                            {[
                              { key: "pr_name", label: "1. 성명", placeholder: m.name },
                              { key: "pr_title_position", label: "2. 직함", placeholder: m.title || "본부장" },
                              { key: "pr_age", label: "3. 나이", placeholder: "45세" },
                              { key: "pr_height", label: "4. 키", placeholder: "178cm" },
                              { key: "pr_body_type", label: "5. 체형", placeholder: "보통" },
                              { key: "pr_site_info", label: "6. 현장정보", placeholder: "수도권 아파트 분양 전문" },
                              { key: "pr_photo_desc", label: "7. 사진 설명", placeholder: "정장 프로필 사진" },
                              { key: "pr_intro", label: "8. 소개 한 줄 문구", placeholder: "20년 분양 경력의 신뢰할 수 있는 파트너" },
                            ].map(f => (
                              <div key={f.key}>
                                <label className={lbl} style={{ color: "var(--text-muted)" }}>{f.label}</label>
                                <input className={inp} value={(s as any)[f.key] || ""}
                                  onChange={e => updateField(m.id, f.key, e.target.value)}
                                  placeholder={f.placeholder}
                                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                              </div>
                            ))}
                            <button onClick={() => saveInfo(m.id)} disabled={saving === m.id}
                              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 mt-3">
                              <Save size={14} />
                              {saving === m.id ? "저장 중..." : "기본정보 저장"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 숨겨진 파일 입력 */}
      <input ref={fileRef} type="file" accept="image/*,.pdf,.zip" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && uploadTarget) handlePhotoUpload(uploadTarget, file);
          e.target.value = "";
        }} />

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
