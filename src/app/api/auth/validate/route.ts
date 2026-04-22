import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, sessionToken } = await req.json();
    if (!userId || !sessionToken) {
      return NextResponse.json({ valid: false });
    }

    const { data } = await supabase
      .from("sessions")
      .select("session_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ valid: false });
    }

    // 토큰 불일치 (다른 기기 로그인)
    if (data.session_token !== sessionToken) {
      return NextResponse.json({ valid: false, reason: "다른 기기에서 로그인되었습니다." });
    }

    // 만료 체크
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: "세션이 만료되었습니다. 다시 로그인해주세요." });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
