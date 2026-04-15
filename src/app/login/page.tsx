"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login, getCurrentUser } from "@/lib/auth";

// ─── 인트로 오버레이 ─────────────────────────────────────────
type IntroPhase = 'idle'|'typing1'|'hold1'|'exit1'|'typing2'|'hold2'|'exit2'|'crm'|'holdcrm'|'done';

function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [phase, setPhase]             = useState<IntroPhase>('idle');
  const [chars1, setChars1]           = useState(0);
  const [chars2, setChars2]           = useState(0);
  const [textOpacity, setTextOpacity] = useState(1);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [crmScale, setCrmScale]       = useState(3);
  const [crmOpacity, setCrmOpacity]   = useState(0);

  const TEXT1 = "FIRST MOVER";
  const TEXT2 = "1%";

  useEffect(() => {
    const T: ReturnType<typeof setTimeout>[] = [];

    T.push(setTimeout(() => {
      // ① FIRST MOVER 타이핑 (70ms/글자)
      setPhase('typing1');
      let i = 0;
      const iv1 = setInterval(() => {
        i++; setChars1(i);
        if (i >= TEXT1.length) clearInterval(iv1);
      }, 70);

      T.push(setTimeout(() => {
        setPhase('hold1');
        T.push(setTimeout(() => {
          setPhase('exit1'); setTextOpacity(0);

          T.push(setTimeout(() => {
            setChars1(0); setTextOpacity(1);

            // ② 1% 타이핑 (150ms/글자)
            setPhase('typing2');
            let j = 0;
            const iv2 = setInterval(() => {
              j++; setChars2(j);
              if (j >= TEXT2.length) clearInterval(iv2);
            }, 150);

            T.push(setTimeout(() => {
              setPhase('hold2');
              T.push(setTimeout(() => {
                // ③ 분양회 CRM — 뒤에서 앞으로 등장
                setPhase('exit2'); setTextOpacity(0);
                T.push(setTimeout(() => {
                  setChars2(0); setTextOpacity(1);
                  setPhase('crm');
                  setCrmScale(3); setCrmOpacity(0);
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      setCrmScale(1); setCrmOpacity(1);
                    });
                  });
                  T.push(setTimeout(() => {
                    setPhase('holdcrm');
                    T.push(setTimeout(() => {
                      setTextOpacity(0);
                      T.push(setTimeout(() => {
                        setOverlayOpacity(0);
                        T.push(setTimeout(() => { setPhase('done'); onDone(); }, 800));
                      }, 350));
                    }, 900));
                  }, 300));
                }, 350));
              }, 500));
            }, TEXT2.length * 150 + 80));
          }, 350));
        }, 450));
      }, TEXT1.length * 70 + 80));
    }, 1800));

    return () => T.forEach(clearTimeout);
  }, [onDone]);

  if (phase === 'done') return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: overlayOpacity,
      transition: 'opacity 0.8s ease',
      pointerEvents: 'none',
    }}>
      <div style={{
        opacity: textOpacity,
        transition: 'opacity 0.35s ease',
        textAlign: 'center',
        userSelect: 'none',
        width: '100%', padding: '0 5vw',
        boxSizing: 'border-box' as const,
      }}>

        {/* FIRST MOVER — 명조체, 자간 축소 */}
        {(phase === 'typing1' || phase === 'hold1' || phase === 'exit1') && (
          <div style={{
            fontSize: 'clamp(44px, 6.5vw, 96px)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.08em',
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            textShadow: '0 0 40px rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            whiteSpace: 'nowrap' as const,
          }}>
            <span>{TEXT1.slice(0, chars1)}</span>
            {phase === 'typing1' && (
              <span style={{
                display: 'inline-block', width: '3px', height: '0.75em',
                background: '#fff', marginLeft: '5px',
                animation: 'blink 0.55s steps(1) infinite',
              }}/>
            )}
          </div>
        )}

        {/* 1% — 명조체 */}
        {(phase === 'typing2' || phase === 'hold2' || phase === 'exit2') && (
          <div style={{
            fontSize: 'clamp(80px, 14vw, 200px)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.04em',
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            textShadow: '0 0 50px rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            <span>{TEXT2.slice(0, chars2)}</span>
            {phase === 'typing2' && (
              <span style={{
                display: 'inline-block', width: '4px', height: '0.7em',
                background: '#fff', marginLeft: '6px',
                animation: 'blink 0.55s steps(1) infinite',
              }}/>
            )}
          </div>
        )}

        {/* 분양회 CRM — 뒤에서 앞으로 튀어나오는 애니메이션 */}
        {(phase === 'crm' || phase === 'holdcrm') && (
          <div style={{
            fontSize: 'clamp(36px, 5.5vw, 80px)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.06em',
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            textShadow: '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(200,168,80,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            whiteSpace: 'nowrap' as const,
            transform: `scale(${crmScale})`,
            opacity: crmOpacity,
            transition: 'transform 0.65s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease',
          }}>
            분양회 CRM
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}

const SLIDES = [
  {
    engBold: "First Mover",
    engRest: " in Real Estate Sales",
    kor1: "분양 산업의 판도를 바꾸는 새로운 기준.",
    kor2: "대한민국 분양 생태계를 선도하는 퍼스트무버, 분양의신.",
  },
  {
    engBold: "Exclusive",
    engRest: " VIP Membership for the Top 1%",
    kor1: "광고를 넘어, 성장을 함께하는 프라이빗 파트너십.",
    kor2: "분양상담사 최상위 100인만을 위한 멤버십, 분양회.",
  },
];

// ─── 메인 로그인 페이지 ──────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState("");
  const [userPw, setUserPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.push("/");
  }, [router]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.muted = true; v.play().catch(() => {}); }
  }, []);

  // 슬라이드 자동 전환
  useEffect(() => {
    if (!introDone) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setSlide(s => (s + 1) % SLIDES.length); setVisible(true); }, 600);
    }, 5500);
    return () => clearInterval(timer);
  }, [introDone]);

  const handleLogin = async () => {
    if (!userId || !userPw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const user = login(userId, userPw);
    if (user) { router.push("/"); }
    else { setError("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); }
  };

  const cur = SLIDES[slide];

  // 로고 — 상단 네비용 (영상 배경 위)
  const navLogoStyle: React.CSSProperties = {
    height: 38, objectFit: "contain" as const,
  };
  const modalLogoStyle: React.CSSProperties = {
    height: 28, objectFit: "contain" as const,
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: "'Pretendard','Noto Sans KR',sans-serif" }}>

      {/* 인트로 오버레이 */}
      {!introDone && <IntroOverlay onDone={() => setIntroDone(true)}/>}

      {/* 배경 영상 */}
      <video
        ref={videoRef}
        autoPlay muted loop playsInline preload="auto"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
      >
        <source src="/login-bg.mp4" type="video/mp4"/>
      </video>

      {/* 오버레이 */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1 }}/>



      {/* 하단 그라디언트 */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40vh", background: "linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 100%)", zIndex: 3, pointerEvents: "none" }}/>

      {/* 상단 네비 */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "28px 52px", zIndex: 10,
        background: "linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,transparent 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/company-logo.png" alt="광고인" style={navLogoStyle}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}/>
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.25)" }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.05em" }}>광고인㈜</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>대외협력팀</div>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: "12px 32px",
          background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.25)", borderRadius: 50,
          color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em",
          transition: "all 0.25s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
        >시스템 접속</button>
      </div>

      {/* 메인 카피 */}
      <div style={{
        position: "absolute", bottom: "14vh", left: "52px",
        zIndex: 10, maxWidth: "700px",
        opacity: visible && introDone ? 1 : 0,
        transform: visible && introDone ? "translateY(0)" : "translateY(18px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <h1 style={{
          margin: "0 0 18px 0",
          fontSize: "clamp(36px,4.5vw,64px)", lineHeight: 1.12,
          fontFamily: "'Montserrat','Pretendard',sans-serif",
          fontWeight: 300, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.01em",
        }}>
          <strong style={{ fontWeight: 800 }}>{cur.engBold}</strong>{cur.engRest}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(13px,1.3vw,17px)", color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
          {cur.kor1}<br/>{cur.kor2}
        </p>
      </div>

      {/* 슬라이드 인디케이터 */}
      <div style={{ position: "absolute", bottom: "14vh", right: "52px", display: "flex", gap: "10px", zIndex: 10, alignItems: "center" }}>
        {SLIDES.map((_, i) => (
          <button key={i}
            onClick={() => { setVisible(false); setTimeout(() => { setSlide(i); setVisible(true); }, 300); }}
            style={{
              width: i === slide ? "32px" : "8px", height: "3px", borderRadius: "2px",
              background: i === slide ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
              border: "none", cursor: "pointer", transition: "all 0.4s ease", padding: 0,
            }}/>
        ))}
      </div>

      {/* 카피라이트 */}
      <div style={{ position: "absolute", bottom: "28px", left: "52px", zIndex: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
        © 2026 광고인㈜ · 분양의신 · All rights reserved.
      </div>

      {/* 로그인 모달 */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        opacity: showModal ? 1 : 0, pointerEvents: showModal ? "auto" : "none",
        transition: "opacity 0.35s ease",
        background: showModal ? "rgba(0,0,0,0.7)" : "transparent",
        backdropFilter: showModal ? "blur(10px)" : "none",
      }}>
        <div style={{
          background: "rgba(8,10,20,0.97)", backdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24,
          padding: "44px 42px 40px", width: "100%", maxWidth: 440,
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          transform: showModal ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
          transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {/* 모달 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/company-logo.png" alt="광고인" style={modalLogoStyle}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}/>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }}/>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "0.04em" }}>광고인㈜ 대외협력팀</span>
            </div>
            <button onClick={() => setShowModal(false)} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          <h3 style={{ fontSize: 26, fontWeight: 900, color: "white", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>CRM시스템 접속</h3>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", margin: "0 0 30px 0" }}>아이디와 비밀번호를 입력하세요</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: "0.04em" }}>아이디</label>
              <input type="text" value={userId}
                onChange={e => { setUserId(e.target.value); setError(""); }}
                placeholder="아이디 입력" onKeyDown={e => e.key === "Enter" && handleLogin()}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 15, color: "white", outline: "none", boxSizing: "border-box" as const, transition: "all 0.2s" }}/>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: "0.04em" }}>비밀번호</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} value={userPw}
                  onChange={e => { setUserPw(e.target.value); setError(""); }}
                  placeholder="비밀번호 입력" onKeyDown={e => e.key === "Enter" && handleLogin()}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                  style={{ width: "100%", padding: "14px 52px 14px 16px", background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 15, color: "white", outline: "none", boxSizing: "border-box" as const, transition: "all 0.2s" }}/>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {showPw ? "숨기기" : "보기"}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ fontSize: 13, color: "#FCA5A5", padding: "11px 14px", background: "rgba(239,68,68,0.12)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.25)" }}>{error}</div>
            )}
            <button onClick={handleLogin} disabled={loading}
              style={{ width: "100%", padding: "15px", marginTop: 4, background: "white", color: "#0a0a0a", fontSize: 15, fontWeight: 800, border: "none", borderRadius: 12, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, letterSpacing: "0.03em", transition: "all 0.2s" }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#f0f0f0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "white"; }}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;800;900&display=swap');
      `}</style>
    </div>
  );
}
