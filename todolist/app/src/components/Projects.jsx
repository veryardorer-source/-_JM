import { useState } from 'react'
import { useStore } from '../store/useStore'

// 의뢰 유형별 단계 정의
const STAGES_MAP = {
  '시공의뢰':  ['디자인', '견적', '작업도면', '시공', '마감'],
  '디자인의뢰': ['평면도', '디자인', '작업도면'],  // 작업도면은 optional
}

// 의뢰 유형별 할일 템플릿
const TEMPLATES_MAP = {
  '시공의뢰':  ['실측', '평면도', '3D', '마감재', '작업도면'],
  '디자인의뢰': ['평면도', '디자인', '작업도면'],
}

const TYPE_COLOR = {
  '시공의뢰':  'bg-orange-50 text-orange-600 border-orange-200',
  '디자인의뢰': 'bg-purple-50 text-purple-600 border-purple-200',
}

const STATUS_OPTIONS = ['진행중', '대기', '완료', '보류', '취소']
const STATUS_COLOR = {
  '진행중': 'bg-blue-100 text-blue-700',
  '대기':   'bg-gray-100 text-gray-600',
  '완료':   'bg-green-100 text-green-700',
  '보류':   'bg-yellow-100 text-yellow-700',
  '취소':   'bg-red-100 text-red-600',
}

function getProgress(stages) {
  const values = Object.values(stages || {})
  if (values.length === 0) return { pct: 0 }
  const done = values.filter(Boolean).length
  return { pct: Math.round((done / values.length) * 100) }
}

// 현재 프로젝트의 실제 단계 키 목록 (정의된 순서 기준)
function getStageKeys(p) {
  const pType = p.projectType || '시공의뢰'
  const ordered = STAGES_MAP[pType] || STAGES_MAP['시공의뢰']
  const stageObj = p.stages || {}
  return ordered.filter(s => s in stageObj)
}

// 디자인의뢰에서 작업도면 포함 여부
function hasWorkingDrawing(p) {
  return '작업도면' in (p.stages || {})
}

const EMPTY_FORM = {
  name: '', client: '', startDate: '', dueDate: '', status: '진행중',
  projectType: '시공의뢰', includeWorkingDrawing: false, memo: ''
}

export default function Projects() {
  const { projects, tasks, addProject, updateProject, deleteProject, toggleStage, addTask, updateTask, deleteTask } = useStore()
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('전체')
  const [addingTaskForProject, setAddingTaskForProject] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')

  const filtered = filter === '전체' ? projects : projects.filter(p => p.status === filter)

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(p, e) {
    e.stopPropagation()
    setEditingId(p.id)
    setForm({
      name: p.name, client: p.client || '', startDate: p.startDate || '',
      dueDate: p.dueDate || '', status: p.status,
      projectType: p.projectType || '시공의뢰',
      includeWorkingDrawing: hasWorkingDrawing(p),
      memo: p.memo || ''
    })
    setShowForm(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editingId) {
      // 수정 시: 유형이 바뀌면 stages 재설정
      const existing = projects.find(p => p.id === editingId)
      let updates = { ...form }
      if (form.projectType !== (existing.projectType || '시공의뢰')) {
        // 유형 변경 → stages 초기화
        if (form.projectType === '시공의뢰') {
          updates.stages = { '디자인': false, '견적': false, '작업도면': false, '시공': false, '마감': false }
        } else {
          updates.stages = form.includeWorkingDrawing
            ? { '평면도': false, '디자인': false, '작업도면': false }
            : { '평면도': false, '디자인': false }
        }
      } else if (form.projectType === '디자인의뢰') {
        // 작업도면 토글 변경
        const curHas = hasWorkingDrawing(existing)
        if (form.includeWorkingDrawing && !curHas) {
          updates.stages = { ...existing.stages, '작업도면': false }
        } else if (!form.includeWorkingDrawing && curHas) {
          const { 작업도면, ...rest } = existing.stages
          updates.stages = rest
        }
      }
      const { includeWorkingDrawing, ...rest } = updates
      updateProject(editingId, rest)
    } else {
      addProject(form)
    }
    setShowForm(false)
    setEditingId(null)
  }

  function handleAddProjectTask(e) {
    e.preventDefault()
    if (!newTaskTitle.trim() || !addingTaskForProject) return
    addTask({ title: newTaskTitle, projectId: addingTaskForProject, dueDate: newTaskDueDate, category: '현장', priority: '보통' })
    setNewTaskTitle('')
    setNewTaskDueDate('')
    setAddingTaskForProject(null)
  }

  function addTemplateTask(projectId, template, existingTitles) {
    if (existingTitles.includes(template)) return
    addTask({ title: template, projectId, dueDate: '', category: '현장', priority: '보통' })
  }

  return (
    <div className="space-y-4">
      {/* 필터 + 추가 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {['전체', '진행중', '대기', '완료', '보류', '취소'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-600 flex-shrink-0">+ 현장 추가</button>
      </div>

      {/* 현장 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 text-sm">현장이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const { pct } = getProgress(p.stages)
            const stageKeys = getStageKeys(p)
            const pType = p.projectType || '시공의뢰'
            const templates = TEMPLATES_MAP[pType] || TEMPLATES_MAP['시공의뢰']
            const pTasks = tasks.filter(t => t.projectId === p.id)
            const pendingTasks = pTasks.filter(t => t.status !== '완료')
            const existingTitles = pTasks.map(t => t.title)
            const isOpen = selectedId === p.id

            return (
              <div key={p.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${p.status === '취소' ? 'border-red-100 opacity-60' : 'border-gray-100'}`}>
                {/* 카드 헤더 */}
                <div className="px-4 py-4 cursor-pointer" onClick={() => setSelectedId(isOpen ? null : p.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{p.name}</span>
                        {/* 의뢰 유형 뱃지 */}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${TYPE_COLOR[pType]}`}>{pType}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status]}`}>{p.status}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.client} · {p.dueDate ? `마감 ${p.dueDate}` : '마감일 미정'}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      <span className="text-sm font-bold text-blue-600">{pct}%</span>
                      <span className="text-gray-300 text-lg">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* 단계 버튼 — 저장된 keys 기준으로 렌더링 */}
                  <div className="mt-3 flex gap-1.5">
                    {stageKeys.map(s => (
                      <button key={s}
                        onClick={e => { e.stopPropagation(); toggleStage(p.id, s) }}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${p.stages[s] ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* 진행바 */}
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* 확장 패널 */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                    {/* 디자인의뢰 — 작업도면 포함 토글 */}
                    {pType === '디자인의뢰' && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={hasWorkingDrawing(p)}
                          onChange={() => {
                            if (hasWorkingDrawing(p)) {
                              const { 작업도면, ...rest } = p.stages
                              updateProject(p.id, { stages: rest })
                            } else {
                              updateProject(p.id, { stages: { ...p.stages, '작업도면': false } })
                            }
                          }}
                          className="rounded" />
                        <span className="text-xs text-gray-600">작업도면 포함</span>
                      </label>
                    )}

                    {/* 메모 */}
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1.5">메모</div>
                      <textarea value={p.memo || ''} onChange={e => updateProject(p.id, { memo: e.target.value })}
                        rows={2} placeholder="현장 메모..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400" />
                    </div>

                    {/* 할일 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-gray-500">
                          할일{pendingTasks.length > 0 && <span className="text-blue-500 ml-1">({pendingTasks.length})</span>}
                        </div>
                        <button onClick={() => setAddingTaskForProject(addingTaskForProject === p.id ? null : p.id)}
                          className="text-xs text-blue-500 hover:underline">+ 직접 입력</button>
                      </div>

                      {/* 유형별 템플릿 버튼 */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {templates.map(t => {
                          const already = existingTitles.includes(t)
                          return (
                            <button key={t}
                              onClick={() => addTemplateTask(p.id, t, existingTitles)}
                              disabled={already}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${already ? 'bg-green-50 border-green-200 text-green-600 cursor-default' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'}`}>
                              {already ? '✓ ' : '+ '}{t}
                            </button>
                          )
                        })}
                      </div>

                      {/* 직접 입력 폼 */}
                      {addingTaskForProject === p.id && (
                        <form onSubmit={handleAddProjectTask} className="flex gap-2 mb-3">
                          <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                            placeholder="할일..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          <input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)}
                            className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                          <button type="submit" className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600">✓</button>
                        </form>
                      )}

                      {/* 할일 목록 */}
                      {pTasks.length === 0 ? (
                        <div className="text-xs text-gray-400 py-1">위 버튼으로 할일을 추가하세요</div>
                      ) : (
                        <div className="space-y-1.5">
                          {pTasks.sort((a, b) => a.status === '완료' ? 1 : b.status === '완료' ? -1 : 0).map(t => (
                            <div key={t.id} className="flex items-center gap-2">
                              <button onClick={() => updateTask(t.id, { status: t.status === '완료' ? '대기' : '완료' })}
                                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${t.status === '완료' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}>
                                {t.status === '완료' && <span className="text-white text-[10px]">✓</span>}
                              </button>
                              <span className={`text-sm flex-1 ${t.status === '완료' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.title}</span>
                              {t.dueDate && <span className="text-[11px] text-gray-400">{t.dueDate}</span>}
                              <button onClick={() => deleteTask(t.id)} className="text-gray-300 hover:text-red-400">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 수정/삭제 */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={e => openEdit(p, e)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">수정</button>
                      <button onClick={e => { e.stopPropagation(); if (confirm(`"${p.name}" 현장을 삭제할까요?`)) { deleteProject(p.id); setSelectedId(null) } }}
                        className="flex-1 border border-red-100 text-red-400 rounded-lg py-2 text-sm hover:bg-red-50">삭제</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 현장 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editingId ? '현장 수정' : '새 현장 추가'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              {/* 의뢰 유형 선택 */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">의뢰 유형 *</label>
                <div className="flex gap-2">
                  {['시공의뢰', '디자인의뢰'].map(type => (
                    <button key={type} type="button"
                      onClick={() => setForm(p => ({ ...p, projectType: type, includeWorkingDrawing: false }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${form.projectType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {type === '시공의뢰' ? '🏗 시공의뢰' : '✏️ 디자인의뢰'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 디자인의뢰 — 진행 범위 선택 */}
              {form.projectType === '디자인의뢰' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">진행 범위</label>
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => setForm(p => ({ ...p, includeWorkingDrawing: false }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${!form.includeWorkingDrawing ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      평면도 + 디자인
                    </button>
                    <button type="button"
                      onClick={() => setForm(p => ({ ...p, includeWorkingDrawing: true }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form.includeWorkingDrawing ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      + 작업도면 포함
                    </button>
                  </div>
                  <div className="mt-1.5 text-[11px] text-gray-400">
                    단계: {form.includeWorkingDrawing ? '평면도 → 디자인 → 작업도면' : '평면도 → 디자인'}
                  </div>
                </div>
              )}

              {form.projectType === '시공의뢰' && (
                <div className="text-[11px] text-gray-400 -mt-1">단계: 디자인 → 견적 → 작업도면 → 시공 → 마감</div>
              )}

              <div>
                <label className="text-xs text-gray-500 mb-1 block">현장명 *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="예: 강남구 압구정 아파트"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">고객명</label>
                  <input value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))}
                    placeholder="홍길동" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">상태</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400">
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">시작일</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">마감일</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">메모</label>
                <textarea value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                  rows={2} placeholder="현장 특이사항..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-600">{editingId ? '수정 완료' : '추가'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm hover:bg-gray-50">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
