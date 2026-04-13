"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login, getCurrentUser } from "@/lib/auth";

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
  const [userId, setUserId] = useState("");
  const [userPw, setUserPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [count, setCount] = useState(0);

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
      else setCount(100);
    };
    requestAnimationFrame(tick);
  }, []);

  const handleLogin = async () => {
    if (!userId || !userPw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const user = login(userId, userPw);
    if (user) { router.push("/"); }
    else { setError("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); }
  };

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

      {/* 메인 랜딩 */}
      <div style={{
        position: "relative", zIndex: 10, minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 20px",
        opacity: showLogin ? 0 : 1, transform: showLogin ? "translateY(-20px) scale(0.98)" : "translateY(0) scale(1)",
        transition: "opacity 0.5s, transform 0.5s", pointerEvents: showLogin ? "none" : "auto",
      }}>

        {/* 로고 - 테두리 없이 이미지만 */}
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/company-logo.png" alt="분양의신"
            style={{ width: "min(480px, 72vw)", height: "auto", display: "block", marginBottom: 14 }}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = "none";
              const span = document.createElement("span");
              span.textContent = "분양의신";
              span.style.cssText = "font-size:24px;font-weight:900;color:white;letter-spacing:-0.02em;display:block;margin-bottom:14px";
              el.parentElement?.insertBefore(span, el.nextSibling);
            }}
          />
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
        background: showLogin ? "rgba(3,6,18,0.82)" : "transparent",
        backdropFilter: showLogin ? "blur(12px)" : "none",
      }}>
        <div style={{
          background: "rgba(7,14,36,0.98)", backdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 28,
          padding: "48px 44px 44px", width: "100%", maxWidth: 460,
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
          transform: showLogin ? "translateY(0) scale(1)" : "translateY(30px) scale(0.96)",
          transition: "transform 0.45s cubic-bezier(0.16,1,0.3,1)",
        }}>

          {/* 모달 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-logo.png" alt="분양의신"
                style={{ width: 36, height: 36, objectFit: "contain" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.18)" }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>광고인㈜ 대외협력팀</span>
            </div>
            <button onClick={() => setShowLogin(false)} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* 타이틀 */}
          <h3 style={{ fontSize: 28, fontWeight: 900, color: "white", margin: "0 0 8px 0", letterSpacing: "-0.01em" }}>시스템 접속</h3>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", margin: "0 0 32px 0" }}>아이디와 비밀번호를 입력하세요</p>

          {/* 로그인 폼 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>로그인</label>
              <input type="text" value={userId}
                onChange={(e) => { setUserId(e.target.value); setError(""); }}
                placeholder="아이디 입력"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(96,165,250,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                style={{
                  width: "100%", padding: "15px 18px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 14, fontSize: 16, color: "white",
                  outline: "none", boxSizing: "border-box" as const,
                  transition: "all 0.2s",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>비밀번호</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={userPw}
                  onChange={(e) => { setUserPw(e.target.value); setError(""); }}
                  placeholder="비밀번호 입력"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(96,165,250,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  style={{
                    width: "100%", padding: "15px 56px 15px 18px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1.5px solid rgba(255,255,255,0.15)",
                    borderRadius: 14, fontSize: 16, color: "white",
                    outline: "none", boxSizing: "border-box" as const,
                    transition: "all 0.2s",
                  }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {showPw ? "숨기기" : "보기"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 14, color: "#FCA5A5", padding: "12px 16px", background: "rgba(239,68,68,0.12)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </div>
            )}

            <button onClick={handleLogin} disabled={loading} style={{
              width: "100%", padding: 16, marginTop: 4,
              background: "linear-gradient(135deg,#1D4ED8,#4F46E5)",
              color: "white", fontSize: 17, fontWeight: 800,
              border: "none", borderRadius: 14,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              boxShadow: "0 4px 24px rgba(37,99,235,0.45)",
              letterSpacing: "0.02em",
              transition: "all 0.2s",
            }}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orb1 { from{transform:translate(0,0) scale(1)} to{transform:translate(5vw,3vh) scale(1.15)} }
        @keyframes orb2 { from{transform:translate(0,0) scale(1)} to{transform:translate(-4vw,-4vh) scale(1.1)} }
        .shine-text {
          display: inline-block;
          background: linear-gradient(90deg,#60A5FA 0%,#A78BFA 30%,#ffffff 48%,#f0f9ff 50%,#ffffff 52%,#A78BFA 70%,#60A5FA 100%);
          background-size: 250% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shine 3s linear infinite;
          filter: drop-shadow(0 0 20px rgba(96,165,250,0.6));
        }
        @keyframes shine {
          0%   { background-position: 200% center; filter: drop-shadow(0 0 20px rgba(96,165,250,0.4)); }
          50%  { filter: drop-shadow(0 0 40px rgba(255,255,255,1)); }
          100% { background-position: -200% center; filter: drop-shadow(0 0 20px rgba(167,139,250,0.4)); }
        }
      `}</style>
    </div>
  );
}
