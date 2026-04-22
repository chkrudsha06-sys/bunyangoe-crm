"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sparkles, MapPin, Building2, ChevronRight, Calendar } from "lucide-react";

interface Site {
  id: number; site_name: string; work_address: string;
  developer: string; constructor: string; trustee: string; agency: string;
  business_site_name: string; business_address: string;
  property_type: string; unit_count: string; rt_fee: string;
  staff_start_date: string; model_house_date: string; grand_open_date: string;
  selling_points: string; created_at: string;
}

const REGIONS = [
  "모든지역","서울","경기남부","경기북부","인천","부산","울산","대구","경상도","대전","세종","충청도","광주","전라도","강원도","제주도"
];

const REGION_RULES: [string, string[]][] = [
  ["서울", ["서울"]],
  ["인천", ["인천"]],
  ["부산", ["부산"]],
  ["울산", ["울산"]],
  ["대구", ["대구"]],
  ["대전", ["대전"]],
  ["세종", ["세종"]],
  ["광주", ["광주"]],
  ["제주도", ["제주"]],
  ["경기남부", ["수원","용인","성남","안양","안산","화성","평택","시흥","광명","군포","의왕","과천","오산","하남","이천","여주","양평","광주시"]],
  ["경기북부", ["고양","파주","의정부","양주","동두천","포천","연천","구리","남양주","가평","김포"]],
  ["경상도", ["경남","경북","창원","진주","김해","양산","거제","통영","포항","경주","구미","김천","안동","영주","영천","상주","문경","경산","밀양","사천","거창","합천","함안","의령","고성","남해","하동","산청","함양"]],
  ["충청도", ["충남","충북","천안","아산","서산","당진","청주","충주","제천","논산","공주","보령","홍성","예산","태안","옥천","영동","진천","음성","괴산","증평","단양"]],
  ["전라도", ["전남","전북","목포","여수","순천","전주","익산","군산","나주","광양","무안","해남","완도","강진","장성","담양","곡성","구례","화순","영암","진도","신안","보성","고흥","장흥","영광","함평","정읍","남원","김제"]],
  ["강원도", ["강원","춘천","원주","강릉","속초","동해","삼척","태백","홍천","횡성","영월","평창","정선","철원","화천","양구","인제","고성","양양"]],
];

function classifyRegion(address: string): string {
  if (!address) return "모든지역";
  for (const [region, keywords] of REGION_RULES) {
    for (const kw of keywords) {
      if (address.includes(kw)) return region;
    }
  }
  // 경기도 일반
  if (address.includes("경기")) return "경기남부";
  return "모든지역";
}

function isNew(d: string) {
  return Date.now() - new Date(d).getTime() < 2 * 24 * 60 * 60 * 1000;
}

export default function SitesListPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState("모든지역");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("new_sites").select("*").order("created_at", { ascending: false });
      setSites(data || []);
      setLoading(false);
    })();
  }, []);

  const sitesWithRegion = sites.map(s => ({ ...s, region: classifyRegion(s.business_address || s.work_address) }));
  const filtered = activeRegion === "모든지역" ? sitesWithRegion : sitesWithRegion.filter(s => s.region === activeRegion);
  const regionCounts = REGIONS.map(r => ({
    name: r,
    count: r === "모든지역" ? sites.length : sitesWithRegion.filter(s => s.region === r).length,
  }));

  return (
    <div className="min-h-screen bg-white">
      <style>{`@keyframes sparkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.15)}}.badge-sparkle{animation:sparkle 1.5s ease-in-out infinite;}`}</style>

      {/* 상단 헤더 */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B5CB8]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">분양의신 · 현장정보</h1>
              <p className="text-xs text-white/60">광고인㈜ 대외협력팀 제공</p>
            </div>
          </div>
        </div>
      </div>

      {/* 지역 탭 */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {regionCounts.map(r => (
              <button
                key={r.name}
                onClick={() => setActiveRegion(r.name)}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeRegion === r.name
                    ? "text-[#1E3A8A] border-[#1E3A8A]"
                    : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
              >
                {r.name}
                {r.count > 0 && <span className={`ml-1 text-[10px] ${activeRegion === r.name ? "text-[#1E3A8A]" : "text-slate-300"}`}>({r.count})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 현장 목록 */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm text-slate-400 font-semibold">해당 지역에 등록된 현장이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => (
              <div
                key={s.id}
                onClick={() => router.push(`/sites/${s.id}`)}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* 왼쪽: 현장 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      {s.property_type && (
                        <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-semibold">{s.property_type}</span>
                      )}
                      <h3 className="text-base font-black text-slate-800 truncate">{s.site_name}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {s.business_address && (
                        <span className="flex items-center gap-1 truncate"><MapPin size={11} />{s.business_address}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {s.unit_count && <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">{s.unit_count}세대</span>}
                      {s.rt_fee && <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded font-semibold">R/T {s.rt_fee}</span>}
                      {s.developer && <span className="text-[11px] px-2 py-0.5 bg-slate-50 text-slate-500 rounded">{s.developer}</span>}
                      {s.staff_start_date && <span className="text-[11px] px-2 py-0.5 bg-blue-50/60 text-blue-500 rounded flex items-center gap-0.5"><Calendar size={9}/>착석 {s.staff_start_date}</span>}
                      {s.grand_open_date && <span className="text-[11px] px-2 py-0.5 bg-emerald-50/60 text-emerald-500 rounded flex items-center gap-0.5"><Calendar size={9}/>GR {s.grand_open_date}</span>}
                    </div>
                  </div>

                  {/* 오른쪽: 신규 뱃지 + 화살표 */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isNew(s.created_at) && (
                      <span className="badge-sparkle inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black rounded-full shadow-sm">
                        <Sparkles size={12} /> 신규현장
                      </span>
                    )}
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 */}
      <div className="max-w-5xl mx-auto px-6 pb-10">
        <div className="text-center pt-8 border-t border-slate-100">
          <p className="text-xs text-slate-400">ⓒ 광고인㈜ · 분양의신</p>
          <p className="text-[10px] text-slate-300 mt-1">본 정보는 광고인㈜ 대외협력팀에서 제공합니다</p>
        </div>
      </div>
    </div>
  );
}
