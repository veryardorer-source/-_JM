import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Naver OAuth - 액세스 토큰 교환
app.post('/api/auth/token', async (req, res) => {
  const { code, state, clientId, clientSecret } = req.body;
  try {
    const response = await axios.get('https://nid.naver.com/oauth2.0/token', {
      params: {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state,
      },
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Naver OAuth - 토큰 갱신
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken, clientId, clientSecret } = req.body;
  try {
    const response = await axios.get('https://nid.naver.com/oauth2.0/token', {
      params: {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      },
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 네이버 블로그 포스팅
app.post('/api/blog/post', async (req, res) => {
  const { accessToken, title, contents, tags, isPublic } = req.body;
  try {
    const params = new URLSearchParams();
    params.append('title', title);
    params.append('contents', contents);
    if (tags) params.append('tags', tags);
    params.append('isPublic', isPublic ? '1' : '0');

    const response = await axios.post(
      'https://openapi.naver.com/v1/blog/writePost.json',
      params,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    const msg = err.response?.data || err.message;
    res.status(err.response?.status || 500).json({ error: msg });
  }
});

// 네이버 사용자 정보 조회
app.get('/api/user/info', async (req, res) => {
  const { accessToken } = req.query;
  try {
    const response = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ 백엔드 서버 실행 중: http://localhost:${PORT}`);
});
