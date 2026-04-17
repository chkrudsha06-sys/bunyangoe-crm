"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { Target, Save, Users, UserCircle, Truck, Lock } from "lucide-react";

// ─── 목표 데이터 구조 ───
interface KpiRow {
  year: number;
  month: number;
  scope: "team" | "execution" | "operation";
  target_name: string;
  recruit_count: number;
  bunyanghoe_revenue: number;
  linked_revenue: number;
  special_revenue: number;
  wanpan_truck_count: number;
  ad_operation_revenue: number;
}

const EXEC_MEMBERS = ["조계현", "이세호", "기여운", "최연전"];
const OPS_MEMBERS  = ["김재영", "최은정"];

const makeEmpty = (year: number, month: number, scope: KpiRow["scope"], name: string): KpiRow => ({
  year, month, scope, target_name: name,
  recruit_count: 0,
  bunyanghoe_revenue: 0,
  linked_revenue: 0,
  special_revenue: 0,
  wanpan_truck_count: 0,
  ad_operation_revenue: 0,
});

// ─── 금액 입력 UI (콤마 자동 포맷) ───
function MoneyInput({ value, onChange, placeholder }: {
  value: number; onChange: (v: number) => void; placeholder?: string;
}) {
  const formatted = value ? value.toLocaleString("ko-KR") : "";
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={formatted}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          onChange(raw ? parseInt(raw, 10) : 0);
        }}
        placeholder={placeholder || "0"}
        className="w-full px-3 py-2 pr-8 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-right"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">원</span>
    </div>
  );
}

// ─── 숫자 입력 UI (명/건) ───
function CountInput({ value, onChange, unit }: {
  value: number; onChange: (v: number) => void; unit: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        placeholder="0"
        className="w-full px-3 py-2 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono text-right"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">{unit}</span>
    </div>
  );
}

export default function KpiSettingsPage() {
  const router = useRouter();
  const [user, setUser]       = useState<ReturnType<typeof getCurrentUser>>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [team, setTeam] = useState<KpiRow>(makeEmpty(year, month, "team", "team"));
  const [execMap, setExecMap] = useState<Record<string, KpiRow>>({});
  const [opsMap,  setOpsMap]  = useState<Record<string, KpiRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");

  // 관리자 권한 체크
  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    setAuthChecked(true);
    if (!u || u.role !== "admin") {
      setTimeout(() => router.push("/"), 1500);
    }
  }, [router]);

  // 년/월 바뀌면 데이터 로드
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    loadData();
  }, [year, month, user]);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kpi_settings")
      .select("*")
      .eq("year", year)
      .eq("month", month);

    const rows = (data as KpiRow[]) || [];

    const teamRow = rows.find(r => r.scope === "team");
    setTeam(teamRow || makeEmpty(year, month, "team", "team"));

    const em: Record<string, KpiRow> = {};
    EXEC_MEMBERS.forEach(name => {
      const r = rows.find(x => x.scope === "execution" && x.target_name === name);
      em[name] = r || makeEmpty(year, month, "execution", name);
    });
    setExecMap(em);

    const om: Record<string, KpiRow> = {};
    OPS_MEMBERS.forEach(name => {
      const r = rows.find(x => x.scope === "operation" && x.target_name === name);
      om[name] = r || makeEmpty(year, month, "operation", name);
    });
    setOpsMap(om);

    setLoading(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);

    const rows: any[] = [
      { ...team, year, month, scope: "team", target_name: "team" },
      ...EXEC_MEMBERS.map(n => ({ ...execMap[n], year, month, scope: "execution", target_name: n })),
      ...OPS_MEMBERS.map(n  => ({ ...opsMap[n],  year, month, scope: "operation", target_name: n })),
    ];

    const { error } = await supabase
      .from("kpi_settings")
      .upsert(rows, { onConflict: "year,month,scope,target_name" });

    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      setTimeout(() => setSavedAt(""), 3000);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
        <Lock size={40} className="mb-3 opacity-40"/>
        <p className="text-sm font-semibold">관리자만 접근할 수 있는 페이지입니다</p>
        <p className="text-xs mt-1">대시보드로 이동합니다...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Target size={20} className="text-amber-500"/>KPI 설정
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">대협팀 전체 및 개인별 월간 목표 설정</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e=>setYear(parseInt(e.target.value))}
              className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400">
              {[2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={month} onChange={e=>setMonth(parseInt(e.target.value))}
              className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400">
              {Array.from({length: 12}, (_, i) => i + 1).map(m =>
                <option key={m} value={m}>{m}월</option>
              )}
            </select>

            {savedAt && (
              <span className="text-xs text-emerald-600 font-semibold px-2">✓ {savedAt} 저장됨</span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              <Save size={14}/> {saving ? "저장 중..." : "전체 저장"}
            </button>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <>
            {/* ══ 1. 대협팀 전체 목표 ══ */}
            <section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3 border-b border-amber-100 flex items-center gap-2">
                <Users size={16} className="text-amber-600"/>
                <h2 className="text-sm font-bold text-amber-800">대협팀 전체 목표</h2>
                <span className="text-xs text-amber-600 ml-1">({year}년 {month}월)</span>
              </div>
              <div className="p-5 space-y-5">
                {/* 주요 KPI - 4개 필드 (분양회 매출 추가) */}
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>주요 KPI
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">분양회 모집</label>
                      <CountInput value={team.recruit_count} onChange={v=>setTeam({...team, recruit_count: v})} unit="명"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">분양회 매출(회비)</label>
                      <MoneyInput value={team.bunyanghoe_revenue} onChange={v=>setTeam({...team, bunyanghoe_revenue: v})}/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">연계매출(하이타겟)</label>
                      <MoneyInput value={team.linked_revenue} onChange={v=>setTeam({...team, linked_revenue: v})}/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">특전매출목표</label>
                      <MoneyInput value={team.special_revenue} onChange={v=>setTeam({...team, special_revenue: v})}/>
                    </div>
                  </div>
                </div>

                {/* 부가 KPI */}
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"/>부가 KPI
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                        <Truck size={11} className="text-slate-400"/>완판트럭
                      </label>
                      <CountInput value={team.wanpan_truck_count} onChange={v=>setTeam({...team, wanpan_truck_count: v})} unit="건"/>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ══ 2. 실행파트 개인별 목표 ══ */}
            <section className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 border-b border-blue-100 flex items-center gap-2">
                <UserCircle size={16} className="text-blue-600"/>
                <h2 className="text-sm font-bold text-blue-800">실행파트 개인별 목표</h2>
                <span className="text-xs text-blue-600 ml-1">({EXEC_MEMBERS.length}명)</span>
              </div>
              <div className="p-5 space-y-4">
                {EXEC_MEMBERS.map(name => {
                  const row = execMap[name] || makeEmpty(year, month, "execution", name);
                  const update = (patch: Partial<KpiRow>) => setExecMap({ ...execMap, [name]: { ...row, ...patch }});
                  return (
                    <div key={name} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{name[0]}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">분양회 모집</label>
                          <CountInput value={row.recruit_count} onChange={v=>update({ recruit_count: v })} unit="명"/>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">분양회 매출(회비)</label>
                          <MoneyInput value={row.bunyanghoe_revenue} onChange={v=>update({ bunyanghoe_revenue: v })}/>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">연계매출</label>
                          <MoneyInput value={row.linked_revenue} onChange={v=>update({ linked_revenue: v })}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ══ 3. 운영파트 개인별 목표 ══ */}
            <section className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 border-b border-emerald-100 flex items-center gap-2">
                <UserCircle size={16} className="text-emerald-600"/>
                <h2 className="text-sm font-bold text-emerald-800">운영파트 개인별 목표</h2>
                <span className="text-xs text-emerald-600 ml-1">({OPS_MEMBERS.length}명)</span>
              </div>
              <div className="p-5 space-y-4">
                {OPS_MEMBERS.map(name => {
                  const row = opsMap[name] || makeEmpty(year, month, "operation", name);
                  const update = (patch: Partial<KpiRow>) => setOpsMap({ ...opsMap, [name]: { ...row, ...patch }});
                  return (
                    <div key={name} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{name[0]}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">광고특전운영매출</label>
                          <MoneyInput value={row.ad_operation_revenue} onChange={v=>update({ ad_operation_revenue: v })}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 하단 저장 버튼 */}
            <div className="flex justify-end pb-4">
              <button
                onClick={handleSaveAll}
                disabled={saving || loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm disabled:opacity-50"
              >
                <Save size={14}/> {saving ? "저장 중..." : "전체 저장"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
