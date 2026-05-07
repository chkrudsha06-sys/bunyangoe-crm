import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// GET: 최신 뉴스 조회
export async function GET() {
  const { data } = await supabase.from("news_curation")
    .select("*").order("published_at", { ascending: false }).limit(5);
  return NextResponse.json({ data: data || [] });
}

// POST: 뉴스 발행
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, weekly_briefing, industry_news, magazine_highlight, published_by } = body;
    if (!title) return NextResponse.json({ error: "제목이 필요합니다" }, { status: 400 });

    const { data, error } = await supabase.from("news_curation").insert({
      title, weekly_briefing: weekly_briefing || "", industry_news: industry_news || "",
      magazine_highlight: magazine_highlight || "", published_by: published_by || "AI",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
