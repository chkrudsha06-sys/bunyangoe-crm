"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login, getCurrentUser } from "@/lib/auth";

// ─── 인트로 오버레이 (luminaire 스타일) ───────────────────────
type IntroPhase =
  | 'black'        // 검정 화면 대기
  | 'line1_in'     // "First Mover" 올라오며 등장
  | 'line1_hold'
  | 'line1_out'    // 올라가며 퇴장
  | 'line2_in'     // "1%" 등장
  | 'line2_hold'
  | 'line2_out'
  | 'line3_in'     // "Bunyangoe" 등장
  | 'line3_hold'
  | 'fade_out'     // 검정 오버레이 사라지며 로그인 페이지 전환
  | 'done';

function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<IntroPhase>('black');

  // 각 줄 translateY 애니메이션용
  const [y1, setY1] = useState(60);   const [op1, setOp1] = useState(0);
  const [y2, setY2] = useState(60);   const [op2, setOp2] = useState(0);
  const [y3, setY3] = useState(60);   const [op3, setOp3] = useState(0);
  const [overlayOp, setOverlayOp] = useState(1);

  useEffect(() => {
    const T: ReturnType<typeof setTimeout>[] = [];
    const raf = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));

    // ① 검정 대기 0.6s 후 시작
    T.push(setTimeout(() => {
      // Line1: First Mover 등장
      setPhase('line1_in');
      raf(() => { setY1(0); setOp1(1); });

      T.push(setTimeout(() => {
        setPhase('line1_hold');
        T.push(setTimeout(() => {
          // Line1 퇴장 (위로)
          setPhase('line1_out');
          setY1(-50); setOp1(0);

          T.push(setTimeout(() => {
            // Line2: 1% 등장
            setY2(60);
            setPhase('line2_in');
            raf(() => { setY2(0); setOp2(1); });

            T.push(setTimeout(() => {
              setPhase('line2_hold');
              T.push(setTimeout(() => {
                // Line2 퇴장
                setPhase('line2_out');
                setY2(-50); setOp2(0);

                T.push(setTimeout(() => {
                  // Line3: Bunyangoe 등장
                  setY3(60);
                  setPhase('line3_in');
                  raf(() => { setY3(0); setOp3(1); });

                  T.push(setTimeout(() => {
                    setPhase('line3_hold');
                    T.push(setTimeout(() => {
                      // 전체 페이드아웃 → 로그인 페이지 전환
                      setPhase('fade_out');
                      setOverlayOp(0);
                      T.push(setTimeout(() => {
                        setPhase('done');
                        onDone();
                      }, 1000));
                    }, 900));
                  }, 1200));
                }, 400));
              }, 700));
            }, 1000));
          }, 400));
        }, 700));
      }, 1100));
    }, 600));

    return () => T.forEach(clearTimeout);
  }, [onDone]);

  if (phase === 'done') return null;

  const trans = 'transform 0.75s cubic-bezier(0.16,1,0.3,1), opacity 0.75s cubic-bezier(0.16,1,0.3,1)';
  const transOut = 'transform 0.55s cubic-bezier(0.4,0,1,1), opacity 0.55s ease';

  // 그림자 — 1%와 Bunyangoe에만 골드
  const shadowGold = '0 0 60px rgba(184,142,30,0.55), 0 4px 32px rgba(184,142,30,0.3)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      opacity: overlayOp,
      transition: 'opacity 0.9s ease',
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>

      {/* ── Line 1: First Mover ── */}
      {(phase==='line1_in'||phase==='line1_hold'||phase==='line1_out') && (
        <div style={{ overflow:'hidden', textAlign:'center' }}>
          <div style={{
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            fontSize: 'clamp(52px, 7.5vw, 112px)',
            fontWeight: 300,
            letterSpacing: '0.18em',
            color: '#ffffff',
            textTransform: 'uppercase' as const,
            transform: `translateY(${y1}px)`,
            opacity: op1,
            transition: phase==='line1_out' ? transOut : trans,
            whiteSpace: 'nowrap' as const,
            lineHeight: 1,
          }}>
            <span style={{ fontWeight:300 }}>First </span>
            <span style={{ fontWeight:800 }}>Mover</span>
          </div>
        </div>
      )}

      {/* ── Line 2: 1% ── */}
      {(phase==='line2_in'||phase==='line2_hold'||phase==='line2_out') && (
        <div style={{ overflow:'hidden', textAlign:'center' }}>
          <div style={{
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            fontSize: 'clamp(100px, 18vw, 260px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            textShadow: shadowGold,
            transform: `translateY(${y2}px)`,
            opacity: op2,
            transition: phase==='line2_out' ? transOut : trans,
            lineHeight: 1,
          }}>
            1%
          </div>
        </div>
      )}

      {/* ── Line 3: Bunyangoe ── */}
      {(phase==='line3_in'||phase==='line3_hold'||phase==='fade_out') && (
        <div style={{ overflow:'hidden', textAlign:'center' }}>
          <div style={{
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            fontSize: 'clamp(48px, 7vw, 104px)',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#ffffff',
            textShadow: shadowGold,
            transform: `translateY(${y3}px)`,
            opacity: op3,
            transition: phase==='fade_out' ? 'none' : trans,
            whiteSpace: 'nowrap' as const,
            lineHeight: 1,
          }}>
            Bunyangoe
          </div>
          {/* Shining Your 스타일 서브텍스트 */}
          <div style={{
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            fontSize: 'clamp(13px, 1.4vw, 20px)',
            fontWeight: 400,
            letterSpacing: '0.45em',
            color: 'rgba(255,255,255,0.45)',
            marginTop: '18px',
            textTransform: 'uppercase' as const,
            transform: `translateY(${y3}px)`,
            opacity: op3 * 0.7,
            transition: trans,
          }}>
            Bunyangoe CRM System
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;800&display=swap');
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
    }, 2500);
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
      <IntroOverlay onDone={() => setIntroDone(true)}/>

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
