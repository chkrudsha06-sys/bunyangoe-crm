import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "분양회 CRM | 광고인㈜ 대외협력팀";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", width: "100%", height: 4, background: "linear-gradient(90deg, #D4A843, #F5D78E)" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 64, display: "flex" }}>🏆</div>
            <div style={{ fontSize: 72, fontWeight: 800, color: "#D4A843", letterSpacing: -2 }}>분양회 CRM</div>
          </div>
          <div style={{ fontSize: 32, color: "#94A3B8", fontWeight: 500 }}>광고인㈜ 대외협력팀</div>
          <div style={{ fontSize: 22, color: "#475569", marginTop: 16 }}>VIP 멤버십 영업관리 시스템</div>
          <div style={{ display: "flex", marginTop: 24, padding: "12px 32px", borderRadius: 50, background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#D4A843" }}>bunyangoe-crm.vercel.app</span>
          </div>
        </div>
        <div style={{ display: "flex", width: "100%", height: 4, background: "linear-gradient(90deg, #D4A843, #F5D78E)" }} />
      </div>
    ),
    { ...size }
  );
}
