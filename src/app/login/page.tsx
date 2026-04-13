"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, loginMember, getCurrentUser, TEAM_MEMBERS, TEAM_MEMBER_ROLES } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.push("/");
  }, [router]);

  const handleAdminLogin = async () => {
    if (!adminId || !adminPw) { setError("아이디와 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const user = loginAdmin(adminId, adminPw);
    if (user) {
      router.push("/");
    } else {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
    }
  };

  const handleMemberLogin = (name: string) => {
    loginMember(name);
    router.push("/");
  };

  return (
    <div className="login-page">
      {/* 애니메이션 그라디언트 배경 */}
      <div className="gradient-bg" />

      {/* 물결 효과 레이어 */}
      <div className="wave-layer wave-1" />
      <div className="wave-layer wave-2" />
      <div className="wave-layer wave-3" />

      {/* 플로팅 오브 */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* 메인 카드 */}
      <div className="login-card">
        {/* 로고 */}
        <div className="login-logo">
          <div className="logo-icon">
            <span>분</span>
          </div>
          <div className="logo-text">
            <h1>분양회 CRM</h1>
            <p>광고인㈜ 대외협력팀</p>
          </div>
        </div>

        {/* 구분선 */}
        <div className="login-divider-top">
          <div className="divider-line" />
          <span>관리자 로그인</span>
          <div className="divider-line" />
        </div>

        {/* 관리자 로그인 폼 */}
        <div className="admin-form">
          <div className="input-group">
            <label>아이디</label>
            <input
              type="text"
              value={adminId}
              onChange={(e) => { setAdminId(e.target.value); setError(""); }}
              placeholder="관리자 아이디 입력"
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
          </div>
          <div className="input-group">
            <label>비밀번호</label>
            <div className="pw-wrapper">
              <input
                type={showPw ? "text" : "password"}
                value={adminPw}
                onChange={(e) => { setAdminPw(e.target.value); setError(""); }}
                placeholder="비밀번호 입력"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="pw-toggle">
                {showPw ? "숨기기" : "보기"}
              </button>
            </div>
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button
            onClick={handleAdminLogin}
            disabled={loading}
            className="admin-btn"
          >
            {loading ? (
              <span className="btn-loading"><span className="spinner" />로그인 중...</span>
            ) : (
              "관리자 로그인"
            )}
          </button>
          <p className="admin-hint">
            관리자: 김정후 본부장 · 김창완 팀장 · 최웅 파트장
          </p>
        </div>

        {/* 구분선 */}
        <div className="login-divider">
          <div className="divider-line" />
          <span>담당자 바로 접속</span>
          <div className="divider-line" />
        </div>

        {/* 담당자 버튼 */}
        <div className="member-grid">
          {TEAM_MEMBERS.map((name) => (
            <button
              key={name}
              onClick={() => handleMemberLogin(name)}
              className="member-btn"
            >
              <div className="member-avatar">{name[0]}</div>
              <div className="member-info">
                <span className="member-name">{name}</span>
                <span className="member-role">{TEAM_MEMBER_ROLES[name]}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 하단 브랜드 */}
      <div className="login-footer">
        <span>© 2026 광고인㈜ · 분양의신</span>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
        }

        /* 그라디언트 배경 */
        .gradient-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            -45deg,
            #0B1629,
            #1E3A8A,
            #0C4A6E,
            #1B4332,
            #1E3A8A,
            #C9A84C,
            #0B1629
          );
          background-size: 400% 400%;
          animation: gradientShift 12s ease infinite;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* 물결 레이어 */
        .wave-layer {
          position: absolute;
          width: 200%;
          height: 200%;
          border-radius: 43%;
          animation: waveRotate linear infinite;
          opacity: 0.08;
        }
        .wave-1 {
          background: rgba(201, 168, 76, 0.3);
          top: -60%; left: -50%;
          animation-duration: 20s;
        }
        .wave-2 {
          background: rgba(30, 58, 138, 0.4);
          top: -70%; left: -30%;
          animation-duration: 28s;
          animation-direction: reverse;
        }
        .wave-3 {
          background: rgba(14, 165, 233, 0.2);
          top: -50%; left: -40%;
          animation-duration: 35s;
        }

        @keyframes waveRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* 플로팅 오브 */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          animation: orbFloat ease-in-out infinite;
        }
        .orb-1 {
          width: 400px; height: 400px;
          background: rgba(201, 168, 76, 0.15);
          top: -100px; right: -100px;
          animation-duration: 8s;
        }
        .orb-2 {
          width: 300px; height: 300px;
          background: rgba(30, 58, 138, 0.2);
          bottom: -80px; left: -80px;
          animation-duration: 10s;
          animation-delay: -3s;
        }
        .orb-3 {
          width: 200px; height: 200px;
          background: rgba(14, 165, 233, 0.15);
          top: 40%; left: 10%;
          animation-duration: 12s;
          animation-delay: -6s;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        /* 메인 카드 */
        .login-card {
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 440px;
          box-shadow: 
            0 25px 60px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          animation: cardFloat 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cardFloat {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* 로고 */
        .login-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 28px;
        }
        .logo-icon {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, #0B1629 0%, #1E3A8A 50%, #C9A84C 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(11, 22, 41, 0.3);
        }
        .logo-icon span {
          color: white;
          font-size: 22px;
          font-weight: 800;
        }
        .logo-text h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          line-height: 1.2;
        }
        .logo-text p {
          font-size: 12px;
          color: #64748B;
          margin: 2px 0 0 0;
        }

        /* 구분선 */
        .login-divider-top,
        .login-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 20px 0;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: #E2E8F0;
        }
        .login-divider-top span,
        .login-divider span {
          font-size: 11px;
          font-weight: 600;
          color: #94A3B8;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* 어드민 폼 */
        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-group label {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        .input-group input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          font-size: 14px;
          color: #0F172A;
          background: #F8FAFC;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        }
        .input-group input:focus {
          border-color: #1E3A8A;
          background: white;
          box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.08);
        }
        .pw-wrapper {
          position: relative;
        }
        .pw-wrapper input {
          padding-right: 60px;
        }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          color: #64748B;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
        }
        .error-msg {
          font-size: 12px;
          color: #EF4444;
          margin: 0;
          padding: 8px 12px;
          background: #FEF2F2;
          border-radius: 8px;
          border: 1px solid #FECACA;
        }
        .admin-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #0B1629 0%, #1E3A8A 100%);
          color: white;
          font-size: 14px;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(30, 58, 138, 0.4);
        }
        .admin-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(30, 58, 138, 0.5);
        }
        .admin-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .btn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          display: inline-block;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .admin-hint {
          font-size: 11px;
          color: #94A3B8;
          text-align: center;
          margin: 0;
        }

        /* 담당자 그리드 */
        .member-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .member-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          background: #F8FAFC;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .member-btn:hover {
          border-color: #C9A84C;
          background: #FFFBF0;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(201, 168, 76, 0.15);
        }
        .member-avatar {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, #1E3A8A, #C9A84C);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .member-info {
          display: flex;
          flex-direction: column;
        }
        .member-name {
          font-size: 13px;
          font-weight: 700;
          color: #0F172A;
        }
        .member-role {
          font-size: 11px;
          color: #94A3B8;
        }

        /* 푸터 */
        .login-footer {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
        }
        .login-footer span {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
