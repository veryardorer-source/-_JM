import { useState } from 'react'
import { useStore } from '../store/useStore'

const TYPE_COLORS = {
  '시공사례': 'bg-blue-100 text-blue-600',
  '인테리어팁': 'bg-green-100 text-green-600',
  '회사소개': 'bg-purple-100 text-purple-600',
  '이벤트': 'bg-orange-100 text-orange-600',
  '기타': 'bg-gray-100 text-gray-600',
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function History({ onReuse }) {
  const { posts, deletePost } = useStore()
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [expanded, setExpanded] = useState(null)

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-gray-500 text-sm">저장된 게시물이 없어요.</p>
        <p className="text-gray-400 text-xs mt-1">작성 탭에서 게시물을 만들고 저장해보세요.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 px-1">총 {posts.length}개의 게시물</p>

      {posts.map(post => (
        <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex gap-3 p-4">
            {/* 썸네일 */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📝</div>
              )}
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[post.type] || TYPE_COLORS['기타']}`}>
                  {post.type}
                </span>
                <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{post.caption}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                해시태그 {post.hashtags?.length || 0}개
                {post.keywords && ` · ${post.keywords}`}
              </p>
            </div>
          </div>

          {/* 확장된 내용 */}
          {expanded === post.id && (
            <div className="px-4 pb-3 space-y-2 border-t border-gray-50 pt-3">
              <p className="text-sm text-gray-700 whitespace-pre-line">{post.caption}</p>
              <div className="flex flex-wrap gap-1">
                {post.hashtags?.map(t => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">#{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* 액션 */}
          <div className="flex border-t border-gray-50">
            <button
              onClick={() => setExpanded(expanded === post.id ? null : post.id)}
              className="flex-1 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {expanded === post.id ? '접기' : '내용 보기'}
            </button>
            <button
              onClick={() => onReuse(post)}
              className="flex-1 py-2.5 text-xs text-blue-500 hover:bg-blue-50 transition-colors"
            >
              다시 사용
            </button>
            <button
              onClick={() => setDeleteConfirm(post.id)}
              className="flex-1 py-2.5 text-xs text-red-400 hover:bg-red-50 transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      ))}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 pb-8 px-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <p className="text-gray-800 font-medium text-center">이 게시물을 삭제할까요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm"
              >
                취소
              </button>
              <button
                onClick={() => { deletePost(deleteConfirm); setDeleteConfirm(null) }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
