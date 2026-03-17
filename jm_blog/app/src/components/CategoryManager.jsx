import { useState } from 'react'
import { useStore } from '../store/useStore'

const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#be185d', '#0f766e']

export default function CategoryManager() {
  const { categories, saveCategory, deleteCategory, posts } = useStore()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', color: COLORS[0] })

  function handleEdit(cat) {
    setEditing(cat.id)
    setForm({ name: cat.name, color: cat.color })
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (editing) {
      saveCategory({ id: editing, ...form })
      setEditing(null)
    } else {
      saveCategory(form)
    }
    setForm({ name: '', color: COLORS[0] })
  }

  function handleCancel() {
    setEditing(null)
    setForm({ name: '', color: COLORS[0] })
  }

  function countPosts(catName) {
    return posts.filter(p => p.category === catName).length
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">카테고리 관리</h2>

      {/* 추가/편집 폼 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {editing ? '카테고리 편집' : '새 카테고리 추가'}
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="카테고리 이름"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <div className="flex gap-1.5 items-center">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setForm(f => ({ ...f, color }))}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  outline: form.color === color ? `2px solid ${color}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
          {editing && (
            <button onClick={handleCancel} className="px-3 py-2 text-gray-500 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              취소
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {editing ? '저장' : '추가'}
          </button>
        </div>
      </div>

      {/* 카테고리 목록 */}
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="flex-1 font-medium text-gray-800">{cat.name}</span>
            <span className="text-sm text-gray-400">{countPosts(cat.name)}개 포스트</span>
            <button
              onClick={() => handleEdit(cat)}
              className="text-sm text-indigo-600 hover:text-indigo-800 px-2 py-1"
            >
              편집
            </button>
            <button
              onClick={() => {
                if (countPosts(cat.name) > 0) {
                  alert('이 카테고리에 포스트가 있어 삭제할 수 없습니다.')
                  return
                }
                if (confirm('삭제하시겠습니까?')) deleteCategory(cat.id)
              }}
              className="text-sm text-red-500 hover:text-red-700 px-2 py-1"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
