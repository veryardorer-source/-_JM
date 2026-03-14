const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const generateRoutes = require('./routes/generate')
const uploadRoutes = require('./routes/upload')
const settingsRoutes = require('./routes/settings')

const app = express()
const PORT = process.env.PORT || 3001

// 필요한 디렉토리 생성
const dirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'data'),
]
dirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) })

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/generate', generateRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/settings', settingsRoutes)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' })
})

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`)
})
