import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Settings() {
  const [form, setForm] = useState({
    claudeApiKey: '',
    openaiApiKey: '',
    brandContext: '',
    defaultHashtags: '',
    preferredStyles: '',
    targetAudience: '',
  })
  const [showClaude, setShowClaude] = useState(false)
  const [showOpenai, setShowOpenai] = useState(false)
  const [configured, setConfigured] = useState({ claude: false, openai: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('') // 'ok' | 'error'

  useEffect(() => {
    api.getSettings()
      .then(data => {
        setForm({
          claudeApiKey: data.claudeApiKey || '',
          openaiApiKey: data.openaiApiKey || '',
          brandContext: data.brandContext || '',
          defaultHashtags: (data.defaultHashtags || []).join(', '),
          preferredStyles: (data.preferredStyles || []).join(', '),
          targetAudience: data.targetAudience || '',
        })
        setConfigured(data.configured || { claude: false, openai: false })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveStatus('')
    try {
      const payload = {
        ...form,
        defaultHashtags: form.defaultHashtags.split(',').map(t => t.trim()).filter(Boolean),
        preferredStyles: form.preferredStyles.split(',').map(t => t.trim()).filter(Boolean),
      }
      const result = await api.saveSettings(payload)
      setConfigured(result.configured || { claude: false, openai: false })
      setSaveStatus('ok')
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (err) {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* AI API 설정 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">AI API 설정</h2>

        {/* Claude */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-500">Claude API Key (캡션 생성)</label>
            <span className={`text-xs px-2 py-0.5 rounded-full ${configured.claude ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
              {configured.claude ? '✓ 설정됨' : '미설정'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type={showClaude ? 'text' : 'password'}
              value={form.claudeApiKey}
              onChange={e => setForm(f => ({ ...f, claudeApiKey: e.target.value }))}
              placeholder="sk-ant-..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 font-mono"
            />
            <button
              onClick={() => setShowClaude(v => !v)}
              className="px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-xl hover:bg-gray-100"
            >
              {showClaude ? '숨기기' : '보기'}
            </button>
          </div>
        </div>

        {/* OpenAI */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-500">OpenAI API Key (이미지 생성)</label>
            <span className={`text-xs px-2 py-0.5 rounded-full ${configured.openai ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
              {configured.openai ? '✓ 설정됨' : '미설정'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type={showOpenai ? 'text' : 'password'}
              value={form.openaiApiKey}
              onChange={e => setForm(f => ({ ...f, openaiApiKey: e.target.value }))}
              placeholder="sk-..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 font-mono"
            />
            <button
              onClick={() => setShowOpenai(v => !v)}
              className="px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-xl hover:bg-gray-100"
            >
              {showOpenai ? '숨기기' : '보기'}
            </button>
          </div>
        </div>
      </div>

      {/* 브랜드 설정 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">브랜드 설정</h2>
        <p className="text-xs text-gray-400 -mt-2">AI 캡션 생성 시 참고하는 정보입니다.</p>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">회사/브랜드 소개</label>
          <textarea
            value={form.brandContext}
            onChange={e => setForm(f => ({ ...f, brandContext: e.target.value }))}
            rows={3}
            placeholder="예: 서울 강남/서초 지역 전문 인테리어 회사. 아파트·오피스텔 시공 전문."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">기본 해시태그 (항상 포함)</label>
          <input
            type="text"
            value={form.defaultHashtags}
            onChange={e => setForm(f => ({ ...f, defaultHashtags: e.target.value }))}
            placeholder="예: JM인테리어, 인테리어, 홈인테리어"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">쉼표(,)로 구분</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">주력 스타일</label>
          <input
            type="text"
            value={form.preferredStyles}
            onChange={e => setForm(f => ({ ...f, preferredStyles: e.target.value }))}
            placeholder="예: 모던, 미니멀, 북유럽"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">쉼표(,)로 구분</p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1.5">주 고객층</label>
          <input
            type="text"
            value={form.targetAudience}
            onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
            placeholder="예: 30-40대 신혼부부 및 이사 예정 가정"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {/* 저장 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
          saveStatus === 'ok'
            ? 'bg-green-500 text-white'
            : saveStatus === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white'
        }`}
      >
        {saving ? '저장 중...' : saveStatus === 'ok' ? '✅ 저장 완료!' : saveStatus === 'error' ? '❌ 저장 실패' : '저장'}
      </button>
    </div>
  )
}
