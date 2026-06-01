import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function toNum(v: unknown, fb = 0) { const n = Number(v); return Number.isNaN(n) ? fb : n; }

function normalize(p: any) {
  return {
    name: p.name ?? null,
    phone: p.phone ?? null,
    position: p.position ?? null,
    company_name: p.company_name ?? p.companyName ?? null,
    region: p.region ?? null,
    memo: p.memo ?? null,
    field_count: toNum(p.field_count ?? p.fieldCount),
    product_type: p.product_type ?? p.productType ?? null,
    setup_people: toNum(p.setup_people ?? p.setupPeople),
    moving_members: toNum(p.moving_members ?? p.movingMembers),
    company_scale: p.company_scale ?? p.companyScale ?? null,
    pr_platform: p.pr_platform ?? p.prPlatform ?? null,
    networking: p.networking ?? null,
    monthly_ad_budget: toNum(p.monthly_ad_budget ?? p.monthlyAdBudget),
    ad_support: p.ad_support ?? p.adSupport ?? null,
    field_score: toNum(p.field_score ?? p.fieldScore),
    organization_score: toNum(p.organization_score ?? p.organizationScore),
    branding_score: toNum(p.branding_score ?? p.brandingScore),
    ad_score: toNum(p.ad_score ?? p.adScore),
    total_score: toNum(p.total_score ?? p.totalScore),
    grade: p.grade ?? null,
    admission: p.admission ?? null,
    action_text: p.action_text ?? p.actionText ?? p.action ?? null,
    source: "member_review_app",
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = normalize(payload);
    if (!data.name && !data.phone) {
      return NextResponse.json({ ok: false, message: "고객명 또는 연락처가 필요합니다." }, { status: 400, headers: CORS });
    }
    const sb = getSupabase();
    const { data: row, error } = await sb.from("member_reviews").insert(data).select("*").single();
    if (error) return NextResponse.json({ ok: false, message: "저장 실패", error: error.message }, { status: 500, headers: CORS });
    return NextResponse.json({ ok: true, message: "심사 결과가 저장되었습니다.", data: row }, { status: 201, headers: CORS });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "서버 오류", error: e.message }, { status: 500, headers: CORS });
  }
}

export async function GET() {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from("member_reviews").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ ok: false, message: "조회 실패", error: error.message }, { status: 500, headers: CORS });
    return NextResponse.json({ ok: true, data }, { headers: CORS });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: "서버 오류", error: e.message }, { status: 500, headers: CORS });
  }
}
