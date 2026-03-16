import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `이 인테리어 평면도를 분석해서 각 공간의 치수 정보를 추출해주세요.

다음 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "rooms": [
    {
      "name": "공간 이름 (예: 거실, 침실1, 주방 등)",
      "widthMm": 가로 치수(mm 단위, 숫자만),
      "depthMm": 세로 치수(mm 단위, 숫자만),
      "heightMm": 천장 높이(mm, 없으면 2400),
      "note": "특이사항 (없으면 빈 문자열)"
    }
  ],
  "summary": "도면 전체 설명 한 줄"
}

주의사항:
- 치수선에 표기된 숫자를 mm 단위로 변환하세요 (예: 4.2m → 4200, 4200mm → 4200)
- 치수가 불명확한 경우 0으로 표기
- 도면에 없는 공간은 포함하지 마세요`

// baseURL: 비어있으면 Anthropic 직접 호출, 'http://localhost:8317' 이면 llm-mux
export async function analyzeFloorPlan(apiKey, fileBase64, mediaType, baseURL = '') {
  const options = { apiKey: apiKey || 'llm-mux', dangerouslyAllowBrowser: true }
  if (baseURL) options.baseURL = baseURL
  const client = new Anthropic(options)

  const isPdf = mediaType === 'application/pdf'

  const contentBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [contentBlock, { type: 'text', text: PROMPT }],
      },
    ],
  })

  const text = message.content[0].text.trim()

  // JSON 블록 추출
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('응답에서 JSON을 찾을 수 없습니다')

  return JSON.parse(match[0])
}
