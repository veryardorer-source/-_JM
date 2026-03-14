const express = require('express')
const multer = require('multer')
const path = require('path')
const router = express.Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `upload_${Date.now()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('JPG, PNG, WEBP 파일만 업로드 가능합니다.'))
  },
})

// POST /api/upload
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지가 없습니다.' })
  res.json({
    imageUrl: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
  })
})

module.exports = router
