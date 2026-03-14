import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useStore } from '../store/useStore'

const TYPES = ['시공사례', '인테리어팁', '회사소개', '이벤트', '기타']
const MOODS = ['전문적', '따뜻한', '트렌디', '고급스러운']

const DEFAULT_FORM = {
  type: '시공사례',
  keywords: '',
  mood: '전문적',
  imageSource: 'upload',
}

export default function Compose({ initialData, onDataConsumed }) {
  const { addPost } = useStore()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(DEFAULT_FORM)
  const [uploadedImage, setUploadedImage] = useState(null) // { previewUrl, serverUrl, filename }
  const [result, setResult] = useState(null)
  const [step, setStep] = useState('form') // 'form' | 'result'
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [saved, setSaved] = useState(false)

  // 이력에서 재사용
  useEffect(() => {
    if (initialData) {
      setForm({
        type: initialData.type || '시공사례',
        keywords: initialData.keywords || '',
        mood: initialData.mood || '전문적',
        imageSource: initialData.imageSource || 'upload',
      })
      setResult({
        caption: initialData.caption,
        hashtags: initialData.hashtags,
        dallePrompt: initialData.dallePrompt || '',
        imageUrl: initialData.imageUrl || null,
      })
      setStep('result')
      setSaved(false)
      onDataConsumed?.()
    }
  }, [initialData])

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setUploadedImage({ previewUrl, serverUrl: null, filename: null })
    setUploadLoading(true)
    setError('')

    api.uploadImage(file)
      .then(data => {
        setUploadedImage({ previewUrl, serverUrl: data.imageUrl, filename: data.filename })
      })
      .catch(err => setError(err.message))
      .finally(() => setUploadLoading(false))
  }

  async function handleGenerate() {
    if (!form.keywords.trim()) return setError('키워드를 입력해주세요.')
    if (form.imageSource === 'upload' && uploadLoading) return setError('이미지 업로드 중입니다. 잠시 기다려주세요.')

    setLoading(true)
    setError('')
    try {
      const payload = {
        type: form.type,
        keywords: form.keywords,
        mood: form.mood,
        imagePath: form.imageSource === 'upload' ? uploadedImage?.filename : null,
      }
      const data = await api.generateCaption(payload)
      setResult({
        caption: data.caption,
        hashtags: data.hashtags,
        dallePrompt: data.dallePrompt,
        imageUrl: form.imageSource === 'upload' ? uploadedImage?.previewUrl : null,
      })
      setStep('result')
      setSaved(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateImage() {
    if (!result?.dallePrompt) return
    setImageLoading(true)
    setError('')
    try {
      const data = await api.generateImage(result.dallePrompt)
      setResult(r => ({ ...r, imageUrl: data.imageUrl }))
    } catch (err) {
      setError(err.message)
    } finally {
      setImageLoading(false)
    }
  }

  function handleCopy(type) {
    let text = ''
    if (type === 'caption') text = result.caption
    else if (type === 'hashtags') text = result.hashtags.map(t => `#${t}`).join(' ')
    else if (type === 'all') text = `${result.caption}\n\n${result.hashtags.map(t => `#${t}`).join(' ')}`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  function handleSave() {
    const post = {
      id: Date.now(),
      type: form.type,
      keywords: form.keywords,
      mood: form.mood,
      imageSource: form.imageSource,
      caption: result.caption,
      hashtags: result.hashtags,
      dallePrompt: result.dallePrompt,
      imageUrl: result.imageUrl,
      createdAt: new Date().toISOString(),
    }
    addPost(post)
    setSaved(true)
  }

  function handleReset() {
    setForm(DEFAULT_FORM)
    setUploadedImage(null)
    setResult(null)
    setStep('form')
    setError('')
    setSaved(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeHashtag(tag) {
    setResult(r => ({ ...r, hashtags: r.hashtags.filter(t => t !== tag) }))
  }

  return (
    <div className="space-y-4">
      {step === 'form' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">게시물 작성</h2>

          {/* 게시 유형 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">게시 유형</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    form.type === t
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 키워드 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              키워드 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.keywords}
              onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
              placeholder="예: 강남 아파트, 주방 리모델링, 화이트 인테리어"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* 분위기 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">분위기</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <button
                  key={m}
                  onClick={() => setForm(f => ({ ...f, mood: m }))}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    form.mood === m
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 이미지 소스 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">이미지</label>
            <div className="flex gap-2">
              {[['upload', '📷 직접 업로드'], ['dalle', '🤖 AI 생성'], ['none', '없음']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setForm(f => ({ ...f, imageSource: val })); setUploadedImage(null) }}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    form.imageSource === val
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 파일 업로드 */}
            {form.imageSource === 'upload' && (
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="img-upload"
                />
                <label
                  htmlFor="img-upload"
                  className="block w-full cursor-pointer border-2 border-dashed border-gray-200 rounded-xl overflow-hidden"
                >
                  {uploadedImage?.previewUrl ? (
                    <div className="relative">
                      <img
                        src={uploadedImage.previewUrl}
                        alt="미리보기"
                        className="w-full aspect-square object-cover"
                      />
                      {uploadLoading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="text-white text-sm">업로드 중...</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center text-gray-400">
                      <span className="text-3xl mb-1">📷</span>
                      <span className="text-sm">탭하여 사진 선택</span>
                      <span className="text-xs mt-0.5">JPG, PNG, WEBP (최대 10MB)</span>
                    </div>
                  )}
                </label>
              </div>
            )}

            {form.imageSource === 'dalle' && (
              <p className="mt-2 text-xs text-gray-400">캡션 생성 후 AI 이미지를 따로 생성할 수 있어요.</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? '✨ AI 생성 중...' : '✨ AI 캡션 생성'}
          </button>
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-4">
          {/* 상단 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              ← 새로 작성
            </button>
            <button
              onClick={() => { setStep('form'); setError('') }}
              className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              수정하기
            </button>
          </div>

          {/* 이미지 */}
          {result.imageUrl && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <img
                src={result.imageUrl}
                alt="게시물 이미지"
                className="w-full aspect-square object-cover"
              />
            </div>
          )}

          {/* AI 이미지 생성 버튼 (dalle 선택 시) */}
          {form.imageSource === 'dalle' && !result.imageUrl && (
            <button
              onClick={handleGenerateImage}
              disabled={imageLoading}
              className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold rounded-xl transition-colors"
            >
              {imageLoading ? '🎨 이미지 생성 중...' : '🎨 AI 이미지 생성'}
            </button>
          )}

          {/* 캡션 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">캡션</span>
              <span className="text-xs text-gray-400">{result.caption.length} / 2200</span>
            </div>
            <textarea
              value={result.caption}
              onChange={e => setResult(r => ({ ...r, caption: e.target.value }))}
              rows={8}
              className="w-full text-sm text-gray-700 leading-relaxed resize-none focus:outline-none"
            />
            <button
              onClick={() => handleCopy('caption')}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                copied === 'caption'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {copied === 'caption' ? '✅ 복사됨!' : '📋 캡션 복사'}
            </button>
          </div>

          {/* 해시태그 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">해시태그</span>
              <span className="text-xs text-gray-400">{result.hashtags.length} / 30</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.hashtags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
                >
                  #{tag}
                  <button
                    onClick={() => removeHashtag(tag)}
                    className="text-blue-400 hover:text-blue-600 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={() => handleCopy('hashtags')}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                copied === 'hashtags'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {copied === 'hashtags' ? '✅ 복사됨!' : '📋 해시태그 복사'}
            </button>
          </div>

          {/* 전체 복사 + 저장 */}
          <div className="space-y-2">
            <button
              onClick={() => handleCopy('all')}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                copied === 'all'
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {copied === 'all' ? '✅ 전체 복사됨! 인스타에 붙여넣기 하세요' : '📋 전체 복사 (캡션 + 해시태그)'}
            </button>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saved}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                saved
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {saved ? '✅ 이력에 저장됨' : '💾 이력에 저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
