const API_BASE = 'http://localhost:3001/api';

export const exchangeToken = async ({ code, state, clientId, clientSecret }) => {
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state, clientId, clientSecret }),
  });
  if (!res.ok) throw new Error('토큰 교환 실패');
  return res.json();
};

export const refreshToken = async ({ refreshToken, clientId, clientSecret }) => {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, clientId, clientSecret }),
  });
  if (!res.ok) throw new Error('토큰 갱신 실패');
  return res.json();
};

export const getUserInfo = async (accessToken) => {
  const res = await fetch(`${API_BASE}/user/info?accessToken=${accessToken}`);
  if (!res.ok) throw new Error('사용자 정보 조회 실패');
  return res.json();
};

export const postToBlog = async ({ accessToken, title, contents, tags, isPublic }) => {
  const res = await fetch(`${API_BASE}/blog/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, title, contents, tags, isPublic }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data.error) || '포스팅 실패');
  return data;
};

export const generateNaverAuthUrl = (clientId, redirectUri, state) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
};
