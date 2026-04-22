"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Site {
  id: number; site_name: string; work_address: string;
  developer: string; constructor: string; trustee: string; agency: string;
  business_site_name: string; business_address: string;
  property_type: string; unit_count: string; rt_fee: string;
  staff_start_date: string; model_house_date: string; grand_open_date: string;
  selling_points: string; created_at: string;
}

export default function SiteDetailPage() {
  const params = useParams();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("new_sites").select("*").eq("id", params.id).maybeSingle();
      if (error || !data) { setNotFound(true); }
      else { setSite(data); }
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !site) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-6xl">🏗️</p>
        <p className="text-lg font-bold text-slate-700">현장 정보를 찾을 수 없습니다</p>
        <p className="text-sm text-slate-400">링크가 올바른지 확인해주세요</p>
      </div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex border-b border-slate-100 last:border-b-0">
      <div className="w-32 flex-shrink-0 px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 flex items-center">{label}</div>
      <div className="flex-1 px-4 py-3 text-sm text-slate-800">{value || "-"}</div>
    </div>
  );

  const InfoRow2 = ({ l1, v1, l2, v2 }: { l1: string; v1: string; l2: string; v2: string }) => (
    <div className="flex border-b border-slate-100 last:border-b-0">
      <div className="w-28 flex-shrink-0 px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 flex items-center">{l1}</div>
      <div className="flex-1 px-4 py-3 text-sm text-slate-800 border-r border-slate-100">{v1 || "-"}</div>
      <div className="w-28 flex-shrink-0 px-4 py-3 bg-slate-50 text-xs font-bold text-slate-500 flex items-center">{l2}</div>
      <div className="flex-1 px-4 py-3 text-sm text-slate-800">{v2 || "-"}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 헤더 */}
      <div className="bg-gradient-to-r from-[#1E3A8A] to-[#3B5CB8] text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <a href="/sites" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white/90 mb-3 transition-colors">← 현장 목록으로</a>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 text-white text-[11px] font-bold rounded-full backdrop-blur-sm">
              ✨ 신규현장
            </span>
            <span className="text-xs text-white/60">
              {new Date(site.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 등록
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{site.site_name}</h1>
          {site.business_address && (
            <p className="text-sm text-white/70 mt-2 flex items-center gap-1">📍 {site.business_address}</p>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* 근무지 정보 */}
        {site.work_address && (
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3 pb-2 border-b-2 border-slate-800">근무지 정보</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <InfoRow label="근무지역 주소" value={site.work_address} />
            </div>
          </section>
        )}

        {/* 사업자 정보 */}
        <section>
          <h2 className="text-base font-black text-slate-800 mb-3 pb-2 border-b-2 border-slate-800">사업자 정보</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <InfoRow2 l1="시행사" v1={site.developer} l2="시공사" v2={site.constructor} />
            <InfoRow2 l1="신탁사" v1={site.trustee} l2="대행사" v2={site.agency} />
          </div>
        </section>

        {/* 사업지 정보 */}
        <section>
          <h2 className="text-base font-black text-slate-800 mb-3 pb-2 border-b-2 border-slate-800">사업지 정보</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <InfoRow label="현장명" value={site.business_site_name || site.site_name} />
            <InfoRow label="사업지 주소" value={site.business_address} />
          </div>
        </section>

        {/* 물건 정보 */}
        <section>
          <h2 className="text-base font-black text-slate-800 mb-3 pb-2 border-b-2 border-slate-800">물건 정보</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <InfoRow2 l1="물건구분" v1={site.property_type} l2="세대수" v2={site.unit_count} />
            {site.rt_fee && <InfoRow label="R/T (수수료)" value={site.rt_fee} />}
          </div>
        </section>

        {/* 현장 스케줄 */}
        {(site.staff_start_date || site.model_house_date || site.grand_open_date) && (
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3 pb-2 border-b-2 border-slate-800">현장 스케줄</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">직원착석일</p>
                <p className="text-sm font-black text-slate-800">{site.staff_start_date || "-"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">모델하우스 오픈</p>
                <p className="text-sm font-black text-slate-800">{site.model_house_date || "-"}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">그랜드오픈</p>
                <p className="text-sm font-black text-slate-800">{site.grand_open_date || "-"}</p>
              </div>
            </div>
          </section>
        )}

        {/* 현장 소구점 */}
        {site.selling_points && (
          <section>
            <h2 className="text-base font-black text-slate-800 mb-3 pb-2 border-b-2 border-slate-800">현장 소구점</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{site.selling_points}</p>
            </div>
          </section>
        )}

        {/* 하단 브랜딩 */}
        <div className="text-center pt-6 pb-4 border-t border-slate-200">
          <p className="text-xs text-slate-400">ⓒ 광고인㈜ · 분양의신</p>
          <p className="text-[10px] text-slate-300 mt-1">본 정보는 광고인㈜ 대외협력팀에서 제공합니다</p>
        </div>
      </div>
    </div>
  );
}
