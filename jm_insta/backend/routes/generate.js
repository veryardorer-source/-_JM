const express = require('express')
const router = express.Router()
const { generateCaption } = require('../services/claudeService')
const { generateImage } = require('../services/dalleService')

// POST /api/generate/caption
router.post('/caption', async (req, res) => {
  try {
    const { type, keywords, mood, imagePath } = req.body
    if (!keywords?.trim()) return res.status(400).json({ error: '키워드를 입력해주세요.' })

    const result = await generateCaption({ type, keywords, mood, imagePath })
    res.json(result)
  } catch (err) {
    console.error('[generate/caption]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/generate/image
router.post('/image', async (req, res) => {
  try {
    const { prompt } = req.body
    if (!prompt?.trim()) return res.status(400).json({ error: '프롬프트가 없습니다.' })

    const result = await generateImage(prompt)
    res.json(result)
  } catch (err) {
    console.error('[generate/image]', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
