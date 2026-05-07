import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Google News RSS에서 부동산/분양 뉴스 수집
async function fetchNewsHeadlines(): Promise<string[]> {
  const queries = ["분양", "부동산 청약", "아파트 분양가", "부동산 시장"];
  const headlines: string[] = [];

  for (const q of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const xml = await res.text();
      // 간단한 XML 파싱 (title 태그 추출)
      const titleMatches = xml.match(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g) || [];
      for (const match of titleMatches.slice(0, 5)) {
        const title = match.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
        const cleaned = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
        if (cleaned && !headlines.includes(cleaned)) headlines.push(cleaned);
      }
    } catch (e) {
      console.error(`RSS fetch error for ${q}:`, e);
    }
  }
  return headlines.slice(0, 15);
}

// Google Gemini로 뉴스 큐레이션 생성
async function generateCuration(headlines: string[]): Promise<{ title: string; weekly_briefing: string; industry_news: string; magazine_highlight: string } | null> {
  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_KEY 환경변수가 없습니다");

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const headlineText = headlines.length > 0 
    ? headlines.map((h, i) => `${i + 1}. ${h}`).join("\n")
    : "(뉴스 헤드라인 수집 불가 - 최근 부동산/분양 시장 동향을 기반으로 작성해주세요)";

  const prompt = `당신은 분양상담사를 위한 부동산 뉴스 큐레이터입니다.
오늘 날짜: ${today}

아래 최신 뉴스 헤드라인을 기반으로 분양상담사에게 유용한 뉴스 브리핑을 작성하세요.

[최신 뉴스 헤드라인]
${headlineText}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "5월 7일 부동산 브리핑" (형식: X월 X일 부동산 브리핑),
  "weekly_briefing": "분양/부동산 핵심 뉴스 3-5개를 각각 ▸ 로 시작하는 한 줄 요약으로 작성. 분양가, 청약 경쟁률, 금리, 공급 물량, 정책 변화 중심. 각 항목은 줄바꿈으로 구분.",
  "industry_news": "부동산 시장 동향, 건설사/시행사 소식, 지역별 분양 이슈 등 2-3개를 ▸ 로 시작하여 작성. 한국부동산마케팅협회나 AI 관련 내용은 제외.",
  "magazine_highlight": "위 뉴스에서 분양상담사가 고객 상담 시 활용할 수 있는 핵심 인사이트 1줄 작성"
}

중요:
- 분양상담사가 현장에서 바로 활용할 수 있는 실질적 정보 중심
- 한국부동산마케팅협회 관련 내용 제외
- AI 관련 내용 제외
- 전일 기준 뉴스가 없으면 가장 최근 이슈로 작성`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini ${res.status}: ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패: " + content.substring(0, 100));
    return JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    console.error("Gemini error:", e);
    throw e;
  }
}

export async function GET(request: Request) {
  // Vercel Cron 인증 (선택사항)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // 수동 호출 허용 (CRON_SECRET 미설정 시)
  }

  try {
    // 오늘 이미 발행됐는지 확인
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase.from("news_curation")
      .select("id").gte("published_at", `${today}T00:00:00`).limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ message: "오늘 이미 발행됨", id: existing[0].id });
    }

    // 1. 뉴스 수집
    const headlines = await fetchNewsHeadlines();

    // 2. AI 큐레이션 생성
    const curation = await generateCuration(headlines);
    if (!curation) {
      return NextResponse.json({ error: "큐레이션 생성 실패", debug: { headlines_count: headlines.length, headlines: headlines.slice(0, 3), has_api_key: !!process.env.OPENAI_API_KEY } }, { status: 500 });
    }

    // 3. Supabase 저장
    const { data, error } = await supabase.from("news_curation").insert({
      title: curation.title,
      weekly_briefing: curation.weekly_briefing,
      industry_news: curation.industry_news,
      magazine_highlight: curation.magazine_highlight,
      published_by: "AI 큐레이터",
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, headlines_used: headlines.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack?.substring(0, 300) }, { status: 500 });
  }
}
