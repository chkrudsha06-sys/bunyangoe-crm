"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginAdmin, loginMember, getCurrentUser, TEAM_MEMBERS, TEAM_MEMBER_ROLES } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [count, setCount] = useState(0);
  const [countDone, setCountDone] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.push("/");
  }, [router]);

  // 카운팅 애니메이션 (0 → 100, 3.5초)
  useEffect(() => {
    let current = 0;
    const total = 100;
    const duration = 3500;
    // easing: 처음엔 빠르게, 끝엔 천천히
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(eased * total);
      setCount(next);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setCount(total);
        setCountDone(true);
      }
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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

  const countColor =
    count >= 100 ? "#60A5FA" :
    count >= 70 ? "#818CF8" :
    count >= 40 ? "#6366F1" : "#3B82F6";

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: "'Apple SD Gothic Neo','Pretendard','Noto Sans KR',sans-serif", background: "#050A18" }}>

      {/* ── YouTube 영상 배경 ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <iframe
          src="https://www.youtube.com/embed/ysz5S6PUM-U?autoplay=1&mute=1&loop=1&playlist=ysz5S6PUM-U&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1"
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100vw", height: "56.25vw",
            minHeight: "100vh", minWidth: "177.78vh",
            border: "none", pointerEvents: "none",
          }}
          allow="autoplay; encrypted-media"
        />
        {/* 다크 오버레이 - 분양의신 톤 (진한 네이비) */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, rgba(4,8,20,0.88) 0%, rgba(5,12,30,0.75) 40%, rgba(4,8,20,0.85) 100%)",
        }} />
        {/* 블루 글로우 */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            radial-gradient(ellipse at 15% 60%, rgba(37,99,235,0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 30%, rgba(99,102,241,0.08) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 90%, rgba(30,58,138,0.1) 0%, transparent 50%)
          `,
        }} />
      </div>

      {/* ── 메인 랜딩 화면 ── */}
      <div style={{
        position: "relative", zIndex: 10,
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 20px",
        opacity: showLogin ? 0 : 1,
        transform: showLogin ? "translateY(-24px) scale(0.98)" : "translateY(0) scale(1)",
        transition: "opacity 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: showLogin ? "none" : "auto",
      }}>

        {/* 상단 로고 + 브랜드 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          {/* 로고 이미지 */}
          <div style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: "12px 28px",
            marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
          }}>
            <Image
              src="/company-logo.png"
              alt="분양의신"
              width={140}
              height={36}
              style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#3B82F6",
              boxShadow: "0 0 8px #3B82F6",
              animation: "pulse 2s ease-in-out infinite",
            }} />
            <span style={{
              fontSize: 11, fontWeight: 700, color: "rgba(96,165,250,0.8)",
              letterSpacing: "0.25em", textTransform: "uppercase",
            }}>
              FIRST MOVER · 분양의신 퍼스트무버
            </span>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#3B82F6",
              boxShadow: "0 0 8px #3B82F6",
            }} />
          </div>
        </div>

        {/* 메인 헤드라인 */}
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <h1 style={{
            fontSize: "clamp(46px, 7vw, 96px)",
            fontWeight: 900,
            color: "white",
            lineHeight: 1.08,
            margin: "0 0 16px 0",
            letterSpacing: "-0.025em",
          }}>
            <span style={{
              background: "linear-gradient(90deg, #FFFFFF 0%, #93C5FD 40%, #818CF8 80%, #FFFFFF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>첫 시작,{" "}</span>
            <br />
            <span style={{
              background: "linear-gradient(90deg, #3B82F6 0%, #6366F1 50%, #3B82F6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>VIP멤버십 분양회</span>
          </h1>

          <h2 style={{
            fontSize: "clamp(18px, 2.4vw, 30px)",
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            margin: "0 0 20px 0",
            letterSpacing: "0.02em",
          }}>
            고객통합관리 시스템
          </h2>

          {/* 서브 카피 */}
          <p style={{
            fontSize: "clamp(13px, 1.3vw, 16px)",
            color: "rgba(255,255,255,0.38)",
            lineHeight: 1.9,
            margin: "0 auto",
            maxWidth: 520,
          }}>
