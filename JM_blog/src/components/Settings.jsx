import { useState, useEffect } from 'react';
import { getSettings, saveSettings, getAuth, saveAuth, clearAuth } from '../utils/storage';
import { generateNaverAuthUrl, exchangeToken, getUserInfo } from '../utils/naverApi';
import styles from './Settings.module.css';

const REDIRECT_URI = 'http://localhost:5173/callback';

export default function Settings({ onAuthChange }) {
  const [settings, setSettings] = useState({ clientId: '', clientSecret: '' });
  const [auth, setAuth] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setSettings(getSettings());
    setAuth(getAuth());

    // OAuth 콜백 처리 (URL에 code, state 있을 때)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code && state) {
      handleOAuthCallback(code, state);
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleOAuthCallback = async (code, state) => {
    setLoading(true);
    setMsg({ type: 'info', text: '로그인 처리 중...' });
    try {
      const stored = getSettings();
      const tokenData = await exchangeToken({
        code, state,
        clientId: stored.clientId,
        clientSecret: stored.clientSecret,
      });
      const newAuth = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
        savedAt: Date.now(),
      };
      // 사용자 정보 가져오기
      try {
        const userInfo = await getUserInfo(newAuth.accessToken);
        newAuth.user = userInfo.response;
      } catch {}
      saveAuth(newAuth);
      setAuth(newAuth);
      onAuthChange?.(newAuth);
      setMsg({ type: 'success', text: '✅ 네이버 로그인 성공!' });
    } catch (e) {
      setMsg({ type: 'error', text: `로그인 실패: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!settings.clientId || !settings.clientSecret) {
      setMsg({ type: 'error', text: 'Client ID와 Client Secret을 모두 입력해주세요.' });
      return;
    }
    saveSettings(settings);
    setMsg({ type: 'success', text: '✅ 설정이 저장되었습니다.' });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleLogin = () => {
    if (!settings.clientId) {
      setMsg({ type: 'error', text: 'Client ID를 먼저 저장해주세요.' });
      return;
    }
    saveSettings(settings);
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem('oauth_state', state);
    const url = generateNaverAuthUrl(settings.clientId, REDIRECT_URI, state);
    window.location.href = url;
  };

  const handleLogout = () => {
    clearAuth();
    setAuth({});
    onAuthChange?.(null);
    setMsg({ type: 'info', text: '로그아웃 되었습니다.' });
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>⚙️ 설정</h1>
        <p className={styles.subtitle}>네이버 블로그 API 연동 설정</p>
      </div>

      {msg && (
        <div className={`${styles.msg} ${styles[msg.type]}`}>{msg.text}</div>
      )}

      {/* API 설정 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>🔑 네이버 Developer API 설정</h2>
        <p className={styles.guide}>
          <a href="https://developers.naver.com/apps/#/register" target="_blank" rel="noreferrer">
            네이버 개발자센터
          </a>
          에서 앱을 등록하고 Client ID와 Secret을 입력하세요.
          <br />
          <strong>사용 API:</strong> 블로그 쓰기, 네이버 로그인
          <br />
          <strong>Callback URL:</strong> <code>http://localhost:5173/callback</code>
        </p>

        <div className={styles.field}>
          <label>Client ID</label>
          <input
            type="text"
            placeholder="네이버 앱 Client ID"
            value={settings.clientId}
            onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label>Client Secret</label>
          <input
            type="password"
            placeholder="네이버 앱 Client Secret"
            value={settings.clientSecret}
            onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
          />
        </div>

        <button className={styles.btnPrimary} onClick={handleSave}>
          저장
        </button>
      </div>

      {/* 로그인 상태 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>👤 네이버 계정 연결</h2>

        {auth.accessToken ? (
          <div className={styles.loggedIn}>
            <div className={styles.loginStatus}>
              <span className={styles.statusDot} />
              <span>연결됨</span>
              {auth.user && (
                <strong>{auth.user.name || auth.user.nickname}</strong>
              )}
            </div>
            <button className={styles.btnDanger} onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        ) : (
          <div>
            <p className={styles.loginDesc}>
              네이버 계정으로 로그인하면 블로그에 직접 포스팅할 수 있습니다.
            </p>
            <button
              className={styles.btnNaver}
              onClick={handleLogin}
              disabled={loading}
            >
              <span className={styles.naverLogo}>N</span>
              네이버 로그인
            </button>
          </div>
        )}
      </div>

      {/* 사용 가이드 */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>📖 사용 방법</h2>
        <ol className={styles.steps}>
          <li>네이버 개발자센터에서 애플리케이션 등록</li>
          <li>사용 API에서 <strong>블로그</strong> 및 <strong>네이버 로그인</strong> 선택</li>
          <li>Callback URL: <code>http://localhost:5173/callback</code> 추가</li>
          <li>Client ID, Secret을 위에 입력 후 저장</li>
          <li>네이버 로그인으로 계정 연결</li>
          <li>새 글 쓰기에서 포스팅!</li>
        </ol>
      </div>
    </div>
  );
}
