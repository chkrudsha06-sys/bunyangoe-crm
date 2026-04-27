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

interface UploadedFile {
  name: string;
  url: string;
  size?: number;
  uploaded_at: string;
}

interface ContentStatus {
  id?: number;
  contact_id: number;
  photo_received: boolean;
  info_received: boolean;
  tf2_delivered: boolean;
  pr_completed: boolean;
  files: UploadedFile[];
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
  files: [],
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
  const [searchQ, setSearchQ] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
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
    (cs || []).forEach((s: any) => {
      map[s.contact_id] = {
        ...s,
        files: Array.isArray(s.files) ? s.files : (s.files ? JSON.parse(s.files) : []),
      };
    });
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

  const handleFileUpload = async (contactId: number, fileList: FileList | File[]) => {
    setUploading(contactId);
    const s = getStatus(contactId);
    const existingFiles = [...(s.files || [])];

    for (const file of Array.from(fileList)) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          existingFiles.push({
            name: file.name,
            url: reader.result as string,
            size: file.size,
            uploaded_at: new Date().toISOString(),
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    const payload = {
      contact_id: contactId,
      files: existingFiles,
      photo_received: true,
      updated_at: new Date().toISOString(),
    };

    if (s.id) {
      await supabase.from("content_statuses").update(payload).eq("id", s.id);
    } else {
      const { data } = await supabase.from("content_statuses").insert(payload).select().single();
      if (data) updateField(contactId, "id", data.id);
    }
    updateField(contactId, "files", existingFiles);
    updateField(contactId, "photo_received", true);
    setUploading(null);
    showToast(`${Array.from(fileList).length}개 파일 업로드 완료`);
  };

  const deleteFile = async (contactId: number, fileIndex: number) => {
    if (!confirm("이 파일을 삭제하시겠습니까?")) return;
    const s = getStatus(contactId);
    const newFiles = s.files.filter((_, i) => i !== fileIndex);
    const payload = {
      files: newFiles,
      photo_received: newFiles.length > 0,
      updated_at: new Date().toISOString(),
    };
    if (s.id) {
      await supabase.from("content_statuses").update(payload).eq("id", s.id);
    }
    updateField(contactId, "files", newFiles);
    updateField(contactId, "photo_received", newFiles.length > 0);
    showToast("파일 삭제 완료");
  };

  const downloadFile = (file: UploadedFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const fmtSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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

      {/* 필터 */}
      <div className="px-6 py-3 flex items-center gap-2 flex-shrink-0 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="고객명, 넘버링 검색"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none focus:ring-1 focus:ring-blue-400"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
        <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="">전체 담당자</option>
          {[...new Set(members.map(m => m.assigned_to).filter(Boolean))].sort().map(a => (
            <option key={a!} value={a!}>{a}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="">전체 상태</option>
          <option value="photo">사진 수취 완료</option>
          <option value="photo_no">사진 미수취</option>
          <option value="info">정보 수취 완료</option>
          <option value="info_no">정보 미수취</option>
          <option value="tf2">TF2팀 전달 완료</option>
          <option value="tf2_no">TF2팀 미전달</option>
          <option value="pr">PR 완료</option>
          <option value="pr_no">PR 미완료</option>
        </select>
        {(searchQ || filterAssigned || filterStatus) && (
          <button onClick={() => { setSearchQ(""); setFilterAssigned(""); setFilterStatus(""); }}
            className="text-xs px-2.5 py-2 rounded-xl font-semibold transition-colors"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            초기화
          </button>
        )}
      </div>

      {/* 회원 목록 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {(() => {
          // 필터 적용
          let filtered = members;
          if (searchQ) {
            const q = searchQ.toLowerCase();
            filtered = filtered.filter(m => 
              m.name.toLowerCase().includes(q) || 
              (m.bunyanghoe_number || "").toLowerCase().includes(q) ||
              `b-${(m.bunyanghoe_number || "").replace(/[^0-9]/g, "")}`.includes(q)
            );
          }
          if (filterAssigned) {
            filtered = filtered.filter(m => m.assigned_to === filterAssigned);
          }
          if (filterStatus) {
            filtered = filtered.filter(m => {
              const s = getStatus(m.id);
              switch (filterStatus) {
                case "photo": return s.photo_received;
                case "photo_no": return !s.photo_received;
                case "info": return s.info_received;
                case "info_no": return !s.info_received;
                case "tf2": return s.tf2_delivered;
                case "tf2_no": return !s.tf2_delivered;
                case "pr": return s.pr_completed;
                case "pr_no": return !s.pr_completed;
                default: return true;
              }
            });
          }
          return (<>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
            <p className="text-sm">{members.length > 0 ? "검색 결과가 없습니다." : "입회자가 없습니다."}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
              {filtered.length === members.length ? `총 ${members.length}명` : `${filtered.length}명 / ${members.length}명`}
            </p>
            {filtered.map(m => {
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
                            <Camera size={14} /> 파일 관리 <span className="text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>({s.files.length}개)</span>
                          </h4>

                          {/* 업로드된 파일 목록 */}
                          {s.files.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {s.files.map((file, fi) => (
                                <div key={fi} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                                  {file.url.startsWith("data:image") ? (
                                    <img src={file.url} alt="" className="w-8 h-8 object-cover rounded" />
                                  ) : (
                                    <FileText size={16} style={{ color: "#3b82f6", flexShrink: 0 }} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{file.name}</p>
                                    <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{fmtSize(file.size)}</p>
                                  </div>
                                  <button onClick={() => downloadFile(file)} title="다운로드"
                                    className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: "#3b82f6" }}>
                                    <Download size={13} />
                                  </button>
                                  <button onClick={() => deleteFile(m.id, fi)} title="삭제"
                                    className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: "#ef4444" }}>
                                    <X size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 업로드 영역 (드래그앤드롭 + 클릭) */}
                          <div
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "rgba(59,130,246,0.05)"; }}
                            onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
                            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; if (e.dataTransfer.files.length > 0) handleFileUpload(m.id, e.dataTransfer.files); }}
                            onClick={() => { setUploadTarget(m.id); fileRef.current?.click(); }}
                            className="w-full py-6 rounded-xl text-sm font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer"
                            style={{ border: "2px dashed var(--border)", color: "var(--text-muted)", background: "transparent" }}>
                            {uploading === m.id ? (
                              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                            ) : (
                              <>
                                <Upload size={18} />
                                <span className="text-xs">클릭 또는 파일을 드래그하여 업로드</span>
                                <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>여러 파일 동시 업로드 가능</span>
                              </>
                            )}
                          </div>
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
        </>);
        })()}
      </div>

      {/* 숨겨진 파일 입력 */}
      <input ref={fileRef} type="file" accept="image/*,.pdf,.zip,.doc,.docx,.ppt,.pptx" multiple className="hidden"
        onChange={e => {
          const files = e.target.files;
          if (files && files.length > 0 && uploadTarget) handleFileUpload(uploadTarget, files);
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
