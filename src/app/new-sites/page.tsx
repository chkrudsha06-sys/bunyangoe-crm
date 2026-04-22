"use client";

import { Construction } from "lucide-react";

export default function NewSitesPage() {
  return (
    <div className="flex flex-col h-full bg-[#F1F5F9]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          🏗️ 신규현장
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">신규 분양현장 정보 관리</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Construction size={48} className="mx-auto text-slate-300" />
          <p className="text-slate-400 text-sm font-semibold">페이지 준비 중입니다</p>
          <p className="text-slate-300 text-xs">기능이 곧 추가됩니다</p>
        </div>
      </div>
    </div>
  );
}
