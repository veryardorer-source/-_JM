import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function PostList({ onEdit, onNew }) {
  const { posts, categories, deletePost } = useStore()
  const [filterCat, setFilterCat] = useState('전체')
  const [search, setSearch] = useState('')

  const filtered = posts.filter(p => {
    const matchCat = filterCat === '전체' || p.category === filterCat
    const matchSearch = !search || p.title.includes(search) || (p.content || '').includes(search)
    return matchCat && matchSearch
  })

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">블로그 포스트</h2>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <span className="text-lg">+</span> 새 글 작성
        </button>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="제목 또는 내용 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
        />
        <div className="flex gap-2 flex-wrap">
          {['전체', ...categories.map(c => c.name)].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterCat === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 포스트 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">✍️</div>
          <p className="text-lg">아직 작성된 글이 없습니다</p>
          <p className="text-sm mt-1">새 글 작성 버튼을 눌러 첫 번째 포스트를 만들어보세요!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(post => {
            const cat = categories.find(c => c.name === post.category)
            return (
              <div key={post.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
                <div className="flex items-start gap-4">
                  {/* 썸네일 */}
                  {post.thumbnail ? (
                    <img
                      src={post.thumbnail}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                      📝
                    </div>
                  )}

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {cat && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1 truncate">{post.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{post.summary || post.content?.slice(0, 100)}</p>
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => onEdit(post)}
                      className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => { if (confirm('삭제하시겠습니까?')) deletePost(post.id) }}
                      className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
