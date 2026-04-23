import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY || process.env.ANTHROPIC_API_KEY;

// 이번 주 월~일 범위
function getThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diff);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().split("T")[0],
    end: sun.toISOString().split("T")[0],
  };
}

function getThisMonth() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end: `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`,
  };
}

async function fetchCRMContext() {
  const week = getThisWeek();
  const month = getThisMonth();
  const context: Record<string, any> = {};

  // 1. 고객 데이터 요약
  const { data: contacts } = await supabase.from("contacts")
    .select("id,name,title,phone,assigned_to,consultant,customer_type,prospect_type,meeting_result,meeting_date,meeting_location,contract_date,reservation_date,bunyanghoe_number,tm_sensitivity")
    .order("id", { ascending: false }).limit(500);
  context.고객DB = {
    총고객수: contacts?.length || 0,
    계약완료: contacts?.filter((c: any) => c.meeting_result === "계약완료").length || 0,
    예약완료: contacts?.filter((c: any) => c.meeting_result === "예약완료").length || 0,
    담당자별: {} as Record<string, number>,
    최근고객: contacts?.slice(0, 30).map((c: any) => ({
      이름: c.name, 직급: c.title, 담당자: c.assigned_to, 컨설턴트: c.consultant,
      가망구분: c.prospect_type, 미팅결과: c.meeting_result, 미팅일정: c.meeting_date,
      미팅지역: c.meeting_location, 계약일: c.contract_date, 넘버링: c.bunyanghoe_number,
      TM감도: c.tm_sensitivity,
    })),
  };
  contacts?.forEach((c: any) => {
    if (c.assigned_to) context.고객DB.담당자별[c.assigned_to] = (context.고객DB.담당자별[c.assigned_to] || 0) + 1;
  });

  // 2. 이번주 일정 (캘린더)
  const { data: events } = await supabase.from("calendar_events")
    .select("*").gte("date", week.start).lte("date", week.end).order("date");
  context.이번주일정 = events?.map((e: any) => ({
    날짜: e.date, 유형: e.type, 제목: e.title, 담당자: e.author, 장소: e.location,
  }));

  // 3. 이번달 일정
  const { data: monthEvents } = await supabase.from("calendar_events")
    .select("*").gte("date", month.start).lte("date", month.end).order("date");
  context.이번달일정 = monthEvents?.map((e: any) => ({
    날짜: e.date, 유형: e.type, 제목: e.title, 담당자: e.author, 장소: e.location,
  }));

  // 4. 매출 데이터 (이번달)
  const { data: sales } = await supabase.from("ad_executions")
    .select("id,member_name,bunyanghoe_number,execution_amount,vat_amount,channel,team_member,payment_date,contract_route,consultant,refund_amount,hightarget_mileage,hightarget_reward,hogaengnono_reward,lms_reward")
    .gte("payment_date", month.start).lte("payment_date", month.end)
    .order("payment_date", { ascending: false });
  context.이번달매출 = {
    총건수: sales?.length || 0,
    총금액: sales?.reduce((s: number, x: any) => s + ((x.vat_amount && x.vat_amount !== x.execution_amount) ? x.vat_amount : x.execution_amount || 0), 0),
    채널별: {} as Record<string, { 건수: number; 금액: number }>,
    담당자별: {} as Record<string, { 건수: number; 금액: number }>,
    상세: sales?.slice(0, 50).map((s: any) => ({
      고객명: s.member_name, 넘버링: s.bunyanghoe_number, 집행금액: s.execution_amount,
      VAT포함: s.vat_amount, 채널: s.channel, 담당자: s.team_member,
      결제일: s.payment_date, 컨설턴트: s.consultant, 유입구분: s.contract_route,
    })),
  };
  sales?.forEach((s: any) => {
    const amt = (s.vat_amount && s.vat_amount !== s.execution_amount) ? s.vat_amount : s.execution_amount || 0;
    if (s.channel) {
      if (!context.이번달매출.채널별[s.channel]) context.이번달매출.채널별[s.channel] = { 건수: 0, 금액: 0 };
      context.이번달매출.채널별[s.channel].건수++;
      context.이번달매출.채널별[s.channel].금액 += amt;
    }
    if (s.team_member) {
      if (!context.이번달매출.담당자별[s.team_member]) context.이번달매출.담당자별[s.team_member] = { 건수: 0, 금액: 0 };
      context.이번달매출.담당자별[s.team_member].건수++;
      context.이번달매출.담당자별[s.team_member].금액 += amt;
    }
  });

  // 5. 전체 매출 (누적)
  const { data: allSales } = await supabase.from("ad_executions")
    .select("execution_amount,vat_amount,channel,team_member,payment_date")
    .order("payment_date", { ascending: false }).limit(1000);
  context.누적매출요약 = {
    총건수: allSales?.length || 0,
    총금액: allSales?.reduce((s: number, x: any) => s + ((x.vat_amount && x.vat_amount !== x.execution_amount) ? x.vat_amount : x.execution_amount || 0), 0),
  };

  // 6. 업무전달
  const { data: tasks } = await supabase.from("tasks")
    .select("*").order("created_at", { ascending: false }).limit(20);
  context.최근업무 = tasks?.map((t: any) => ({
    요청자: t.requester, 수신자: t.assignee, 카테고리: t.category,
    내용: t.content?.substring(0, 100), 상태: t.status, 생성일: t.created_at?.split("T")[0],
  }));

  // 7. 완판트럭
  const { data: trucks } = await supabase.from("wanpan_trucks")
    .select("*").order("dispatch_date", { ascending: false }).limit(20);
  context.완판트럭 = trucks?.map((t: any) => ({
    출동일: t.dispatch_date, 현장: t.site_name, 지역: t.region,
    담당자: t.members?.join(", "), 고객수: t.customers?.length,
  }));

  // 8. 분양회 입회자 (계약완료/예약완료)
  const vipContacts = contacts?.filter((c: any) => ["계약완료", "예약완료"].includes(c.meeting_result));
  context.분양회입회자 = {
    총인원: vipContacts?.length || 0,
    계약완료: vipContacts?.filter((c: any) => c.meeting_result === "계약완료").length || 0,
    예약완료: vipContacts?.filter((c: any) => c.meeting_result === "예약완료").length || 0,
    목록: vipContacts?.map((c: any) => ({
      이름: c.name, 직급: c.title, 넘버링: c.bunyanghoe_number,
      담당자: c.assigned_to, 결과: c.meeting_result, 계약일: c.contract_date,
    })),
  };

  return context;
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
    }

    if (!GOOGLE_AI_KEY) {
      return NextResponse.json({ error: "AI 기능이 설정되지 않았습니다. 관리자에게 문의하세요." }, { status: 500 });
    }

    // CRM 데이터 조회
    const crmData = await fetchCRMContext();
    const today = new Date().toISOString().split("T")[0];
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const todayDay = dayNames[new Date().getDay()];

    const systemPrompt = `당신은 광고인㈜ 대외협력팀의 CRM AI 어시스턴트입니다.
이름: 분양의신 AI

[기본 규칙]
- 한국어로 답변
- CRM 데이터를 기반으로 정확하게 답변
- 데이터에 없는 것은 "해당 데이터를 찾을 수 없습니다"라고 솔직히 말하기
- 금액은 원 단위로 표시 (예: 5,500,000원)
- 날짜는 M월 D일 (요일) 형식 (예: 4월 23일 (수))
- 간결하되 필요한 정보는 빠짐없이 전달
- 이모지 적절히 사용

[오늘 날짜]
${today} (${todayDay}요일)

[팀 구성]
- 관리자: 김정후 본부장, 김창완 팀장, 최웅 파트장
- 실행파트(대외협력팀): 조계현 메인, 이세호 어쏘, 기여운 어쏘, 최연전 CX
- 운영파트: 김재영 어시, 최은정 어시

[별명/줄임말 매핑]
- "계현", "조 메인" → 조계현
- "세호" → 이세호
- "여운" → 기여운
- "연전" → 최연전
- "재영" → 김재영
- "은정" → 최은정

[CRM 데이터]
${JSON.stringify(crmData, null, 0)}`;

    // 대화 히스토리 구성 (Gemini 형식: role = "user" | "model")
    const geminiContents = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        geminiContents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      }
    }
    geminiContents.push({ role: "user", parts: [{ text: message }] });

    // Google Gemini API 호출
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return NextResponse.json({ error: `AI 응답 실패 (${res.status}): ${errText.substring(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "응답을 생성할 수 없습니다.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("AI Chat error:", err);
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}
