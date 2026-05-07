import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_KEY = process.env.GOOGLE_AI_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY;

// Google Gemini API 호출
async function callAI(systemPrompt: string, messages: { role: string; content: string }[]) {
  if (!API_KEY) return { reply: null, error: "API 키 없음" };
  try {
    const contents = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return { reply: null, error: `Gemini ${res.status}: ${errText.substring(0, 200)}` };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return { reply: text || null, error: text ? null : "빈 응답" };
  } catch (e: any) {
    return { reply: null, error: `Gemini 예외: ${e.message}` };
  }
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diff);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().split("T")[0], end: sun.toISOString().split("T")[0] };
}

function getMonthRange() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end: `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`,
    label: `${y}년 ${m}월`,
  };
}

function fmtDate(d: string) {
  if (!d) return "";
  const dt = new Date(d);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일(${days[dt.getDay()]})`;
}

function fmtMoney(n: number) { return n.toLocaleString() + "원"; }

async function buildContext(question: string) {
  const q = question.toLowerCase();
  const week = getWeekRange();
  const month = getMonthRange();
  const lines: string[] = [];

  // ═══ 항상 포함 (핵심 요약) ═══

  // ── 1. 고객DB ──
  const { data: contacts } = await supabase.from("contacts")
    .select("id,name,title,assigned_to,consultant,prospect_type,meeting_result,meeting_date,meeting_location,bunyanghoe_number,contract_date,phone,operating_site,total_org_count,team_org_count,rt")
    .limit(500);
  const c = contacts || [];
  const vip = c.filter((x: any) => ["계약완료", "예약완료"].includes(x.meeting_result));
  const resultCount: Record<string, number> = {};
  const assignCount: Record<string, number> = {};
  c.forEach((x: any) => {
    if (x.meeting_result) resultCount[x.meeting_result] = (resultCount[x.meeting_result] || 0) + 1;
    if (x.assigned_to) assignCount[x.assigned_to] = (assignCount[x.assigned_to] || 0) + 1;
  });
  lines.push("## 고객 현황");
  lines.push(`총 ${c.length}명 | 미팅결과: ${Object.entries(resultCount).map(([k, v]) => `${k}(${v})`).join(" ")} | 담당자: ${Object.entries(assignCount).map(([k, v]) => `${k}(${v})`).join(" ")}`);
  lines.push(`분양회 입회자: ${vip.length}명 (계약완료 ${vip.filter((x:any)=>x.meeting_result==="계약완료").length}명, 예약완료 ${vip.filter((x:any)=>x.meeting_result==="예약완료").length}명)`);

  // ── 2. 분양회 입회자 명단 (항상 포함) ──
  if (vip.length > 0) {
    lines.push(`\n## 분양회 입회자 명단`);
    vip.forEach((x: any) => lines.push(`- ${x.bunyanghoe_number||"-"} ${x.name}(${x.title||"-"}) 담당:${x.assigned_to||"-"} ${x.meeting_result} 계약일:${x.contract_date||"-"}`));
  }

  // ── 3. 이번주 일정 (항상 포함) ──
  const { data: weekEvents } = await supabase.from("calendar_events")
    .select("date,event_type,title,content,author").gte("date", week.start).lte("date", week.end).order("date");
  const { data: weekTrucks } = await supabase.from("wanpan_trucks")
    .select("dispatch_date,location,site_name,agency,staff_members,consultant_members,team_size")
    .gte("dispatch_date", week.start).lte("dispatch_date", week.end).order("dispatch_date");
  const weekMeetings = c.filter((x: any) => x.meeting_date && x.meeting_date >= week.start && x.meeting_date <= week.end);
  lines.push(`\n## 이번주 일정 (${fmtDate(week.start)}~${fmtDate(week.end)})`);
  if (!weekEvents?.length && !weekTrucks?.length && !weekMeetings.length) lines.push("등록된 일정 없음");
  weekEvents?.forEach((e: any) => lines.push(`- ${fmtDate(e.date)} [캘린더] ${e.event_type} ${e.title||""} 담당:${e.author||"-"}`));
  weekTrucks?.forEach((t: any) => lines.push(`- ${fmtDate(t.dispatch_date)} [완판트럭] ${t.site_name||"-"} ${t.location||"-"} ${t.team_size||"-"}명`));
  weekMeetings.forEach((x: any) => lines.push(`- ${fmtDate(x.meeting_date)} [미팅] ${x.name} ${x.assigned_to||"-"} ${x.meeting_location||"-"}`));

  // ── 4. 이번달 매출 (항상 포함) ──
  const { data: sales } = await supabase.from("ad_executions")
    .select("member_name,execution_amount,vat_amount,channel,team_member,payment_date,consultant,contract_route,bunyanghoe_number")
    .gte("payment_date", month.start).lte("payment_date", month.end);
  if (sales && sales.length > 0) {
    const tmMap: Record<string, number> = {};
    let totalAmt = 0;
    sales.forEach((s: any) => {
      const amt = s.vat_amount && s.vat_amount !== s.execution_amount ? s.vat_amount : (s.execution_amount || 0);
      totalAmt += amt;
      tmMap[s.team_member || "미지정"] = (tmMap[s.team_member || "미지정"] || 0) + amt;
    });
    lines.push(`\n## ${month.label} 매출: ${sales.length}건, ${fmtMoney(totalAmt)}`);
    lines.push(`담당별: ${Object.entries(tmMap).map(([k, v]) => `${k}(${fmtMoney(v)})`).join(" ")}`);
  } else {
    lines.push(`\n## ${month.label} 매출: 데이터 없음`);
  }

  // ── 5. PR패키지 현황 (항상 요약) ──
  const { data: cs } = await supabase.from("content_statuses").select("contact_id,photo_received,info_received,tf2_delivered,pr_completed,production_impossible").limit(100);
  if (cs && cs.length > 0) {
    lines.push(`\n## PR패키지 현황: 총 ${cs.length}명 | 사진:${cs.filter((x:any)=>x.photo_received).length} 정보:${cs.filter((x:any)=>x.info_received).length} TF2:${cs.filter((x:any)=>x.tf2_delivered).length} PR완료:${cs.filter((x:any)=>x.pr_completed).length} 제작불가:${cs.filter((x:any)=>x.production_impossible).length}`);
  }

  // ── 6. 활동량 (항상 요약) ──
  const { data: acts } = await supabase.from("daily_activities")
    .select("*").gte("activity_date", month.start).lte("activity_date", month.end);
  if (acts && acts.length > 0) {
    lines.push(`\n## ${month.label} 활동량`);
    const byUser: Record<string, { sales: number; cust: number; cold: number; days: number }> = {};
    acts.forEach((a: any) => {
      if (!byUser[a.user_name]) byUser[a.user_name] = { sales: 0, cust: 0, cold: 0, days: 0 };
      byUser[a.user_name].sales += a.sales_tm || 0;
      byUser[a.user_name].cust += a.customer_tm || 0;
      byUser[a.user_name].cold += a.cold_talk || 0;
      byUser[a.user_name].days++;
    });
    Object.entries(byUser).forEach(([name, v]) => lines.push(`- ${name}: 영업TM ${v.sales}건 고객관리 ${v.cust}건 콜드톡 ${v.cold}건 (${v.days}일)`));
  }

  // ═══ 이름 매칭 시 상세 포함 ═══
  const nameMatches = c.filter((x: any) => x.name && x.name.length >= 2 && (q.includes(x.name) || q.includes(x.name.substring(0, 2))));
  if (nameMatches.length > 0 && nameMatches.length <= 10) {
    lines.push("\n## 이름 매칭 고객 상세");
    nameMatches.forEach((x: any) => {
      lines.push(`- ${x.name}(${x.title||"-"}) 담당:${x.assigned_to||"-"} 컨설턴트:${x.consultant||"-"} 미팅결과:${x.meeting_result||"-"} 미팅일:${x.meeting_date||"-"} 넘버링:${x.bunyanghoe_number||"-"} 계약일:${x.contract_date||"-"} 현장:${x.operating_site||"-"} 전체조직:${x.total_org_count||"-"} 팀조직:${x.team_org_count||"-"} RT:${x.rt||"-"} 연락처:${x.phone||"-"}`);
    });
    // 고객정보히스토리
    for (const nm of nameMatches.slice(0, 3)) {
      const { data: analysis } = await supabase.from("customer_analysis").select("*").eq("contact_id", nm.id).order("created_at", { ascending: false }).limit(2);
      if (analysis && analysis.length > 0) {
        lines.push(`\n## ${nm.name} 고객정보히스토리`);
        analysis.forEach((a: any) => lines.push(`- ${a.created_at?.split("T")[0]} 지역:${a.region||"-"} 인구:${a.population||"-"} 컨디션:${a.site_condition||"-"} 계약조건:${a.contract_terms||"-"} 분양률:${a.sales_rate||"-"} 대행사:${a.agency_info||"-"} 조직도:${a.org_chart||"-"} 조직수:${a.org_count||"-"} RT:${a.rt||"-"} 광고:${a.ad_cost_type||"-"} 총비용:${a.ad_total_cost||"-"} 품목:${a.ad_items||"-"}`));
      }
      // 활동노트
      const { data: notes } = await supabase.from("contact_notes").select("note_date,content,author").eq("contact_id", nm.id).order("note_date", { ascending: false }).limit(5);
      if (notes && notes.length > 0) {
        lines.push(`\n## ${nm.name} 활동노트`);
        notes.forEach((n: any) => lines.push(`- ${n.note_date} ${n.author||"-"}: ${(n.content||"").substring(0,100)}`));
      }
      // 타임라인
      const { data: timeline } = await supabase.from("member_timeline").select("event_type,event_title,event_date").eq("contact_id", nm.id).order("event_date", { ascending: false }).limit(5);
      if (timeline && timeline.length > 0) {
        lines.push(`\n## ${nm.name} 타임라인`);
        timeline.forEach((t: any) => lines.push(`- ${t.event_date} [${t.event_type}] ${t.event_title}`));
      }
    }
  }

  // ═══ 키워드별 상세 확장 ═══

  // KPI
  if (q.includes("kpi") || q.includes("목표") || q.includes("설정") || q.includes("성과")) {
    const { data: kpi } = await supabase.from("kpi_settings").select("*").order("created_at", { ascending: false }).limit(20);
    if (kpi && kpi.length > 0) {
      lines.push(`\n## KPI 설정 상세`);
      kpi.forEach((k: any) => lines.push(`- ${k.member_name||"-"}: 목표매출 ${fmtMoney(k.target_revenue||0)} 목표건수 ${k.target_count||0}건 기간:${k.period||"-"}`));
    } else {
      lines.push(`\n## KPI 설정: 데이터 없음 (KPI 설정 메뉴에서 등록 필요)`);
    }
  }

  // 매출 상세
  if (sales && sales.length > 0 && (q.includes("매출") || q.includes("실적") || q.includes("광고") || q.includes("집계") || q.includes("채널"))) {
    lines.push(`\n## 매출 상세 (최근 30건)`);
    sales.slice(0, 30).forEach((s: any) => {
      const amt = s.vat_amount && s.vat_amount !== s.execution_amount ? s.vat_amount : (s.execution_amount || 0);
      lines.push(`- ${s.payment_date} ${s.member_name||"-"}(${s.bunyanghoe_number||"-"}) ${s.channel} ${fmtMoney(amt)} 담당:${s.team_member||"-"}`);
    });
  }

  // 리워드
  if (q.includes("리워드") || q.includes("마일리지") || q.includes("포인트")) {
    const { data: rewards } = await supabase.from("rewards").select("*").order("created_at", { ascending: false }).limit(20);
    if (rewards && rewards.length > 0) {
      lines.push(`\n## 리워드 상세`);
      rewards.forEach((r: any) => lines.push(`- ${r.member_name||"-"} ${r.reward_type||"-"} ${fmtMoney(r.amount||0)} ${r.status||"-"} ${r.created_at?.split("T")[0]||"-"}`));
    }
  }

  // 매전방
  if (q.includes("매전") || q.includes("영업") || q.includes("파이프") || q.includes("매출예정") || q.includes("노션")) {
    const { data: ns } = await supabase.from("notion_sales").select("consultant,month,week,sales_target,customer_name,amount,probability,deposit_status").limit(100);
    if (ns && ns.length > 0) {
      lines.push(`\n## 영업부 매전방`);
      const byC: Record<string, { count: number; total: number }> = {};
      ns.forEach((r: any) => { const n = r.consultant||"-"; if (!byC[n]) byC[n]={count:0,total:0}; byC[n].count++; byC[n].total+=Number(r.amount)||0; });
      Object.entries(byC).forEach(([k, v]) => lines.push(`- ${k}: ${v.count}건 ${fmtMoney(v.total)}`));
    }
  }

  // 업무전달
  if (q.includes("업무") || q.includes("요청") || q.includes("전달") || q.includes("태스크")) {
    const { data: tasks } = await supabase.from("tasks").select("requester,assignee,category,content,status,created_at").order("created_at", { ascending: false }).limit(10);
    if (tasks && tasks.length > 0) {
      lines.push(`\n## 최근 업무전달`);
      tasks.forEach((t: any) => lines.push(`- ${t.created_at?.split("T")[0]} ${t.requester}→${t.assignee} [${t.category}] ${t.status} ${(t.content||"").substring(0,80)}`));
    }
  }

  // 완판트럭 상세
  if (q.includes("완판") || q.includes("트럭") || q.includes("출동")) {
    const { data: trucks } = await supabase.from("wanpan_trucks").select("dispatch_date,site_name,location,agency,team_size,staff_members,consultant_members").order("dispatch_date", { ascending: false }).limit(10);
    if (trucks && trucks.length > 0) {
      lines.push(`\n## 완판트럭 상세`);
      trucks.forEach((t: any) => lines.push(`- ${fmtDate(t.dispatch_date)} ${t.site_name||"-"} ${t.location||"-"} ${t.agency||"-"} ${t.team_size||"-"}명`));
    }
  }

  // 인센티브
  if (q.includes("인센티브") || q.includes("성과급") || q.includes("보너스") || q.includes("특전")) {
    const { data: incentiveSales } = await supabase.from("ad_executions")
      .select("member_name,execution_amount,bunyanghoe_number,payment_date")
      .gte("payment_date", month.start).lte("payment_date", month.end).eq("contract_route", "분양회");
    if (incentiveSales && incentiveSales.length > 0) {
      const byM: Record<string, number> = {};
      incentiveSales.forEach((s: any) => { byM[s.member_name||"-"] = (byM[s.member_name||"-"]||0) + (s.execution_amount||0); });
      lines.push(`\n## ${month.label} 인센티브 기준 특전매출`);
      Object.entries(byM).forEach(([k, v]) => lines.push(`- ${k}: ${fmtMoney(v)}`));
    }
  }

  // 메모
  if (q.includes("메모") || q.includes("기록")) {
    const { data: memos } = await supabase.from("memos").select("title,content,memo_type,created_by,created_at").order("created_at", { ascending: false }).limit(5);
    if (memos && memos.length > 0) {
      lines.push(`\n## 최근 메모`);
      memos.forEach((m: any) => lines.push(`- ${m.created_at?.split("T")[0]} [${m.memo_type}] ${m.title} ${m.created_by||"-"}`));
    }
  }

  // 뉴스
  if (q.includes("뉴스") || q.includes("브리핑") || q.includes("시장")) {
    const { data: news } = await supabase.from("news_curation").select("title,weekly_briefing,published_at").order("published_at", { ascending: false }).limit(1);
    if (news && news.length > 0) {
      lines.push(`\n## 최근 뉴스: ${news[0].title} (${news[0].published_at?.split("T")[0]})`);
      lines.push(news[0].weekly_briefing||"");
    }
  }

  // 이번달 전체 일정
  if (q.includes("이번달") || q.includes("캘린더") || q.includes("전체일정")) {
    const { data: mEvents } = await supabase.from("calendar_events").select("date,event_type,title,author").gte("date", month.start).lte("date", month.end).order("date");
    if (mEvents && mEvents.length > 0) {
      lines.push(`\n## ${month.label} 전체 일정`);
      mEvents.forEach((e: any) => lines.push(`- ${fmtDate(e.date)} [${e.event_type}] ${e.title||""} ${e.author||"-"}`));
    }
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    if (!message) return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
    if (!API_KEY) return NextResponse.json({ error: "AI API 키가 설정되지 않았습니다." }, { status: 500 });

    const crmData = await buildContext(message);
    const today = new Date();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${dayNames[today.getDay()]}요일)`;

    const systemPrompt = `You are "분양의신 AI", a CRM assistant for 광고인㈜ 대외협력팀.
You MUST answer in Korean only. Be accurate, specific, and helpful.

IMPORTANT RULES:
1. Answer ONLY based on the CRM data provided below. Do NOT make up data.
2. If the data doesn't contain the answer, say "해당 데이터가 CRM에 등록되어 있지 않습니다. [관련 메뉴]에서 확인해주세요." and suggest which CRM menu to check.
3. Format money as "5,500,000원" (with commas).
4. Format dates as "4월 23일(수)" style.
5. Use bullet points and clean formatting.
6. Be concise but complete.

AVAILABLE DATA (what you can answer about):
- 고객DB: 전체 고객 목록, 담당자, 컨설턴트, 미팅결과, 가망유형, 연락처, 현장정보
- 일정: 캘린더, 완판트럭, 미팅 (이번주/이번달)
- 매출: 광고집행 내역, 채널별/담당자별 매출, 분양회 특전매출
- KPI: 개인별 KPI 목표 설정값 (키워드: kpi, 목표, 설정)
- 활동량: 영업TM, 고객관리TM, 콜드톡 일별/월별 누적 (키워드: 활동, TM, 콜드톡)
- 리워드: 마일리지 적립/사용 내역 (키워드: 리워드, 마일리지)
- PR패키지: 사진수취, 정보수취, TF2전달, PR완료 진행현황 (키워드: PR, 패키지, 컨텐츠)
- 고객정보히스토리: 현장분석, 조직분석, 광고분석 (고객 이름으로 검색)
- 활동노트: 고객별 상담기록, 메모 (키워드: 노트, 메모)
- 매전방: 영업부 매출예정 파이프라인 (키워드: 매전, 영업)
- 입회자: 분양회 VIP 회원 목록 (키워드: 입회, 분양회, 회원)
- 업무전달: 요청/할당 업무 목록 (키워드: 업무, 요청)
- 완판트럭: 출동 일정/이력 (키워드: 완판, 트럭)
- 인센티브: 분양회 특전매출 기반 인센티브 (키워드: 인센티브)
- 메모장: 개인 메모 (키워드: 메모)
- 타임라인: 회원별 이벤트 이력 (키워드: 타임라인)
- 뉴스: 부동산 뉴스 큐레이션 (키워드: 뉴스, 브리핑)

TODAY: ${todayStr}

TEAM MEMBERS:
- 관리자: 김정후 본부장, 김창완 팀장, 최웅 파트장
- 실행파트(대외협력팀): 조계현 메인, 이세호 어쏘, 기여운 어쏘, 최연전 CX
- 운영파트: 김재영 어시, 최은정 어시

NICKNAME MAPPING:
- 계현, 조메인 → 조계현 | 세호 → 이세호 | 여운 → 기여운 | 연전 → 최연전 | 재영 → 김재영 | 은정 → 최은정

CRM DATA:
${crmData}`;

    const chatMessages: { role: string; content: string }[] = [];
    if (history && Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        chatMessages.push({ role: h.role, content: h.content });
      }
    }
    chatMessages.push({ role: "user", content: message });

    // DeepSeek API 호출
    const result = await callAI(systemPrompt, chatMessages);

    if (!result.reply) {
      return NextResponse.json({ error: `AI 응답 실패: ${result.error}` }, { status: 500 });
    }

    return NextResponse.json({ reply: result.reply });
  } catch (err: any) {
    console.error("AI Chat error:", err);
    return NextResponse.json({ error: err.message || "서버 오류" }, { status: 500 });
  }
}
