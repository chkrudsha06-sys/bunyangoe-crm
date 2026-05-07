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
  path?: string;
  uploaded_at: string;
}

interface ContentStatus {
  id?: number;
  contact_id: number;
  photo_received: boolean;
  info_received: boolean;
  tf2_delivered: boolean;
  pr_completed: boolean;
  production_impossible: boolean;
  impossible_reason: string;
  files: UploadedFile[];
  pr_name: string;
  pr_gender: string;
  pr_birth_date: string;
  pr_title_position: string;
  pr_age: string;
  pr_height: string;
  pr_body_type: string;
  pr_activity_region: string;
  pr_company: string;
  pr_site_history_1: string;
  pr_site_history_2: string;
  pr_site_history_3: string;
  pr_site_history_4: string;
  pr_site_history_5: string;
  pr_intro: string;
  pr_request: string;
  pr_video_copy_1: string;
  pr_video_performance: string;
  pr_video_copy_2: string;
  pr_site_info: string;
  pr_photo_desc: string;
  pr_feed_text: string;
  pr_career: string;
  pr_years: string;
  pr_years_base_year: number;
  pr_output_server: string;
  pr_output_url: string;
  updated_at: string | null;
}

const EMPTY_STATUS: Omit<ContentStatus, "contact_id"> = {
  photo_received: false, info_received: false, tf2_delivered: false, pr_completed: false,
  production_impossible: false, impossible_reason: "",
  files: [],
  pr_name: "", pr_gender: "", pr_birth_date: "", pr_title_position: "", pr_age: "", pr_height: "", pr_body_type: "",
  pr_activity_region: "", pr_company: "",
  pr_site_history_1: "", pr_site_history_2: "", pr_site_history_3: "", pr_site_history_4: "", pr_site_history_5: "",
  pr_intro: "", pr_request: "", pr_video_copy_1: "", pr_video_performance: "", pr_video_copy_2: "",
  pr_site_info: "", pr_photo_desc: "", pr_feed_text: "", pr_career: "", pr_years: "", pr_years_base_year: 0,
  pr_output_server: "", pr_output_url: "", updated_at: null,
};

// 연차 자동계산
function calcYears(baseYear: number, storedYears: string): string {
  if (!baseYear || !storedYears) return storedYears || "";
  const num = parseInt(storedYears.replace(/[^0-9]/g, ""));
  if (isNaN(num)) return storedYears;
  const currentYear = new Date().getFullYear();
  const diff = currentYear - baseYear;
  return `${num + diff}년차`;
}

// Supabase Storage용 안전한 파일 경로 생성
// 화면에는 원본 파일명을 그대로 보여주고, Storage path만 영문/숫자 기반으로 저장합니다.
// 한글/공백/특수문자가 path에 들어가면 Supabase Storage에서 "Invalid key"가 발생할 수 있습니다.
function makeStorageSafePath(file: File, contactId: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);

  const extMatch = file.name.match(/\.[^.]+$/);
  const ext = extMatch ? extMatch[0].replace(/[^a-zA-Z0-9.]/g, "").toLowerCase() : "";

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const safeBase =
    baseName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "file";

  return `${contactId}/${timestamp}_${random}_${safeBase}${ext}`;
}

// Supabase Storage에 파일 업로드 (원본 품질 유지)
async function uploadToStorage(file: File, contactId: number): Promise<{ name: string; url: string; size: number; path: string }> {
  const path = makeStorageSafePath(file, contactId);

  const { error } = await supabase.storage.from("content-files").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw new Error(`업로드 실패: ${error.message}`);

  const { data: urlData } = supabase.storage.from("content-files").getPublicUrl(path);

  return {
    name: file.name,
    url: urlData.publicUrl,
    size: file.size,
    path,
  };
}

function normalizeFiles(files: any): UploadedFile[] {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  try {
    const parsed = JSON.parse(files);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isImageFile(file: UploadedFile): boolean {
  return file.url?.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name || "");
}

export default function ContentManagePage() {
  const [members, setMembers] = useState<VipMember[]>([]);
  const [extMembers, setExtMembers] = useState<VipMember[]>([]);
  const [statuses, setStatuses] = useState<Record<number, ContentStatus>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadedFiles, setLoadedFiles] = useState<Set<number>>(new Set());
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", title: "", assigned_to: "", content_item: "" });
  const [regSaving, setRegSaving] = useState(false);

  // 새 고객 등록
  const handleRegister = async () => {
    if (!regForm.name.trim()) return;
    setRegSaving(true);
    const { data: contact, error } = await supabase.from("contacts").insert({
      name: regForm.name.trim(), title: regForm.title.trim() || null,
      assigned_to: regForm.assigned_to.trim() || null, meeting_result: "컨텐츠등록",
      memo: regForm.content_item.trim() || null,
    }).select().single();
    if (error || !contact) { alert("등록 실패: " + (error?.message || "")); setRegSaving(false); return; }
    await supabase.from("content_statuses").insert({ contact_id: contact.id });
    setRegForm({ name: "", title: "", assigned_to: "", content_item: "" });
    setShowRegForm(false); setRegSaving(false);
    fetchData();
  };

  // 회원 펼칠 때 파일 데이터 로드 (lazy loading)
  const expandMember = async (contactId: number) => {
    if (expandedId === contactId) { setExpandedId(null); return; }
    setExpandedId(contactId);

    // 이미 파일을 로드한 회원이면 스킵
    if (loadedFiles.has(contactId)) return;

    const s = getStatus(contactId);
    if (!s.id) return;

    const { data } = await supabase.from("content_statuses")
      .select("files").eq("id", s.id).single();

    if (data) {
      const files = normalizeFiles(data.files);
      setStatuses(prev => ({
        ...prev,
        [contactId]: { ...prev[contactId], files },
      }));
      setLoadedFiles(prev => new Set(prev).add(contactId));
    }
  };
  const [saving, setSaving] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [cardFilter, setCardFilter] = useState<string>("");
  const [showStats, setShowStats] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<number | null>(null);

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const fetchData = async () => {
    setLoading(true);
    // VIP 입회자 (계약완료/예약완료)
    const { data: contacts } = await supabase.from("contacts")
      .select("id,name,title,bunyanghoe_number,meeting_result,assigned_to")
      .in("meeting_result", ["계약완료", "예약완료"]);
    
    // 외부 컨텐츠 고객
    const { data: extContacts } = await supabase.from("contacts")
      .select("id,name,title,bunyanghoe_number,meeting_result,assigned_to")
      .eq("meeting_result", "컨텐츠등록")
      .order("id", { ascending: false });
    
    // 넘버링 기준 정렬 (B-1, B-2, ... B-10, B-11)
    const sorted = (contacts || []).sort((a: any, b: any) => {
      const numA = parseInt((a.bunyanghoe_number || "").replace(/[^0-9]/g, "")) || 9999;
      const numB = parseInt((b.bunyanghoe_number || "").replace(/[^0-9]/g, "")) || 9999;
      return numA - numB;
    });
    setMembers(sorted as VipMember[]);

    // 외부 고객 저장
    setExtMembers((extContacts || []) as VipMember[]);

    // 컨텐츠 현황 (파일 데이터 제외 — 경량 로드)
    const { data: cs } = await supabase.from("content_statuses")
      .select("id,contact_id,photo_received,info_received,tf2_delivered,pr_completed,production_impossible,impossible_reason,pr_name,pr_gender,pr_birth_date,pr_title_position,pr_age,pr_height,pr_body_type,pr_activity_region,pr_company,pr_site_history_1,pr_site_history_2,pr_site_history_3,pr_site_history_4,pr_site_history_5,pr_intro,pr_request,pr_video_copy_1,pr_video_performance,pr_video_copy_2,pr_site_info,pr_photo_desc,pr_feed_text,pr_career,pr_years,pr_years_base_year,pr_output_server,pr_output_url,updated_at");
    const map: Record<number, ContentStatus> = {};
    (cs || []).forEach((s: any) => {
      map[s.contact_id] = { ...s, files: [] }; // 파일은 빈 배열로 초기화
    });
    setStatuses(map);
    setLoading(false);
  };

  const getStatus = (contactId: number): ContentStatus => {
    return statuses[contactId] || { ...EMPTY_STATUS, contact_id: contactId };
  };

  const updateField = (contactId: number, field: string, value: any) => {
    setStatuses(prev => {
      const current = prev[contactId] || { ...EMPTY_STATUS, contact_id: contactId };

      return {
        ...prev,
        [contactId]: {
          ...current,
          contact_id: contactId,
          [field]: value,
        },
      };
    });
  };

  const toggleCheckbox = async (contactId: number, field: string) => {
    const s = getStatus(contactId);
    const newVal = !(s as any)[field];

    // 즉시 UI 반영
    setStatuses(prev => ({
      ...prev,
      [contactId]: { ...getStatus(contactId), contact_id: contactId, [field]: newVal },
    }));

    const payload = { contact_id: contactId, [field]: newVal, updated_at: new Date().toISOString() };
    if (s.id) {
      await supabase.from("content_statuses").update(payload).eq("id", s.id);
    } else {
      const { data } = await supabase.from("content_statuses").insert(payload).select().single();
      if (data) {
        setStatuses(prev => ({
          ...prev,
          [contactId]: { ...prev[contactId], id: data.id },
        }));
      }
    }
  };

  const handleFileUpload = async (contactId: number, fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList);
    if (selectedFiles.length === 0) return;

    setUploading(contactId);

    try {
      const s = getStatus(contactId);
      const uploadedFiles: UploadedFile[] = [];

      for (const file of selectedFiles) {
        if (file.size > 50 * 1024 * 1024) {
          showToast(`${file.name}: 50MB 이하 파일만 업로드 가능합니다`);
          continue;
        }

        try {
          const uploaded = await uploadToStorage(file, contactId);
          uploadedFiles.push({ ...uploaded, uploaded_at: new Date().toISOString() });
        } catch (e: any) {
          showToast(`${file.name} 업로드 실패: ${e.message || "알 수 없는 오류"}`);
        }
      }

      if (uploadedFiles.length === 0) return;

      // 기존 파일 목록은 화면 상태가 아니라 DB 최신값 기준으로 다시 읽습니다.
      // lazy loading 구조에서는 s.files가 []일 수 있어, 그대로 저장하면 기존 파일 목록이 덮어써질 수 있습니다.
      let statusId = s.id;
      let existingFiles: UploadedFile[] = [];

      if (statusId) {
        const { data: latestStatus, error: latestError } = await supabase
          .from("content_statuses")
          .select("id,files")
          .eq("id", statusId)
          .single();

        if (latestError) throw latestError;
        existingFiles = normalizeFiles(latestStatus?.files);
      } else {
        const { data: latestStatus, error: latestError } = await supabase
          .from("content_statuses")
          .select("id,files")
          .eq("contact_id", contactId)
          .maybeSingle();

        if (latestError) throw latestError;
        statusId = latestStatus?.id;
        existingFiles = normalizeFiles(latestStatus?.files);
      }

      const nextFiles = [...existingFiles, ...uploadedFiles];
      const payload = {
        contact_id: contactId,
        files: nextFiles,
        photo_received: true,
        updated_at: new Date().toISOString(),
      };

      let savedId = statusId;

      if (statusId) {
        const { error } = await supabase
          .from("content_statuses")
          .update(payload)
          .eq("id", statusId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("content_statuses")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;
        savedId = data?.id;
      }

      // 업로드 성공 후 파일 목록을 즉시 화면에 반영합니다.
      setStatuses(prev => {
        const current = prev[contactId] || { ...EMPTY_STATUS, contact_id: contactId };

        return {
          ...prev,
          [contactId]: {
            ...current,
            contact_id: contactId,
            id: savedId || current.id,
            files: nextFiles,
            photo_received: true,
            updated_at: new Date().toISOString(),
          },
        };
      });

      setLoadedFiles(prev => new Set(prev).add(contactId));
      showToast(`${uploadedFiles.length}개 파일 업로드 완료`);
    } catch (e: any) {
      showToast(`업로드 오류: ${e.message || "알 수 없는 오류"}`);
    } finally {
      setUploading(null);
    }
  };

  const deleteFile = async (contactId: number, fileIndex: number, fileName: string) => {
    const s = getStatus(contactId);
    if (!s.files || s.files.length === 0) { showToast("삭제할 파일이 없습니다"); return; }
    
    const fileToDelete = s.files[fileIndex];
    const newFiles = s.files.filter((_: any, i: number) => i !== fileIndex);

    // Storage에서 파일 삭제
    if (fileToDelete?.path) {
      await supabase.storage.from("content-files").remove([fileToDelete.path]);
    }

    // 즉시 UI 반영
    setStatuses(prev => ({
      ...prev,
      [contactId]: { ...prev[contactId], files: newFiles, photo_received: newFiles.length > 0 },
    }));

    // DB 업데이트
    if (s.id) {
      const { error } = await supabase.from("content_statuses").update({
        files: newFiles,
        photo_received: newFiles.length > 0,
        updated_at: new Date().toISOString(),
      }).eq("id", s.id);
      if (error) {
        // 실패 시 롤백
        setStatuses(prev => ({
          ...prev,
          [contactId]: { ...prev[contactId], files: s.files, photo_received: true },
        }));
        showToast(`삭제 실패: ${error.message}`);
        return;
      }
    }
    showToast(`${fileName} 삭제 완료`);
  };

  const downloadFile = (file: UploadedFile) => {
    // Storage URL → 새 탭에서 원본 다운로드
    if (file.url.startsWith("http")) {
      window.open(file.url, "_blank");
      return;
    }
    // 기존 base64 호환
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
      pr_name: s.pr_name, pr_gender: s.pr_gender, pr_birth_date: s.pr_birth_date,
      pr_title_position: s.pr_title_position, pr_age: s.pr_age,
      pr_height: s.pr_height, pr_body_type: s.pr_body_type,
      pr_activity_region: s.pr_activity_region, pr_company: s.pr_company,
      pr_site_history_1: s.pr_site_history_1, pr_site_history_2: s.pr_site_history_2,
      pr_site_history_3: s.pr_site_history_3, pr_site_history_4: s.pr_site_history_4,
      pr_site_history_5: s.pr_site_history_5,
      pr_intro: s.pr_intro,
      pr_request: s.pr_request,
      pr_video_copy_1: s.pr_video_copy_1, pr_video_performance: s.pr_video_performance,
      pr_video_copy_2: s.pr_video_copy_2,
      pr_site_info: s.pr_site_info, pr_photo_desc: s.pr_photo_desc,
      pr_feed_text: s.pr_feed_text, pr_career: s.pr_career, pr_years: s.pr_years,
      pr_years_base_year: s.pr_years_base_year || new Date().getFullYear(),
      pr_output_server: s.pr_output_server, pr_output_url: s.pr_output_url,
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
          { key: "all", label: "총 회원", value: members.length, color: "#3b82f6" },
          { key: "photo", label: "사진 수취", value: Object.values(statuses).filter(s => s.photo_received).length, color: "#8b5cf6" },
          { key: "info", label: "정보 수취", value: Object.values(statuses).filter(s => s.info_received).length, color: "#f59e0b" },
          { key: "tf2", label: "TF2 전달", value: Object.values(statuses).filter(s => s.tf2_delivered).length, color: "#10b981" },
          { key: "pr", label: "PR 완료", value: Object.values(statuses).filter(s => s.pr_completed).length, color: "#ef4444" },
          { key: "impossible", label: "제작불가", value: Object.values(statuses).filter(s => s.production_impossible).length, color: "#6b7280" },
        ].map(c => {
          const isActive = cardFilter === c.key;
          return (
            <button key={c.key} onClick={() => setCardFilter(isActive ? "" : c.key)}
              className="px-4 py-2 rounded-xl text-center transition-all"
              style={{
                background: isActive ? `${c.color}15` : "var(--surface)",
                border: isActive ? `2px solid ${c.color}` : "1px solid var(--border)",
                minWidth: 90, cursor: "pointer",
              }}>
              <p className="text-lg font-black" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[10px] font-semibold" style={{ color: isActive ? c.color : "var(--text-muted)" }}>{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* 회원 통계 */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => setShowStats(!showStats)}>
          <h3 className="text-sm font-bold" style={{ color: "var(--text)" }}>📊 회원 통계</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            {showStats ? "접기" : "펼치기"}
          </span>
        </div>
        {showStats && (() => {
          // 성별 통계
          const genderData: Record<string, number> = { "남": 0, "여": 0, "미입력": 0 };
          // 연령대 통계
          const ageData: Record<string, number> = {};
          const total = members.length;

          Object.values(statuses).forEach((s: any) => {
            // 성별
            const g = s.pr_gender?.trim();
            if (g === "남" || g === "여") genderData[g]++;
            else genderData["미입력"]++;
            // 연령대 (pr_birth_date에서 계산: 88.11.26 형식)
            const birthStr = s.pr_birth_date?.replace(/[^0-9]/g, "");
            if (birthStr && birthStr.length >= 2) {
              const yy = parseInt(birthStr.substring(0, 2));
              const birthYear = yy >= 40 ? 1900 + yy : 2000 + yy;
              const age = new Date().getFullYear() - birthYear;
              if (age > 0 && age < 100) {
                const decade = `${Math.floor(age / 10) * 10}대`;
                ageData[decade] = (ageData[decade] || 0) + 1;
              }
            }
          });
          // 정보 미입력 회원도 미입력으로 카운트
          const infoCount = Object.values(statuses).length;
          if (infoCount < total) genderData["미입력"] += (total - infoCount);

          const genderColors: Record<string, string> = { "남": "#3b82f6", "여": "#ec4899", "미입력": "#94a3b8" };
          const ageKeys = Object.keys(ageData).sort();
          const maxAge = Math.max(...Object.values(ageData), 1);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 성별 분포 */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>성별 분포</h4>
                <div className="flex items-center gap-4 mb-3">
                  {Object.entries(genderData).filter(([_, v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="text-center">
                      <p className="text-2xl font-black" style={{ color: genderColors[k] }}>{v}</p>
                      <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>{k}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{total > 0 ? `${Math.round(v / total * 100)}%` : "0%"}</p>
                    </div>
                  ))}
                </div>
                {/* 비율 바 */}
                <div className="flex rounded-full overflow-hidden h-5">
                  {Object.entries(genderData).filter(([_, v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${total > 0 ? (v / total * 100) : 0}%`, background: genderColors[k], minWidth: v > 0 ? 24 : 0 }}>
                      {total > 0 && v > 0 ? `${Math.round(v / total * 100)}%` : ""}
                    </div>
                  ))}
                </div>
              </div>

              {/* 연령대 분포 */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>연령대 분포</h4>
                {ageKeys.length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: "var(--text-subtle)" }}>나이 데이터가 입력되면 표시됩니다</p>
                ) : (
                  <div className="space-y-2">
                    {ageKeys.map(k => {
                      const v = ageData[k];
                      const pct = total > 0 ? Math.round(v / total * 100) : 0;
                      return (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-xs font-bold w-10 text-right" style={{ color: "var(--text)" }}>{k}</span>
                          <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: "var(--bg)" }}>
                            <div className="h-full rounded-lg flex items-center px-2 transition-all"
                              style={{ width: `${Math.max((v / maxAge) * 100, 8)}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}>
                              <span className="text-[10px] font-bold text-white whitespace-nowrap">{v}명 ({pct}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
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
          {Array.from(new Set(members.map(m => m.assigned_to).filter(Boolean))).sort().map(a => (
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
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="">전체 성별</option>
          <option value="남">남</option>
          <option value="여">여</option>
        </select>
        <select value={filterAge} onChange={e => setFilterAge(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="">전체 연령대</option>
          <option value="20">20대</option>
          <option value="30">30대</option>
          <option value="40">40대</option>
          <option value="50">50대</option>
          <option value="60">60대</option>
        </select>
        {(searchQ || filterAssigned || filterStatus || filterGender || filterAge || cardFilter) && (
          <button onClick={() => { setSearchQ(""); setFilterAssigned(""); setFilterStatus(""); setFilterGender(""); setFilterAge(""); setCardFilter(""); }}
            className="text-xs px-2.5 py-2 rounded-xl font-semibold transition-colors"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            초기화
          </button>
        )}
      </div>

      {/* 메인: 좌측 분양회 + 우측 외부고객 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 분양회 회원 리스트 */}
        <div className="overflow-y-auto pb-4" style={{ width: 350, flexShrink: 0, borderRight: "1px solid var(--border)" }}>
          <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-xs font-bold" style={{ color: "var(--text)" }}>🏆 분양회 회원 <span className="font-normal" style={{ color: "var(--text-muted)" }}>({members.length}명)</span></p>
          </div>
        {(() => {
          let filtered = members;
          if (cardFilter && cardFilter !== "all") {
            filtered = filtered.filter(m => {
              const s = getStatus(m.id);
              switch (cardFilter) {
                case "photo": return s.photo_received;
                case "info": return s.info_received;
                case "tf2": return s.tf2_delivered;
                case "pr": return s.pr_completed;
                case "impossible": return s.production_impossible;
                default: return true;
              }
            });
          }
          if (searchQ) {
            const q = searchQ.toLowerCase();
            filtered = filtered.filter(m => 
              m.name.toLowerCase().includes(q) || 
              (m.bunyanghoe_number || "").toLowerCase().includes(q) ||
              `b-${(m.bunyanghoe_number || "").replace(/[^0-9]/g, "")}`.includes(q)
            );
          }
          if (filterAssigned) filtered = filtered.filter(m => m.assigned_to === filterAssigned);
          if (filterGender) {
            filtered = filtered.filter(m => {
              const s = getStatus(m.id);
              return (s.pr_gender || "").trim() === filterGender;
            });
          }
          if (filterAge) {
            const decade = parseInt(filterAge);
            filtered = filtered.filter(m => {
              const s = getStatus(m.id);
              const birthStr = (s.pr_birth_date || "").replace(/[^0-9]/g, "");
              if (!birthStr || birthStr.length < 2) return false;
              const yy = parseInt(birthStr.substring(0, 2));
              const birthYear = yy >= 40 ? 1900 + yy : 2000 + yy;
              const age = new Date().getFullYear() - birthYear;
              return age >= decade && age < decade + 10;
            });
          }
          if (filterStatus) {
            filtered = filtered.filter(m => {
              const s = getStatus(m.id);
              switch (filterStatus) {
                case "photo": return s.photo_received; case "photo_no": return !s.photo_received;
                case "info": return s.info_received; case "info_no": return !s.info_received;
                case "tf2": return s.tf2_delivered; case "tf2_no": return !s.tf2_delivered;
                case "pr": return s.pr_completed; case "pr_no": return !s.pr_completed;
                default: return true;
              }
            });
          }
          return loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="px-3 pt-2">
              <p className="text-xs px-2 py-1.5" style={{ color: "var(--text-muted)" }}>
                {filtered.length === members.length ? `총 ${members.length}명` : `${filtered.length}명 / ${members.length}명`}
              </p>
              <div className="space-y-1">
                {filtered.map(m => {
                  const s = getStatus(m.id);
                  const isSelected = expandedId === m.id;
                  return (
                    <div key={m.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                      onClick={() => expandMember(m.id)}
                      style={{
                        background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
                        border: isSelected ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent",
                      }}>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg flex-shrink-0" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", minWidth: 36, textAlign: "center" }}>
                        {m.bunyanghoe_number ? `B-${m.bunyanghoe_number.replace(/[^0-9]/g, "")}` : "-"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{m.name}</span>
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{m.title || ""}</span>
                        </div>
                        {m.assigned_to && <span className="text-[10px] font-semibold" style={{ color: "#8b5cf6" }}>{m.assigned_to}</span>}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <StatusBadge done={s.photo_received} label="사진" />
                        <StatusBadge done={s.info_received} label="정보" />
                        <StatusBadge done={s.tf2_delivered} label="TF2" />
                        <StatusBadge done={s.pr_completed} label="PR" />
                        {s.production_impossible && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>불가</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        </div>

        {/* 우측: 외부 고객 리스트 */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-xs font-bold" style={{ color: "var(--text)" }}>🎬 외부 컨텐츠 고객 <span className="font-normal" style={{ color: "var(--text-muted)" }}>({extMembers.length}명)</span></p>
            <button onClick={() => setShowRegForm(v => !v)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.15)" }}>
              ➕ 등록
            </button>
          </div>
          {showRegForm && (
            <div className="p-3 space-y-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="고객명 *" value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input placeholder="직급" value={regForm.title} onChange={e => setRegForm(p => ({ ...p, title: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input placeholder="대협팀 담당자" value={regForm.assigned_to} onChange={e => setRegForm(p => ({ ...p, assigned_to: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                <input placeholder="컨텐츠제작항목" value={regForm.content_item} onChange={e => setRegForm(p => ({ ...p, content_item: e.target.value }))}
                  className="px-2.5 py-1.5 text-xs rounded-lg outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleRegister} disabled={regSaving || !regForm.name.trim()}
                  className="flex-1 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-50" style={{ background: "#3b82f6" }}>
                  {regSaving ? "등록 중..." : "등록"}
                </button>
                <button onClick={() => setShowRegForm(false)} className="px-3 py-1.5 text-xs rounded-lg" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>취소</button>
              </div>
            </div>
          )}
          {extMembers.length === 0 && !showRegForm ? (
            <div className="flex items-center justify-center py-16" style={{ color: "var(--text-subtle)" }}>
              <p className="text-sm">등록된 외부 고객이 없습니다</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {extMembers.map(m => {
                const s = getStatus(m.id);
                return (
                  <div key={m.id} className="rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
                    onClick={() => expandMember(m.id)}
                    style={{ background: expandedId === m.id ? "rgba(59,130,246,0.08)" : "var(--surface)", border: `1px solid ${expandedId === m.id ? "rgba(59,130,246,0.3)" : "var(--border)"}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{m.name}</span>
                      {m.title && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.title}</span>}
                      {m.assigned_to && <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{m.assigned_to}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { done: s.photo_received, label: "사진" },
                        { done: s.info_received, label: "정보" },
                        { done: s.tf2_delivered, label: "TF2" },
                        { done: s.pr_completed, label: "PR" },
                      ].map(item => (
                        <span key={item.label} className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: item.done ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)", color: item.done ? "#10b981" : "var(--text-subtle)" }}>
                          {item.done ? "✓" : "○"} {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 상세 슬라이드 패널 (클릭 시) */}
      {expandedId && (() => {
        const selectedMember = [...members, ...extMembers].find(m => m.id === expandedId);
        if (!selectedMember) return null;
        return (
          <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setExpandedId(null)}>
            <div className="h-full overflow-y-auto shadow-2xl" style={{ width: "75%", maxWidth: 1200, background: "var(--modal-bg)", borderLeft: "1px solid var(--border)" }}
              onClick={e => e.stopPropagation()}>
              {/* 패널 헤더 */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3" style={{ background: "var(--modal-bg)", borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  {selectedMember.bunyanghoe_number && <span className="text-sm font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>{selectedMember.bunyanghoe_number}</span>}
                  <span className="text-lg font-bold" style={{ color: "var(--text)" }}>{selectedMember.name}</span>
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>{selectedMember.title || ""}</span>
                  {selectedMember.assigned_to && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{selectedMember.assigned_to}</span>}
                </div>
                <button onClick={() => setExpandedId(null)} className="p-2 rounded-lg text-lg" style={{ color: "var(--text-muted)" }}>✕</button>
              </div>
              {(() => {
            const m = selectedMember;
            const s = getStatus(m.id);
            return (
              <div className="p-5">
                {/* 2열: 좌(체크+파일+산출물) / 우(PR패키지) */}
                <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
                  {/* 좌측 */}
                  <div style={{ width: "40%", flexShrink: 0 }} className="space-y-3">
                    {/* 체크박스 */}
                    <div className="flex items-center gap-3 flex-wrap rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      {[
                        { field: "photo_received", label: "사진 수취", icon: Camera },
                        { field: "info_received", label: "기본정보 수취", icon: FileText },
                        { field: "tf2_delivered", label: "TF2팀 전달", icon: Send },
                        { field: "pr_completed", label: "PR패키지 완료", icon: CheckCircle },
                        { field: "production_impossible", label: "제작불가", icon: X },
                      ].map(item => (
                        <label key={item.field} className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: "var(--text)" }}>
                          <input type="checkbox" checked={(s as any)[item.field] || false}
                            onChange={() => toggleCheckbox(m.id, item.field)}
                            className="w-3.5 h-3.5 rounded accent-blue-500" />
                          <item.icon size={12} style={{ color: (s as any)[item.field] ? (item.field === "production_impossible" ? "#ef4444" : "#10b981") : "var(--text-muted)" }} />
                          {item.label}
                        </label>
                      ))}
                    </div>

                    {/* 파일 관리 */}
                    <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                        <Camera size={14} /> 파일 관리
                        <span className="text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>({s.files.length}개)</span>
                      </h4>
                      {s.files.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {s.files.map((file, fi) => (
                            <div key={fi} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                              {isImageFile(file) ? <img src={file.url} alt="" className="w-8 h-8 object-cover rounded" /> : <FileText size={16} style={{ color: "#3b82f6" }} />}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{file.name}</p>
                                <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>{fmtSize(file.size)}</p>
                              </div>
                              <button onClick={() => downloadFile(file)} className="px-2 py-1 rounded-lg text-[10px] font-semibold" style={{ color: "#3b82f6", background: "rgba(59,130,246,0.08)" }}>저장</button>
                              <button onClick={() => deleteFile(m.id, fi, file.name)} className="px-2 py-1 rounded-lg text-[10px] font-semibold" style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)" }}>삭제</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#3b82f6"; }}
                        onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; }}
                        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--border)"; if (e.dataTransfer.files.length > 0) handleFileUpload(m.id, e.dataTransfer.files); }}
                        onClick={() => { uploadTargetRef.current = m.id; fileRef.current?.click(); }}
                        className="w-full py-5 rounded-xl text-sm font-semibold flex flex-col items-center gap-1 cursor-pointer"
                        style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}>
                        {uploading === m.id ? <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" /> : <><Upload size={16} /><span className="text-xs">클릭 또는 드래그 업로드</span></>}
                      </div>
                      <p className="text-[10px] text-center mt-1.5" style={{ color: "var(--text-subtle)" }}>최대 업로드 용량: 파일당 50MB</p>
                    </div>

                    {/* 산출물 주소 */}
                    <div className="rounded-xl p-4 space-y-2.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <h4 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--text)" }}>📁 산출물 주소</h4>
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>서버/컴퓨터 경로</label>
                        <div className="flex items-center gap-1">
                          <input className="flex-1 px-2.5 py-1.5 text-xs rounded-lg outline-none" readOnly
                            value={s.pr_output_server || ""} placeholder="경로 미등록"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }} />
                          {s.pr_output_server && <button onClick={() => { navigator.clipboard.writeText(s.pr_output_server); showToast("경로 복사됨"); }}
                            className="px-2 py-1.5 rounded-lg text-xs flex-shrink-0" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>📋</button>}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>URL 주소</label>
                        <div className="flex items-center gap-1">
                          {s.pr_output_url ? (
                            <a href={s.pr_output_url.startsWith("http") ? s.pr_output_url : `https://${s.pr_output_url}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex-1 px-2.5 py-1.5 text-xs rounded-lg truncate block"
                              style={{ background: "var(--surface)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", textDecoration: "underline" }}>{s.pr_output_url}</a>
                          ) : (
                            <input className="flex-1 px-2.5 py-1.5 text-xs rounded-lg outline-none" readOnly value="" placeholder="URL 미등록"
                              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }} />
                          )}
                          {s.pr_output_url && <button onClick={() => { navigator.clipboard.writeText(s.pr_output_url); showToast("URL 복사됨"); }}
                            className="px-2 py-1.5 rounded-lg text-xs flex-shrink-0" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>📋</button>}
                        </div>
                      </div>
                      <details className="text-xs"><summary className="cursor-pointer font-semibold" style={{ color: "#3b82f6" }}>주소 편집</summary>
                        <div className="mt-2 space-y-2">
                          <div>
                            <label className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>서버/컴퓨터 경로</label>
                            <input className="w-full px-2.5 py-1.5 text-xs rounded-lg outline-none" value={s.pr_output_server || ""}
                              onChange={e => updateField(m.id, "pr_output_server", e.target.value)} placeholder="\\\\server\\path\\folder"
                              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold block mb-0.5" style={{ color: "var(--text-muted)" }}>URL 주소</label>
                            <input className="w-full px-2.5 py-1.5 text-xs rounded-lg outline-none" value={s.pr_output_url || ""}
                              onChange={e => updateField(m.id, "pr_output_url", e.target.value)} placeholder="https://drive.google.com/..."
                              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* 우측: PR패키지 */}
                  <div className="flex-1 min-w-0">
                    <div className="rounded-xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    {s.production_impossible ? (
                      <>
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "#ef4444" }}><X size={14} /> 제작불가 사유</h4>
                        <textarea value={s.impossible_reason || ""} onChange={e => updateField(m.id, "impossible_reason", e.target.value)}
                          placeholder="제작불가 사유를 작성해주세요..." rows={6}
                          className="w-full rounded-xl outline-none resize-none text-sm p-4"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        <button onClick={async () => {
                          setSaving(m.id);
                          const payload = { contact_id: m.id, impossible_reason: s.impossible_reason || "", production_impossible: true, updated_at: new Date().toISOString() };
                          if (s.id) { await supabase.from("content_statuses").update(payload).eq("id", s.id); }
                          else { const { data } = await supabase.from("content_statuses").insert(payload).select().single(); if (data) updateField(m.id, "id", data.id); }
                          setSaving(null); showToast("불가사유 저장 완료");
                        }} disabled={saving === m.id}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl mt-3">
                          <Save size={14} />{saving === m.id ? "저장 중..." : "불가사유 저장"}
                        </button>
                      </>
                    ) : (
                      <>
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--text)" }}><FileText size={14} /> PR패키지 기본정보</h4>
                        {/* 고객기본정보 3열 */}
                        <div className="rounded-xl p-3 mb-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                          <h5 className="text-xs font-bold mb-2 pb-1.5" style={{ color: "#3b82f6", borderBottom: "1px solid var(--border)" }}>📋 고객기본정보</h5>
                          <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                            {[
                              { key: "pr_name", label: "성명", placeholder: m.name },
                              { key: "pr_title_position", label: "직함", placeholder: "본부장" },
                              { key: "pr_gender", label: "성별", placeholder: "남 / 여" },
                              { key: "pr_birth_date", label: "생년월일", placeholder: "88.11.26" },
                              { key: "pr_height", label: "키", placeholder: "175cm" },
                              { key: "pr_body_type", label: "체형", placeholder: "근육질" },
                              { key: "pr_activity_region", label: "활동지역", placeholder: "경기 수도권" },
                              { key: "pr_company", label: "소속회사", placeholder: "마켓리더" },
                              { key: "pr_years", label: `연차${s.pr_years_base_year ? ` (${calcYears(s.pr_years_base_year, s.pr_years)})` : ""}`, placeholder: "7년차" },
                            ].map(f => (
                              <div key={f.key}>
                                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>{f.label}</label>
                                <input className="w-full px-2.5 py-2 text-sm rounded-lg outline-none" value={(s as any)[f.key] || ""}
                                  onChange={e => { updateField(m.id, f.key, e.target.value); if (f.key === "pr_years") updateField(m.id, "pr_years_base_year", new Date().getFullYear()); }}
                                  placeholder={f.placeholder}
                                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                              </div>
                            ))}
                          </div>
                          <div className="mt-2">
                            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>한줄소개</label>
                            <input className="w-full px-2.5 py-2 text-sm rounded-lg outline-none" value={(s as any).pr_intro || ""}
                              onChange={e => updateField(m.id, "pr_intro", e.target.value)}
                              placeholder="다름을 만드는 경험, 결과로 답하는 리더"
                              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                          </div>
                          <div className="mt-2">
                            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>요청사항</label>
                            <textarea className="w-full px-2.5 py-2 text-sm rounded-lg outline-none resize-none" value={(s as any).pr_request || ""}
                              onChange={e => updateField(m.id, "pr_request", e.target.value)}
                              placeholder="PR패키지 제작 시 반영할 요청사항을 입력하세요"
                              rows={3}
                              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                          </div>
                        </div>
                        {/* 현장이력 + 영상카피 3열 */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <h5 className="text-xs font-bold mb-2 pb-1.5" style={{ color: "#10b981", borderBottom: "1px solid var(--border)" }}>🏗️ 대표현장이력</h5>
                            <div className="space-y-1.5">
                              {[{ n:1, ph:"안동코오롱하늘채" },{ n:2, ph:"사천삼정그린코아" },{ n:3, ph:"대구만촌자이르네" },{ n:4, ph:"현장이력 4" },{ n:5, ph:"현장이력 5" }].map(({n,ph}) => (
                                <input key={n} className="w-full px-2.5 py-1.5 text-sm rounded-lg outline-none" value={(s as any)[`pr_site_history_${n}`] || ""}
                                  onChange={e => updateField(m.id, `pr_site_history_${n}`, e.target.value)} placeholder={ph}
                                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <h5 className="text-xs font-bold mb-2 pb-1.5" style={{ color: "#8b5cf6", borderBottom: "1px solid var(--border)" }}>🎬 ①영상카피</h5>
                            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>문구기재</label>
                            <input className="w-full px-2.5 py-2 text-sm rounded-lg outline-none" value={(s as any).pr_video_copy_1 || ""}
                              onChange={e => updateField(m.id, "pr_video_copy_1", e.target.value)} placeholder="성과로 말하는 현장전문가"
                              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                          </div>
                          <div className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <h5 className="text-xs font-bold mb-2 pb-1.5" style={{ color: "#8b5cf6", borderBottom: "1px solid var(--border)" }}>🎬 ②영상카피</h5>
                            <div className="space-y-2">
                              <div><label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>핵심성과수치</label>
                                <input className="w-full px-2.5 py-2 text-sm rounded-lg outline-none" value={(s as any).pr_video_performance || ""}
                                  onChange={e => updateField(m.id, "pr_video_performance", e.target.value)} placeholder="누적 계약180%"
                                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} /></div>
                              <div><label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>소구카피</label>
                                <input className="w-full px-2.5 py-2 text-sm rounded-lg outline-none" value={(s as any).pr_video_copy_2 || ""}
                                  onChange={e => updateField(m.id, "pr_video_copy_2", e.target.value)} placeholder="신뢰를 성과로 완성하는 본부장"
                                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} /></div>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => saveInfo(m.id)} disabled={saving === m.id}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                          <Save size={14} />{saving === m.id ? "저장 중..." : "기본정보 저장"}
                        </button>
                      </>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
            </div>
          </div>
        );
      })()}

      {/* 숨겨진 파일 입력 */}
      <input ref={fileRef} type="file" accept="image/*,.pdf,.zip,.doc,.docx,.ppt,.pptx" multiple className="hidden"
        onChange={e => {
          const files = e.target.files;
          const targetId = uploadTargetRef.current;
          if (files && files.length > 0 && targetId) handleFileUpload(targetId, files);
          e.target.value = "";
          uploadTargetRef.current = null;
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
