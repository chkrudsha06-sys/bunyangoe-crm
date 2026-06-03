"use client";
import { useState, useEffect } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

interface Review {
  id: string;
  name: string;
  phone: string;
  position: string;
  company_name: string;
  region: string;
  memo: string;
  field_count: number;
  product_type: string;
  setup_people: number;
  moving_members: number;
  company_scale: string;
  pr_platform: string;
  networking: string;
  monthly_ad_budget: number;
  ad_support: string;
  field_score: number;
  organization_score: number;
  branding_score: number;
  ad_score: number;
  total_score: number;
  grade: string;
  admission: string;
  action_text: string;
  created_at: string;
}

const POS: Record<string,string> = { director:"본부장", teamLeader:"팀장", manager:"실장/소장", staff:"직원", etc:"기타" };
const PROD: Record<string,string> = { general:"일반분양", localHousing:"지주택", etc:"기타", none:"없음" };
const SCALE: Record<string,string> = { major:"대형/인지도", mid:"중견회사", small:"소규모", none:"무소속" };
const PR: Record<string,string> = { active:"활발히 운영", exists:"보유만 함", none:"없음" };
const NET: Record<string,string> = { regular:"정기적", occasional:"간헐적", none:"없음" };
const ADS: Record<string,string> = { full:"본부/팀 가능", partial:"일부 가능", siteDependent:"현장 의존", none:"불가" };

const gradeColor = (g: string) => g?.includes("마스터") ? "bg-amber-100 text-amber-700 border-amber-200" : g?.includes("챌린저") ? "bg-purple-100 text-purple-700 border-purple-200" : g?.includes("추가") ? "bg-blue-100 text-blue-700 border-blue-200" : g?.includes("브론즈") ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-red-100 text-red-600 border-red-200";
const admColor = (a: string) => a?.includes("적극") ? "bg-emerald-100 text-emerald-700 border-emerald-200" : a?.includes("가능") ? "bg-blue-100 text-blue-700 border-blue-200" : a?.includes("육성") ? "bg-orange-100 text-orange-700 border-orange-200" : a?.includes("브론즈") ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-red-100 text-red-600 border-red-200";
const scoreColor = (s: number) => s >= 85 ? "#16a34a" : s >= 75 ? "#3b82f6" : s >= 55 ? "#ea7c1e" : "#dc2626";

export default function CustomerReview() {
  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterAdm, setFilterAdm] = useState("");
  const [selected, setSelected] = useState<Review | null>(null);

  useEffect(() => { setUser(getCurrentUser()); }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("member_reviews").select("*").order("created_at", { ascending: false });
      setReviews((data || []) as Review[]);
      setLoading(false);
    })();
  }, [user]);

  if (!user) return null;

  const filtered = reviews.filter(r => {
    if (search && !r.name?.includes(search) && !r.phone?.includes(search) && !r.company_name?.includes(search) && !r.region?.includes(search)) return false;
    if (filterGrade && r.grade !== filterGrade) return false;
    if (filterAdm && r.admission !== filterAdm) return false;
    return true;
  });

  const masters = reviews.filter(r => r.grade?.includes("마스터")).length;
  const challengers = reviews.filter(r => r.grade?.includes("챌린저")).length;
  const additional = reviews.filter(r => r.grade?.includes("추가")).length;
  const bronzes = reviews.filter(r => r.grade?.includes("브론즈")).length;
  const holdGrade = reviews.filter(r => r.grade?.includes("보류")).length;

  const fmt = (n: number) => n ? n.toLocaleString() + "원" : "-";

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2" style={{ color: "var(--text)" }}>📋 고객별심사결과</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>심사앱에서 저장된 고객 심사 데이터를 실시간 조회합니다 · 120점 만점</p>
        </div>
        <div className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
          총 {reviews.length}건
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "전체", count: reviews.length, color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
          { label: "마스터", count: masters, color: "#d97706", bg: "rgba(217,119,6,0.08)" },
          { label: "챌린저", count: challengers, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
          { label: "추가심사", count: additional, color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
          { label: "브론즈", count: bronzes, color: "#64748b", bg: "rgba(100,116,139,0.08)" },
          { label: "판정보류", count: holdGrade, color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
        ].map(k => (
          <div key={k.label} className="text-center py-3 rounded-xl" style={{ background: k.bg, border: `1px solid ${k.color}20` }}>
            <p className="text-lg font-black" style={{ color: k.color }}>{k.count}</p>
            <p className="text-[10px] font-bold" style={{ color: k.color }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="고객명, 연락처, 회사, 지역 검색"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }} />
        </div>
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="text-xs px-3 py-2 rounded-xl outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="">등급 전체</option>
          <option value="마스터">마스터</option>
          <option value="챌린저">챌린저</option>
          <option value="추가 심사">추가심사</option>
          <option value="브론즈">브론즈</option>
          <option value="판정 보류">판정보류</option>
        </select>
        <select value={filterAdm} onChange={e => setFilterAdm(e.target.value)} className="text-xs px-3 py-2 rounded-xl outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          <option value="">판정 전체</option>
          <option value="적극 입회 대상">적극 입회</option>
          <option value="입회 가능 대상">입회 가능</option>
          <option value="육성 대상">육성</option>
          <option value="입회 보류">보류</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "rgba(59,130,246,0.06)" }}>
                {["No","고객명","직급","소속회사","활동지역","총점<br>/120","등급","판정","현장<br>/30","조직<br>/40","브랜딩<br>/20","광고<br>/30","심사일"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-center font-bold whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="text-center py-10" style={{ color: "var(--text-muted)" }}>로딩 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-10" style={{ color: "var(--text-muted)" }}>심사 데이터가 없습니다</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className="cursor-pointer transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                  onClick={() => setSelected(r)}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text)" }}>{r.name || "-"}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: "var(--text)" }}>{POS[r.position] || r.position || "-"}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: "var(--text)" }}>{r.company_name || "-"}</td>
                  <td className="px-3 py-2.5 text-center" style={{ color: "var(--text)" }}>{r.region || "-"}</td>
                  <td className="px-3 py-2.5 text-center font-black" style={{ color: scoreColor(r.total_score) }}>{r.total_score}</td>
                  <td className="px-3 py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${gradeColor(r.grade)}`}>{r.grade}</span></td>
                  <td className="px-3 py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${admColor(r.admission)}`}>{r.admission}</span></td>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text)" }}>{r.field_score}/30</td>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text)" }}>{r.organization_score}/40</td>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text)" }}>{r.branding_score}/20</td>
                  <td className="px-3 py-2.5 text-center font-bold" style={{ color: "var(--text)" }}>{r.ad_score}/30</td>
                  <td className="px-3 py-2.5 text-center whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 슬라이드 패널 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl" style={{ background: "var(--bg)" }} onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between p-4" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              <div>
                <h2 className="font-black text-base" style={{ color: "var(--text)" }}>{selected.name} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>{POS[selected.position] || selected.position}</span></h2>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{selected.phone || "-"} · {selected.company_name || "-"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-full" style={{ background: "var(--surface)" }}><X size={16} style={{ color: "var(--text-muted)" }} /></button>
            </div>

            <div className="p-4 space-y-4">
              {/* 총점 + 등급 */}
              <div className="text-center py-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-4xl font-black" style={{ color: scoreColor(selected.total_score) }}>{selected.total_score}<span className="text-base font-normal" style={{ color: "var(--text-muted)" }}>/120</span></p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold border ${gradeColor(selected.grade)}`}>{selected.grade}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold border ${admColor(selected.admission)}`}>{selected.admission}</span>
                </div>
                <p className="text-[11px] mt-2 px-6" style={{ color: "var(--text-muted)" }}>{selected.action_text}</p>
              </div>

              {/* 영역별 점수 */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "현장 운영력", score: selected.field_score, max: 30, color: "#3b82f6" },
                  { label: "조직 운영력", score: selected.organization_score, max: 40, color: "#8b5cf6" },
                  { label: "브랜딩", score: selected.branding_score, max: 20, color: "#ea7c1e" },
                  { label: "광고 집행력", score: selected.ad_score, max: 30, color: "#16a34a" },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                    <p className="text-lg font-black" style={{ color: s.color }}>{s.score}<span className="text-xs font-normal">/{s.max}</span></p>
                    <div className="w-full h-1.5 rounded-full mt-1" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(s.score / s.max) * 100}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* 기본정보 */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3 pb-2" style={{ color: "#3b82f6", borderBottom: "1px solid var(--border)" }}>👤 기본정보</h3>
                <div className="space-y-2 text-xs">
                  {[
                    ["고객명", selected.name],
                    ["연락처", selected.phone],
                    ["직급", POS[selected.position] || selected.position],
                    ["소속회사", selected.company_name],
                    ["활동지역", selected.region],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>{l}</span><b style={{ color: "var(--text)" }}>{v || "-"}</b></div>
                  ))}
                </div>
              </div>

              {/* 체크리스트 */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="text-xs font-bold mb-3 pb-2" style={{ color: "#8b5cf6", borderBottom: "1px solid var(--border)" }}>📝 체크리스트 입력값</h3>
                <div className="space-y-2 text-xs">
                  {[
                    ["1년간 진행 현장 수", `${selected.field_count}개`],
                    ["주로 운영하는 물건", PROD[selected.product_type] || selected.product_type],
                    ["직접 양성한 상담사 수", `${(selected as any).trained_consultants || 0}명`],
                    ["세팅 가능 인원수", `${selected.setup_people}명`],
                    ["같이 움직이는 팀원", `${selected.moving_members}명`],
                    ["회사 규모", SCALE[selected.company_scale] || selected.company_scale],
                    ["PR 플랫폼", PR[selected.pr_platform] || selected.pr_platform],
                    ["네트워킹 활동", NET[selected.networking] || selected.networking],
                    ["월 평균 광고비", fmt(selected.monthly_ad_budget)],
                    ["광고 셋팅 운영", (selected as any).ad_setting_operation || "-"],
                    ["광고비 지원", ADS[selected.ad_support] || selected.ad_support],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>{l}</span><b style={{ color: "var(--text)" }}>{v || "-"}</b></div>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              {selected.memo && (
                <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h3 className="text-xs font-bold mb-2" style={{ color: "#16a34a" }}>💬 상담 메모</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{selected.memo}</p>
                </div>
              )}

              {/* 심사일 */}
              <div className="text-center text-[11px] py-2" style={{ color: "var(--text-muted)" }}>
                심사일: {selected.created_at ? new Date(selected.created_at).toLocaleString("ko-KR") : "-"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
