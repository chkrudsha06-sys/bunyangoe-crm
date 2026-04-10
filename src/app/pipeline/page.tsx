"use client";

import { useState, useEffect } from "react";
import { supabase, TEAM_MEMBERS, RESULT_COLORS, PROSPECT_COLORS, SENSITIVITY_COLORS } from "@/lib/supabase";
import { Contact } from "@/types";
import { Phone, MapPin, Calendar, User } from "lucide-react";

const PIPELINE_STAGES = [
  { key: "즉가입가망", label: "즉가입 가망", color: "border-emerald-500/40 bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-300" },
  { key: "미팅예정가망", label: "미팅 예정", color: "border-blue-500/40 bg-blue-500/5", badge: "bg-blue-500/20 text-blue-300" },
  { key: "연계매출가망고객", label: "연계매출 가망", color: "border-amber-500/40 bg-amber-500/5", badge: "bg-amber-500/20 text-amber-300" },
  { key: "미팅후가망관리", label: "미팅 후 관리", color: "border-purple-500/40 bg-purple-500/5", badge: "bg-purple-500/20 text-purple-300" },
  { key: "계약완료", label: "계약 완료", color: "border-emerald-500/60 bg-emerald-500/10", badge: "bg-emerald-500/30 text-emerald-200" },
];

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMember, setFilterMember] = useState("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from("contacts")
        .select("*")
        .or("prospect_type.not.is.null,meeting_result.in.(계약완료,예약완료,서류만수취,미팅후가망관리)")
        .order("meeting_date", { ascending: true, nullsFirst: false });

      if (filterMember) query = query.eq("assigned_to", filterMember);

      const { data } = await query;
      setContacts((data as Contact[]) || []);
      setLoading(false);
    };
    fetch();
  }, [filterMember]);

  const getStageContacts = (stageKey: string) => {
    if (stageKey === "계약완료") {
      return contacts.filter((c) => c.meeting_result === "계약완료" || c.meeting_result === "예약완료");
    }
    if (stageKey === "미팅후가망관리") {
      return contacts.filter((c) => c.meeting_result === "미팅후가망관리" || c.meeting_result === "서류만수취");
    }
    return contacts.filter((c) => c.prospect_type === stageKey);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-brand-border bg-brand-navy sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-brand-text font-bold">영업 파이프라인</h1>
            <p className="text-brand-muted text-xs mt-0.5">가망 고객 현황 및 단계별 관리</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="text-sm px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg"
            >
              <option value="">전체 담당자</option>
              {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-h-[600px]" style={{ minWidth: `${PIPELINE_STAGES.length * 280}px` }}>
            {PIPELINE_STAGES.map((stage) => {
              const stageContacts = getStageContacts(stage.key);
              return (
                <div key={stage.key} className="flex flex-col w-64 flex-shrink-0">
                  {/* 스테이지 헤더 */}
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-l border-r border-t ${stage.color}`}>
                    <span className="text-sm font-semibold text-brand-text">{stage.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${stage.badge}`}>
                      {stageContacts.length}
                    </span>
                  </div>

                  {/* 카드 목록 */}
                  <div className={`flex-1 overflow-y-auto space-y-2 p-2 rounded-b-xl border ${stage.color}`}>
                    {stageContacts.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-brand-muted text-sm">
                        없음
                      </div>
                    ) : (
                      stageContacts.map((c) => (
                        <ContactCard key={c.id} contact={c} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactCard({ contact: c }: { contact: Contact }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-3 hover:border-brand-gold/30 transition-all cursor-default">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-gold/15 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-brand-gold text-xs font-bold">{c.name[0]}</span>
          </div>
          <div>
            <p className="text-brand-text text-sm font-medium leading-tight truncate max-w-[120px]">{c.name}</p>
            <p className="text-brand-muted text-xs">{c.assigned_to}</p>
          </div>
        </div>
        {c.tm_sensitivity && (
          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${SENSITIVITY_COLORS[c.tm_sensitivity]}`}>
            {c.tm_sensitivity}
          </span>
        )}
      </div>

      {c.phone && (
        <div className="flex items-center gap-1 text-xs text-brand-muted mb-1">
          <Phone size={10} />
          <span>{c.phone}</span>
        </div>
      )}

      {c.meeting_date && (
        <div className="flex items-center gap-1 text-xs text-blue-400 mb-1">
          <Calendar size={10} />
          <span>{new Date(c.meeting_date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</span>
          {c.meeting_address && <span className="text-brand-muted">· {c.meeting_address}</span>}
        </div>
      )}

      {c.memo && (
        <p className="text-xs text-brand-muted mt-2 line-clamp-2 bg-brand-navy/50 px-2 py-1.5 rounded">
          {c.memo}
        </p>
      )}

      {c.meeting_result && (
        <div className="mt-2">
          <span className={`text-xs px-1.5 py-0.5 rounded border ${RESULT_COLORS[c.meeting_result]}`}>
            {c.meeting_result}
          </span>
        </div>
      )}
    </div>
  );
}
