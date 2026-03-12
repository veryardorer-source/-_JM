import { useStore } from '../store/useStore'
import { PaymentSummary } from './Payments'

const STAGES_MAP = {
  '시공의뢰':  ['디자인', '작업도면', '견적', '시공', '마감'],
  '디자인의뢰': ['평면도', '디자인', '작업도면'],
}

const TYPE_COLOR = {
  '시공의뢰':  'text-orange-500 bg-orange-50 border border-orange-200',
  '디자인의뢰': 'text-purple-500 bg-purple-50 border border-purple-200',
}

function getStageProgress(stages) {
  const values = Object.values(stages || {})
  if (values.length === 0) return 0
  const done = values.filter(Boolean).length
  return Math.round((done / values.length) * 100)
}

function isUrgent(dueDate) {
  if (!dueDate) return false
  const diff = (new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)
  return diff <= 7 && diff >= 0
}

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

function isToday(dueDate) {
  if (!dueDate) return false
  return dueDate === new Date().toISOString().slice(0, 10)
}

function isRecurringToday(r) {
  if (!r.active) return false
  const dow = new Date().getDay()
  const dom = new Date().getDate()
  if (r.repeatType === 'daily') return true
  if (r.repeatType === 'weekly') return r.repeatDays.includes(dow)
  if (r.repeatType === 'monthly') return r.repeatMonthDay === dom
  return false
}

export default function Dashboard({ onTabChange }) {
  const { projects, tasks, payments, recurring, toggleTaskStatus, deleteTask, completeRecurring, uncompleteRecurring } = useStore()

  const today = new Date().toISOString().slice(0, 10)
  const activeProjects = projects.filter(p => p.status !== '완료')
  const completedProjectIds = new Set(projects.filter(p => p.status === '완료').map(p => p.id))
  const todayTasks = tasks.filter(t => t.status !== '완료' && !completedProjectIds.has(t.projectId) && (isToday(t.dueDate) || (!t.dueDate)))
  const urgentTasks = tasks.filter(t => t.status !== '완료' && !completedProjectIds.has(t.projectId) && t.dueDate && (isUrgent(t.dueDate) || isOverdue(t.dueDate)) && !isToday(t.dueDate))
  // 오늘 해당하는 반복 업무
  const todayRecurring = (recurring || []).filter(r => isRecurringToday(r))

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-blue-600">{activeProjects.length}</div>
          <div className="text-sm text-gray-500 mt-1">진행 중 현장</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-orange-500">{tasks.filter(t => t.status !== '완료' && t.projectId === null).length}</div>
          <div className="text-sm text-gray-500 mt-1">경리 할일</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-red-500">{tasks.filter(t => t.status !== '완료' && t.dueDate && isOverdue(t.dueDate)).length}</div>
          <div className="text-sm text-gray-500 mt-1">기한 초과</div>
        </div>
      </div>

      {/* 수금 현황 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">수금 현황</h2>
          <button onClick={() => onTabChange('payments')} className="text-xs text-blue-500 hover:underline">관리</button>
        </div>
        <PaymentSummary payments={payments} projects={projects} />
      </section>

      {/* 진행 중인 현장 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">진행 중인 현장</h2>
          <button onClick={() => onTabChange('projects')} className="text-xs text-blue-500 hover:underline">전체 보기</button>
        </div>
        {activeProjects.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm shadow-sm border border-gray-100">진행 중인 현장이 없습니다</div>
        ) : (
          <div className="space-y-2">
            {activeProjects.map(p => {
              const progress = getStageProgress(p.stages)
              const canonical = STAGES_MAP[p.projectType || '시공의뢰'] || Object.keys(p.stages || {})
              const stageKeys = canonical.filter(k => k in (p.stages || {}))
              const pType = p.projectType || '시공의뢰'
              return (
                <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800">{p.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[pType]}`}>{pType}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.client} · 마감 {p.dueDate || '-'}</div>
                    </div>
                    <span className="text-sm font-semibold text-blue-600 flex-shrink-0 ml-2">{progress}%</span>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {stageKeys.map(s => (
                      <div key={s} className="flex-1 text-center">
                        <div className={`h-1.5 rounded-full ${p.stages[s] ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        <div className="text-[10px] text-gray-400 mt-1">{s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 오늘 할일 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">
            오늘 할일 <span className="text-gray-400 font-normal text-sm">({today})</span>
          </h2>
          <button onClick={() => onTabChange('tasks')} className="text-xs text-blue-500 hover:underline">할일 관리</button>
        </div>

        {/* 반복 업무 (오늘 해당) */}
        {todayRecurring.length > 0 && (
          <div className="space-y-2 mb-2">
            {todayRecurring.map(r => {
              const doneToday = r.lastCompletedDate === today
              return (
                <div key={r.id} className={`bg-white rounded-xl px-4 py-3 shadow-sm border flex items-center gap-3 ${doneToday ? 'border-green-100 opacity-70' : 'border-blue-100'}`}>
                  <button
                    onClick={() => doneToday ? uncompleteRecurring(r.id) : completeRecurring(r.id)}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${doneToday ? 'bg-green-500 border-green-500' : 'border-blue-300 hover:border-blue-500'}`}
                  >
                    {doneToday && <span className="text-white text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${doneToday ? 'line-through text-gray-400' : 'text-gray-800'}`}>{r.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">반복</span>
                      {r.priority === '높음' && !doneToday && <span className="text-[11px] text-red-500 font-medium">긴급</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <TaskList tasks={todayTasks} onToggle={toggleTaskStatus} onDelete={deleteTask} projects={projects} />
      </section>

      {/* 마감 임박 */}
      {urgentTasks.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">마감 임박 <span className="text-red-400 text-sm font-normal">({urgentTasks.length})</span></h2>
          <TaskList tasks={urgentTasks} onToggle={toggleTaskStatus} onDelete={deleteTask} projects={projects} />
        </section>
      )}
    </div>
  )
}

function TaskList({ tasks, onToggle, onDelete, projects }) {
  if (tasks.length === 0) {
    return <div className="bg-white rounded-xl p-5 text-center text-gray-400 text-sm shadow-sm border border-gray-100">할일이 없습니다 🎉</div>
  }
  return (
    <div className="space-y-2">
      {tasks.map(t => {
        const project = projects.find(p => p.id === t.projectId)
        const overdue = isOverdue(t.dueDate)
        return (
          <div key={t.id} className={`bg-white rounded-xl px-4 py-3 shadow-sm border flex items-center gap-3 ${overdue ? 'border-red-100' : 'border-gray-100'}`}>
            <button onClick={() => onToggle(t.id)} className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${t.status === '완료' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'}`}>
              {t.status === '완료' && <span className="text-white text-xs">✓</span>}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${t.status === '완료' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {project && <span className="text-[11px] text-blue-500 truncate max-w-[100px]">{project.name}</span>}
                {t.dueDate && <span className={`text-[11px] ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{overdue ? '⚠ ' : ''}{t.dueDate}</span>}
                {t.priority === '높음' && <span className="text-[11px] text-red-500 font-medium">긴급</span>}
              </div>
            </div>
            <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-red-400 text-lg flex-shrink-0">×</button>
          </div>
        )
      })}
    </div>
  )
}
