const OpenAI = require('openai')
const fs = require('fs')
const path = require('path')
const settingsService = require('./settingsService')

async function generateImage(prompt) {
  const settings = settingsService.read()
  if (!settings.openaiApiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다. 설정 탭에서 입력해주세요.')

  const client = new OpenAI({ apiKey: settings.openaiApiKey })

  // 인테리어 스타일에 맞는 프롬프트 강화
  const enhancedPrompt = `Professional interior design photography, South Korean apartment, high quality, bright and clean lighting, architectural photography style. ${prompt}. No people, no text in image.`

  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt: enhancedPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    response_format: 'url',
  })

  const imageUrl = response.data[0].url

  // DALL-E URL은 1시간 후 만료되므로 서버에 다운로드해서 저장
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))
  let imgBuffer
  try {
    // node-fetch 없으면 https로 직접 다운로드
    imgBuffer = await downloadImage(imageUrl)
  } catch {
    // URL만 반환 (임시)
    return { imageUrl, local: false }
  }

  const filename = `dalle_${Date.now()}.png`
  const savePath = path.join(__dirname, '../uploads', filename)
  fs.writeFileSync(savePath, imgBuffer)

  return { imageUrl: `/uploads/${filename}`, local: true }
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const http = require('http')
    const client = url.startsWith('https') ? https : http

    client.get(url, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

module.exports = { generateImage }
