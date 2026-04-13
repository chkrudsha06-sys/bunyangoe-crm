"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, loginMember, getCurrentUser, TEAM_MEMBERS, TEAM_MEMBER_ROLES } from "@/lib/auth";

// 무료 비즈니스 미팅 영상 (Mixkit CDN - 저작권 무료)
const VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-business-team-having-a-meeting-in-the-office-4807-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-people-having-a-meeting-in-a-conference-room-4805-large.mp4",
];

export default function LoginPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [count, setCount] = useState(0);
  const [countDone, setCountDone] = useState(false);
  const [videoIdx, setVideoIdx] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.push("/");
  }, [router]);

  // 영상 자동 재생
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.src = VIDEOS[videoIdx];
    v.muted = true;
    v.load();
    const playVideo = () => {
      v.play().catch(() => setVideoLoaded(false));
      setVideoLoaded(true);
    };
    v.addEventListener("canplay", playVideo, { once: true });
    // 영상 끝나면 다음 영상으로
    const onEnd = () => {
      setVideoIdx((p) => (p + 1) % VIDEOS.length);
    };
    v.addEventListener("ended", onEnd);
    return () => {
      v.removeEventListener("canplay", playVideo);
      v.removeEventListener("ended", onEnd);
    };
  }, [videoIdx]);

  // 카운팅 애니메이션
  useEffect(() => {
    const duration = 3500;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * 100));
      if (progress < 1) requestAnimationFrame(tick);
      else { setCount(100); setCountDone(true); }
    };
    requestAnimationFrame(tick);
  }, []);

  const handleAdminLogin = async () => {
    if (!adminId || !adminPw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const user = loginAdmin(adminId, adminPw);
    if (user) { router.push("/"); }
    else { setError("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); }
  };

  const handleMemberLogin = (name: string) => { loginMember(name); router.push("/"); };

  const countColor = count >= 100 ? "#60A5FA" : count >= 70 ? "#818CF8" : count >= 40 ? "#6366F1" : "#3B82F6";

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: "'Apple SD Gothic Neo','Pretendard','Noto Sans KR',sans-serif", background: "#050A18" }}>

      {/* ── HTML5 영상 배경 ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          loop={VIDEOS.length === 1}
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            minWidth: "100vw", minHeight: "100vh",
            width: "auto", height: "auto",
            objectFit: "cover",
            filter: "brightness(0.7) saturate(1.15)",
          }}
        />
        {/* 다크 오버레이 */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg,rgba(4,8,22,0.8) 0%,rgba(5,12,32,0.55) 50%,rgba(4,8,22,0.75) 100%)",
        }} />
        {/* 블루 글로우 효과 */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(ellipse at 20% 60%,rgba(37,99,235,0.14) 0%,transparent 55%),radial-gradient(ellipse at 80% 25%,rgba(99,102,241,0.09) 0%,transparent 45%)",
        }} />
      </div>

      {/* ── 메인 랜딩 ── */}
      <div style={{
        position: "relative", zIndex: 10,
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 20px",
        opacity: showLogin ? 0 : 1,
        transform: showLogin ? "translateY(-20px) scale(0.98)" : "translateY(0) scale(1)",
        transition: "opacity 0.5s, transform 0.5s",
        pointerEvents: showLogin ? "none" : "auto",
      }}>

        {/* 로고 */}
        <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            background: "rgba(255,255,255,0.06)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20,
            padding: "14px 32px", marginBottom: 14,
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "white", letterSpacing: "-0.03em" }}>
              분양의신
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#3B82F6", boxShadow: "0 0 12px #3B82F6", marginLeft: 4, verticalAlign: "super", fontSize: 8 }} />
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#60A5FA", boxShadow: "0 0 8px #60A5FA" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(147,197,253,0.85)", letterSpacing: "0.22em", textTransform: "uppercase" as const }}>
              FIRST MOVER · 분양의신 퍼스트무버
            </span>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#60A5FA", boxShadow: "0 0 8px #60A5FA" }} />
          </div>
        </div>

        {/* 헤드라인 */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: "clamp(48px,7.5vw,100px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 14px 0", letterSpacing: "-0.025em" }}>
            <span style={{ color: "#FFFFFF", textShadow: "0 2px 40px rgba(255,255,255,0.12)" }}>첫 시작,{" "}</span>
            <br />
            <span style={{ background: "linear-gradient(90deg,#60A5FA 0%,#A78BFA 50%,#60A5FA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              VIP멤버십 분양회
            </span>
          </h1>
          <h2 style={{ fontSize: "clamp(20px,2.6vw,32px)", fontWeight: 600, color: "rgba(255,255,255,0.75)", margin: 0, letterSpacing: "0.04em" }}>
            고객통합관리 시스템
          </h2>
        </div>

        {/* VIP 카운터 */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          marginBottom: 48, padding: "28px 52px",
          background: "rgba(10,18,45,0.72)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(96,165,250,0.15)", borderRadius: 28, minWidth: 340,
          boxShadow: "0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", margin: "0 0 20px 0" }}>
            VIP 멤버십 분양회
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 20 }}>
            <span style={{
              fontSize: "clamp(88px,11vw,136px)", fontWeight: 900, lineHeight: 1,
              color: "white", textShadow: `0 0 50px ${countColor}55`,
              fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif",
              minWidth: "2.4ch", textAlign: "right" as const, transition: "text-shadow 0.4s",
            }}>{count}</span>
            <div style={{ paddingBottom: 18 }}>
              <p style={{ fontSize: 30, color: "rgba(255,255,255,0.2)", fontWeight: 200, margin: 0, lineHeight: 1.2 }}>/</p>
              <p style={{ fontSize: 30, color: "rgba(255,255,255,0.6)", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>100</p>
            </div>
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", paddingBottom: 22, fontWeight: 600 }}>명</span>
          </div>
          <div style={{ width: 300, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${count}%`, background: "linear-gradient(90deg,#1D4ED8,#60A5FA,#A78BFA)", borderRadius: 10, boxShadow: `0 0 12px ${countColor}88`, transition: "width 0.03s linear" }} />
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0, fontWeight: 500 }}>
            {countDone ? "🎯 목표 100인 달성을 향해 전진 중" : `목표까지 ${100 - count}명 남음`}
          </p>
        </div>

        {/* 접속 버튼 */}
        <button
          onClick={() => setShowLogin(true)}
          style={{
            padding: "20px 80px",
            background: "linear-gradient(135deg,#1D4ED8 0%,#2563EB 50%,#4F46E5 100%)",
            color: "white", fontSize: 17, fontWeight: 800,
            border: "1px solid rgba(147,197,253,0.3)", borderRadius: 50, cursor: "pointer",
            letterSpacing: "0.05em", marginBottom: 24,
            boxShadow: "0 8px 40px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(-3px) scale(1.03)"; el.style.boxShadow = "0 16px 56px rgba(37,99,235,0.65)"; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(0) scale(1)"; el.style.boxShadow = "0 8px 40px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.2)"; }}
        >
          시스템 접속하기  →
        </button>

        {/* 통계 */}
        <div style={{ display: "flex", gap: 36 }}>
          {[{ num: "11,964", label: "고객 DB" }, { num: "VIP 100인", label: "멤버십 목표" }, { num: "광고인㈜", label: "대외협력팀 운영" }].map(({ num, label }) => (
            <div key={label} style={{ textAlign: "center" as const }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.65)", margin: 0 }}>{num}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "4px 0 0 0" }}>{label}</p>
            </div>
          ))}
        </div>

        <p style={{ position: "absolute", bottom: 20, fontSize: 10, color: "rgba(255,255,255,0.15)" }}>
          © 2026 광고인㈜ · 분양의신 · All rights reserved.
        </p>
      </div>

      {/* ── 로그인 모달 ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        opacity: showLogin ? 1 : 0, pointerEvents: showLogin ? "auto" : "none",
        transition: "opacity 0.4s",
        background: showLogin ? "rgba(3,6,18,0.75)" : "transparent",
        backdropFilter: showLogin ? "blur(10px)" : "none",
      }}>
        <div style={{
          background: "rgba(7,13,32,0.97)", backdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 28,
          padding: "40px 40px 36px", width: "100%", maxWidth: 420,
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
          transform: showLogin ? "translateY(0) scale(1)" : "translateY(30px) scale(0.96)",
          transition: "transform 0.45s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: "white" }}>분양의신</span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontWeight: 600 }}>광고인㈜ 대외협력팀</span>
            </div>
            <button onClick={() => setShowLogin(false)} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: "0 0 6px 0" }}>시스템 접속</h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 24px 0" }}>관리자 또는 담당자로 로그인하세요</p>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "20px 18px", marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(96,165,250,0.75)", letterSpacing: "0.15em", textTransform: "uppercase" as const, margin: "0 0 14px 0" }}>▪ 관리자 로그인</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <input type="text" value={adminId} onChange={(e) => { setAdminId(e.target.value); setError(""); }} placeholder="아이디"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(96,165,250,0.55)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 11, fontSize: 13, color: "white", outline: "none", boxSizing: "border-box" as const }} />
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={adminPw} onChange={(e) => { setAdminPw(e.target.value); setError(""); }} placeholder="비밀번호"
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(96,165,250,0.55)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                  style={{ width: "100%", padding: "11px 52px 11px 14px", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 11, fontSize: 13, color: "white", outline: "none", boxSizing: "border-box" as const }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>
                  {showPw ? "숨기기" : "보기"}
                </button>
              </div>
              {error && <p style={{ fontSize: 11, color: "#FCA5A5", padding: "7px 10px", background: "rgba(239,68,68,0.12)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)", margin: 0 }}>{error}</p>}
              <button onClick={handleAdminLogin} disabled={loading} style={{ width: "100%", padding: 12, background: "linear-gradient(135deg,#1D4ED8,#4F46E5)", color: "white", fontSize: 13, fontWeight: 800, border: "none", borderRadius: 11, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, boxShadow: "0 4px 20px rgba(37,99,235,0.4)" }}>
                {loading ? "로그인 중..." : "관리자 로그인"}
              </button>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" as const, margin: 0 }}>김정후 본부장 · 김창완 팀장 · 최웅 파트장</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>또는</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" as const, margin: "0 0 10px 0" }}>▪ 담당자 바로 접속</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {TEAM_MEMBERS.map((name) => (
              <button key={name} onClick={() => handleMemberLogin(name)}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", textAlign: "left" as const, transition: "all 0.2s" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "rgba(37,99,235,0.15)"; el.style.borderColor = "rgba(96,165,250,0.35)"; el.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.borderColor = "rgba(255,255,255,0.08)"; el.style.transform = "translateY(0)"; }}
              >
                <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#1D4ED8,#4F46E5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {name[0]}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3 }}>{name}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0 }}>{TEAM_MEMBER_ROLES[name]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
