"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, loginMember, getCurrentUser, TEAM_MEMBERS, TEAM_MEMBER_ROLES } from "@/lib/auth";

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=90",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1920&q=90",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1920&q=90",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1920&q=90",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&q=90",
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
  const [focusId, setFocusId] = useState(false);
  const [focusPw, setFocusPw] = useState(false);

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
      }, 900);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleAdminLogin = async () => {
    if (!adminId || !adminPw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const user = loginAdmin(adminId, adminPw);
    if (user) { router.push("/"); }
    else { setError("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); }
  };

  const handleMemberLogin = (name: string) => {
    loginMember(name);
    router.push("/");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "stretch",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', sans-serif",
    }}>

      {/* ── 배경 이미지 ── */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${BG_IMAGES[currentBg]})`,
        backgroundSize: "cover", backgroundPosition: "center 30%",
        opacity: fade ? 1 : 0,
        transition: "opacity 0.9s ease-in-out",
        filter: "brightness(0.82)",
      }} />

      {/* 왼쪽 진한 그라디언트 */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(105deg, rgba(7,14,30,0.88) 0%, rgba(7,14,30,0.65) 45%, rgba(7,14,30,0.15) 70%, transparent 100%)",
      }} />
      {/* 오른쪽 어두운 패널 */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 440,
        background: "rgba(7,14,30,0.72)",
        backdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }} />

      {/* ── 왼쪽 브랜드 카피 ── */}
      <div style={{
        position: "relative", zIndex: 10,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 6vw 0 8vw",
        maxWidth: "calc(100% - 440px)",
      }}>

        {/* 상단 배지 */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          marginBottom: 36,
          width: "fit-content",
        }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #1E3A8A, #C9A84C)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: 16, fontWeight: 900 }}>분</span>
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.08em",
          }}>광고인㈜ · 분양의신 CRM</span>
        </div>

        {/* 메인 헤드라인 */}
        <h1 style={{
          fontSize: "clamp(44px, 5.5vw, 72px)",
          fontWeight: 900,
          lineHeight: 1.12,
          color: "white",
          margin: "0 0 24px 0",
          letterSpacing: "-0.02em",
          textShadow: "0 4px 40px rgba(0,0,0,0.4)",
        }}>
          고객 한 명이<br />
          <span style={{
            background: "linear-gradient(90deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>매출을 만든다</span>
        </h1>

        {/* 서브 카피 */}
        <p style={{
          fontSize: "clamp(16px, 1.6vw, 20px)",
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.75,
          margin: "0 0 48px 0",
          fontWeight: 400,
          maxWidth: 460,
        }}>
          분양회 VIP 고객관리의 새로운 기준.<br />
          TM부터 계약까지, 모든 관계를<br />
          하나의 플랫폼에서 관리하세요.
        </p>

        {/* 통계 배지 3개 */}
        <div style={{ display: "flex", gap: 16, marginBottom: 48 }}>
          {[
            { num: "11,964", label: "고객 DB" },
            { num: "100인", label: "VIP 목표" },
            { num: "4팀", label: "대협팀 운영" },
          ].map(({ num, label }) => (
            <div key={label} style={{
              padding: "14px 20px",
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(10px)",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              textAlign: "center" as const,
            }}>
              <p style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 800, color: "#C9A84C", margin: 0, lineHeight: 1.2 }}>{num}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "4px 0 0 0" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* 슬라이드 인디케이터 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {BG_IMAGES.map((_, i) => (
            <button key={i} onClick={() => { setFade(false); setTimeout(() => { setCurrentBg(i); setFade(true); }, 300); }} style={{
              width: i === currentBg ? 28 : 8, height: 8,
              borderRadius: i === currentBg ? 4 : "50%",
              background: i === currentBg ? "#C9A84C" : "rgba(255,255,255,0.25)",
              border: "none", cursor: "pointer", padding: 0,
              transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
            }} />
          ))}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>
            {currentBg + 1} / {BG_IMAGES.length}
          </span>
        </div>
      </div>

      {/* ── 오른쪽 로그인 카드 ── */}
      <div style={{
        position: "relative", zIndex: 10,
        width: 440, flexShrink: 0,
        display: "flex", flexDirection: "column",
        justifyContent: "center",
        padding: "48px 44px",
      }}>

        {/* 카드 상단 */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "white", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
            시작하기
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
            관리자 또는 담당자로 접속하세요
          </p>
        </div>

        {/* 관리자 섹션 */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18,
          padding: "24px 22px",
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#C9A84C", letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 16px 0" }}>
            ▪ 관리자 로그인
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* 아이디 */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>아이디</label>
              <input
                type="text" value={adminId}
                onChange={(e) => { setAdminId(e.target.value); setError(""); }}
                onFocus={() => setFocusId(true)} onBlur={() => setFocusId(false)}
                placeholder="관리자 아이디 입력"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: focusId ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                  border: focusId ? "1.5px solid rgba(201,168,76,0.6)" : "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, fontSize: 13, color: "white",
                  outline: "none", boxSizing: "border-box" as const,
                  transition: "all 0.2s",
                }}
              />
            </div>
            {/* 비밀번호 */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>비밀번호</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} value={adminPw}
                  onChange={(e) => { setAdminPw(e.target.value); setError(""); }}
                  onFocus={() => setFocusPw(true)} onBlur={() => setFocusPw(false)}
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  style={{
                    width: "100%", padding: "12px 50px 12px 14px",
                    background: focusPw ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                    border: focusPw ? "1.5px solid rgba(201,168,76,0.6)" : "1.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 12, fontSize: 13, color: "white",
                    outline: "none", boxSizing: "border-box" as const,
                    transition: "all 0.2s",
                  }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 10, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer",
                }}>{showPw ? "숨기기" : "보기"}</button>
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 11, color: "#FCA5A5", padding: "8px 12px", background: "rgba(239,68,68,0.15)", borderRadius: 9, border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </div>
            )}

            <button onClick={handleAdminLogin} disabled={loading} style={{
              width: "100%", padding: "13px",
              background: loading ? "rgba(201,168,76,0.5)" : "linear-gradient(135deg, #B8860B 0%, #C9A84C 50%, #E8C97A 100%)",
              color: "#0B1629", fontSize: 13, fontWeight: 800,
              border: "none", borderRadius: 12, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 20px rgba(201,168,76,0.35)",
              letterSpacing: "0.02em",
              transition: "all 0.2s",
            }}>
              {loading ? "로그인 중..." : "관리자로 로그인"}
            </button>
          </div>

          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center" as const, margin: "12px 0 0 0" }}>
            김정후 본부장 · 김창완 팀장 · 최웅 파트장
          </p>
        </div>

        {/* 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>또는</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* 담당자 섹션 */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: "0 0 12px 0" }}>
            ▪ 담당자 바로 접속
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {TEAM_MEMBERS.map((name) => (
              <button key={name} onClick={() => handleMemberLogin(name)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 13, cursor: "pointer",
                textAlign: "left" as const,
                transition: "all 0.2s",
              }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(201,168,76,0.3)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(255,255,255,0.09)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                <div style={{
                  width: 32, height: 32,
                  background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #C9A84C 100%)",
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 13, fontWeight: 800, flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(30,58,138,0.4)",
                }}>
                  {name[0]}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3 }}>{name}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>{TEAM_MEMBER_ROLES[name]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 하단 */}
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" as const, margin: "28px 0 0 0" }}>
          © 2026 광고인㈜ · 분양의신 · All rights reserved.
        </p>
      </div>
    </div>
  );
}
