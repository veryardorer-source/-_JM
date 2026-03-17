import { useState, useRef } from 'react'
import { useStore } from '../store/useStore'
import { generateBlogPost, improveText } from '../utils/gemini'

const IMPROVE_OPTIONS = [
  '더 전문적으로',
  '더 친근하게',
  '더 간결하게',
  '더 자세하게',
  'SEO 최적화',
]

export default function PostEditor({ post, onSave, onCancel }) {
  const { categories, settings, savePost } = useStore()
  const [form, setForm] = useState({
    title: post?.title || '',
    category: post?.category || categories[0]?.name || '',
    content: post?.content || '',
    summary: post?.summary || '',
    thumbnail: post?.thumbnail || '',
    images: post?.images || [],
    id: post?.id || null,
  })
  const [aiPanel, setAiPanel] = useState(false)
  const [aiForm, setAiForm] = useState({
    topic: '',
    keywords: '',
    length: 'medium',
  })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [improving, setImproving] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const contentRef = useRef(null)
  const fileInputRef = useRef(null)
  const thumbInputRef = useRef(null)

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleGenerate() {
    if (!settings.apiKey) {
      setAiError('설정에서 API 키를 먼저 입력해주세요.')
      return
    }
    if (!aiForm.topic) {
      setAiError('주제를 입력해주세요.')
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const result = await generateBlogPost({
        apiKey: settings.apiKey,
        topic: aiForm.topic,
        category: form.category,
        keywords: aiForm.keywords,
        tone: settings.tone,
        companyName: settings.companyName,
        companyDesc: settings.companyDesc,
        length: aiForm.length,
      })
      update('title', result.title)
      update('content', result.content)
      update('summary', result.summary)
      setAiPanel(false)
    } catch (e) {
      setAiError('AI 생성 오류: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleImprove(instruction) {
    const text = window.getSelection()?.toString() || form.content
    if (!text) return
    if (!settings.apiKey) { alert('설정에서 API 키를 먼저 입력해주세요.'); return }
    setImproving(true)
    try {
      const improved = await improveText({ apiKey: settings.apiKey, text, instruction })
      if (window.getSelection()?.toString()) {
        const sel = window.getSelection().toString()
        update('content', form.content.replace(sel, improved))
      } else {
        update('content', improved)
      }
    } catch (e) {
      alert('개선 오류: ' + e.message)
    } finally {
      setImproving(false)
    }
  }

  function handleImageUpload(e) {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const src = ev.target.result
        update('images', [...form.images, { id: Date.now().toString(), src, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
  }

  function handleThumbUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => update('thumbnail', ev.target.result)
    reader.readAsDataURL(file)
  }

  function insertImage(src) {
    const tag = `\n![이미지](${src})\n`
    update('content', form.content + tag)
  }

  function handleSave() {
    if (!form.title) { alert('제목을 입력해주세요.'); return }
    if (!form.content) { alert('내용을 입력해주세요.'); return }
    savePost(form)
    onSave()
  }

  function handleCopyHTML() {
    const html = markdownToHtml(form.content)
    navigator.clipboard.writeText(html)
    alert('HTML이 클립보드에 복사되었습니다! 블로그에 붙여넣기하세요.')
  }

  function handleCopyText() {
    navigator.clipboard.writeText(`${form.title}\n\n${form.content}`)
    alert('텍스트가 클립보드에 복사되었습니다!')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {form.id ? '포스트 편집' : '새 포스트 작성'}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            취소
          </button>
          <button onClick={handleCopyText} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            텍스트 복사
          </button>
          <button onClick={handleCopyHTML} className="px-4 py-2 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-sm">
            HTML 복사
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            저장
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 메인 편집 영역 */}
        <div className="col-span-2 space-y-4">
          {/* 제목 */}
          <input
            type="text"
            placeholder="포스트 제목"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            className="w-full px-4 py-3 text-xl font-semibold border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white"
          />

          {/* 본문 편집기 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">AI 개선:</span>
              {IMPROVE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleImprove(opt)}
                  disabled={improving}
                  className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
              {improving && <span className="text-xs text-indigo-500 animate-pulse">개선 중...</span>}
            </div>
            <textarea
              ref={contentRef}
              value={form.content}
              onChange={e => update('content', e.target.value)}
              placeholder="본문을 입력하세요. 마크다운을 지원합니다.&#10;&#10;## 소제목&#10;**굵게** *기울임*&#10;- 목록"
              className="w-full px-4 py-4 text-sm text-gray-700 resize-none focus:outline-none leading-relaxed"
              rows={20}
            />
          </div>

          {/* 한줄 요약 */}
          <input
            type="text"
            placeholder="한줄 요약 (SNS 공유용)"
            value={form.summary}
            onChange={e => update('summary', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-white text-sm"
          />
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">
          {/* AI 생성 */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
            <button
              onClick={() => setAiPanel(!aiPanel)}
              className="w-full flex items-center justify-between text-indigo-700 font-semibold"
            >
              <span>✨ AI 글 자동생성</span>
              <span className="text-lg">{aiPanel ? '▲' : '▼'}</span>
            </button>

            {aiPanel && (
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  placeholder="주제 (예: 주방 리모델링 사례)"
                  value={aiForm.topic}
                  onChange={e => setAiForm(f => ({ ...f, topic: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="키워드 (예: 타일, 욕실, 비용)"
                  value={aiForm.keywords}
                  onChange={e => setAiForm(f => ({ ...f, keywords: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
                />
                <select
                  value={aiForm.length}
                  onChange={e => setAiForm(f => ({ ...f, length: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none bg-white"
                >
                  <option value="short">짧게 (600~900자)</option>
                  <option value="medium">보통 (1000~1500자)</option>
                  <option value="long">길게 (1800~2500자)</option>
                </select>
                {aiError && <p className="text-xs text-red-500">{aiError}</p>}
                <button
                  onClick={handleGenerate}
                  disabled={aiLoading}
                  className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {aiLoading ? '생성 중...' : '✨ 글 생성하기'}
                </button>
              </div>
            )}
          </div>

          {/* 카테고리 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">카테고리</label>
            <select
              value={form.category}
              onChange={e => update('category', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
            >
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 썸네일 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">대표 이미지</label>
            {form.thumbnail ? (
              <div className="relative">
                <img src={form.thumbnail} alt="" className="w-full h-32 object-cover rounded-lg" />
                <button
                  onClick={() => update('thumbnail', '')}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                >×</button>
              </div>
            ) : (
              <button
                onClick={() => thumbInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors text-sm"
              >
                + 이미지 선택
              </button>
            )}
            <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbUpload} className="hidden" />
          </div>

          {/* 이미지 관리 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">이미지 라이브러리</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                + 추가
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
              {form.images.map(img => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.src}
                    alt={img.name}
                    className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => insertImage(img.src)}
                    title="클릭하면 본문에 삽입"
                  />
                  <button
                    onClick={() => update('images', form.images.filter(i => i.id !== img.id))}
                    className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >×</button>
                </div>
              ))}
            </div>
            {form.images.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">이미지를 추가하면 클릭으로 본문에 삽입</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function markdownToHtml(md) {
  if (!md) return ''
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|l])(.+)$/gm, '<p>$1</p>')
}
