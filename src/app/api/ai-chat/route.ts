import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY || process.env.ANTHROPIC_API_KEY;

function getThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diff);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().split("T")[0], end: sun.toISOString().split("T")[0] };
}

function getThisMonth() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end: `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`,
  };
}

// 질문 키워드에 따라 필요한 데이터만 조회 (토큰 절약)
async function fetchCRMContext(question: string) {
  const q = question.toLowerCase();
  const week = getThisWeek();
  const month = getThisMonth();
  const parts: string[] = [];

  // 1. 항상 포함: 기본 요약
  const { data: contacts } = await supabase.from("contacts")
    .select("name,assigned_to,meeting_result,meeting_date,meeting_location,bunyanghoe_number,prospect_type,title,consultant").limit(500);
  const total = contacts?.length || 0;
  const byResult: Record<string, number> = {};
  const byAssigned: Record<string, number> = {};
  contacts?.forEach((c: any) => {
    if (c.meeting_result) byResult[c.meeting_result] = (byResult[c.meeting_result] || 0) + 1;
    if (c.assigned_to) byAssigned[c.assigned_to] = (byAssigned[c.assigned_to] || 0) + 1;
  });
  parts.push(`[고객현황] 총${total}명, 결과별: ${JSON.stringify(byResult)}, 담당자별: ${JSON.stringify(byAssigned)}`);

  // 2. 일정 관련 질문
  if (q.includes("일정") || q.includes("스케줄") || q.includes("미팅") || q.includes("이번주") || q.includes("이번달") || q.includes("캘린더") || q.includes("완판")) {
    const { data: weekEvents } = await supabase.from("calendar_events")
      .select("date,type,title,author,location").gte("date", week.start).lte("date", week.end).order("date");
    parts.push(`[이번주일정 ${week.start}~${week.end}] ${JSON.stringify(weekEvents?.map(e => `${e.date} ${e.type} ${e.title} (${e.author}) ${e.location||""}`) || "없음")}`);

    if (q.includes("이번달")) {
      const { data: monthEvents } = await supabase.from("calendar_events")
        .select("date,type,title,author,location").gte("date", month.start).lte("date", month.end).order("date");
      parts.push(`[이번달일정] ${JSON.stringify(monthEvents?.map(e => `${e.date} ${e.type} ${e.title} (${e.author})`) || "없음")}`);
    }
  }

  // 3. 매출 관련 질문
  if (q.includes("매출") || q.includes("집계") || q.includes("월회비") || q.includes("입회비") || q.includes("실적") || q.includes("광고") || q.includes("리워드") || q.includes("하이타") || q.includes("호갱")) {
    const { data: sales } = await supabase.from("ad_executions")
      .select("member_name,execution_amount,vat_amount,channel,team_member,payment_date,consultant,contract_route")
      .gte("payment_date", month.start).lte("payment_date", month.end);
    const ch: Record<string, { n: number; a: number }> = {};
    const tm: Record<string, { n: number; a: number }> = {};
    let totalAmt = 0;
    sales?.forEach((s: any) => {
      const amt = (s.vat_amount && s.vat_amount !== s.execution_amount) ? s.vat_amount : s.execution_amount || 0;
      totalAmt += amt;
      const c = s.channel || "기타";
      if (!ch[c]) ch[c] = { n: 0, a: 0 }; ch[c].n++; ch[c].a += amt;
      const t = s.team_member || "미지정";
      if (!tm[t]) tm[t] = { n: 0, a: 0 }; tm[t].n++; tm[t].a += amt;
    });
    parts.push(`[이번달매출 ${month.start}~${month.end}] 총${sales?.length||0}건 ${totalAmt.toLocaleString()}원`);
    parts.push(`채널별: ${Object.entries(ch).map(([k, v]) => `${k}:${v.n}건/${v.a.toLocaleString()}원`).join(", ")}`);
    parts.push(`담당자별: ${Object.entries(tm).map(([k, v]) => `${k}:${v.n}건/${v.a.toLocaleString()}원`).join(", ")}`);

    // 개별 매출 상세 (최근 15건만)
    parts.push(`[최근매출상세] ${JSON.stringify(sales?.slice(0, 15).map(s => `${(s as any).payment_date} ${(s as any).member_name} ${(s as any).channel} ${((s as any).vat_amount||(s as any).execution_amount||0).toLocaleString()}원 (${(s as any).team_member})`) || "없음")}`);
  }

  // 4. 고객 관련 상세 질문
  if (q.includes("고객") || q.includes("계약") || q.includes("예약") || q.includes("입회") || q.includes("분양회") || q.includes("넘버") || q.includes("B-")) {
    const vip = contacts?.filter((c: any) => ["계약완료", "예약완료"].includes(c.meeting_result));
    parts.push(`[분양회입회자] 총${vip?.length||0}명 (계약${vip?.filter((c:any)=>c.meeting_result==="계약완료").length||0}, 예약${vip?.filter((c:any)=>c.meeting_result==="예약완료").length||0})`);
    parts.push(`목록: ${JSON.stringify(vip?.slice(0, 30).map(c => `${c.bunyanghoe_number||"-"} ${c.name} ${c.title||""} (${c.assigned_to})`) || "없음")}`);
  }

  // 5. 특정 이름 검색
  const nameMatch = contacts?.filter((c: any) => q.includes(c.name?.substring(0, 2)));
  if (nameMatch && nameMatch.length > 0 && nameMatch.length < 10) {
    parts.push(`[이름매칭고객] ${JSON.stringify(nameMatch.map(c => ({ 이름: c.name, 직급: c.title, 담당: c.assigned_to, 컨설턴트: c.consultant, 가망: c.prospect_type, 결과: c.meeting_result, 미팅일: c.meeting_date, 미팅지역: c.meeting_location, 넘버: c.bunyanghoe_number })))}`);
  }

  // 6. 업무 관련
  if (q.includes("업무") || q.includes("요청") || q.includes("태스크") || q.includes("할일")) {
    const { data: tasks } = await supabase.from("tasks")
      .select("requester,assignee,category,content,status,created_at").order("created_at", { ascending: false }).limit(10);
    parts.push(`[최근업무] ${JSON.stringify(tasks?.map(t => `${(t as any).created_at?.split("T")[0]} ${(t as any).requester}→${(t as any).assignee} [${(t as any).category}] ${(t as any).status} ${(t as any).content?.substring(0, 50)}`) || "없음")}`);
  }

  // 7. 완판트럭
  if (q.includes("완판") || q.includes("트럭") || q.includes("출동")) {
    const { data: trucks } = await supabase.from("wanpan_trucks")
      .select("dispatch_date,site_name,region,members,customers").order("dispatch_date", { ascending: false }).limit(10);
    parts.push(`[완판트럭] ${JSON.stringify(trucks?.map(t => `${(t as any).dispatch_date} ${(t as any).site_name} ${(t as any).region} 담당:${(t as any).members?.join(",")} 고객${(t as any).customers?.length||0}명`) || "없음")}`);
  }

  return parts.join("\n");
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    if (!message) return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
    if (!GOOGLE_AI_KEY) return NextResponse.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });

    const crmData = await fetchCRMContext(message);
    const today = new Date().toISOString().split("T")[0];
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    const systemPrompt = `당신은 광고인㈜ 대외협력팀 CRM AI 어시스턴트 "분양의신 AI"입니다.

[규칙] 한국어 답변, CRM 데이터 기반 정확 답변, 없는 데이터는 솔직히 "없음" 표시, 금액은 원 단위, 날짜는 M월 D일(요일)

[오늘] ${today} (${dayNames[new Date().getDay()]}요일)

[팀] 관리자: 김정후본부장/김창완팀장/최웅파트장 | 실행파트: 조계현메인/이세호어쏘/기여운어쏘/최연전CX | 운영파트: 김재영어시/최은정어시

[별명] 계현=조계현, 세호=이세호, 여운=기여운, 연전=최연전, 재영=김재영, 은정=최은정

[CRM데이터]
${crmData}`;

    // Gemini 대화 구성
    const geminiContents = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        geminiContents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      }
    }
    geminiContents.push({ role: "user", parts: [{ text: message }] });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return NextResponse.json({ error: `AI 오류 (${res.status}): ${errText.substring(0, 150)}` }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "응답을 생성할 수 없습니다.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("AI Chat error:", err);
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}
