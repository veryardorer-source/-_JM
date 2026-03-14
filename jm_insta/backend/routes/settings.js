const express = require('express')
const router = express.Router()
const settingsService = require('../services/settingsService')

// GET /api/settings - 마스킹된 설정 반환
router.get('/', (req, res) => {
  try {
    const s = settingsService.masked()
    res.json({ ...s, configured: settingsService.isConfigured() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/settings - 설정 저장
router.put('/', (req, res) => {
  try {
    const current = settingsService.read()
    const incoming = req.body

    // 마스킹된 값이면 기존 값 유지
    const merged = {
      ...current,
      ...incoming,
      claudeApiKey: incoming.claudeApiKey?.includes('***') ? current.claudeApiKey : (incoming.claudeApiKey || current.claudeApiKey),
      openaiApiKey: incoming.openaiApiKey?.includes('***') ? current.openaiApiKey : (incoming.openaiApiKey || current.openaiApiKey),
    }

    settingsService.write(merged)
    res.json({ success: true, configured: settingsService.isConfigured() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
