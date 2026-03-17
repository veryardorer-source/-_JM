import { GoogleGenerativeAI } from '@google/generative-ai'

export async function generateBlogPost({ apiKey, topic, category, keywords, tone, companyName, companyDesc, length = 'medium' }) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const lengthGuide = {
    short: '600~900자',
    medium: '1000~1500자',
    long: '1800~2500자',
  }

  const prompt = `
당신은 인테리어/건설 회사의 전문 블로그 작가입니다.

회사 정보:
- 회사명: ${companyName || '저희 회사'}
- 회사 소개: ${companyDesc || '인테리어 및 건설 전문 회사'}

아래 조건으로 블로그 포스팅을 작성해주세요:
- 주제: ${topic}
- 카테고리: ${category}
- 핵심 키워드: ${keywords || topic}
- 말투/톤: ${tone || '친근하고 전문적인'} 톤
- 분량: ${lengthGuide[length]}

작성 형식:
1. 제목 (SEO에 최적화된 매력적인 제목)
2. 도입부 (독자의 관심을 끄는 2~3문장)
3. 본문 (소제목 포함, 단락 나누기)
4. 마무리 (회사 홍보 자연스럽게 포함)

JSON 형식으로만 응답해주세요:
{
  "title": "제목",
  "content": "전체 본문 내용 (마크다운 형식, 소제목은 ## 사용)",
  "summary": "한줄 요약 (SNS 공유용, 100자 이내)"
}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 응답 파싱 실패')

  return JSON.parse(jsonMatch[0])
}

export async function improveText({ apiKey, text, instruction }) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `
다음 블로그 텍스트를 "${instruction}" 방식으로 개선해주세요.
원문의 핵심 내용은 유지하면서 자연스럽게 수정해주세요.
수정된 텍스트만 응답해주세요 (설명 없이).

원문:
${text}
`
  const result = await model.generateContent(prompt)
  return result.response.text()
}
