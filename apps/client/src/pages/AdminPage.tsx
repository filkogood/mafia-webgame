import { useState, useEffect } from 'react';
import { useAdminStore } from '../store/adminStore';

const SERVER = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export default function AdminPage({ onBack }: { onBack: () => void }) {
  const { adminToken, setAdminToken } = useAdminStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    fetch(`${SERVER}/admin/me`, { credentials: 'include' })
      .then((r) => r.json())
      .then(({ isAdmin }: { isAdmin: boolean }) => {
        // If server says admin but we lost the token in state (e.g. page reload),
        // we can't recover the token – user must re-login.
        if (!isAdmin && adminToken) setAdminToken(null);
      })
      .catch(() => {/* ignore */})
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '로그인 실패');
      } else {
        setAdminToken(data.token as string);
        setCode('');
      }
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch(`${SERVER}/admin/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {/* ignore */});
    setAdminToken(null);
  };

  if (checking) {
    return (
      <div style={containerStyle}>
        <p>확인 중...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <button onClick={onBack} style={{ marginBottom: 16, cursor: 'pointer' }}>
        ← 돌아가기
      </button>
      <h2>🔐 관리자 로그인</h2>

      {adminToken ? (
        <div>
          <p style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ 관리자로 로그인됨</p>
          <p style={{ color: '#888', fontSize: 14 }}>세션 유효 시간: 12시간</p>
          <button
            onClick={handleLogout}
            style={{
              marginTop: 12,
              padding: '8px 20px',
              background: '#95a5a6',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            로그아웃
          </button>
          <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 16 }}>
            <p style={{ color: '#555' }}>관리자 권한으로 방을 만들 수 있습니다.</p>
            <button
              onClick={onBack}
              style={{
                padding: '10px 24px',
                fontSize: 16,
                background: '#e74c3c',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              로비로 돌아가서 방 만들기
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: '#555' }}>
            TOTP 인증 앱(예: Google Authenticator)에서 6자리 코드를 입력하세요.
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="6자리 OTP 코드"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            maxLength={6}
            style={{
              padding: 10,
              fontSize: 24,
              letterSpacing: 8,
              textAlign: 'center',
              width: 200,
              border: '2px solid #ddd',
              borderRadius: 4,
            }}
          />
          {error && <p style={{ color: '#e74c3c', margin: 0 }}>{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loading || code.length !== 6}
            style={{
              padding: '10px 24px',
              fontSize: 16,
              background: code.length === 6 ? '#3498db' : '#ccc',
              color: '#fff',
              border: 'none',
              cursor: code.length === 6 ? 'pointer' : 'not-allowed',
              borderRadius: 4,
              width: 220,
            }}
          >
            {loading ? '확인 중...' : '로그인'}
          </button>
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  gap: 8,
  fontFamily: 'sans-serif',
};
