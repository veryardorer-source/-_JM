const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '요청 실패')
  return data
}

export const api = {
  generateCaption: (body) =>
    request('/generate/caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  generateImage: (prompt) =>
    request('/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    }),

  uploadImage: (file) => {
    const form = new FormData()
    form.append('image', file)
    return request('/upload', { method: 'POST', body: form })
  },

  getSettings: () => request('/settings'),

  saveSettings: (body) =>
    request('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
}
