"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login, getCurrentUser } from "@/lib/auth";

// ─── 인트로 오버레이 ─────────────────────────────────────────
// MOVER 글자: M O V E R (인덱스 0~4)
const MOVER_CHARS = ['M','O','V','E','R'];
const GOLD = '#C9982A';
const GOLD_BRIGHT = '#F0C040';

function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [textY, setTextY]         = useState(0);
  const [textOp, setTextOp]       = useState(0);
  // MOVER 황금 애니메이션: -1=없음, 0~4=현재 켜진 인덱스, 5=전체 골드
  const [goldIdx, setGoldIdx]     = useState(-1);
  const [allGold, setAllGold]     = useState(false);
  const [topH, setTopH]           = useState(50);
  const [botH, setBotH]           = useState(50);
  const [panelOpen, setPanelOpen] = useState(false);
  const [centerOp, setCenterOp]   = useState(0);
  const [centerY, setCenterY]     = useState(20);

  useEffect(() => {
    const T: ReturnType<typeof setTimeout>[] = [];
    const raf = (fn: ()=>void) => requestAnimationFrame(()=>requestAnimationFrame(fn));

    // ① 0.5s 후 FIRST MOVER 페이드인
    T.push(setTimeout(() => {
      raf(() => { setTextOp(1); setTextY(0); });

      // ② 1.0s 후 MOVER 한글자씩 골드 (4초 총: 글자당 480ms × 5 = 2400ms + 전체골드 1000ms + 여유 600ms)
      T.push(setTimeout(() => {
        const charDelay = 480; // 글자당 간격
        MOVER_CHARS.forEach((_, i) => {
          T.push(setTimeout(() => {
            setGoldIdx(i);
          }, i * charDelay));
        });

        // 5글자 후 전체 골드
        T.push(setTimeout(() => {
          setAllGold(true);
          setGoldIdx(-1);

          // 전체 골드 1.0s 유지 후 패널 열림
          T.push(setTimeout(() => {
            setTextY(-30); setTextOp(0);
            setPanelOpen(true);
            raf(() => { setTopH(0); setBotH(0); });

            T.push(setTimeout(() => {
              raf(() => { setCenterOp(1); setCenterY(0); });
              T.push(setTimeout(() => {
                onDone();
              }, 3000));
            }, 200));
          }, 1000));
        }, MOVER_CHARS.length * charDelay + 200));
      }, 1000));
    }, 500));

    return () => T.forEach(clearTimeout);
  }, [onDone]);

  return (
    <>
      {/* 위 검정 패널 */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 35,
        height: `${topH}vh`,
        background: '#000',
        transition: panelOpen ? 'height 1.0s cubic-bezier(0.76,0,0.24,1)' : 'none',
        pointerEvents: 'none',
      }}/>

      {/* 아래 검정 패널 */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 35,
        height: `${botH}vh`,
        background: '#000',
        transition: panelOpen ? 'height 1.0s cubic-bezier(0.76,0,0.24,1)' : 'none',
        pointerEvents: 'none',
      }}/>

      {/* FIRST MOVER — 패널 열리기 전에만 표시 */}
      {!panelOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          background: '#000',
        }}>
          <div style={{
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            fontSize: 'clamp(40px, 6vw, 88px)',
            fontWeight: 900,
            letterSpacing: '0.2em',
            color: '#ffffff',
            textTransform: 'uppercase' as const,
            transform: `translateY(${textY}px)`,
            opacity: textOp,
            transition: textOp === 0
              ? 'transform 0.6s ease, opacity 0.5s ease'
              : 'transform 0.0s, opacity 0.7s ease',
            whiteSpace: 'nowrap' as const,
            display: 'flex', alignItems: 'center', gap: 0,
          }}>
            {/* FIRST  */}
            {'FIRST '.split('').map((ch, i) => (
              <span key={i}>{ch === ' ' ? ' ' : ch}</span>
            ))}
            {/* MOVER — 한글자씩 골드 */}
            {MOVER_CHARS.map((ch, i) => {
              const isActive = goldIdx === i;
              const isGold   = allGold || isActive;
              return (
                <span key={i} style={{
                  color: isGold ? GOLD_BRIGHT : '#ffffff',
                  transition: 'color 0.25s ease',
                  display: 'inline-block',
                }}>
                  {ch}
                </span>
              );
            })}
          </div>
        </div>
      )}


    </>
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

  // BGM: 유저 클릭/키 감지 시 재생 시작
  const [bgmStarted, setBgmStarted] = useState(false);
  useEffect(() => {
    let audio: HTMLAudioElement | null = null;

    const startBGM = () => {
      if (audio) return;
      audio = new Audio("/bgm.mp3");
      audio.volume = 0.3;
      audio.loop = true;
      audio.play().then(() => setBgmStarted(true)).catch(() => {});
      const evts = ["click","mousedown","keydown","touchstart","pointerdown"];
      evts.forEach(e => window.removeEventListener(e, startBGM));
    };

    const evts = ["click","mousedown","keydown","touchstart","pointerdown"];
    evts.forEach(e => window.addEventListener(e, startBGM));

    return () => {
      evts.forEach(e => window.removeEventListener(e, startBGM));
      if (audio) { audio.pause(); audio.src = ""; }
    };
  }, []);

  // 슬라이드 자동 전환
  useEffect(() => {
    if (!introDone) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setSlide(s => (s + 1) % SLIDES.length); setVisible(true); }, 600);
    }, 4500);
    return () => clearInterval(timer);
  }, [introDone]);

  const handleLogin = async () => {
    if (!userId || !userPw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const user = await login(userId, userPw);
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
      {/* 인트로 완료 후 가운데 텍스트 + 카드 */}
      {introDone && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 5,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {/* 타이틀 */}
          <div style={{
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            fontSize: 'clamp(36px, 6vw, 80px)',
            fontWeight: 800, letterSpacing: '0.04em',
            color: '#ffffff', lineHeight: 1, textAlign: 'center',
          }}>VIP Membership</div>
          <div style={{
            fontFamily: "'Montserrat','Pretendard',sans-serif",
            fontSize: 'clamp(11px, 1.2vw, 16px)',
            fontWeight: 400, letterSpacing: '0.42em',
            color: 'rgba(255,255,255,0.6)', marginTop: '12px',
            textTransform: 'uppercase' as const, textAlign: 'center',
          }}>Bunyangoe CRM System</div>

          {/* 3D VIP 카드 */}
          <div style={{ marginTop: '52px', perspective: '600px', pointerEvents: 'auto', cursor: 'default' }}>
            <div
              id="vip-card-3d"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                e.currentTarget.style.transform = `rotateY(${x * 35}deg) rotateX(${-y * 35}deg) scale(1.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1)';
              }}
              style={{
                width: 'clamp(380px, 35vw, 520px)',
                height: 'clamp(220px, 20vw, 300px)',
                background: 'linear-gradient(-45deg, #2a2a2a, #111)',
                borderRadius: '16px',
                padding: 'clamp(20px, 2vw, 30px)',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
                transition: 'transform 0.1s ease-out',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transformStyle: 'preserve-3d' as const,
              }}>
              {/* 글레이즈 빛 반사 */}
              <div style={{
                position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
                background: 'conic-gradient(from 180deg, transparent 0%, rgba(232,200,122,0.03) 25%, transparent 50%)',
                pointerEvents: 'none', animation: 'cardShine 8s linear infinite',
              }}/>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, rgba(255,255,255,0.02) 100%)',
                borderRadius: '16px', pointerEvents: 'none',
              }}/>

              {/* 상단 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                <div>
                  <div style={{
                    fontFamily: "'Montserrat',sans-serif", fontSize: 'clamp(14px, 1.3vw, 20px)',
                    fontWeight: 700, color: '#E8C87A', letterSpacing: '0.08em',
                  }}>VIP Membership</div>
                  <div style={{
                    fontFamily: "'Pretendard',sans-serif", fontSize: 'clamp(11px, 1vw, 14px)',
                    fontWeight: 500, color: 'rgba(232,200,122,0.5)', marginTop: '3px', letterSpacing: '0.15em',
                  }}>분양회</div>
                </div>
                <div style={{
                  textAlign: 'right',
                  borderLeft: '1px solid rgba(232,200,122,0.15)',
                  paddingLeft: 'clamp(10px, 1vw, 16px)',
                }}>
                  <div style={{
                    fontFamily: "'Montserrat',sans-serif", fontSize: '9px',
                    fontWeight: 600, color: 'rgba(232,200,122,0.4)', letterSpacing: '0.25em',
                  }}>EXCLUSIVE</div>
                  <div style={{
                    fontFamily: "'Montserrat',sans-serif", fontSize: 'clamp(14px, 1.3vw, 20px)',
                    fontWeight: 800, color: '#E8C87A', marginTop: '2px', letterSpacing: '0.05em',
                  }}>TOP 1%</div>
                </div>
              </div>

              {/* 하단 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 2 }}>
                <div>
                  <div style={{
                    fontFamily: "'Montserrat',sans-serif", fontSize: 'clamp(9px, 0.8vw, 11px)',
                    fontWeight: 400, color: 'rgba(232,200,122,0.35)', letterSpacing: '0.12em', lineHeight: 1.6,
                  }}>THE ULTIMATE BENEFITS<br/>FOR SELECTED MEMBERS</div>
                  <div style={{
                    fontFamily: "'Montserrat',sans-serif", fontSize: 'clamp(40px, 3.5vw, 56px)',
                    fontWeight: 800, color: '#E8C87A', lineHeight: 1, marginTop: '2px',
                  }}>100</div>
                </div>
                <div style={{ opacity: 0.5, display: 'flex', alignItems: 'flex-end' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/company-logo.png" alt="광고인" style={{
                    height: 'clamp(28px, 2.5vw, 40px)', objectFit: 'contain',
                    filter: 'brightness(1.8) grayscale(0.2)',
                  }} onError={e=>{(e.currentTarget as HTMLImageElement).style.display="none";}}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        padding: "28px 52px", zIndex: 40,
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

      {/* BGM 안내 */}
      {introDone && !bgmStarted && (
        <div style={{
          position: "absolute", bottom: "52px", left: "50%", transform: "translateX(-50%)",
          zIndex: 10, display: "flex", alignItems: "center", gap: 8,
          padding: "10px 24px", borderRadius: 50,
          background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.12)",
          animation: "pulse 2s ease-in-out infinite",
        }}>
          <span style={{ fontSize: 14 }}>🔊</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500, letterSpacing: "0.03em" }}>
            화면을 클릭하면 음악이 재생됩니다
          </span>
        </div>
      )}

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
        background: showModal ? "rgba(0,0,0,0.45)" : "transparent",
        backdropFilter: showModal ? "blur(6px)" : "none",
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
        @keyframes cardShine {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
