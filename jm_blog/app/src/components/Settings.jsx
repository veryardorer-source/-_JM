import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function Settings() {
  const { settings, saveSettings } = useStore()
  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  function handleSave() {
    saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">설정</h2>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        {/* API 키 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Google Gemini API 키 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="AIza..."
              value={form.apiKey}
              onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
              className="w-full px-3 py-2 pr-20 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              {showKey ? '숨기기' : '보기'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            aistudio.google.com에서 발급받은 API 키를 입력하세요
          </p>
        </div>

        {/* 회사명 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">회사명</label>
          <input
            type="text"
            placeholder="예: JM 인테리어"
            value={form.companyName}
            onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* 회사 소개 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">회사 소개</label>
          <textarea
            placeholder="예: 10년 경력의 인테리어 전문 회사로 주거공간부터 상업공간까지 시공합니다."
            value={form.companyDesc}
            onChange={e => setForm(f => ({ ...f, companyDesc: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 resize-none"
            rows={3}
          />
          <p className="text-xs text-gray-400 mt-1">AI 글쓰기에 자동으로 반영됩니다</p>
        </div>

        {/* 기본 톤 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">기본 글쓰기 톤</label>
          <select
            value={form.tone}
            onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
          >
            <option value="친근하고 전문적인">친근하고 전문적인</option>
            <option value="격식있고 전문적인">격식있고 전문적인</option>
            <option value="친근하고 캐주얼한">친근하고 캐주얼한</option>
            <option value="정보 전달 위주의">정보 전달 위주의</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {saved ? '✓ 저장되었습니다' : '저장'}
        </button>
      </div>
    </div>
  )
}
