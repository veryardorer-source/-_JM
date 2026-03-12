import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const INITIAL_PROJECTS = [
  {
    id: '1',
    name: '강남구 압구정 아파트',
    client: '김**',
    startDate: '2026-02-01',
    dueDate: '2026-04-30',
    status: '진행중',
    projectType: '시공의뢰',
    stages: { '디자인': true, '견적': true, '작업도면': false, '시공': false, '마감': false },
    memo: '거실 확장 포함. 주방 아일랜드 추가 요청',
  },
  {
    id: '2',
    name: '서초구 반포 오피스텔',
    client: '이**',
    startDate: '2026-02-15',
    dueDate: '2026-05-15',
    status: '진행중',
    projectType: '디자인의뢰',
    stages: { '평면도': true, '디자인': false, '작업도면': false },
    memo: '원룸 풀옵션 인테리어',
  },
]

const INITIAL_TASKS = [
  { id: 't1', title: '압구정 현장 3D 도면 작업', dueDate: '2026-03-10', priority: '높음', status: '진행중', projectId: '1', completedAt: null },
  { id: 't2', title: '반포 오피스텔 평면도 작업', dueDate: '2026-03-12', priority: '높음', status: '대기', projectId: '2', completedAt: null },
  { id: 't3', title: '3월 급여 이체', dueDate: '2026-03-25', priority: '높음', status: '대기', projectId: null, completedAt: null },
  { id: 't4', title: '부가세 신고 서류 준비', dueDate: '2026-03-15', priority: '높음', status: '대기', projectId: null, completedAt: null },
  { id: 't5', title: '압구정 현장 실측', dueDate: '2026-02-05', priority: '보통', status: '완료', projectId: '1', completedAt: '2026-02-05' },
  { id: 't6', title: '반포 계약서 작성', dueDate: '2026-02-15', priority: '높음', status: '완료', projectId: '2', completedAt: '2026-02-15' },
  { id: 't7', title: '2월 급여 이체', dueDate: '2026-02-25', priority: '높음', status: '완료', projectId: null, completedAt: '2026-02-25' },
]

const INITIAL_PAYMENTS = [
  { id: 'p1', projectId: '1', type: '계약금', amount: 10000000, dueDate: '2026-02-01', paidDate: '2026-02-01', paid: true, note: '' },
  { id: 'p2', projectId: '1', type: '중도금', amount: 20000000, dueDate: '2026-03-15', paidDate: '', paid: false, note: '' },
  { id: 'p3', projectId: '1', type: '잔금', amount: 20000000, dueDate: '2026-04-25', paidDate: '', paid: false, note: '' },
  { id: 'p4', projectId: '2', type: '계약금', amount: 5000000, dueDate: '2026-02-15', paidDate: '2026-02-17', paid: true, note: '' },
  { id: 'p5', projectId: '2', type: '잔금', amount: 15000000, dueDate: '2026-05-10', paidDate: '', paid: false, note: '' },
]

const INITIAL_RECURRING = [
  { id: 'r1', title: '매일 업무일지 확인', repeatType: 'daily', repeatDays: [], repeatMonthDay: null, priority: '보통', memo: '', active: true, lastCompletedDate: '' },
  { id: 'r2', title: '월·수 현장 진행 체크', repeatType: 'weekly', repeatDays: [1, 3], repeatMonthDay: null, priority: '보통', memo: '', active: true, lastCompletedDate: '' },
  { id: 'r3', title: '화·금 견적 메일 확인', repeatType: 'weekly', repeatDays: [2, 5], repeatMonthDay: null, priority: '보통', memo: '', active: true, lastCompletedDate: '' },
  { id: 'r4', title: '매월 25일 급여 이체', repeatType: 'monthly', repeatDays: [], repeatMonthDay: 25, priority: '높음', memo: '', active: true, lastCompletedDate: '' },
]

const STORAGE_KEYS = {
  PROJECTS: 'jm_projects_v2',
  TASKS: 'jm_tasks_v2',
  PAYMENTS: 'jm_payments_v1',
  RECURRING: 'jm_recurring_v1',
}

function loadFromStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('localStorage 저장 실패:', e)
  }
}

// ── Supabase 동기화 헬퍼 ──────────────────────────────────────────
async function fetchFromSupabase() {
  if (!supabase) return null
  try {
    const [{ data: projects }, { data: tasks }, { data: payments }, { data: recurring }] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('recurring').select('*'),
    ])
    return { projects, tasks, payments, recurring }
  } catch (e) {
    console.error('Supabase 로드 실패:', e)
    return null
  }
}

async function upsertToSupabase(table, row) {
  if (!supabase) return
  try {
    await supabase.from(table).upsert(row)
  } catch (e) {
    console.error(`Supabase upsert(${table}) 실패:`, e)
  }
}

async function deleteFromSupabase(table, id) {
  if (!supabase) return
  try {
    await supabase.from(table).delete().eq('id', id)
  } catch (e) {
    console.error(`Supabase delete(${table}) 실패:`, e)
  }
}

// ── 전역 상태 ────────────────────────────────────────────────────
let globalProjects = loadFromStorage(STORAGE_KEYS.PROJECTS, INITIAL_PROJECTS)
let globalTasks    = loadFromStorage(STORAGE_KEYS.TASKS, INITIAL_TASKS)
let globalPayments = loadFromStorage(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS)
let globalRecurring = loadFromStorage(STORAGE_KEYS.RECURRING, INITIAL_RECURRING)
let initialized = false

let listeners = []
function notify() { listeners.forEach(fn => fn()) }

// 앱 시작 시 Supabase에서 최신 데이터 로드
async function initFromSupabase() {
  if (initialized || !supabase) return
  initialized = true
  const data = await fetchFromSupabase()
  if (!data) return
  if (data.projects?.length)  { globalProjects  = data.projects;  saveToStorage(STORAGE_KEYS.PROJECTS,  data.projects) }
  if (data.tasks?.length)     { globalTasks      = data.tasks;     saveToStorage(STORAGE_KEYS.TASKS,     data.tasks) }
  if (data.payments?.length)  { globalPayments   = data.payments;  saveToStorage(STORAGE_KEYS.PAYMENTS,  data.payments) }
  if (data.recurring?.length) { globalRecurring  = data.recurring; saveToStorage(STORAGE_KEYS.RECURRING, data.recurring) }
  notify()
}

initFromSupabase()

export function useStore() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const update = () => forceUpdate(n => n + 1)
    listeners.push(update)
    return () => { listeners = listeners.filter(fn => fn !== update) }
  }, [])

  // 탭 포커스 시 Supabase에서 재동기화
  useEffect(() => {
    if (!supabase) return
    const handleFocus = async () => {
      const data = await fetchFromSupabase()
      if (!data) return
      if (data.projects?.length)  { globalProjects  = data.projects;  saveToStorage(STORAGE_KEYS.PROJECTS,  data.projects) }
      if (data.tasks?.length)     { globalTasks      = data.tasks;     saveToStorage(STORAGE_KEYS.TASKS,     data.tasks) }
      if (data.payments?.length)  { globalPayments   = data.payments;  saveToStorage(STORAGE_KEYS.PAYMENTS,  data.payments) }
      if (data.recurring?.length) { globalRecurring  = data.recurring; saveToStorage(STORAGE_KEYS.RECURRING, data.recurring) }
      notify()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // ── 프로젝트 ────────────────────────────────────────
  const addProject = useCallback((project) => {
    const type = project.projectType || '시공의뢰'
    const defaultStages = type === '시공의뢰'
      ? { '디자인': false, '견적': false, '작업도면': false, '시공': false, '마감': false }
      : project.includeWorkingDrawing
        ? { '평면도': false, '디자인': false, '작업도면': false }
        : { '평면도': false, '디자인': false }
    const { includeWorkingDrawing, ...rest } = project
    const newProject = { id: Date.now().toString(), status: '진행중', stages: defaultStages, memo: '', ...rest }
    globalProjects = [...globalProjects, newProject]
    saveToStorage(STORAGE_KEYS.PROJECTS, globalProjects)
    upsertToSupabase('projects', newProject)
    notify()
  }, [])

  const updateProject = useCallback((id, updates) => {
    globalProjects = globalProjects.map(p => p.id === id ? { ...p, ...updates } : p)
    saveToStorage(STORAGE_KEYS.PROJECTS, globalProjects)
    const updated = globalProjects.find(p => p.id === id)
    if (updated) upsertToSupabase('projects', updated)
    notify()
  }, [])

  const deleteProject = useCallback((id) => {
    globalProjects = globalProjects.filter(p => p.id !== id)
    globalTasks    = globalTasks.filter(t => t.projectId !== id)
    globalPayments = globalPayments.filter(p => p.projectId !== id)
    saveToStorage(STORAGE_KEYS.PROJECTS, globalProjects)
    saveToStorage(STORAGE_KEYS.TASKS, globalTasks)
    saveToStorage(STORAGE_KEYS.PAYMENTS, globalPayments)
    deleteFromSupabase('projects', id)
    notify()
  }, [])

  const toggleStage = useCallback((projectId, stage) => {
    globalProjects = globalProjects.map(p => {
      if (p.id !== projectId) return p
      return { ...p, stages: { ...p.stages, [stage]: !p.stages[stage] } }
    })
    saveToStorage(STORAGE_KEYS.PROJECTS, globalProjects)
    const updated = globalProjects.find(p => p.id === projectId)
    if (updated) upsertToSupabase('projects', updated)
    notify()
  }, [])

  // ── 할일 ────────────────────────────────────────────
  const addTask = useCallback((task) => {
    const newTask = { id: Date.now().toString(), status: '대기', priority: '보통', completedAt: null, ...task }
    globalTasks = [...globalTasks, newTask]
    saveToStorage(STORAGE_KEYS.TASKS, globalTasks)
    upsertToSupabase('tasks', newTask)
    notify()
  }, [])

  const updateTask = useCallback((id, updates) => {
    globalTasks = globalTasks.map(t => {
      if (t.id !== id) return t
      const merged = { ...t, ...updates }
      if (updates.status === '완료' && !t.completedAt) merged.completedAt = new Date().toISOString().slice(0, 10)
      else if (updates.status && updates.status !== '완료') merged.completedAt = null
      return merged
    })
    saveToStorage(STORAGE_KEYS.TASKS, globalTasks)
    const updated = globalTasks.find(t => t.id === id)
    if (updated) upsertToSupabase('tasks', updated)
    notify()
  }, [])

  const deleteTask = useCallback((id) => {
    globalTasks = globalTasks.filter(t => t.id !== id)
    saveToStorage(STORAGE_KEYS.TASKS, globalTasks)
    deleteFromSupabase('tasks', id)
    notify()
  }, [])

  const toggleTaskStatus = useCallback((id) => {
    globalTasks = globalTasks.map(t => {
      if (t.id !== id) return t
      const completing = t.status !== '완료'
      return { ...t, status: completing ? '완료' : '대기', completedAt: completing ? new Date().toISOString().slice(0, 10) : null }
    })
    saveToStorage(STORAGE_KEYS.TASKS, globalTasks)
    const updated = globalTasks.find(t => t.id === id)
    if (updated) upsertToSupabase('tasks', updated)
    notify()
  }, [])

  // ── 반복 업무 ────────────────────────────────────────
  const addRecurring = useCallback((item) => {
    const newItem = { id: Date.now().toString(), active: true, lastCompletedDate: '', repeatDays: [], repeatMonthDay: null, ...item }
    globalRecurring = [...globalRecurring, newItem]
    saveToStorage(STORAGE_KEYS.RECURRING, globalRecurring)
    upsertToSupabase('recurring', newItem)
    notify()
  }, [])

  const updateRecurring = useCallback((id, updates) => {
    globalRecurring = globalRecurring.map(r => r.id === id ? { ...r, ...updates } : r)
    saveToStorage(STORAGE_KEYS.RECURRING, globalRecurring)
    const updated = globalRecurring.find(r => r.id === id)
    if (updated) upsertToSupabase('recurring', updated)
    notify()
  }, [])

  const deleteRecurring = useCallback((id) => {
    globalRecurring = globalRecurring.filter(r => r.id !== id)
    saveToStorage(STORAGE_KEYS.RECURRING, globalRecurring)
    deleteFromSupabase('recurring', id)
    notify()
  }, [])

  const completeRecurring = useCallback((id) => {
    const today = new Date().toISOString().slice(0, 10)
    globalRecurring = globalRecurring.map(r => r.id === id ? { ...r, lastCompletedDate: today } : r)
    saveToStorage(STORAGE_KEYS.RECURRING, globalRecurring)
    const updated = globalRecurring.find(r => r.id === id)
    if (updated) upsertToSupabase('recurring', updated)
    notify()
  }, [])

  const uncompleteRecurring = useCallback((id) => {
    globalRecurring = globalRecurring.map(r => r.id === id ? { ...r, lastCompletedDate: '' } : r)
    saveToStorage(STORAGE_KEYS.RECURRING, globalRecurring)
    const updated = globalRecurring.find(r => r.id === id)
    if (updated) upsertToSupabase('recurring', updated)
    notify()
  }, [])

  // ── 수금 ────────────────────────────────────────────
  const addPayment = useCallback((payment) => {
    const newPayment = { id: Date.now().toString(), paid: false, paidDate: '', note: '', ...payment }
    globalPayments = [...globalPayments, newPayment]
    saveToStorage(STORAGE_KEYS.PAYMENTS, globalPayments)
    upsertToSupabase('payments', newPayment)
    notify()
  }, [])

  const updatePayment = useCallback((id, updates) => {
    globalPayments = globalPayments.map(p => p.id === id ? { ...p, ...updates } : p)
    saveToStorage(STORAGE_KEYS.PAYMENTS, globalPayments)
    const updated = globalPayments.find(p => p.id === id)
    if (updated) upsertToSupabase('payments', updated)
    notify()
  }, [])

  const deletePayment = useCallback((id) => {
    globalPayments = globalPayments.filter(p => p.id !== id)
    saveToStorage(STORAGE_KEYS.PAYMENTS, globalPayments)
    deleteFromSupabase('payments', id)
    notify()
  }, [])

  return {
    projects: globalProjects,
    tasks: globalTasks,
    payments: globalPayments,
    recurring: globalRecurring,
    addProject, updateProject, deleteProject, toggleStage,
    addTask, updateTask, deleteTask, toggleTaskStatus,
    addPayment, updatePayment, deletePayment,
    addRecurring, updateRecurring, deleteRecurring, completeRecurring, uncompleteRecurring,
  }
}
