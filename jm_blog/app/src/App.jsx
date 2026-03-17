import { useState } from 'react'
import PostList from './components/PostList'
import PostEditor from './components/PostEditor'
import CategoryManager from './components/CategoryManager'
import Settings from './components/Settings'

const TABS = [
  { id: 'posts', label: '📝 포스트' },
  { id: 'categories', label: '🗂 카테고리' },
  { id: 'settings', label: '⚙️ 설정' },
]

export default function App() {
  const [tab, setTab] = useState('posts')
  const [editingPost, setEditingPost] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  function handleEdit(post) {
    setEditingPost(post)
    setIsEditing(true)
  }

  function handleNew() {
    setEditingPost(null)
    setIsEditing(true)
  }

  function handleSave() {
    setIsEditing(false)
    setEditingPost(null)
  }

  function handleCancel() {
    setIsEditing(false)
    setEditingPost(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">✍️</span>
            <span className="font-bold text-gray-800 text-lg">JM 블로그</span>
          </div>

          {!isEditing && (
            <nav className="flex gap-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )}

          {isEditing && (
            <span className="text-sm text-gray-400">
              포스트 {editingPost ? '편집' : '작성'} 중...
            </span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {isEditing ? (
          <PostEditor
            post={editingPost}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : tab === 'posts' ? (
          <PostList onEdit={handleEdit} onNew={handleNew} />
        ) : tab === 'categories' ? (
          <CategoryManager />
        ) : (
          <Settings />
        )}
      </main>
    </div>
  )
}
