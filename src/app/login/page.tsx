"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, loginMember, getCurrentUser, TEAM_MEMBERS, TEAM_MEMBER_ROLES } from "@/lib/auth";

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let animId: number;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    type P = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };
    const particles: P[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 2 + 1, alpha: Math.random() * 0.5 + 0.2,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${p.alpha})`; ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(96,165,250,${(1 - dist / 130) * 0.22})`; ctx.lineWidth = 0.8; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animId); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

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

  useEffect(() => {
    const duration = 3500;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) requestAnimationFrame(tick);
      else { setCount(100); setCountDone(true); }
    };
    requestAnimationFrame(tick);
  }, []);

  const handleAdminLogin = async () => {
    if (!adminId || !adminPw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const user = loginAdmin(adminId, adminPw);
    if (user) router.push("/");
    else { setError("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); }
  };

  const handleMemberLogin = (name: string) => { loginMember(name); router.push("/"); };
  const countColor = count >= 100 ? "#60A5FA" : count >= 70 ? "#818CF8" : count >= 40 ? "#6366F1" : "#3B82F6";

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", fontFamily: "'Apple SD Gothic Neo','Pretendard','Noto Sans KR',sans-serif" }}>

      {/* 배경 */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 50%,#0D1B4B 0%,#050D2E 40%,#030918 100%)" }} />
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "50vw", height: "60vh", borderRadius: "50%", background: "radial-gradient(circle,rgba(37,99,235,0.18) 0%,transparent 70%)", filter: "blur(40px)", animation: "orb1 12s ease-in-out infinite alternate" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "45vw", height: "55vh", borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)", filter: "blur(50px)", animation: "orb2 15s ease-in-out infinite alternate" }} />
        <ParticleCanvas />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30vh", background: "linear-gradient(to top,rgba(3,9,24,0.8),transparent)" }} />
      </div>

      {/* 메인 */}
      <div style={{
        position: "relative", zIndex: 10, minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 20px",
        opacity: showLogin ? 0 : 1, transform: showLogin ? "translateY(-20px) scale(0.98)" : "translateY(0) scale(1)",
        transition: "opacity 0.5s, transform 0.5s", pointerEvents: showLogin ? "none" : "auto",
      }}>

        {/* 로고 이미지 */}
        <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 18, padding: "10px 28px", marginBottom: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/company-logo.png" alt="분양의신"
              style={{ height: 64, width: "auto", filter: "brightness(0) invert(1)", display: "block" }}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
                const span = document.createElement("span");
                span.textContent = "분양의신";
                span.style.cssText = "font-size:26px;font-weight:900;color:white;letter-spacing:-0.02em";
                el.parentElement?.appendChild(span);
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#60A5FA", boxShadow: "0 0 8px #60A5FA" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(147,197,253,0.85)", letterSpacing: "0.22em", textTransform: "uppercase" as const }}>FIRST MOVER · 분양의신 퍼스트무버</span>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#60A5FA", boxShadow: "0 0 8px #60A5FA" }} />
          </div>
        </div>

        {/* 헤드라인 */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(48px,7.5vw,100px)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 14px 0", letterSpacing: "-0.025em" }}>
            <span style={{ color: "#FFFFFF", textShadow: "0 2px 40px rgba(255,255,255,0.15)" }}>첫 시작,{" "}</span>
            <br />
            {/* 빛나는 동적 텍스트 */}
            <span className="shine-text">VIP멤버십 분양회</span>
          </h1>
          <h2 style={{ fontSize: "clamp(20px,2.6vw,32px)", fontWeight: 600, color: "rgba(255,255,255,0.75)", margin: 0, letterSpacing: "0.04em" }}>
            고객통합관리 시스템
          </h2>
        </div>

        {/* VIP 카운터 */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          marginBottom: 40, padding: "28px 52px",
          background: "rgba(8,16,42,0.75)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(96,165,250,0.18)", borderRadius: 28, minWidth: 340,
          boxShadow: "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", margin: "0 0 18px 0" }}>VIP 멤버십 분양회</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <span style={{
              fontSize: "clamp(110px,14vw,180px)", fontWeight: 900, lineHeight: 1,
              color: "white", textShadow: `0 0 60px ${countColor}66, 0 0 120px ${countColor}33`,
              fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif",
              transition: "text-shadow 0.4s",
            }}>{count}</span>
          </div>
          <div style={{ width: 300, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${count}%`, background: "linear-gradient(90deg,#1D4ED8,#60A5FA,#A78BFA)", borderRadius: 10, boxShadow: `0 0 14px ${countColor}99`, transition: "width 0.03s linear" }} />
          </div>
        </div>

        {/* 접속 버튼 */}
        <button
          onClick={() => setShowLogin(true)}
          style={{
            padding: "20px 80px",
            background: "linear-gradient(135deg,#1D4ED8 0%,#2563EB 50%,#4F46E5 100%)",
            color: "white", fontSize: 17, fontWeight: 800,
            border: "1px solid rgba(147,197,253,0.3)", borderRadius: 50,
            cursor: "pointer", letterSpacing: "0.05em", marginBottom: 20,
            boxShadow: "0 8px 40px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(-3px) scale(1.03)"; el.style.boxShadow = "0 16px 56px rgba(37,99,235,0.65)"; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(0) scale(1)"; el.style.boxShadow = "0 8px 40px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.2)"; }}
        >
          시스템 접속하기  →
        </button>

        {/* 하단 텍스트만 */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.6)", margin: "0 0 3px 0" }}>(주)광고인</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>대외협력팀</p>
        </div>

        <p style={{ position: "absolute", bottom: 20, fontSize: 10, color: "rgba(255,255,255,0.15)" }}>© 2026 광고인㈜ · 분양의신 · All rights reserved.</p>
      </div>

      {/* 로그인 모달 */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        opacity: showLogin ? 1 : 0, pointerEvents: showLogin ? "auto" : "none",
        transition: "opacity 0.4s",
        background: showLogin ? "rgba(3,6,18,0.8)" : "transparent",
        backdropFilter: showLogin ? "blur(12px)" : "none",
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/company-logo.png" alt="분양의신" style={{ height: 24, width: "auto", filter: "brightness(0) invert(1)" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
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
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>{showPw ? "숨기기" : "보기"}</button>
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
                <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#1D4ED8,#4F46E5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{name[0]}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3 }}>{name}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0 }}>{TEAM_MEMBER_ROLES[name]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orb1 { from{transform:translate(0,0) scale(1)} to{transform:translate(5vw,3vh) scale(1.15)} }
        @keyframes orb2 { from{transform:translate(0,0) scale(1)} to{transform:translate(-4vw,-4vh) scale(1.1)} }

        /* 빛나는 글씨 애니메이션 */
        .shine-text {
          position: relative;
          display: inline-block;
          background: linear-gradient(
            90deg,
            #60A5FA 0%,
            #A78BFA 30%,
            #ffffff 48%,
            #f0f9ff 50%,
            #ffffff 52%,
            #A78BFA 70%,
            #60A5FA 100%
          );
          background-size: 250% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shine 3s linear infinite;
          filter: drop-shadow(0 0 20px rgba(96,165,250,0.6));
        }

        @keyframes shine {
          0%   { background-position: 200% center; filter: drop-shadow(0 0 20px rgba(96,165,250,0.4)); }
          40%  { filter: drop-shadow(0 0 35px rgba(255,255,255,0.9)); }
          50%  { filter: drop-shadow(0 0 40px rgba(255,255,255,1)); }
          60%  { filter: drop-shadow(0 0 35px rgba(167,139,250,0.9)); }
          100% { background-position: -200% center; filter: drop-shadow(0 0 20px rgba(167,139,250,0.4)); }
        }
      `}</style>
    </div>
  );
}
