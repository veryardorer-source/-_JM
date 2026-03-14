const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')
const settingsService = require('./settingsService')

const TYPE_GUIDE = {
  '시공사례': '완성된 인테리어 시공 사례를 소개합니다. 공간의 변화와 완성도를 강조하세요.',
  '인테리어팁': '인테리어에 유용한 팁이나 트렌드를 공유합니다. 실용적이고 따라 하기 쉬운 내용으로 작성하세요.',
  '회사소개': '회사의 전문성과 서비스를 소개합니다. 신뢰감을 주는 톤으로 작성하세요.',
  '이벤트': '진행 중인 이벤트나 프로모션을 알립니다. 혜택을 명확하게 전달하세요.',
  '기타': '자유로운 형식으로 작성합니다.',
}

const MOOD_GUIDE = {
  '전문적': '전문적이고 신뢰감 있는 톤. 수치, 소재명, 전문용어 적절히 활용.',
  '따뜻한': '따뜻하고 친근한 톤. 생활 감성과 공감을 자극.',
  '트렌디': '트렌디하고 감각적인 톤. 최신 트렌드 키워드 활용.',
  '고급스러운': '고급스럽고 세련된 톤. 품격 있는 표현 사용.',
}

async function generateCaption({ type, keywords, mood, imagePath }) {
  const settings = settingsService.read()
  if (!settings.claudeApiKey) throw new Error('Claude API 키가 설정되지 않았습니다. 설정 탭에서 입력해주세요.')

  const client = new Anthropic({ apiKey: settings.claudeApiKey })

  const brandInfo = settings.brandContext
    ? `\n회사 정보: ${settings.brandContext}`
    : ''
  const defaultTags = settings.defaultHashtags?.length
    ? `\n기본 포함 해시태그: ${settings.defaultHashtags.map(t => '#' + t).join(' ')}`
    : ''
  const styleInfo = settings.preferredStyles?.length
    ? `\n주력 스타일: ${settings.preferredStyles.join(', ')}`
    : ''
  const audienceInfo = settings.targetAudience
    ? `\n주 고객층: ${settings.targetAudience}`
    : ''

  const systemPrompt = `당신은 한국 인테리어 회사의 SNS 마케터입니다.${brandInfo}${styleInfo}${audienceInfo}

인스타그램 게시물용 한국어 캡션과 해시태그를 생성합니다.

캡션 작성 규칙:
- 자연스러운 한국어로 작성
- 이모지를 적절히 사용 (과하지 않게, 줄 시작이나 강조 포인트에)
- 2~3단락 구성: 첫째(핵심 메시지/임팩트), 둘째(상세 설명/공간 특징), 셋째(행동 유도/문의 안내)
- 마지막에 "📩 문의는 DM 또는 프로필 링크" 형태로 마무리
${defaultTags}

해시태그 규칙:
- 총 20~25개
- 기본 해시태그 반드시 포함
- 한국어 태그 + 영어 태그 혼합
- 인기 태그(팔로워 100만+) + 중간 태그 + 세부 니치 태그 조합
- # 기호 없이 태그 텍스트만 반환

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이:
{
  "caption": "캡션 텍스트 (\\n으로 줄바꿈)",
  "hashtags": ["태그1", "태그2"],
  "dallePrompt": "English prompt for DALL-E 3 to generate a matching interior design image"
}`

  const userPrompt = `게시 유형: ${type}
유형 가이드: ${TYPE_GUIDE[type] || ''}
키워드: ${keywords}
분위기: ${mood} - ${MOOD_GUIDE[mood] || ''}${imagePath ? '\n\n[첨부된 이미지를 분석하여 해당 공간에 맞는 캡션을 작성해주세요]' : ''}`

  let messageContent

  if (imagePath) {
    const fullPath = path.join(__dirname, '../uploads', imagePath)
    if (fs.existsSync(fullPath)) {
      const imageData = fs.readFileSync(fullPath)
      const base64 = imageData.toString('base64')
      const ext = path.extname(imagePath).toLowerCase()
      const mediaType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'

      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        { type: 'text', text: userPrompt },
      ]
    } else {
      messageContent = userPrompt
    }
  } else {
    messageContent = userPrompt
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: messageContent }],
  })

  const text = response.content[0].text.trim()

  // JSON 파싱 (마크다운 코드블록 제거)
  const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
  const parsed = JSON.parse(jsonStr)

  return {
    caption: parsed.caption,
    hashtags: parsed.hashtags,
    dallePrompt: parsed.dallePrompt,
  }
}

module.exports = { generateCaption }
