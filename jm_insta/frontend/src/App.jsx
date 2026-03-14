import { useState } from 'react'
import Compose from './components/Compose'
import History from './components/History'
import Settings from './components/Settings'

const TABS = [
  { id: 'compose', label: '작성', icon: '✏️' },
  { id: 'history', label: '이력', icon: '📋' },
  { id: 'settings', label: '설정', icon: '⚙️' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('compose')
  const [composeData, setComposeData] = useState(null)

  function goToCompose(data) {
    setComposeData(data)
    setActiveTab('compose')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <span className="text-lg font-bold text-gray-900">JM 인스타 관리</span>
          <span className="ml-2 text-xs text-gray-400">Instagram Content Tool</span>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        {activeTab === 'compose' && (
          <Compose initialData={composeData} onDataConsumed={() => setComposeData(null)} />
        )}
        {activeTab === 'history' && <History onReuse={goToCompose} />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* 하단 탭 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-500 font-semibold'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
