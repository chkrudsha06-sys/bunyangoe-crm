import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "분양회 VIP멤버십 대시보드";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { code: string } }) {
  let name = "";
  let title = "";

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
    const { data } = await supabase.from("contacts")
      .select("name,title")
      .eq("bunyanghoe_number", params.code)
      .single();
    if (data) { name = data.name || ""; title = data.title || ""; }
  } catch {}

  return new ImageResponse(
    (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        width: "100%", height: "100%",
        background: "linear-gradient(160deg, #0a0a0a 0%, #1a1205 50%, #0a0a0a 100%)",
        fontFamily: "sans-serif",
      }}>
        {/* 상단 골드 라인 */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, #D4A843, #F5D78E, #D4A843, transparent)" }} />

        {/* 메인 콘텐츠 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {/* 상위 1% 100人 */}
          <div style={{ fontSize: 28, fontWeight: 400, color: "#B8963E", letterSpacing: 6 }}>
            상위 1% 100人
          </div>

          {/* 분양회 */}
          <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: -2, background: "linear-gradient(180deg, #F5D78E 0%, #D4A843 40%, #B8963E 100%)", backgroundClip: "text", color: "#D4A843" }}>
            분양회
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ display: "flex", width: 200, height: 1, background: "linear-gradient(90deg, transparent, #D4A84388, transparent)", marginTop: 32, marginBottom: 32 }} />

        {/* 고객명 직급 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, color: "#C4A55A", fontWeight: 600 }}>
          <span>분양회</span>
          <span style={{ color: "#555" }}>|</span>
          <span>{name} {title}</span>
          <span style={{ color: "#555" }}>|</span>
        </div>

        {/* VIP 멤버십 */}
        <div style={{ display: "flex", marginTop: 16, fontSize: 18, color: "#666", fontWeight: 400, letterSpacing: 3 }}>
          분양회 VIP멤버십 대시보드
        </div>

        {/* 하단 골드 라인 */}
        <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, #D4A843, #F5D78E, #D4A843, transparent)" }} />
      </div>
    ),
    { ...size }
  );
}
