"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, loginMember, getCurrentUser, TEAM_MEMBERS, TEAM_MEMBER_ROLES } from "@/lib/auth";

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=85",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1920&q=85",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1920&q=85",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1920&q=85",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&q=85",
];

export default function LoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.push("/");
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentBg((prev) => (prev + 1) % BG_IMAGES.length);
        setFade(true);
      }, 800);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleAdminLogin = async () => {
    if (!adminId || !adminPw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const user = loginAdmin(adminId, adminPw);
    if (user) { router.push("/"); }
    else { setError("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); }
  };

  const handleMemberLogin = (name: string) => {
    loginMember(name);
    router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "flex-end", position: "relative", overflow: "hidden", fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif", paddingRight: "6vw" }}>
      
      {/* 배경 이미지 */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${BG_IMAGES[currentBg]})`,
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: fade ? 1 : 0,
        transition: "opacity 0.8s ease-in-out",
      }} />

      {/* 오버레이 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)"
      }} />

      {/* 왼쪽 브랜드 */}
      <div style={{ position: "absolute", left: "8vw", top: "50%", transform: "translateY(-50%)", zIndex: 10, color: "white" }}>
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: "#C9A84C", border: "1px solid rgba(201,168,76,0.5)", padding: "4px 14px", borderRadius: 20, marginBottom: 20, letterSpacing: "0.05em", background: "rgba(201,168,76,0.08)", backdropFilter: "blur(4px)" }}>
          광고인㈜ 대외협력팀
        </div>
        <h2 style={{ fontSize: "clamp(36px,4vw,52px)", fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px 0", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>
          분양 업계의<br />
          <span style={{ color: "#C9A84C" }}>퍼스트무버</span>
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.8, margin: "0 0 32px 0" }}>
          분양의신과 함께<br />
          VIP 100인 네트워크를 구축하세요
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {BG_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setCurrentBg(i)} style={{
              width: i === currentBg ? 24 : 8, height: 8,
              borderRadius: i === currentBg ? 4 : "50%",
              background: i === currentBg ? "#C9A84C" : "rgba(255,255,255,0.35)",
              border: "none", cursor: "pointer", padding: 0,
              transition: "all 0.3s",
            }} />
          ))}
        </div>
      </div>

      {/* 로그인 카드 */}
      <div style={{
        position: "relative", zIndex: 10,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)",
        borderRadius: 24, padding: "36px 32px",
        width: 380, flexShrink: 0,
        boxShadow: "0 30px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.3)",
      }}>
        {/* 로고 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #0B1629 0%, #1E3A8A 60%, #C9A84C 100%)", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(11,22,41,0.35)", flexShrink: 0 }}>
            <span style={{ color: "white", fontSize: 20, fontWeight: 800 }}>분</span>
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0, lineHeight: 1.2 }}>분양회 CRM</p>
            <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0 0" }}>광고인㈜ 대외협력팀</p>
          </div>
        </div>

        {/* 관리자 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.08em" }}>관리자 로그인</span>
          <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
        </div>

        {/* 관리자 폼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>아이디</label>
            <input type="text" value={adminId} onChange={(e) => { setAdminId(e.target.value); setError(""); }} placeholder="관리자 아이디"
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              style={{ width: "100%", padding: "10px 13px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, color: "#0F172A", background: "#F8FAFC", outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>비밀번호</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={adminPw} onChange={(e) => { setAdminPw(e.target.value); setError(""); }} placeholder="비밀번호"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                style={{ width: "100%", padding: "10px 50px 10px 13px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, color: "#0F172A", background: "#F8FAFC", outline: "none", boxSizing: "border-box" as const }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#64748B", background: "none", border: "none", cursor: "pointer" }}>
                {showPw ? "숨기기" : "보기"}
              </button>
            </div>
          </div>
          {error && <p style={{ fontSize: 11, color: "#EF4444", padding: "7px 10px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA", margin: 0 }}>{error}</p>}
          <button onClick={handleAdminLogin} disabled={loading} style={{ width: "100%", padding: 12, background: "linear-gradient(135deg, #0B1629 0%, #1E3A8A 100%)", color: "white", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 4px 14px rgba(30,58,138,0.4)" }}>
            {loading ? "로그인 중..." : "관리자 로그인"}
          </button>
          <p style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", margin: 0 }}>김정후 본부장 · 김창완 팀장 · 최웅 파트장</p>
        </div>

        {/* 담당자 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.08em" }}>담당자 바로 접속</span>
          <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
        </div>

        {/* 담당자 버튼 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
          {TEAM_MEMBERS.map((name) => (
            <button key={name} onClick={() => handleMemberLogin(name)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 11, background: "#F8FAFC", cursor: "pointer", textAlign: "left" as const }}>
              <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #1E3A8A, #C9A84C)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {name[0]}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", margin: 0, lineHeight: 1.3 }}>{name}</p>
                <p style={{ fontSize: 10, color: "#94A3B8", margin: 0 }}>{TEAM_MEMBER_ROLES[name]}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 푸터 */}
      <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10, fontSize: 10, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
        © 2026 광고인㈜ · 분양의신 · All rights reserved.
      </div>
    </div>
  );
}
